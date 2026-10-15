const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

const analyzerSource = readFileSync(process.env.DNS_ANALYZER_PATH || `${__dirname}/js/dns-analyzer.js`, 'utf8');

function createAnalyzer(fetch) {
    const context = vm.createContext({
        fetch,
        console: { log() {}, warn() {} },
        CommonUtils: {},
        ServiceDetectionEngine: class {}
    });
    vm.runInContext(analyzerSource, context, { filename: `${__dirname}/js/dns-analyzer.js` });
    return vm.runInContext('new DNSAnalyzer()', context);
}

const names = ['contact', 'connect', 'prompting', 'agentic', 'institute', 'www', 'agents', 'aura', 'crm'];

test('31 crt.sh certificate entries yield nine unique subdomains for mixed-case input', async () => {
    // Repeated certificates and apex entries are not additional subdomains.
    const entries = Array.from({ length: 30 }, (_, i) => ({
        name_value: i < 27 ? `${names[i % names.length]}.synottic.com` : 'synottic.com'
    }));
    entries.push({ name_value: 'synottic.com\nwww.synottic.com' });
    for (const domain of ['synottic.com', 'Synottic.com', ' SYNOTTIC.COM ']) {
        const analyzer = createAnalyzer(async (url) => {
            assert.equal(url, 'https://crt.sh/?q=%25.synottic.com&output=json');
            return { ok: true, json: async () => entries };
        });
        await analyzer.queryCrtSh(domain);
        assert.deepEqual(Array.from(analyzer.discoveryQueue.discoveredSubdomains.keys()).sort(),
            names.map(name => `${name}.synottic.com`).sort());

        analyzer.analyzeSingleSubdomain = async subdomain => ({ subdomain, records: { A: [] } });
        const results = await analyzer.processDiscoveryQueue();
        assert.equal(results.length, names.length);
        for (const result of results) assert.deepEqual(Array.from(result.sources), ['crt.sh']);
    }
});

for (const provider of ['queryCrtSh', 'queryCertSpotter', 'queryHackerTarget', 'queryTHC']) {
    test(`${provider}: normalizes names, rejects unrelated domains, preserves attribution`, async () => {
        const hostnames = [' WWW.SYNOTTIC.COM ', 'www.synottic.com', 'SYNOTTIC.COM',
            'www.evil-synottic.com', 'www.synottic.com.evil.test', 'API.Synottic.Com'];
        const payloads = {
            queryCrtSh: [{ name_value: hostnames.join('\r\n') + ',API.SYNOTTIC.COM' }],
            queryCertSpotter: [{ dns_names: hostnames }],
            queryHackerTarget: hostnames.map(name => `${name},192.0.2.1`).join('\n'),
            queryTHC: { domains: [...hostnames.map(domain => ({ domain })), {}] }
        };
        const source = { queryCrtSh: 'crt.sh', queryCertSpotter: 'SSLMate CT Search',
            queryHackerTarget: 'HackerTarget', queryTHC: 'THC Reverse DNS' }[provider];
        const analyzer = createAnalyzer(async (url, options) => {
            if (provider === 'queryTHC') assert.equal(JSON.parse(options.body).domain, 'synottic.com');
            else assert.ok(url.includes('synottic.com'));
            return { ok: true, json: async () => payloads[provider], text: async () => payloads[provider] };
        });
        await analyzer[provider](' Synottic.com ');
        assert.deepEqual(Array.from(analyzer.discoveryQueue.discoveredSubdomains.keys()).sort(),
            ['api.synottic.com', 'www.synottic.com']);
        for (const info of analyzer.discoveryQueue.discoveredSubdomains.values()) {
            assert.deepEqual(Array.from(info.sources), [source]);
        }
    });

    test(`${provider}: reports HTTP errors without adding subdomains`, async () => {
        const analyzer = createAnalyzer(async () => ({ ok: false, status: 503 }));
        const notifications = [];
        analyzer.onAPINotification((...args) => notifications.push(args));
        await analyzer[provider]('Synottic.com');
        assert.equal(analyzer.discoveryQueue.getStats().total, 0);
        assert.ok(notifications.some(([, status]) => status === 'error'));
    });
}

for (const provider of ['queryCrtSh', 'queryCertSpotter']) {
    test(`${provider}: normalizes and deduplicates wildcard certificates without inventing hosts`, async () => {
        const payload = provider === 'queryCrtSh'
            ? [{ name_value: '*.SYNOTTIC.COM\n*.synottic.com\n*.EVIL-SYNOTTIC.COM', id: 1 }]
            : [{ dns_names: ['*.SYNOTTIC.COM', '*.synottic.com', '*.EVIL-SYNOTTIC.COM'], id: 1 }];
        const analyzer = createAnalyzer(async () => ({ ok: true, json: async () => payload }));
        await analyzer[provider]('Synottic.com');
        assert.equal(analyzer.wildcardCertificates.length, 1);
        assert.equal(analyzer.wildcardCertificates[0].domain, '*.synottic.com');
        assert.equal(analyzer.discoveryQueue.getStats().total, 0);
    });
}

test('crt.sh retry still applies case-insensitive matching', async () => {
    let calls = 0;
    const analyzer = createAnalyzer(async () => {
        if (++calls === 1) throw new Error('Network failure');
        return { ok: true, json: async () => [{ name_value: 'WWW.SYNOTTIC.COM' }] };
    });
    await analyzer.queryCrtSh('Synottic.com');
    assert.equal(calls, 2);
    assert.equal(analyzer.discoveryQueue.getStats().total, 1);
});
