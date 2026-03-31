// Common Utilities - Shared functions used across multiple modules
// This file should be loaded before other JS files that depend on it

const CommonUtils = {
    /**
     * Safely check if a target domain is the same as or a subdomain of a given domain.
     * This prevents domain confusion attacks where 'evil-example.com' could match 'example.com'.
     * 
     * @param {string} target - The domain/hostname to check
     * @param {string} domain - The base domain to compare against
     * @returns {boolean} - True if target equals domain or is a subdomain of it
     * 
     * @example
     * isDomainOrSubdomain('example.com', 'example.com') // true
     * isDomainOrSubdomain('sub.example.com', 'example.com') // true
     * isDomainOrSubdomain('evil-example.com', 'example.com') // false
     * isDomainOrSubdomain('notexample.com', 'example.com') // false
     */
    isDomainOrSubdomain(target, domain) {
        if (!target || !domain) return false;
        
        const targetLower = target.toLowerCase().trim();
        const domainLower = domain.toLowerCase().trim();
        
        // Exact match
        if (targetLower === domainLower) return true;
        
        // Subdomain match - must end with .domain (not just contain it)
        if (targetLower.endsWith('.' + domainLower)) return true;
        
        return false;
    },

    /**
     * Validate if a string looks like a valid domain name.
     * 
     * @param {string} domain - The domain to validate
     * @returns {boolean} - True if it looks like a valid domain
     */
    isValidDomain(domain) {
        if (!domain || typeof domain !== 'string') return false;
        
        // Basic domain pattern: at least one dot, valid characters
        const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
        return domainPattern.test(domain.trim());
    },

    /**
     * Extract the base domain from a full hostname.
     * Note: This is a simple implementation that works for most cases.
     * For complex TLDs (co.uk, com.au), a proper public suffix list would be needed.
     * 
     * @param {string} hostname - The full hostname (e.g., 'sub.example.com')
     * @returns {string} - The base domain (e.g., 'example.com')
     */
    extractBaseDomain(hostname) {
        if (!hostname) return '';
        
        const parts = hostname.toLowerCase().trim().split('.');
        if (parts.length <= 2) return hostname;
        
        // Simple extraction - take last two parts
        // This won't work perfectly for co.uk, com.au, etc.
        return parts.slice(-2).join('.');
    },

    /**
     * Safely get string data from a DNS record (handles both string and object formats).
     * 
     * @param {string|object} record - DNS record (can be string or {data: string})
     * @returns {string} - The record data as a string
     */
    getRecordData(record) {
        if (!record) return '';
        if (typeof record === 'string') return record;
        if (record.data) return String(record.data);
        return String(record);
    },

    /**
     * Escape HTML special characters to prevent XSS attacks.
     * Converts <, >, &, ", ' to their HTML entity equivalents.
     * 
     * @param {string} text - The text to escape
     * @returns {string} - The escaped HTML-safe text
     * 
     * @example
     * escapeHtml('<script>alert("XSS")</script>') // Returns: &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * IPv4 dotted-decimal pattern (same as used for ASN / Shodan enrichment).
     */
    _ipv4DottedRe() {
        return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    },

    /**
     * True if the string is an IPv4 address in RFC1918 space, loopback, or IPv4 link-local (APIPA).
     * Used to skip Shodan InternetDB and unnecessary ASN lookups for non-internet-routable addresses.
     *
     * @param {string} ip
     * @returns {boolean}
     */
    isPrivateIPv4(ip) {
        if (!ip || typeof ip !== 'string') return false;
        const trimmed = ip.trim();
        if (!this._ipv4DottedRe().test(trimmed)) return false;
        const parts = trimmed.split('.').map(p => parseInt(p, 10));
        if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return false;
        const [a, b] = parts;
        if (a === 10) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
        if (a === 127) return true;
        if (a === 169 && b === 254) return true;
        return false;
    },

    /**
     * Collect unique IPv4 addresses from subdomain.ip and A records (order: .ip first, then A records).
     *
     * @param {object} subdomain
     * @returns {string[]}
     */
    collectSubdomainIPv4Addresses(subdomain) {
        const ipv4Re = this._ipv4DottedRe();
        const out = [];
        const seen = new Set();
        const add = (raw) => {
            if (raw === undefined || raw === null) return;
            const ip = String(raw).replace(/\.$/, '').trim();
            if (!ipv4Re.test(ip)) return;
            if (seen.has(ip)) return;
            seen.add(ip);
            out.push(ip);
        };
        if (subdomain?.ip) add(subdomain.ip);
        const aList = subdomain?.records?.A;
        if (Array.isArray(aList)) {
            for (const rec of aList) {
                add(this.getRecordData(rec));
            }
        }
        return out;
    },

    /**
     * Primary IPv4 for enrichment (Shodan/ASN): prefers subdomain.ip if it is IPv4, else first A record IPv4.
     *
     * @param {object} subdomain
     * @returns {string|null}
     */
    getSubdomainCanonicalIPv4(subdomain) {
        const list = this.collectSubdomainIPv4Addresses(subdomain);
        return list.length > 0 ? list[0] : null;
    }
};

// Export to window for global access
window.CommonUtils = CommonUtils;

