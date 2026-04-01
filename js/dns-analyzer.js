// Discovery Queue - Centralized subdomain discovery and processing management
class DiscoveryQueue {
    constructor() {
        this.discoveredSubdomains = new Map(); // subdomain -> {sources: [], status: 'discovered'}
        this.processingQueue = []; // Array of subdomains to process
        this.results = new Map(); // subdomain -> analysis results
        this.stats = {
            discovered: 0,
            processed: 0,
            total: 0
        };
    }
    
    addDiscovered(subdomain, source) {
        // Clean and validate subdomain name
        const cleanSubdomain = subdomain.trim().toLowerCase();
        
        // Skip if empty or invalid
        if (!cleanSubdomain || cleanSubdomain.includes('\n') || cleanSubdomain.includes('\r')) {
            console.warn(`⚠️ Skipping invalid subdomain: "${subdomain}" (contains newlines)`);
            return;
        }
        
        if (!this.discoveredSubdomains.has(cleanSubdomain)) {
            this.discoveredSubdomains.set(cleanSubdomain, {
                sources: [source],
                status: 'discovered',
                discoveredAt: new Date()
            });
            this.processingQueue.push(cleanSubdomain);
            this.stats.discovered++;
            console.log(`🆕 Added to discovery queue: ${cleanSubdomain} (from ${source})`);
        } else {
            // Add source to existing entry
            const entry = this.discoveredSubdomains.get(cleanSubdomain);
            if (!entry.sources.includes(source)) {
                entry.sources.push(source);
                console.log(`📝 Added source ${source} to existing subdomain: ${cleanSubdomain}`);
            }
        }
    }
    
    getNextToProcess() {
        return this.processingQueue.shift(); // FIFO processing
    }
    
    markCompleted(subdomain, results) {
        this.results.set(subdomain, results);
        this.stats.processed++;
        console.log(`✅ Completed processing: ${subdomain}`);
    }
    
    getProgress() {
        return {
            discovered: this.stats.discovered,
            processed: this.stats.processed,
            remaining: this.processingQueue.length,
            total: this.discoveredSubdomains.size
        };
    }
    
    getResults() {
        return Array.from(this.results.values());
    }
    
    getStats() {
        return {
            ...this.stats,
            remaining: this.processingQueue.length,
            total: this.discoveredSubdomains.size
        };
    }
    
    clear() {
        this.discoveredSubdomains.clear();
        this.processingQueue = [];
        this.results.clear();
        this.stats = {
            discovered: 0,
            processed: 0,
            total: 0
        };
    }
}

// DNS Analyzer Module
class DNSAnalyzer {
    constructor() {
        // Use shared isDomainOrSubdomain from CommonUtils (prevents domain confusion attacks)
        this.isDomainOrSubdomain = CommonUtils.isDomainOrSubdomain;
        
        // Primary DNS servers (Google and Cloudflare only - more reliable)
        this.primaryDNSServers = [
            'https://dns.google/resolve',
            'https://cloudflare-dns.com/dns-query'
        ];
        
        // Fallback DNS servers (less reliable, used only if primary fails)
        this.fallbackDNSServers = [
            'https://doh.powerdns.org/dns-query',
            'https://dns.alidns.com/resolve'
        ];
        
        // Statistics
        this.stats = {
            dnsQueries: 0,
            apiCalls: 0,
            subdomainsAnalyzed: 0,
            subdomainsDiscovered: 0,
            asnLookups: 0,
            servicesDetected: 0,
            takeoversDetected: 0,
            errors: 0,
            startTime: null
        };
        
        // Track processed subdomains to avoid duplicates
        this.processedSubdomains = new Set();
        
        // FIXED: Store processed subdomain results
        this.processedSubdomainResults = new Map();
        
        // Historical records tracking
        this.historicalRecords = [];
        
        // Wildcard certificates tracking
        this.wildcardCertificates = [];
        
        // NEW: Discovery queue for centralized management
        this.discoveryQueue = new DiscoveryQueue();
        
        // Callbacks for API notifications
        this.apiCallbacks = [];
        
        // Track rate-limited providers to avoid notification spam
        this.rateLimitedProviders = new Set();
        
        // Track consecutive fetch failure counts per provider (for retry threshold)
        this.providerFailCounts = new Map();
        
        // Track blocklists that returned "query blocked" so we stop hitting them
        this.blockedBlocklists = new Set();
        
        // Rate limiting
        this.rateLimiter = new RateLimiter(10, 1000); // 10 requests per second
        
        // Current domain being analyzed
        this.currentDomain = null;
        
        // Service detection engine
        this.serviceDetector = new ServiceDetectionEngine();
    }

    // Reset all statistics and internal state
    resetStats() {
        this.stats = {
            dnsQueries: 0,
            apiCalls: 0,
            subdomainsAnalyzed: 0,
            subdomainsDiscovered: 0,
            asnLookups: 0,
            servicesDetected: 0,
            takeoversDetected: 0,
            errors: 0,
            startTime: Date.now()
        };
        
        // Clear all internal arrays and sets
        this.processedSubdomains.clear();
        this.processedSubdomainResults.clear();
        this.historicalRecords = [];
        this.wildcardCertificates = [];
        this.discoveryQueue.clear(); // Clear discovery queue
        this.apiCallbacks = [];
        this.rateLimitedProviders.clear(); // Clear rate limit tracking
        this.providerFailCounts.clear(); // Clear provider failure counts
        this.blockedBlocklists.clear(); // Clear blocklist blocked tracking
        this.currentDomain = null;
        
        console.log('🧹 DNS Analyzer internal state cleared for new analysis');
    }
    
    // Set current domain for intelligent record querying
    setCurrentDomain(domain) {
        this.currentDomain = domain;
    }

    // Register callback for API notifications
    onAPINotification(callback) {
        this.apiCallbacks.push(callback);
    }

    // Notify about new subdomain discovery
    notifySubdomainDiscovered(subdomain, source) {
        this.processedSubdomains.add(subdomain);
        this.stats.subdomainsDiscovered++;
        console.log(`🆕 New subdomain discovered: ${subdomain} (from ${source})`);
    }

    // Send API notification
    notifyAPIStatus(apiName, status, message) {
        this.apiCallbacks.forEach(callback => {
            try {
                callback(apiName, status, message);
            } catch (error) {
                console.warn('API notification callback error:', error);
            }
        });
    }
    
    // Get processed subdomain results
    getProcessedSubdomainResults() {
        return this.discoveryQueue.getResults();
    }

    // Get CT API statuses for detailed reporting
    getCTApiStatuses() {
        // For now, return a simple structure since we're not tracking individual API statuses
        // This can be enhanced later to track actual API performance
        return {
            completed: ['Discovery Queue'],
            timeout: [],
            failed: []
        };
    }

    // Get historical records
    getHistoricalRecords() {
        return this.historicalRecords;
    }

    // Get wildcard certificates
    getWildcardCertificates() {
        return this.wildcardCertificates;
    }

    // Convert DNS record type number to name
    getRecordTypeName(typeNumber) {
        const types = {
            1: 'A',
            2: 'NS', 
            5: 'CNAME',
            6: 'SOA',
            15: 'MX',
            16: 'TXT',
            28: 'AAAA',
            43: 'DS',
            46: 'RRSIG',
            47: 'NSEC',
            48: 'DNSKEY',
            50: 'NSEC3',
            52: 'TLSA',
            257: 'CAA'
        };
        return types[typeNumber] || `TYPE${typeNumber}`;
    }

    // Fallback method for specific record type queries
    async querySpecificRecordTypes(domain, results) {
        const recordTypes = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'CAA', 'SOA'];
        let hasARecords = false;
        
        for (const type of recordTypes) {
            // Skip CNAME if A records already exist (RFC compliance)
            if (type === 'CNAME' && hasARecords) {
                console.log(`  ⏭️  Skipping CNAME query - A records already found for ${domain}`);
                continue;
            }
            
            try {
                const records = await this.queryDNS(domain, type);
                if (records && records.length > 0) {
                    results.records[type] = records;
                    if (type === 'A') {
                        hasARecords = true;
                    }
                }
            } catch (error) {
                console.warn(`Failed to query ${type} records for ${domain}:`, error);
            }
        }
    }

    // Check if CNAME points to main domain
    isCNAMEToMainDomain(cnameTarget) {
        if (!cnameTarget || !this.currentDomain) return false;
        
        // Remove trailing dot and compare
        const cleanTarget = cnameTarget.replace(/\.$/, '');
        const cleanMainDomain = this.currentDomain.replace(/\.$/, '');
        
        // Check if CNAME target is the main domain
        return cleanTarget === cleanMainDomain;
    }

    // Process subdomain immediately when discovered
    async processSubdomainImmediately(subdomain, source, certInfo = null) {
        if (this.processedSubdomains.has(subdomain)) {
            console.log(`⏭️  Skipping already processed subdomain: ${subdomain}`);
            return;
        }

        console.log(`⚡ Processing subdomain immediately: ${subdomain} (from ${source})`);
        this.processedSubdomains.add(subdomain);
        this.stats.subdomainsAnalyzed++;

        try {
            // Analyze the subdomain
            const analysis = await this.analyzeSingleSubdomain(subdomain);
            
            // Add source information from discovery queue
            const discoveryInfo = this.discoveryQueue?.discoveredSubdomains?.get(subdomain);
            if (discoveryInfo && discoveryInfo.sources) {
                analysis.sources = discoveryInfo.sources;
            } else {
                // Fallback to the source parameter if discovery info not available
                analysis.sources = [source];
            }
            
            // Check if this is a CNAME redirect to main domain
            if (analysis.records.CNAME && analysis.records.CNAME.length > 0) {
                const cnameTarget = analysis.records.CNAME[0].data;
                if (this.isCNAMEToMainDomain(cnameTarget)) {
                    // This is a redirect to main domain - mark as redirect and skip further analysis
                    analysis.isRedirectToMain = true;
                    analysis.redirectTarget = cnameTarget;
                    console.log(`🔄 Redirect detected: ${subdomain} → ${cnameTarget} (main domain) - skipping detailed analysis`);
                    
                    // Store the result
                    this.processedSubdomainResults.set(subdomain, analysis);
                    return; // Skip further analysis
                }
            }
            
            // Check if this is a historical record (no DNS records found)
            if (!analysis.records || Object.keys(analysis.records).length === 0) {
                console.log(`📜 Historical record detected: ${subdomain} (no active DNS records)`);
                analysis.isHistorical = true;
                analysis.status = 'historical';
            } else {
                // This is an active subdomain with DNS records
                console.log(`✅ Active subdomain detected: ${subdomain} with ${Object.keys(analysis.records).length} record types`);
                analysis.status = 'active';
            }
            
            // Store the result
            this.processedSubdomainResults.set(subdomain, analysis);
            
        } catch (error) {
            console.warn(`❌ Failed to process subdomain ${subdomain}:`, error.message);
            
            // Store error result
            const discoveryInfo = this.discoveryQueue?.discoveredSubdomains?.get(subdomain);
            const errorResult = {
                subdomain: subdomain,
                records: {},
                ip: null,
                status: 'error',
                error: error.message,
                sources: discoveryInfo?.sources || [source]
            };
            this.processedSubdomainResults.set(subdomain, errorResult);
        }
    }

    // Analyze a single subdomain
    async analyzeSingleSubdomain(subdomain) {
        console.log(`🔍 Analyzing single subdomain: ${subdomain}`);
        
        const analysis = {
            subdomain: subdomain,
            records: {},
            ip: null,
            vendor: { vendor: 'Unknown', category: 'Unknown' },
            takeover: null
        };

        try {
            // Get DNS records (without specifying type to get CNAME chain automatically)
            const records = await this.queryDNS(subdomain);
            if (records && records.length > 0) {
                // Process all record types from the response
                for (const record of records) {
                    if (record.type === 1) { // A record
                        if (!analysis.records.A) analysis.records.A = [];
                        analysis.records.A.push(record);
                        analysis.ip = record.data;
                    } else if (record.type === 28) { // AAAA record (IPv6)
                        if (!analysis.records.AAAA) analysis.records.AAAA = [];
                        analysis.records.AAAA.push(record);
                        // Use IPv6 as IP if no IPv4 found
                        if (!analysis.ip) {
                            analysis.ip = record.data;
                        }
                    } else if (record.type === 5) { // CNAME record
                        if (!analysis.records.CNAME) analysis.records.CNAME = [];
                        analysis.records.CNAME.push(record);
                        // Store the CNAME target for service analysis
                        analysis.cnameTarget = record.data.replace(/\.$/, '');
                        
                        // Follow CNAME chain for enhanced service detection
                        const cnameChain = await this.followCNAMEChain(subdomain);
                        if (cnameChain.length > 0) {
                            analysis.cnameChain = cnameChain;
                            
                            // Detect primary service from first CNAME
                            const firstCNAME = cnameChain[0].to;
                            analysis.primaryService = this.detectPrimaryService(firstCNAME);
                            
                            // Detect infrastructure from final CNAME
                            const finalCNAME = cnameChain[cnameChain.length - 1].to;
                            analysis.infrastructure = this.detectInfrastructure(finalCNAME);
                            
                            // Use primary service as cnameService (consolidated approach)
                            analysis.cnameService = analysis.primaryService;
                        } else {
                            // Fallback to single CNAME detection (consolidated)
                            analysis.cnameService = this.detectCNAMEService(analysis.cnameTarget);
                            // Also set as primary service for consistency
                            analysis.primaryService = analysis.cnameService;
                        }
                    }
                }
                
                // Query AAAA records explicitly for subdomains (IPv6 support)
                try {
                    const aaaaRecords = await this.queryDNS(subdomain, 'AAAA');
                    if (aaaaRecords && aaaaRecords.length > 0) {
                        if (!analysis.records.AAAA) analysis.records.AAAA = [];
                        analysis.records.AAAA.push(...aaaaRecords);
                        // Use IPv6 as IP if no IPv4 found
                        if (!analysis.ip && aaaaRecords[0]) {
                            analysis.ip = aaaaRecords[0].data;
                        }
                    }
                } catch (error) {
                    // AAAA records are optional, silently continue if not available
                }
                
                // For subdomains, we don't need to query MX, TXT, or NS records
                // These are typically only relevant for the main domain:
                // - MX: Email routing (domain-level)
                // - TXT: Domain policies like SPF, DMARC, verification (domain-level)  
                // - NS: Authoritative nameservers (domain-level)
                // Subdomains typically only need A/AAAA and CNAME records
                
                console.log(`  ✅ Subdomain ${subdomain} analysis complete - A/AAAA/CNAME records processed`);
                
                // Ensure IPv4 is set when A records exist but ip was never set (record ordering edge cases)
                if (!analysis.ip && analysis.records.A && analysis.records.A.length > 0) {
                    const v4 = CommonUtils.getSubdomainCanonicalIPv4({ ip: null, records: { A: analysis.records.A } });
                    if (v4) analysis.ip = v4;
                }
                
                // Get ASN info only for public IPv4 (skip private/link-local — wastes API calls)
                const ipv4Re = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
                if (analysis.ip && ipv4Re.test(analysis.ip) && !CommonUtils.isPrivateIPv4(analysis.ip)) {
                    try {
                        const asnInfo = await this.getASNInfo(analysis.ip);
                        analysis.vendor = this.classifyVendor(asnInfo);
                        this.stats.asnLookups++;
                        console.log(`  ✅ ASN info for ${analysis.ip}: ${asnInfo.org || 'Unknown'}`);
                    } catch (error) {
                        console.warn(`  ⚠️  ASN lookup failed for ${analysis.ip}:`, error.message);
                    }
                } else if (analysis.ip && ipv4Re.test(analysis.ip) && CommonUtils.isPrivateIPv4(analysis.ip)) {
                    analysis.isPrivateIP = true;
                    analysis.vendor = { vendor: 'Internal Network', category: 'internal' };
                    analysis.asnInfo = null;
                }
                
                // Check for takeover from CNAME records (service detection already handled above)
                if (analysis.records.CNAME && analysis.records.CNAME.length > 0) {
                    const cnameTarget = analysis.records.CNAME[0].data.replace(/\.$/, '');
                    
                    // Detect takeover
                    const takeover = await this.detectTakeover(subdomain, cnameTarget);
                    if (takeover) {
                        analysis.takeover = takeover;
                        this.stats.takeoversDetected++;
                    }
                }
            }

            // TXT and MX records are not queried for subdomains as they are typically
            // only relevant at the domain level (SPF, DMARC, email routing, etc.)
            // This optimization reduces unnecessary DNS queries by ~50% for subdomain analysis

            console.log(`✅ Single subdomain analysis complete: ${subdomain} (IP: ${analysis.ip || 'none'})`);
            return analysis;

        } catch (error) {
            console.error(`❌ Error analyzing subdomain ${subdomain}:`, error);
            return analysis;
        }
    }

    // Classify vendor from ASN info
    classifyVendor(asnInfo) {
        if (!asnInfo || !asnInfo.org) {
            return { vendor: 'Unknown', category: 'Unknown' };
        }

        const org = asnInfo.org.toLowerCase();
        
        if (org.includes('amazon') || org.includes('aws')) {
            return { vendor: 'Amazon Web Services', category: 'Cloud' };
        } else if (org.includes('microsoft') || org.includes('azure')) {
            return { vendor: 'Microsoft Azure', category: 'Cloud' };
        } else if (org.includes('google') || org.includes('gcp')) {
            return { vendor: 'Google Cloud Platform', category: 'Cloud' };
        } else if (org.includes('cloudflare')) {
            return { vendor: 'Cloudflare', category: 'CDN' };
        } else if (org.includes('digitalocean')) {
            return { vendor: 'DigitalOcean', category: 'Cloud' };
        } else if (org.includes('linode')) {
            return { vendor: 'Linode', category: 'Cloud' };
        } else if (org.includes('hetzner')) {
            return { vendor: 'Hetzner', category: 'Cloud' };
        } else if (org.includes('fastly')) {
            return { vendor: 'Fastly', category: 'CDN' };
        } else {
            return { vendor: asnInfo.org, category: 'Other' };
        }
    }

    // Follow CNAME chain to identify primary service and infrastructure
    async followCNAMEChain(subdomain) {
        const chain = [];
        let currentTarget = subdomain;
        const maxHops = 10; // Prevent infinite loops
        let hopCount = 0;
        
        while (hopCount < maxHops) {
            try {
                const records = await this.queryDNS(currentTarget, 'CNAME');
                if (records && records.length > 0) {
                    const cnameRecord = records[0];
                    const target = cnameRecord.data.replace(/\.$/, '');
                    chain.push({
                        from: currentTarget,
                        to: target,
                        ttl: cnameRecord.TTL
                    });
                    currentTarget = target;
                    hopCount++;
                } else {
                    // No more CNAME records, we've reached the end
                    break;
                }
            } catch (error) {
                console.warn(`  ⚠️  Failed to follow CNAME chain for ${currentTarget}:`, error.message);
                break;
            }
        }
        
        return chain;
    }
    
    // Simplified service detection from CNAME target
    detectPrimaryService(firstCNAME) {
        if (!firstCNAME) return null;
        
        const target = firstCNAME.toLowerCase();
        
        // Comprehensive service patterns for CNAME detection
        const servicePatterns = [
            // Identity & Authentication
            { pattern: 'okta.com', name: 'Okta', category: 'security', description: 'Identity and access management platform' },
            { pattern: 'auth0.com', name: 'Auth0', category: 'security', description: 'Identity and access management platform' },
            
            // Payment Services
            { pattern: 'stripecdn.com', name: 'Stripe', category: 'payment', description: 'Payment processing platform' },
            { pattern: 'stripe.com', name: 'Stripe', category: 'payment', description: 'Payment processing platform' },
            { pattern: 'paypal.com', name: 'PayPal', category: 'payment', description: 'Payment processing platform' },
            
            // Productivity & Office Suites
            { pattern: 'zohohost.eu', name: 'Zoho', category: 'productivity', description: 'Business productivity suite' },
            { pattern: 'zoho.com', name: 'Zoho', category: 'productivity', description: 'Business productivity suite' },
            { pattern: 'zohohost.com', name: 'Zoho', category: 'productivity', description: 'Business productivity suite' },
            
            // CDN & Cloud Services
            { pattern: 'cloudflare', name: 'Cloudflare', category: 'cloud', description: 'CDN and security services' },
            { pattern: 'cloudfront.net', name: 'AWS CloudFront', category: 'cloud', description: 'Amazon content delivery network' },
            { pattern: 'elb.amazonaws.com', name: 'AWS Load Balancer', category: 'cloud', description: 'Amazon load balancing service' },
            { pattern: 'awsglobalaccelerator.com', name: 'AWS Global Accelerator', category: 'cloud', description: 'Global application accelerator' },
            { pattern: 'awsapprunner.com', name: 'AWS App Runner', category: 'cloud', description: 'Containerized application hosting' },
            { pattern: 'amazonaws.com', name: 'Amazon AWS', category: 'cloud', description: 'Cloud computing platform' },
            { pattern: 'fastly.com', name: 'Fastly', category: 'cloud', description: 'Edge cloud platform' },
            
            // Hosting Platforms
            { pattern: 'heroku', name: 'Heroku', category: 'cloud', description: 'Cloud application platform' },
            { pattern: 'netlify', name: 'Netlify', category: 'cloud', description: 'Static site hosting' },
            { pattern: 'vercel', name: 'Vercel', category: 'cloud', description: 'Frontend deployment platform' },
            { pattern: 'github', name: 'GitHub Pages', category: 'cloud', description: 'Static site hosting' },
            { pattern: 'wixdns.net', name: 'Wix', category: 'cloud', description: 'Website builder platform' },
            { pattern: 'wix.com', name: 'Wix', category: 'cloud', description: 'Website builder platform' },
            { pattern: 'azurewebsites.net', name: 'Microsoft Azure App Service', category: 'cloud', description: 'Azure web application hosting' },
            { pattern: 'ondigitalocean.app', name: 'DigitalOcean App Platform', category: 'cloud', description: 'Application hosting platform' },
            
            // Documentation & Content
            { pattern: 'gitbook.io', name: 'GitBook', category: 'documentation', description: 'Documentation platform' },
            { pattern: 'notion.so', name: 'Notion', category: 'documentation', description: 'Workspace and documentation platform' },
            
            // Customer Feedback & Support
            { pattern: 'canny.io', name: 'Canny Feedback', category: 'feedback', description: 'Product feedback platform' },
            { pattern: 'zendesk.com', name: 'Zendesk', category: 'support', description: 'Customer support platform' },
            { pattern: 'intercom.io', name: 'Intercom', category: 'support', description: 'Customer messaging platform' },
            
            // Analytics & Marketing
            { pattern: 'hubspot.com', name: 'HubSpot', category: 'marketing', description: 'Marketing and CRM platform' },
            { pattern: 'mailchimp.com', name: 'Mailchimp', category: 'marketing', description: 'Email marketing platform' },
            
            // Development Tools
            { pattern: 'gitpod.io', name: 'Gitpod', category: 'development', description: 'Cloud development environment' },
            
            // H4: Additional Monitoring & Observability Services
            { pattern: 'datadoghq.com', name: 'Datadog', category: 'monitoring', description: 'Infrastructure monitoring and analytics' },
            { pattern: 'datadoghq.eu', name: 'Datadog', category: 'monitoring', description: 'Infrastructure monitoring and analytics' },
            { pattern: 'newrelic.com', name: 'New Relic', category: 'monitoring', description: 'Application performance monitoring' },
            { pattern: 'splunkcloud.com', name: 'Splunk Cloud', category: 'monitoring', description: 'Data platform for security and observability' },
            { pattern: 'splunk.com', name: 'Splunk', category: 'monitoring', description: 'Data platform for security and observability' },
            { pattern: 'pagerduty.com', name: 'PagerDuty', category: 'monitoring', description: 'Incident management and response platform' },
            { pattern: 'grafana.net', name: 'Grafana Cloud', category: 'monitoring', description: 'Observability platform for metrics, logs, and traces' },
            { pattern: 'grafana.com', name: 'Grafana', category: 'monitoring', description: 'Observability platform for metrics, logs, and traces' },
            { pattern: 'opsgenie.com', name: 'Opsgenie', category: 'monitoring', description: 'Alert and incident management' },
            
            // E-commerce Platforms
            { pattern: 'myshopify.com', name: 'Shopify', category: 'ecommerce', description: 'E-commerce platform' },
            { pattern: 'shopify.com', name: 'Shopify', category: 'ecommerce', description: 'E-commerce platform' },
            
            // Legal & Compliance
            { pattern: 'docusign.com', name: 'DocuSign', category: 'legal', description: 'Electronic signature platform' },
            { pattern: 'onetrust.com', name: 'OneTrust', category: 'compliance', description: 'Privacy and data governance platform' },
            { pattern: 'cookiebot.com', name: 'Cookiebot', category: 'compliance', description: 'Cookie consent management' },
            
            // H6: CI/CD Platforms
            { pattern: 'circleci.com', name: 'CircleCI', category: 'cicd', description: 'Continuous integration and delivery platform' },
            { pattern: 'gitlab.io', name: 'GitLab Pages', category: 'cicd', description: 'Static site hosting from GitLab' },
            { pattern: 'gitlab.com', name: 'GitLab', category: 'cicd', description: 'DevOps platform with built-in CI/CD' },
            { pattern: 'travis-ci.com', name: 'Travis CI', category: 'cicd', description: 'Continuous integration service' },
            { pattern: 'bitbucket.io', name: 'Bitbucket', category: 'cicd', description: 'Git repository with CI/CD pipelines' },
            
            // Workflow Automation
            { pattern: 'zapier.com', name: 'Zapier', category: 'automation', description: 'Workflow automation platform' },
            { pattern: 'make.com', name: 'Make (Integromat)', category: 'automation', description: 'Workflow automation and integration' },
            { pattern: 'integromat.com', name: 'Make (Integromat)', category: 'automation', description: 'Workflow automation and integration' },
            { pattern: 'tray.io', name: 'Tray.io', category: 'automation', description: 'Enterprise automation platform' },
            { pattern: 'workato.com', name: 'Workato', category: 'automation', description: 'Enterprise automation platform' },
            
            // Payment Services
            { pattern: 'adyen.com', name: 'Adyen', category: 'payment', description: 'Global payment platform' },
            { pattern: 'braintree.com', name: 'Braintree', category: 'payment', description: 'Payment gateway' },
            { pattern: 'braintreegateway.com', name: 'Braintree', category: 'payment', description: 'Payment gateway' },
            { pattern: 'klarna.com', name: 'Klarna', category: 'payment', description: 'Buy now, pay later service' },
            { pattern: 'mollie.com', name: 'Mollie', category: 'payment', description: 'European payment service provider' },
            { pattern: 'squareup.com', name: 'Square', category: 'payment', description: 'Payment processing platform' }
        ];
        
        for (const service of servicePatterns) {
            if (target.includes(service.pattern)) {
                return {
                    name: service.name,
                    category: service.category,
                    description: service.description
                };
            }
        }
        
        return null;
    }
    
    // Detect infrastructure from final CNAME target
    detectInfrastructure(finalCNAME) {
        if (!finalCNAME) return null;
        
        const target = finalCNAME.toLowerCase();
        
        // SECURITY FIX: Use isDomainOrSubdomain to prevent domain confusion attacks
        // AWS services
        if (this.isDomainOrSubdomain(target, 'awsglobalaccelerator.com')) {
            return { name: 'AWS Global Accelerator', category: 'cloud', description: 'Global application accelerator' };
        }
        if (this.isDomainOrSubdomain(target, 'awsapprunner.com')) {
            return { name: 'AWS App Runner', category: 'cloud', description: 'Containerized application hosting' };
        }
        if (this.isDomainOrSubdomain(target, 'amazonaws.com')) {
            return { name: 'Amazon Web Services (AWS)', category: 'cloud', description: 'Cloud computing platform' };
        }
        
        // Azure services
        if (this.isDomainOrSubdomain(target, 'azurewebsites.net')) {
            return { name: 'Microsoft Azure', category: 'cloud', description: 'Cloud computing platform' };
        }
        
        // DigitalOcean services
        if (this.isDomainOrSubdomain(target, 'ondigitalocean.app')) {
            return { name: 'DigitalOcean App Platform', category: 'cloud', description: 'Application hosting platform' };
        }
        
        // Cloudflare
        if (this.isDomainOrSubdomain(target, 'cloudflare.com')) {
            return { name: 'Cloudflare', category: 'cloud', description: 'CDN and security services' };
        }
        
        return null; // No infrastructure detected
    }
    
    // Use primary service detection for CNAME targets
    detectCNAMEService(cnameTarget) {
        return this.detectPrimaryService(cnameTarget);
    }

    // Query DNS with fallback strategy
    async queryDNS(domain, type = 'A', server = null) {
        await this.rateLimiter.throttle();
        this.stats.dnsQueries++;

        console.log(`🔍 Querying DNS for ${domain}${type ? ` (${type})` : ' (any type)'}`);
        
        // If specific server is requested, use only that
        if (server) {
            console.log(`  📡 Using specified DNS server: ${server}`);
            try {
                const response = await this.queryDNSServer(domain, type, server);
                if (response && response.Answer && response.Answer.length > 0) {
                    console.log(`  ✅ DNS server ${server} succeeded with ${response.Answer.length} records`);
                    return response.Answer;
                } else {
                    console.log(`  ⚠️  DNS server ${server} returned no records`);
                    return null;
                }
            } catch (error) {
                console.warn(`  ❌ DNS server ${server} failed:`, error.message);
                return null;
            }
        }
        
        // Try primary DNS servers first
        console.log(`  🔄 Trying PRIMARY DNS servers...`);
        let validResponseReceived = false;
        
        for (const dnsServer of this.primaryDNSServers) {
            console.log(`    📡 Trying PRIMARY DNS server: ${dnsServer}`);
            
            try {
                const response = await this.queryDNSServer(domain, type, dnsServer);
                if (response) {
                    validResponseReceived = true; // We got a valid DNS response
                    
                    if (response.Answer && response.Answer.length > 0) {
                        console.log(`    ✅ PRIMARY DNS server ${dnsServer} succeeded with ${response.Answer.length} records`);
                        return response.Answer; // Return immediately on success
                    } else {
                        // Valid response but no records (normal for missing record types)
                        console.log(`    ℹ️  PRIMARY DNS server ${dnsServer} confirmed no ${type} records exist`);
                        return null; // Don't try other servers - this is the authoritative answer
                    }
                }
            } catch (error) {
                console.warn(`    ❌ PRIMARY DNS server ${dnsServer} failed:`, error.message);
                continue; // Try next primary server only on actual failure
            }
        }
        
        // Only try backup servers if ALL primary servers actually failed (not just returned no records)
        if (!validResponseReceived && this.fallbackDNSServers.length > 0) {
            console.log(`  🚨 All PRIMARY DNS servers failed, trying BACKUP servers...`);
            for (const dnsServer of this.fallbackDNSServers) {
                console.log(`    📡 Trying BACKUP DNS server: ${dnsServer}`);
                
                try {
                    const response = await this.queryDNSServer(domain, type, dnsServer);
                    if (response && response.Answer && response.Answer.length > 0) {
                        console.log(`    ✅ BACKUP DNS server ${dnsServer} succeeded with ${response.Answer.length} records`);
                        return response.Answer; // Return immediately on success
                    } else {
                        console.log(`    ⚠️  BACKUP DNS server ${dnsServer} returned no records`);
                    }
                } catch (error) {
                    console.warn(`    ❌ BACKUP DNS server ${dnsServer} failed:`, error.message);
                    continue; // Try next backup server
                }
            }
        }
        
        console.log(`  ℹ️  No DNS records found for ${domain}${type ? ` (${type})` : ''} - this is normal for some record types`);
        return null;
    }

    // Query specific DNS server
    async queryDNSServer(domain, type, server) {
        try {
            // SECURITY FIX: Extract hostname from URL and use isDomainOrSubdomain for DNS provider detection
            let serverHostname = server;
            try {
                const urlObj = new URL(server);
                serverHostname = urlObj.hostname;
            } catch (e) {
                // If not a valid URL, treat as hostname
                serverHostname = server;
            }
            
            if (this.isDomainOrSubdomain(serverHostname, 'dns.google')) {
                // Google DNS format
                const url = new URL(server);
                url.searchParams.set('name', domain);
                if (type) {
                    url.searchParams.set('type', type);
                }
                url.searchParams.set('do', 'true');
                
                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/dns-json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`DNS query failed: ${response.status}`);
                }
                
                return await response.json();
            } else if (this.isDomainOrSubdomain(serverHostname, 'cloudflare-dns.com')) {
                // Cloudflare DNS format
                const cloudflareUrl = `https://cloudflare-dns.com/dns-query?name=${domain}${type ? `&type=${type}` : ''}`;
                const response = await fetch(cloudflareUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/dns-json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`DNS query failed: ${response.status}`);
                }
                
                return await response.json();
            } else if (this.isDomainOrSubdomain(serverHostname, 'doh.pub')) {
                // DoH.pub format
                const dohUrl = `https://doh.pub/dns-query?name=${domain}&type=${type}`;
                const response = await fetch(dohUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/dns-json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`DNS query failed: ${response.status}`);
                }
                
                return await response.json();
            } else if (this.isDomainOrSubdomain(serverHostname, 'dns.alidns.com')) {
                // Alibaba DNS format
                const alibabaUrl = `https://dns.alidns.com/resolve?name=${domain}&type=${type}`;
                const response = await fetch(alibabaUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/dns-json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`DNS query failed: ${response.status}`);
                }
                
                return await response.json();
            } else if (this.isDomainOrSubdomain(serverHostname, 'doh.powerdns.org')) {
                // PowerDNS format (fallback server)
                const url = new URL(server);
                url.searchParams.set('name', domain);
                if (type) {
                    url.searchParams.set('type', type);
                }
                
                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/dns-json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`DNS query failed: ${response.status}`);
                }
                
                return await response.json();
            } else {
                throw new Error(`Unsupported DNS server: ${server}`);
            }
        } catch (error) {
            console.warn(`Failed to query ${server}:`, error);
            throw error;
        }
    }

    // Analyze main domain records
    async analyzeMainDomain(domain) {
        const results = {
            domain: domain,
            records: {},
            services: []
        };

        // First, do a default query (A record) to discover if it's A or CNAME
        console.log(`🔍 Checking primary record type for ${domain}...`);
        try {
            const primaryRecords = await this.queryDNS(domain); // Defaults to 'A' type
            if (primaryRecords && primaryRecords.length > 0) {
                // Group records by type - this will include CNAME chain if it exists
                const recordsByType = {};
                const foundTypes = new Set();
                
                for (const record of primaryRecords) {
                    // Skip DNSSEC signature records (RRSIG) - they're returned with do=true but we don't need to display them
                    if (record.type === 46) { // RRSIG
                        continue;
                    }
                    const typeName = this.getRecordTypeName(record.type);
                    if (!recordsByType[typeName]) {
                        recordsByType[typeName] = [];
                    }
                    recordsByType[typeName].push(record);
                    foundTypes.add(typeName);
                }
                
                console.log(`  📋 Primary query found: ${Array.from(foundTypes).join(', ')}`);
                results.records = recordsByType;
                
                // Now query for other important record types (AAAA, TXT, MX, NS, CAA, SOA)
                // Skip CNAME since we already know from the primary query if it exists
                const otherTypes = ['AAAA', 'TXT', 'MX', 'NS', 'CAA', 'SOA'];
                for (const type of otherTypes) {
                    try {
                        const records = await this.queryDNS(domain, type);
                        if (records && records.length > 0) {
                            results.records[type] = records;
                        }
                    } catch (error) {
                        console.warn(`Failed to query ${type} records for ${domain}:`, error);
                    }
                }
                
            } else {
                // Fallback: If primary query returns nothing, try specific types
                console.log(`  ⚠️  Primary query returned no records, trying specific types...`);
                await this.querySpecificRecordTypes(domain, results);
            }
        } catch (error) {
            console.warn(`Primary DNS query failed for ${domain}, falling back to specific queries:`, error.message);
            await this.querySpecificRecordTypes(domain, results);
        }

        // Query SPF and DMARC records
        try {
            const spfRecords = await this.queryDNS(domain, 'TXT');
            if (spfRecords) {
                const spf = spfRecords.filter(record => 
                    record.data.includes('v=spf1')
                );
                if (spf.length > 0) {
                    results.records['SPF'] = spf;
                }
            }
        } catch (error) {
            console.warn('Failed to query SPF records:', error);
        }

        try {
            const dmarcRecords = await this.queryDNS(`_dmarc.${domain}`, 'TXT');
            if (dmarcRecords) {
                const dmarc = dmarcRecords.filter(record => 
                    record.data.includes('v=DMARC1')
                );
                if (dmarc.length > 0) {
                    results.records['DMARC'] = dmarc;
                }
            }
        } catch (error) {
            console.warn('Failed to query DMARC records:', error);
        }

        // Query DKIM records using common selectors
        try {
            const dkimRecords = await this.queryDKIMRecords(domain);
            if (dkimRecords.length > 0) {
                results.records['DKIM'] = dkimRecords;
            }
        } catch (error) {
            console.warn('Failed to query DKIM records:', error);
        }

        // Query SRV records for service discovery
        try {
            const srvRecords = await this.querySRVRecords(domain);
            if (srvRecords.length > 0) {
                results.records['SRV'] = srvRecords;
            }
        } catch (error) {
            console.warn('Failed to query SRV records:', error);
        }

        return results;
    }

    // Get subdomains from multiple sources (real-time version)
    async getSubdomainsFromCT(domain) {
        console.log(`🔍 Starting optimized subdomain discovery for ${domain}`);
        
        // Phase 1: Start ALL sources in parallel (no waiting)
        // Sources: crt.sh (CT logs), HackerTarget (DNS), SSLMate (CT logs), THC (reverse DNS)
        const discoveryPromises = [
            this.queryCrtSh(domain),
            this.queryHackerTarget(domain),
            this.queryCertSpotter(domain),
            this.queryTHC(domain)
        ];
        
        // Phase 2: Wait for all sources with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Discovery timeout')), 90000)
        );
        
        try {
            await Promise.race([
                Promise.allSettled(discoveryPromises),
                timeoutPromise
            ]);
        } catch (error) {
            console.warn(`⚠️ Discovery timeout: ${error.message}`);
        }
        
        // Phase 3: Process everything from unified queue
        return this.processDiscoveryQueue();
    }
    
    // Process discovery queue sequentially
    async processDiscoveryQueue() {
        const results = [];
        const total = this.discoveryQueue.discoveredSubdomains.size;
        
        console.log(`⚡ Processing ${total} discovered subdomains sequentially...`);
        
        while (this.discoveryQueue.processingQueue.length > 0) {
            const subdomain = this.discoveryQueue.getNextToProcess();
            
            // Update progress via callbacks
            const progress = this.discoveryQueue.getProgress();
            this.notifyProgressUpdate(progress);
            
            try {
                // Process single subdomain
                const result = await this.analyzeSingleSubdomain(subdomain);
                
                // Add source information from discovery queue
                const discoveryInfo = this.discoveryQueue?.discoveredSubdomains?.get(subdomain);
                if (discoveryInfo && discoveryInfo.sources) {
                    result.sources = discoveryInfo.sources;
                } else {
                    result.sources = ['discovery'];
                }
                
                this.discoveryQueue.markCompleted(subdomain, result);
                results.push(result);
                
            } catch (error) {
                console.warn(`❌ Failed to process ${subdomain}:`, error.message);
                const discoveryInfo = this.discoveryQueue?.discoveredSubdomains?.get(subdomain);
                this.discoveryQueue.markCompleted(subdomain, {
                    subdomain: subdomain,
                    status: 'error',
                    error: error.message,
                    sources: discoveryInfo?.sources || ['discovery']
                });
            }
        }
        
        console.log(`✅ Processed ${results.length} subdomains from discovery queue`);
        return results;
    }
    
    // Notify progress updates
    notifyProgressUpdate(progress) {
        this.apiCallbacks.forEach(callback => {
            try {
                callback('Discovery Progress', 'info', 
                    `Processing: ${progress.processed}/${progress.total} subdomains (${progress.remaining} remaining)`
                );
            } catch (error) {
                console.warn('Progress callback error:', error);
            }
        });
    }
    
    // Query crt.sh for subdomains
    async queryCrtSh(domain) {
        console.log(`  📡 Querying crt.sh for subdomains...`);
        this.stats.apiCalls++;
        
        try {
            // Try with different CORS modes
            let response = null;
            try {
                // First try with explicit CORS mode
                response = await fetch(`https://crt.sh/?q=%25.${domain}&output=json`, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
            } catch (corsError) {
                console.log(`    ⚠️  CORS error with crt.sh, trying without mode:`, corsError.message);
                // Try without explicit mode
                response = await fetch(`https://crt.sh/?q=%25.${domain}&output=json`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
            }
            
            if (!response.ok) {
                const errorMsg = `Service unavailable (${response.status})`;
                this.notifyAPIStatus('crt.sh', 'error', errorMsg);
                throw new Error(`CT query failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`    📊 crt.sh returned ${data.length} entries`);
            
            // Process entries and add to discovery queue
            let processedCount = 0;
            let addedCount = 0;
            let wildcardCount = 0;
            for (const entry of data) {
                const nameValue = entry.name_value;
                if (nameValue) {
                    // Handle case where name_value contains multiple domains/subdomains separated by newlines or commas
                    const domains = nameValue.split(/\n|,/).map(s => s.trim()).filter(s => s);
                    
                    for (const dnsName of domains) {
                        // Check if this is a wildcard certificate
                        if (dnsName.includes('*') && (dnsName.endsWith(`.${domain}`) || dnsName === `*.${domain}`)) {
                            // Collect wildcard certificate
                            const wildcardCert = {
                                domain: dnsName,
                                issuer: entry.issuer_name || 'Unknown',
                                source: 'crt.sh',
                                notBefore: entry.not_before || null,
                                notAfter: entry.not_after || null,
                                certificateId: entry.id || entry.certificate_id || null
                            };
                            
                            // Check if we already have this wildcard cert (avoid duplicates)
                            const isDuplicate = this.wildcardCertificates.some(cert => 
                                cert.domain === wildcardCert.domain && 
                                cert.certificateId === wildcardCert.certificateId
                            );
                            
                            if (!isDuplicate) {
                                this.wildcardCertificates.push(wildcardCert);
                                wildcardCount++;
                            }
                        } else if (!dnsName.startsWith('*.') && dnsName.endsWith(`.${domain}`) && dnsName !== domain) {
                            // Regular subdomain - add to discovery queue
                            processedCount++;
                            // Check if this subdomain was actually added (not a duplicate)
                            const beforeCount = this.discoveryQueue.discoveredSubdomains.size;
                            this.discoveryQueue.addDiscovered(dnsName, 'crt.sh');
                            const afterCount = this.discoveryQueue.discoveredSubdomains.size;
                            if (afterCount > beforeCount) {
                                addedCount++;
                            }
                        }
                    }
                }
            }
            
            console.log(`    ✅ crt.sh: Processed ${processedCount} entries, added ${addedCount} unique subdomains to discovery queue, collected ${wildcardCount} wildcard certificates`);
            this.notifyAPIStatus('crt.sh', 'success', `Found ${addedCount} unique subdomains from ${processedCount} entries`);
            
        } catch (error) {
            console.log(`    ❌ crt.sh failed:`, error.message);
            this.notifyAPIStatus('crt.sh', 'error', error.message);
        }
    }

    // Query SSLMate CT Search API (formerly Cert Spotter) for subdomains
    async queryCertSpotter(domain) {
        console.log(`  📡 Querying SSLMate CT Search API for subdomains...`);
        this.stats.apiCalls++;
        
        try {
            // New API endpoint: https://api.certspotter.com/v1/issuances
            // Documentation: https://sslmate.com/help/reference/ct_search_api_v1
            const response = await fetch(`https://api.certspotter.com/v1/issuances?domain=${domain}&include_subdomains=true&expand=dns_names`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorMsg = `Service unavailable (${response.status})`;
                this.notifyAPIStatus('SSLMate CT Search', 'error', errorMsg);
                throw new Error(`SSLMate CT Search query failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`    📊 SSLMate CT Search returned ${data.length} certificate issuances`);
            
            // Process entries and add to discovery queue
            let processedCount = 0;
            let addedCount = 0;
            let wildcardCount = 0;
            for (const issuance of data) {
                if (issuance.dns_names) {
                    for (const dnsName of issuance.dns_names) {
                        // Check if this is a wildcard certificate
                        if (dnsName.includes('*') && (dnsName.endsWith(`.${domain}`) || dnsName === `*.${domain}` || dnsName === domain)) {
                            // Collect wildcard certificate
                            const wildcardCert = {
                                domain: dnsName,
                                issuer: issuance.issuer_name || issuance.issuer?.name || 'Unknown',
                                source: 'SSLMate CT Search',
                                notBefore: issuance.not_before || null,
                                notAfter: issuance.not_after || null,
                                certificateId: issuance.id || null
                            };
                            
                            // Check if we already have this wildcard cert (avoid duplicates)
                            const isDuplicate = this.wildcardCertificates.some(cert => 
                                cert.domain === wildcardCert.domain && 
                                cert.certificateId === wildcardCert.certificateId
                            );
                            
                            if (!isDuplicate) {
                                this.wildcardCertificates.push(wildcardCert);
                                wildcardCount++;
                            }
                        } else if (dnsName.endsWith(`.${domain}`) && dnsName !== domain && !dnsName.includes('*')) {
                            // Regular subdomain - add to discovery queue
                            processedCount++;
                            // Check if this subdomain was actually added (not a duplicate)
                            const beforeCount = this.discoveryQueue.discoveredSubdomains.size;
                            this.discoveryQueue.addDiscovered(dnsName, 'SSLMate CT Search');
                            const afterCount = this.discoveryQueue.discoveredSubdomains.size;
                            if (afterCount > beforeCount) {
                                addedCount++;
                            }
                        }
                    }
                }
            }
            
            console.log(`    ✅ SSLMate CT Search: Processed ${processedCount} entries, added ${addedCount} unique subdomains to discovery queue, collected ${wildcardCount} wildcard certificates`);
            this.notifyAPIStatus('SSLMate CT Search', 'success', `Found ${addedCount} unique subdomains from ${processedCount} entries`);
            
        } catch (error) {
            console.log(`    ❌ SSLMate CT Search failed:`, error.message);
            this.notifyAPIStatus('SSLMate CT Search', 'error', error.message);
        }
    }




    // Query HackerTarget for subdomains
    async queryHackerTarget(domain) {
        console.log(`  📡 Querying HackerTarget for subdomains...`);
        this.stats.apiCalls++;
        
        try {
            const response = await fetch(`https://api.hackertarget.com/hostsearch/?q=${domain}`, {
                method: 'GET',
                headers: {
                    'Accept': 'text/plain'
                }
            });
            
            if (!response.ok) {
                const errorMsg = `Service unavailable (${response.status})`;
                this.notifyAPIStatus('HackerTarget', 'error', errorMsg);
                throw new Error(`HackerTarget query failed: ${response.status}`);
            }
            
            const data = await response.text();
            console.log(`    📊 HackerTarget returned ${data.split('\n').length} entries`);
            
            // Process entries and add to discovery queue
            let processedCount = 0;
            let addedCount = 0;
            const lines = data.split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    const parts = line.split(',');
                    if (parts.length >= 1) {
                        const subdomain = parts[0].trim();
                        if (subdomain && subdomain.endsWith(`.${domain}`) && subdomain !== domain) {
                            processedCount++;
                            // Check if this subdomain was actually added (not a duplicate)
                            const beforeCount = this.discoveryQueue.discoveredSubdomains.size;
                            this.discoveryQueue.addDiscovered(subdomain, 'HackerTarget');
                            const afterCount = this.discoveryQueue.discoveredSubdomains.size;
                            if (afterCount > beforeCount) {
                                addedCount++;
                            }
                        }
                    }
                }
            }
            
            console.log(`    ✅ HackerTarget: Processed ${processedCount} entries, added ${addedCount} unique subdomains to discovery queue`);
            this.notifyAPIStatus('HackerTarget', 'success', `Found ${addedCount} unique subdomains from ${processedCount} entries`);
            
        } catch (error) {
            console.log(`    ❌ HackerTarget failed:`, error.message);
            this.notifyAPIStatus('HackerTarget', 'error', error.message);
        }
    }

    // Query THC ip.thc.org API for subdomains (reverse DNS data)
    // Documentation: https://ip.thc.org/docs/API/subdomain-lookup
    async queryTHC(domain) {
        console.log(`  📡 Querying THC ip.thc.org for subdomains...`);
        this.stats.apiCalls++;
        
        try {
            const response = await fetch('https://ip.thc.org/api/v1/lookup/subdomains', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    domain: domain,
                    limit: 500 // Get up to 500 subdomains per request
                })
            });
            
            if (!response.ok) {
                const errorMsg = `Service unavailable (${response.status})`;
                this.notifyAPIStatus('THC Reverse DNS', 'error', errorMsg);
                throw new Error(`THC query failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Check for API error response
            if (data.status === 'error') {
                throw new Error(data.error || 'Unknown API error');
            }
            
            const totalMatching = data.matching_records || 0;
            const domains = data.domains || [];
            console.log(`    📊 THC returned ${domains.length} entries (${totalMatching} total matching)`);
            
            // Process entries and add to discovery queue
            let processedCount = 0;
            let addedCount = 0;
            for (const entry of domains) {
                const subdomain = entry.domain;
                if (subdomain && subdomain.endsWith(`.${domain}`) && subdomain !== domain) {
                    processedCount++;
                    // Check if this subdomain was actually added (not a duplicate)
                    const beforeCount = this.discoveryQueue.discoveredSubdomains.size;
                    this.discoveryQueue.addDiscovered(subdomain, 'THC Reverse DNS');
                    const afterCount = this.discoveryQueue.discoveredSubdomains.size;
                    if (afterCount > beforeCount) {
                        addedCount++;
                    }
                }
            }
            
            console.log(`    ✅ THC: Processed ${processedCount} entries, added ${addedCount} unique subdomains to discovery queue`);
            this.notifyAPIStatus('THC Reverse DNS', 'success', `Found ${addedCount} unique subdomains from ${processedCount} entries (${totalMatching} total in database)`);
            
        } catch (error) {
            console.log(`    ❌ THC failed:`, error.message);
            this.notifyAPIStatus('THC Reverse DNS', 'error', error.message);
        }
    }

    // Query DKIM records using common selectors
    async queryDKIMRecords(domain) {
        const dkimRecords = [];
        
        // Common DKIM selectors used by various email services
        const commonSelectors = [
            // Generic/Default selectors
            'default', 'dkim', 'key1', 'key2',
            
            // Google Workspace / Gmail
            'google', '20161025', '20210112',
            
            // Microsoft Office 365 / Outlook
            'selector1', 'selector2',
            
            // iCloud / Apple Mail
            'sig1', 'sig2', 'sig3',
            
            // SendGrid
            's1', 's2', 'em1', 'em2', 'em3', 'em4', 'em5', 'em6', 'em7', 'em8', 'em9', 'em10',
            'emshared1', 'emshared2', 'emshared3',
            
            // Mailchimp
            'k1', 'k2', 'k3', 'mc1', 'mc2', 'mc3',
            
            // Amazon SES
            'amazonses', 'ses', 'aws-ses',
            
            // Mandrill (Mailchimp Transactional)
            'mandrill', 'mte1', 'mte2',
            
            // Postmark
            'pm', 'postmark', 'pm1', 'pm2',
            
            // SparkPost / MessageSystems
            'sp', 'sparkpost', 'scph0316', 'scph0817',
            
            // Constant Contact
            'constantcontact', 'cc1', 'cc2',
            
            // Campaign Monitor
            'cm', 'campaignmonitor', 'cm1', 'cm2',
            
            // Zendesk
            'zendesk1', 'zendesk2', 'zendeskverification',
            
            // HubSpot
            'hs1-', 'hs2-', 'hsdomainkey1', 'hsdomainkey2',
            
            // Salesforce / ExactTarget
            'et', 'sf', 'exacttarget', 'sfmc1', 'sfmc2',
            
            // MailGun
            'mg', 'mailgun', 'mg1', 'mg2',
            
            // Klaviyo
            'dkim', 'klaviyo1', 'klaviyo2',
            
            // ConvertKit
            'ck', 'convertkit', 'ck1', 'ck2'
        ];

        console.log(`🔍 Querying DKIM records for ${domain} using ${commonSelectors.length} common selectors...`);
        
        // Try each selector
        for (const selector of commonSelectors) {
            try {
                const dkimSubdomain = `${selector}._domainkey.${domain}`;
                console.log(`  📡 Checking DKIM selector: ${dkimSubdomain}`);
                
                const records = await this.queryDNS(dkimSubdomain, 'TXT');
                if (records && records.length > 0) {
                    // Check if there's a CNAME chain before the TXT record
                    let cnameChain = [];
                    let txtRecord = null;
                    
                    for (const record of records) {
                        if (record.type === 5) { // CNAME record
                            cnameChain.push({
                                from: record.name,
                                to: record.data,
                                ttl: record.TTL
                            });
                        } else if (this.isDKIMRecord(record.data)) {
                            // This is the final TXT record
                            txtRecord = record;
                        }
                    }
                    
                    // If we found a valid DKIM record, store it with CNAME info
                    if (txtRecord) {
                        const dkimInfo = {
                            ...txtRecord,
                            selector: selector,
                            subdomain: dkimSubdomain,
                            cnameChain: cnameChain.length > 0 ? cnameChain : null,
                            parsedInfo: this.parseDKIMRecord(txtRecord.data, selector)
                        };
                        
                        dkimRecords.push(dkimInfo);
                        if (cnameChain.length > 0) {
                            console.log(`  ✅ Found DKIM record with selector '${selector}' (via CNAME chain):`, dkimInfo.parsedInfo);
                        } else {
                            console.log(`  ✅ Found DKIM record with selector '${selector}':`, dkimInfo.parsedInfo);
                        }
                    }
                }
            } catch (error) {
                // Silently continue - most selectors won't exist
                console.log(`    ⚠️  Selector '${selector}' not found (normal)`);
            }
        }
        
        console.log(`📊 Found ${dkimRecords.length} DKIM records for ${domain}`);
        return dkimRecords;
    }

    // Check if a TXT record is a valid DKIM record
    isDKIMRecord(data) {
        const lowerData = data.toLowerCase();
        return lowerData.includes('v=dkim1') || 
               lowerData.includes('k=rsa') || 
               lowerData.includes('p=') ||
               (lowerData.includes('v=') && lowerData.includes('p='));
    }

    // Parse DKIM record and extract useful information
    parseDKIMRecord(data, selector) {
        const info = {
            selector: selector,
            version: null,
            keyType: null,
            publicKey: null,
            service: null,
            flags: null,
            notes: null,
            possibleService: null
        };

        // Extract version
        const versionMatch = data.match(/v=([^;]+)/i);
        if (versionMatch) info.version = versionMatch[1];

        // Extract key type
        const keyTypeMatch = data.match(/k=([^;]+)/i);
        if (keyTypeMatch) info.keyType = keyTypeMatch[1];

        // Extract public key (truncated for display)
        const publicKeyMatch = data.match(/p=([^;]+)/i);
        if (publicKeyMatch) {
            const fullKey = publicKeyMatch[1];
            info.publicKey = fullKey.length > 50 ? fullKey.substring(0, 50) + '...' : fullKey;
        }

        // Extract service type
        const serviceMatch = data.match(/s=([^;]+)/i);
        if (serviceMatch) info.service = serviceMatch[1];

        // Extract flags
        const flagsMatch = data.match(/t=([^;]+)/i);
        if (flagsMatch) info.flags = flagsMatch[1];

        // Extract notes
        const notesMatch = data.match(/n=([^;]+)/i);
        if (notesMatch) info.notes = notesMatch[1];

        // Identify possible email service based on selector
        info.possibleService = this.identifyEmailServiceFromSelector(selector);

        return info;
    }

    // Identify email service based on DKIM selector patterns
    identifyEmailServiceFromSelector(selector) {
        const lowerSelector = selector.toLowerCase();
        
        // Google Workspace / Gmail patterns
        if (lowerSelector.includes('google') || 
            /^\d{8}$/.test(lowerSelector) || // 8-digit dates like 20161025
            lowerSelector === 'default') {
            return { name: 'Google Workspace', category: 'email-service', confidence: 'medium' };
        }
        
        // iCloud / Apple Mail patterns
        if (lowerSelector.startsWith('sig') && /^sig\d+$/.test(lowerSelector)) {
            return { name: 'iCloud Mail', category: 'email-service', confidence: 'high' };
        }
        
        // Microsoft Office 365 patterns (more specific to avoid false positives)
        if (lowerSelector === 'selector1' || 
            lowerSelector === 'selector2' ||
            lowerSelector.startsWith('selector1-') ||
            lowerSelector.startsWith('selector2-')) {
            return { name: 'Microsoft Office 365', category: 'email-service', confidence: 'medium' };
        }
        
        // SendGrid patterns
        if (lowerSelector.startsWith('s') && /^s\d+$/.test(lowerSelector) ||
            lowerSelector.startsWith('em') ||
            lowerSelector.includes('emshared')) {
            return { name: 'SendGrid', category: 'email-service', confidence: 'high' };
        }
        
        // Mailchimp patterns
        if (lowerSelector.startsWith('k') && /^k\d+$/.test(lowerSelector) ||
            lowerSelector.startsWith('mc')) {
            return { name: 'Mailchimp', category: 'email-service', confidence: 'high' };
        }
        
        // Amazon SES patterns
        if (lowerSelector.includes('amazonses') || 
            lowerSelector.includes('ses') ||
            lowerSelector.includes('aws-ses')) {
            return { name: 'Amazon SES', category: 'email-service', confidence: 'high' };
        }
        
        // Mandrill patterns
        if (lowerSelector.includes('mandrill') || 
            lowerSelector.startsWith('mte')) {
            return { name: 'Mandrill (Mailchimp Transactional)', category: 'email-service', confidence: 'high' };
        }
        
        // Postmark patterns
        if (lowerSelector.includes('postmark') || 
            lowerSelector.startsWith('pm')) {
            return { name: 'Postmark', category: 'email-service', confidence: 'high' };
        }
        
        // SparkPost patterns
        if (lowerSelector.includes('sparkpost') || 
            lowerSelector.startsWith('sp') ||
            lowerSelector.includes('scph')) {
            return { name: 'SparkPost', category: 'email-service', confidence: 'high' };
        }
        
        // HubSpot patterns
        if (lowerSelector.includes('hs') || 
            lowerSelector.includes('hubspot')) {
            return { name: 'HubSpot', category: 'email-service', confidence: 'high' };
        }
        
        // Salesforce patterns
        if (lowerSelector.includes('exacttarget') || 
            lowerSelector.includes('sfmc') ||
            lowerSelector.startsWith('et') ||
            lowerSelector.startsWith('sf')) {
            return { name: 'Salesforce Marketing Cloud', category: 'email-service', confidence: 'medium' };
        }
        
        // MailGun patterns
        if (lowerSelector.includes('mailgun') || 
            lowerSelector.startsWith('mg')) {
            return { name: 'Mailgun', category: 'email-service', confidence: 'high' };
        }
        
        // Klaviyo patterns
        if (lowerSelector.includes('klaviyo')) {
            return { name: 'Klaviyo', category: 'email-service', confidence: 'high' };
        }
        
        // ConvertKit patterns
        if (lowerSelector.includes('convertkit') || 
            lowerSelector.startsWith('ck')) {
            return { name: 'ConvertKit', category: 'email-service', confidence: 'medium' };
        }
        
        // Zendesk patterns
        if (lowerSelector.includes('zendesk')) {
            return { name: 'Zendesk', category: 'email-service', confidence: 'high' };
        }
        
        return null;
    }

    // Query SRV records using comprehensive service patterns
    async querySRVRecords(domain) {
        const srvRecords = [];
        
        // Comprehensive list of common SRV service patterns
        const srvServices = [
            // Communication Services
            '_sip._tcp', '_sip._udp', '_sips._tcp',
            '_xmpp-server._tcp', '_xmpp-client._tcp',
            '_jabber._tcp', '_jabber-client._tcp',
            
            // Email Services
            '_submission._tcp', '_imap._tcp', '_imaps._tcp',
            '_pop3._tcp', '_pop3s._tcp', '_smtp._tcp',
            
            // Enterprise/Directory Services
            '_ldap._tcp', '_ldaps._tcp', '_ldap._udp',
            '_kerberos._tcp', '_kerberos._udp', '_kpasswd._tcp',
            '_kerberos-master._tcp', '_kerberos-adm._tcp',
            
            // Calendar and Contact Services
            '_caldav._tcp', '_caldavs._tcp', '_carddav._tcp', '_carddavs._tcp',
            
            // Microsoft Services
            '_autodiscover._tcp', '_msrpc._tcp', '_gc._tcp',
            '_kerberos-iv._udp', '_ldap._msdcs',
            
            // File Transfer Services
            '_ftp._tcp', '_ftps._tcp', '_sftp._tcp',
            
            // Voice/Video Services
            '_h323cs._tcp', '_h323be._tcp', '_h323ls._tcp',
            '_sip._tls', '_turn._tcp', '_turn._udp',
            '_stun._tcp', '_stun._udp',
            
            // Web Services
            '_http._tcp', '_https._tcp', '_www._tcp',
            '_webdav._tcp', '_webdavs._tcp',
            
            // Database Services
            '_mysql._tcp', '_pgsql._tcp', '_mongodb._tcp',
            
            // Messaging Services
            '_matrix._tcp', '_matrix-fed._tcp',
            '_irc._tcp', '_ircs._tcp',
            
            // Network Services
            '_ntp._udp', '_snmp._udp', '_tftp._udp',
            '_dns._tcp', '_dns._udp',
            
            // Printing Services
            '_ipp._tcp', '_ipps._tcp', '_printer._tcp',
            
            // Discovery Services
            '_device-info._tcp', '_workstation._tcp',
            '_adisk._tcp', '_afpovertcp._tcp',
            
            // Game Services
            '_minecraft._tcp', '_teamspeak._udp',
            
            // IoT/Smart Home
            '_homekit._tcp', '_hap._tcp', '_airplay._tcp'
        ];

        console.log(`🔍 Querying SRV records for ${domain} using ${srvServices.length} service patterns...`);
        
        // Query each SRV service pattern
        for (const service of srvServices) {
            try {
                const srvSubdomain = `${service}.${domain}`;
                console.log(`  📡 Checking SRV service: ${srvSubdomain}`);
                
                const records = await this.queryDNS(srvSubdomain, 'SRV');
                if (records && records.length > 0) {
                    for (const record of records) {
                        // Parse SRV record data: priority weight port target
                        const srvInfo = this.parseSRVRecord(record.data, service, srvSubdomain);
                        if (srvInfo) {
                            const enhancedRecord = {
                                ...record,
                                service: service,
                                subdomain: srvSubdomain,
                                parsedInfo: srvInfo
                            };
                            
                            srvRecords.push(enhancedRecord);
                            console.log(`  ✅ Found SRV record for '${service}':`, srvInfo);
                        }
                    }
                }
            } catch (error) {
                // Silently continue - most SRV services won't exist
                console.log(`    ⚠️  SRV service '${service}' not found (normal)`);
            }
        }
        
        console.log(`📊 Found ${srvRecords.length} SRV records for ${domain}`);
        return srvRecords;
    }

    // Parse SRV record and extract service information
    parseSRVRecord(data, service, subdomain) {
        // SRV record format: priority weight port target
        const parts = data.trim().split(/\s+/);
        if (parts.length < 4) return null;
        
        const info = {
            service: service,
            subdomain: subdomain,
            priority: parseInt(parts[0]) || 0,
            weight: parseInt(parts[1]) || 0,
            port: parseInt(parts[2]) || 0,
            target: parts[3].replace(/\.$/, ''),
            serviceType: this.identifyServiceType(service),
            description: this.getSRVServiceDescription(service)
        };

        return info;
    }

    // Identify service type from SRV service name
    identifyServiceType(service) {
        const lowerService = service.toLowerCase();
        
        // Communication services
        if (lowerService.includes('sip') || lowerService.includes('xmpp') || lowerService.includes('jabber')) {
            return { name: 'Communication', category: 'communication', description: 'Voice/messaging communication service' };
        }
        
        // Email services
        if (lowerService.includes('imap') || lowerService.includes('pop3') || lowerService.includes('smtp') || lowerService.includes('submission')) {
            return { name: 'Email', category: 'email', description: 'Email service' };
        }
        
        // Directory services
        if (lowerService.includes('ldap') || lowerService.includes('kerberos')) {
            return { name: 'Directory', category: 'directory', description: 'Directory/authentication service' };
        }
        
        // Calendar/Contact services
        if (lowerService.includes('caldav') || lowerService.includes('carddav')) {
            return { name: 'Calendar/Contacts', category: 'productivity', description: 'Calendar and contact synchronization service' };
        }
        
        // Microsoft services
        if (lowerService.includes('autodiscover') || lowerService.includes('msrpc') || lowerService.includes('_gc')) {
            return { name: 'Microsoft', category: 'microsoft', description: 'Microsoft enterprise service' };
        }
        
        // File transfer
        if (lowerService.includes('ftp') || lowerService.includes('sftp')) {
            return { name: 'File Transfer', category: 'file-transfer', description: 'File transfer service' };
        }
        
        // Web services
        if (lowerService.includes('http') || lowerService.includes('www') || lowerService.includes('webdav')) {
            return { name: 'Web', category: 'web', description: 'Web service' };
        }
        
        // Default
        return { name: 'Other Service', category: 'other', description: 'Service discovered via SRV record' };
    }

    // Get description for SRV service
    getSRVServiceDescription(service) {
        const descriptions = {
            '_sip._tcp': 'SIP (Session Initiation Protocol) for VoIP over TCP',
            '_sip._udp': 'SIP (Session Initiation Protocol) for VoIP over UDP',
            '_sips._tcp': 'Secure SIP for encrypted VoIP',
            '_xmpp-server._tcp': 'XMPP server-to-server communication',
            '_xmpp-client._tcp': 'XMPP client connections',
            '_submission._tcp': 'Email submission service',
            '_imap._tcp': 'IMAP email access',
            '_imaps._tcp': 'Secure IMAP email access',
            '_ldap._tcp': 'LDAP directory service',
            '_ldaps._tcp': 'Secure LDAP directory service',
            '_kerberos._tcp': 'Kerberos authentication service',
            '_caldav._tcp': 'Calendar synchronization service',
            '_carddav._tcp': 'Contact synchronization service',
            '_autodiscover._tcp': 'Microsoft Exchange autodiscovery',
            '_matrix._tcp': 'Matrix messaging protocol',
            '_minecraft._tcp': 'Minecraft game server'
        };
        
        return descriptions[service] || `Service discovery record for ${service}`;
    }

    // Get ASN information for IP with multiple fallback sources - Enhanced for Data Sovereignty Analysis
    async getASNInfo(ip) {
        const providers = [
            {
                name: 'ipinfo.io',
                url: `https://ipinfo.io/${ip}/json`,
                transform: (data) => ({
                    asn: data.org || 'Unknown',
                    isp: data.org || 'Unknown',
                    location: data.country || 'Unknown',
                    city: data.city || 'Unknown',
                    // Enhanced data sovereignty fields
                    country: data.country || 'Unknown',
                    countryName: this.getCountryName(data.country) || 'Unknown',
                    region: data.region || 'Unknown',
                    timezone: data.timezone || 'Unknown',
                    coordinates: data.loc ? data.loc.split(',') : null,
                    postal: data.postal || 'Unknown'
                })
            },
            {
                name: 'ip-api.com',
                url: `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
                transform: (data) => ({
                    asn: data.as || 'Unknown',
                    isp: data.isp || 'Unknown',
                    location: data.countryCode || 'Unknown',
                    city: data.city || 'Unknown',
                    // Enhanced data sovereignty fields
                    country: data.countryCode || 'Unknown',
                    countryName: data.country || 'Unknown',
                    region: data.regionName || 'Unknown',
                    timezone: data.timezone || 'Unknown',
                    coordinates: (data.lat && data.lon) ? [data.lat, data.lon] : null,
                    postal: data.zip || 'Unknown'
                })
            },
            {
                name: 'ipapi.co',
                url: `https://ipapi.co/${ip}/json/`,
                transform: (data) => ({
                    asn: data.asn || 'Unknown',
                    isp: data.org || 'Unknown',
                    location: data.country_code || 'Unknown',
                    city: data.city || 'Unknown',
                    // Enhanced data sovereignty fields
                    country: data.country_code || 'Unknown',
                    countryName: data.country_name || 'Unknown',
                    region: data.region || 'Unknown',
                    timezone: data.timezone || 'Unknown',
                    coordinates: (data.latitude && data.longitude) ? [data.latitude, data.longitude] : null,
                    postal: data.postal || 'Unknown'
                })
            }
        ];

        let rateLimitedProviders = [];
        let lastError = null;

        for (const provider of providers) {
            // Skip providers already known to be rate-limited this session
            if (this.rateLimitedProviders.has(provider.name)) {
                rateLimitedProviders.push(provider.name);
                continue;
            }

            try {
                const response = await fetch(provider.url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': '3rdPartyTracer/1.0'
                    }
                });
                
                // Check for rate limit (429 Too Many Requests)
                if (response.status === 429) {
                    rateLimitedProviders.push(provider.name);
                    this.rateLimitedProviders.add(provider.name);
                    this.notifyAPIRateLimit(provider.name);
                    continue;
                }
                
                if (response.ok) {
                    const data = await response.json();
                    this.providerFailCounts.delete(provider.name);
                    if (rateLimitedProviders.length > 0) {
                        this.notifyAPIFallback(rateLimitedProviders, provider.name);
                    }
                    return provider.transform(data);
                } else {
                    // Non-429 error - log but continue to next provider
                    lastError = `HTTP ${response.status}`;
                    console.warn(`Failed to get ASN from ${provider.name}: HTTP ${response.status}`);
                }
            } catch (error) {
                lastError = error.message;
                console.warn(`Failed to get ASN from ${provider.name}:`, error.message);
                // Track consecutive failures per provider. After 3 failures, mark unavailable.
                // "Failed to fetch" can be CORS-blocked 429 or transient network issue.
                const failCount = (this.providerFailCounts.get(provider.name) || 0) + 1;
                this.providerFailCounts.set(provider.name, failCount);
                if (failCount >= 3) {
                    this.rateLimitedProviders.add(provider.name);
                    rateLimitedProviders.push(provider.name);
                    console.warn(`⛔ ${provider.name} marked as unavailable after ${failCount} consecutive failures — skipping for remainder of session`);
                    this.notifyAPIStatus(provider.name, 'error', `Unavailable after ${failCount} consecutive failures. Skipping for this session.`);
                }
                continue;
            }
        }
        
        // If all providers failed or were rate-limited, notify user
        if (rateLimitedProviders.length > 0) {
            this.notifyAPIAllRateLimited(rateLimitedProviders);
        } else if (lastError) {
            this.notifyAPIAllFailed();
        }
        
        // If all providers fail, return unknown
        return {
            asn: 'Unknown',
            isp: 'Unknown',
            location: 'Unknown',
            city: 'Unknown',
            country: 'Unknown',
            countryName: 'Unknown',
            region: 'Unknown',
            timezone: 'Unknown',
            coordinates: null,
            postal: 'Unknown'
        };
    }

    // Get Shodan InternetDB information for IP (ports, vulns, hostnames, CPEs, tags)
    // This is a FREE API - no authentication required, CORS compliant
    async getShodanInternetDBInfo(ip) {
        // Validate IP format (IPv4 only for InternetDB)
        if (!ip || typeof ip !== 'string') {
            return null;
        }
        
        // Basic IPv4 validation
        const ipParts = ip.split('.');
        if (ipParts.length !== 4 || ipParts.some(p => isNaN(parseInt(p)) || parseInt(p) < 0 || parseInt(p) > 255)) {
            console.warn(`⚠️ Invalid IP format for Shodan InternetDB: ${ip}`);
            return null;
        }
        
        // Skip private IPs (InternetDB won't have data for them)
        if (this.isPrivateIP(ip)) {
            console.log(`ℹ️ Skipping Shodan InternetDB lookup for private IP: ${ip}`);
            return null;
        }

        const url = `https://internetdb.shodan.io/${ip}`;
        
        try {
            console.log(`🔍 Querying Shodan InternetDB for: ${ip}`);
            this.stats.apiCalls++;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            // InternetDB returns 404 for IPs with no data - this is normal
            if (response.status === 404) {
                console.log(`ℹ️ No Shodan InternetDB data for IP: ${ip}`);
                return {
                    ip: ip,
                    ports: [],
                    hostnames: [],
                    cpes: [],
                    vulns: [],
                    tags: [],
                    hasData: false
                };
            }
            
            if (!response.ok) {
                console.warn(`⚠️ Shodan InternetDB returned ${response.status} for ${ip}`);
                return null;
            }
            
            const data = await response.json();
            
            // Normalize the response
            const result = {
                ip: data.ip || ip,
                ports: data.ports || [],
                hostnames: data.hostnames || [],
                cpes: data.cpes || [],
                vulns: data.vulns || [],
                tags: data.tags || [],
                hasData: true
            };
            
            // Log findings
            if (result.ports.length > 0) {
                console.log(`  ✅ Shodan InternetDB: ${ip} has ${result.ports.length} open ports: ${result.ports.slice(0, 5).join(', ')}${result.ports.length > 5 ? '...' : ''}`);
            }
            if (result.vulns.length > 0) {
                console.log(`  ⚠️ Shodan InternetDB: ${ip} has ${result.vulns.length} known vulnerabilities`);
            }
            if (result.hostnames.length > 0) {
                console.log(`  📝 Shodan InternetDB: ${ip} hostnames: ${result.hostnames.slice(0, 3).join(', ')}${result.hostnames.length > 3 ? '...' : ''}`);
            }
            
            return result;
            
        } catch (error) {
            console.warn(`⚠️ Shodan InternetDB lookup failed for ${ip}:`, error.message);
            return null;
        }
    }
    
    // Check if IP is private (RFC 1918); delegates to CommonUtils when available
    isPrivateIP(ip) {
        if (typeof CommonUtils !== 'undefined' && CommonUtils.isPrivateIPv4) {
            return CommonUtils.isPrivateIPv4(ip);
        }
        const parts = String(ip).split('.').map(p => parseInt(p, 10));
        if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return false;
        if (parts[0] === 10) return true;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        if (parts[0] === 192 && parts[1] === 168) return true;
        if (parts[0] === 127) return true;
        if (parts[0] === 169 && parts[1] === 254) return true;
        return false;
    }

    // Notify about API rate limit
    notifyAPIRateLimit(providerName) {
        this.notifyAPIStatus(providerName, 'error', 'Rate limit exceeded (429). Skipping for this session.');
    }

    // Notify about successful fallback after rate limits
    notifyAPIFallback(rateLimitedProviders, successfulProvider) {
        this.notifyAPIStatus(successfulProvider, 'warning', `Using as fallback (${rateLimitedProviders.join(', ')} unavailable).`);
    }

    // Notify when all providers are rate-limited
    notifyAPIAllRateLimited(rateLimitedProviders) {
        this.notifyAPIStatus('IP Geolocation', 'error', `All providers unavailable (${rateLimitedProviders.join(', ')}). Location data unavailable.`);
    }

    // Notify when all providers fail (non-rate-limit errors)
    notifyAPIAllFailed() {
        this.notifyAPIStatus('IP Geolocation', 'warning', 'All providers failed. Location data unavailable for some IPs.');
    }

    // Check IP against Spamhaus ZEN blocklist
    async checkIPAgainstSpamhausZEN(ip) {
        if (!ip || typeof ip !== 'string') {
            return null;
        }

        // Validate IP format
        const ipParts = ip.split('.');
        if (ipParts.length !== 4) {
            return null;
        }

        // Reverse IP for Spamhaus ZEN query (8.8.8.8 -> 8.8.8.8.zen.spamhaus.org)
        const reversedIP = ipParts.join('.');
        const queryDomain = `${reversedIP}.zen.spamhaus.org`;

        try {
            const records = await this.queryDNS(queryDomain, 'TXT');
            
            if (!records || records.length === 0) {
                // No records = IP is clean
                return { listed: false, blocklist: 'Spamhaus ZEN' };
            }

            // Parse TXT record to get blocklist codes
            const txtData = records[0].data || '';
            const codes = txtData.match(/127\.0\.0\.\d+/g) || [];
            
            if (codes.length === 0) {
                return { listed: false, blocklist: 'Spamhaus ZEN' };
            }

            // Map codes to blocklist names
            const blocklistMap = {
                '127.0.0.2': 'SBL (Spamhaus Block List)',
                '127.0.0.3': 'CSS (Spamhaus CSS)',
                '127.0.0.4': 'XBL (Exploits Block List)',
                '127.0.0.9': 'PBL (Policy Block List)',
                '127.0.0.10': 'PBL (Policy Block List)',
                '127.0.0.11': 'PBL (Policy Block List)'
            };

            const blocklists = codes.map(code => blocklistMap[code] || code).join(', ');
            
            return {
                listed: true,
                blocklist: 'Spamhaus ZEN',
                codes: codes,
                blocklists: blocklists,
                severity: codes.includes('127.0.0.4') ? 'high' : 'medium' // XBL is more serious
            };
        } catch (error) {
            console.warn(`Failed to check IP ${ip} against Spamhaus ZEN:`, error.message);
            return null;
        }
    }

    // Check domain against Spamhaus DBL blocklist
    async checkDomainAgainstSpamhausDBL(domain) {
        if (!domain || typeof domain !== 'string') {
            return null;
        }

        if (this.blockedBlocklists.has('Spamhaus DBL')) {
            return { listed: false, blocklist: 'Spamhaus DBL', error: 'Query blocked' };
        }

        // Query format: domain.dbl.spamhaus.org
        const queryDomain = `${domain}.dbl.spamhaus.org`;

        try {
            // DBL uses A records in the 127.0.1.x range (NOT TXT records)
            const records = await this.queryDNS(queryDomain, 'A');
            
            if (!records || records.length === 0) {
                // No records (NXDOMAIN) = domain is not listed
                return { listed: false, blocklist: 'Spamhaus DBL' };
            }

            // Parse A record - DBL returns 127.0.1.x codes
            const ip = records[0].data;
            if (!ip) {
                return { listed: false, blocklist: 'Spamhaus DBL' };
            }

            // Check for error codes (should NOT be treated as listings)
            // 127.255.255.252 = Typing error in DNSBL name
            // 127.255.255.254 = Anonymous query through public resolver
            // 127.255.255.255 = Excessive number of queries
            if (ip.startsWith('127.255.255.')) {
                this.blockedBlocklists.add('Spamhaus DBL');
                console.warn(`Spamhaus DBL returned error code ${ip} for ${domain} — skipping for remainder of session`);
                this.notifyAPIStatus('Spamhaus DBL', 'error', `Queries blocked (${ip}). Skipping for this session.`);
                return { listed: false, blocklist: 'Spamhaus DBL', error: ip };
            }

            // Valid DBL responses are in 127.0.1.x range
            if (!ip.startsWith('127.0.1.')) {
                return { listed: false, blocklist: 'Spamhaus DBL' };
            }

            // Map return codes to threat types (per Spamhaus documentation)
            const threatMap = {
                '127.0.1.2': 'Spam domain',
                '127.0.1.4': 'Phishing domain',
                '127.0.1.5': 'Malware domain',
                '127.0.1.6': 'Botnet C&C domain',
                '127.0.1.102': 'Abused legit spam',
                '127.0.1.103': 'Abused spammed redirector domain',
                '127.0.1.104': 'Abused legit phish',
                '127.0.1.105': 'Abused legit malware',
                '127.0.1.106': 'Abused legit botnet C&C',
                '127.0.1.255': 'IP queries prohibited'
            };

            // 127.0.1.255 means IP queries are prohibited (error, not a listing)
            if (ip === '127.0.1.255') {
                this.blockedBlocklists.add('Spamhaus DBL');
                console.warn(`Spamhaus DBL: IP queries prohibited for ${domain} — skipping for remainder of session`);
                this.notifyAPIStatus('Spamhaus DBL', 'error', 'IP queries prohibited. Skipping for this session.');
                return { listed: false, blocklist: 'Spamhaus DBL', error: ip };
            }

            const threat = threatMap[ip] || `Unknown code: ${ip}`;
            
            // High severity for malware, botnet C&C, and their abused variants
            const highSeverityCodes = ['127.0.1.5', '127.0.1.6', '127.0.1.105', '127.0.1.106'];
            const severity = highSeverityCodes.includes(ip) ? 'high' : 'medium';
            
            return {
                listed: true,
                blocklist: 'Spamhaus DBL',
                ip: ip,
                codes: [ip],
                threats: threat,
                severity: severity
            };
        } catch (error) {
            console.warn(`Failed to check domain ${domain} against Spamhaus DBL:`, error.message);
            return null;
        }
    }
    
    // ==========================================
    // M5: Additional Blocklist Integration
    // ==========================================
    
    // Check domain against SURBL (Spam URI Realtime Blocklists)
    async checkDomainAgainstSURBL(domain) {
        if (!domain || typeof domain !== 'string') {
            return null;
        }

        if (this.blockedBlocklists.has('SURBL')) {
            return { listed: false, blocklist: 'SURBL', error: 'Query blocked' };
        }

        // Query format: domain.multi.surbl.org
        const queryDomain = `${domain}.multi.surbl.org`;

        try {
            const records = await this.queryDNS(queryDomain, 'A');
            
            if (!records || records.length === 0) {
                return { listed: false, blocklist: 'SURBL' };
            }

            // Parse A record to get blocklist codes
            const ip = records[0].data;
            if (!ip || !ip.startsWith('127.0.0.')) {
                return { listed: false, blocklist: 'SURBL' };
            }

            const lastOctet = parseInt(ip.split('.')[3], 10);
            
            // SURBL uses bitmask in last octet (per multi.surbl.org documentation)
            // Bit positions: 4=DM, 8=PH, 16=MW, 32=CT, 64=ABUSE, 128=CR
            const lists = [];
            if (lastOctet & 4) lists.push('DM (Data/Marketing)');
            if (lastOctet & 8) lists.push('PH (Phishing)');
            if (lastOctet & 16) lists.push('MW (Malware)');
            if (lastOctet & 32) lists.push('CT (Cracked/Test)');
            if (lastOctet & 64) lists.push('ABUSE (Abused domains)');
            if (lastOctet & 128) lists.push('CR (Cracked sites)');
            
            // High severity for phishing (8), malware (16), and cracked sites (128)
            const severity = (lastOctet & 8) || (lastOctet & 16) || (lastOctet & 128) ? 'high' : 'medium';
            
            return {
                listed: lists.length > 0,
                blocklist: 'SURBL',
                ip: ip,
                lists: lists,
                threats: lists.join(', '),
                severity: severity
            };
        } catch (error) {
            console.warn(`Failed to check domain ${domain} against SURBL:`, error.message);
            return null;
        }
    }
    
    // Check domain against URIBL (URI Blocklist)
    async checkDomainAgainstURIBL(domain) {
        if (!domain || typeof domain !== 'string') {
            return null;
        }

        if (this.blockedBlocklists.has('URIBL')) {
            return { listed: false, blocklist: 'URIBL', error: 'Query blocked' };
        }

        // Use multi.uribl.com for proper bitmask checking (per URIBL documentation)
        const queryDomain = `${domain}.multi.uribl.com`;

        try {
            const records = await this.queryDNS(queryDomain, 'A');
            
            if (!records || records.length === 0) {
                return { listed: false, blocklist: 'URIBL' };
            }

            // Parse A record
            const ip = records[0].data;
            if (!ip || !ip.startsWith('127.0.0.')) {
                return { listed: false, blocklist: 'URIBL' };
            }

            const lastOctet = parseInt(ip.split('.')[3], 10);
            
            // URIBL bitmask values (per URIBL documentation):
            // 1 = Query blocked (NOT a listing!)
            // 2 = black
            // 4 = grey
            // 8 = red
            // 14 = black,grey,red (testpoints)
            
            // Check if query was blocked (bit 1) - this is NOT a positive listing
            if (lastOctet === 1) {
                this.blockedBlocklists.add('URIBL');
                console.warn(`URIBL query blocked for ${domain} (high volume) — skipping for remainder of session`);
                this.notifyAPIStatus('URIBL', 'error', 'Queries blocked (high volume). Skipping for this session.');
                return { listed: false, blocklist: 'URIBL', error: 'Query blocked' };
            }
            
            const lists = [];
            if (lastOctet & 2) lists.push('black');
            if (lastOctet & 4) lists.push('grey');
            if (lastOctet & 8) lists.push('red');
            
            // If no actual lists matched (only bit 1 was set), not a true listing
            if (lists.length === 0) {
                return { listed: false, blocklist: 'URIBL' };
            }
            
            // Red is highest severity, then black, then grey
            const severity = (lastOctet & 8) ? 'high' : (lastOctet & 2) ? 'medium' : 'low';
            
            return {
                listed: true,
                blocklist: 'URIBL',
                ip: ip,
                lists: lists,
                threats: `Listed in URIBL ${lists.join(', ')}`,
                severity: severity
            };
        } catch (error) {
            console.warn(`Failed to check domain ${domain} against URIBL:`, error.message);
            return null;
        }
    }
    
    // Check domain against multiple blocklists
    async checkDomainAgainstAllBlocklists(domain) {
        const results = [];
        
        // Run all checks in parallel
        const [dbl, surbl, uribl] = await Promise.all([
            this.checkDomainAgainstSpamhausDBL(domain),
            this.checkDomainAgainstSURBL(domain),
            this.checkDomainAgainstURIBL(domain)
        ]);
        
        if (dbl?.listed) results.push(dbl);
        if (surbl?.listed) results.push(surbl);
        if (uribl?.listed) results.push(uribl);
        
        return results;
    }

    // Helper method to get full country names from country codes
    getCountryName(countryCode) {
        const countryNames = {
            'US': 'United States',
            'CA': 'Canada',
            'GB': 'United Kingdom',
            'DE': 'Germany',
            'FR': 'France',
            'JP': 'Japan',
            'AU': 'Australia',
            'BR': 'Brazil',
            'IN': 'India',
            'CN': 'China',
            'RU': 'Russia',
            'NL': 'Netherlands',
            'SG': 'Singapore',
            'IE': 'Ireland',
            'CH': 'Switzerland',
            'SE': 'Sweden',
            'NO': 'Norway',
            'DK': 'Denmark',
            'FI': 'Finland',
            'IT': 'Italy',
            'ES': 'Spain',
            'BE': 'Belgium',
            'AT': 'Austria',
            'PL': 'Poland',
            'CZ': 'Czech Republic',
            'HU': 'Hungary',
            'GR': 'Greece',
            'PT': 'Portugal',
            'RO': 'Romania',
            'BG': 'Bulgaria',
            'HR': 'Croatia',
            'SI': 'Slovenia',
            'SK': 'Slovakia',
            'LT': 'Lithuania',
            'LV': 'Latvia',
            'EE': 'Estonia',
            'LU': 'Luxembourg',
            'MT': 'Malta',
            'CY': 'Cyprus',
            'MX': 'Mexico',
            'AR': 'Argentina',
            'CL': 'Chile',
            'CO': 'Colombia',
            'PE': 'Peru',
            'VE': 'Venezuela',
            'UY': 'Uruguay',
            'PY': 'Paraguay',
            'BO': 'Bolivia',
            'EC': 'Ecuador',
            'GY': 'Guyana',
            'SR': 'Suriname',
            'GF': 'French Guiana',
            'FK': 'Falkland Islands',
            'KR': 'South Korea',
            'TW': 'Taiwan',
            'HK': 'Hong Kong',
            'MO': 'Macau',
            'TH': 'Thailand',
            'MY': 'Malaysia',
            'ID': 'Indonesia',
            'PH': 'Philippines',
            'VN': 'Vietnam',
            'LA': 'Laos',
            'KH': 'Cambodia',
            'MM': 'Myanmar',
            'BD': 'Bangladesh',
            'LK': 'Sri Lanka',
            'NP': 'Nepal',
            'BT': 'Bhutan',
            'MV': 'Maldives',
            'PK': 'Pakistan',
            'AF': 'Afghanistan',
            'IR': 'Iran',
            'IQ': 'Iraq',
            'SY': 'Syria',
            'LB': 'Lebanon',
            'JO': 'Jordan',
            'IL': 'Israel',
            'PS': 'Palestine',
            'SA': 'Saudi Arabia',
            'AE': 'United Arab Emirates',
            'QA': 'Qatar',
            'BH': 'Bahrain',
            'KW': 'Kuwait',
            'OM': 'Oman',
            'YE': 'Yemen',
            'EG': 'Egypt',
            'LY': 'Libya',
            'TN': 'Tunisia',
            'DZ': 'Algeria',
            'MA': 'Morocco',
            'SD': 'Sudan',
            'SS': 'South Sudan',
            'ET': 'Ethiopia',
            'ER': 'Eritrea',
            'DJ': 'Djibouti',
            'SO': 'Somalia',
            'KE': 'Kenya',
            'UG': 'Uganda',
            'RW': 'Rwanda',
            'BI': 'Burundi',
            'TZ': 'Tanzania',
            'MZ': 'Mozambique',
            'MW': 'Malawi',
            'ZM': 'Zambia',
            'ZW': 'Zimbabwe',
            'BW': 'Botswana',
            'NA': 'Namibia',
            'ZA': 'South Africa',
            'LS': 'Lesotho',
            'SZ': 'Eswatini',
            'MG': 'Madagascar',
            'MU': 'Mauritius',
            'SC': 'Seychelles',
            'KM': 'Comoros',
            'YT': 'Mayotte',
            'RE': 'Réunion',
            'TR': 'Turkey',
            'GE': 'Georgia',
            'AM': 'Armenia',
            'AZ': 'Azerbaijan',
            'KZ': 'Kazakhstan',
            'KG': 'Kyrgyzstan',
            'TJ': 'Tajikistan',
            'TM': 'Turkmenistan',
            'UZ': 'Uzbekistan',
            'MN': 'Mongolia',
            'NZ': 'New Zealand',
            'FJ': 'Fiji',
            'PG': 'Papua New Guinea',
            'SB': 'Solomon Islands',
            'VU': 'Vanuatu',
            'NC': 'New Caledonia',
            'PF': 'French Polynesia',
            'WS': 'Samoa',
            'TO': 'Tonga',
            'KI': 'Kiribati',
            'TV': 'Tuvalu',
            'NR': 'Nauru',
            'FM': 'Micronesia',
            'MH': 'Marshall Islands',
            'PW': 'Palau'
        };
        return countryNames[countryCode] || countryCode;
    }

    // ==========================================
    // M6: Dangling NS Record Detection
    // ==========================================
    
    // Detect nameservers pointing to unregistered or non-responsive domains
    async checkDanglingNS(domain) {
        console.log(`🔍 Checking for dangling NS records for ${domain}`);
        
        const result = {
            domain: domain,
            nameservers: [],
            danglingNS: [],
            issues: [],
            error: null
        };
        
        try {
            // Query NS records for the domain
            const nsRecords = await this.queryDNS(domain, 'NS');
            
            if (!nsRecords || nsRecords.length === 0) {
                result.error = 'No NS records found';
                return result;
            }
            
            // Check each nameserver (filter out RRSIG records which may be returned with do=true)
            // NS records have type 2, RRSIG records have type 46
            for (const record of nsRecords) {
                // Skip non-NS records (e.g., RRSIG records returned with DNSSEC-enabled queries)
                if (record.type && record.type !== 2) {
                    console.log(`  ⏭️  Skipping non-NS record type ${record.type}`);
                    continue;
                }
                
                const nsHostname = (record.data || '').replace(/\.$/, '').toLowerCase();
                if (!nsHostname) continue;
                
                // Additional safety check: valid NS hostnames should look like domain names
                // RRSIG data contains spaces and Base64 - filter these out
                if (nsHostname.includes(' ') || nsHostname.includes('=')) {
                    console.log(`  ⏭️  Skipping invalid NS hostname (likely RRSIG data): ${nsHostname.substring(0, 50)}...`);
                    continue;
                }
                
                result.nameservers.push(nsHostname);
                
                try {
                    // Try to resolve the nameserver to an IP
                    const nsIPs = await this.queryDNS(nsHostname, 'A');
                    
                    if (!nsIPs || nsIPs.length === 0) {
                        // Nameserver doesn't resolve - potential takeover risk
                        result.danglingNS.push({
                            nameserver: nsHostname,
                            status: 'nxdomain',
                            risk: 'high',
                            description: 'Nameserver hostname does not resolve to any IP address'
                        });
                        
                        result.issues.push({
                            type: 'Dangling NS Record',
                            risk: 'high',
                            nameserver: nsHostname,
                            description: `Nameserver ${nsHostname} does not resolve. This could indicate an expired or misconfigured nameserver, potentially allowing NS takeover attacks.`,
                            recommendation: 'Update or remove this NS record. If the nameserver domain is available for registration, an attacker could register it and take control of your DNS.'
                        });
                    } else {
                        // Check if we can actually query the nameserver
                        // This is a basic check - in a full implementation we'd do a SOA query
                        result.nameservers.push({
                            nameserver: nsHostname,
                            status: 'resolves',
                            ips: nsIPs.map(r => r.data)
                        });
                    }
                } catch (error) {
                    // Resolution failed - could be temporary or permanent
                    result.danglingNS.push({
                        nameserver: nsHostname,
                        status: 'error',
                        risk: 'medium',
                        error: error.message,
                        description: 'Failed to resolve nameserver IP'
                    });
                    
                    result.issues.push({
                        type: 'NS Resolution Error',
                        risk: 'medium',
                        nameserver: nsHostname,
                        description: `Could not resolve nameserver ${nsHostname}: ${error.message}. This could indicate DNS issues or a potentially dangling NS record.`,
                        recommendation: 'Verify that this nameserver is correctly configured and accessible.'
                    });
                }
            }
            
            console.log(`  ✅ NS check complete: ${result.nameservers.length} NS records, ${result.danglingNS.length} dangling`);
            
        } catch (error) {
            result.error = error.message;
            console.error(`  ❌ NS check failed:`, error);
        }
        
        return result;
    }

    // ==========================================
    // DNSSEC Validation (M1 Feature)
    // ==========================================
    
    // Check DNSSEC status for a domain
    async checkDNSSEC(domain) {
        console.log(`🔐 Checking DNSSEC for ${domain}`);
        
        const result = {
            domain: domain,
            enabled: false,
            validated: false,
            dnskeyPresent: false,
            dsPresent: false,
            status: 'unknown',
            records: {
                dnskey: [],
                ds: []
            },
            errors: [],
            details: null
        };
        
        try {
            // Query DNSKEY records (indicates DNSSEC is configured)
            const dnskeyRecords = await this.queryDNS(domain, 'DNSKEY');
            if (dnskeyRecords && dnskeyRecords.length > 0) {
                result.dnskeyPresent = true;
                result.records.dnskey = dnskeyRecords.map(r => ({
                    flags: this.parseDNSKEYFlags(r.data),
                    algorithm: this.parseDNSKEYAlgorithm(r.data),
                    data: r.data
                }));
                console.log(`  ✅ DNSKEY records found: ${dnskeyRecords.length}`);
            }
            
            // Query DS records at parent zone (validates DNSSEC chain)
            // For this, we need to query the parent zone's NS
            // Since we're client-side, we'll check if DS records exist
            const dsRecords = await this.queryDNS(domain, 'DS');
            if (dsRecords && dsRecords.length > 0) {
                result.dsPresent = true;
                result.records.ds = dsRecords.map(r => ({
                    keyTag: this.parseDSKeyTag(r.data),
                    algorithm: this.parseDSAlgorithm(r.data),
                    digestType: this.parseDSDigestType(r.data),
                    data: r.data
                }));
                console.log(`  ✅ DS records found: ${dsRecords.length}`);
            }
            
            // Determine DNSSEC status
            if (result.dnskeyPresent && result.dsPresent) {
                result.enabled = true;
                result.validated = true;
                result.status = 'secure';
                result.details = 'DNSSEC is fully configured and validated through DS records';
            } else if (result.dnskeyPresent) {
                result.enabled = true;
                result.validated = false;
                result.status = 'insecure';
                result.details = 'DNSSEC keys are present but DS records are missing at parent zone (chain not validated)';
            } else {
                result.enabled = false;
                result.validated = false;
                result.status = 'unsigned';
                result.details = 'DNSSEC is not configured for this domain';
            }
            
            // Check for AD flag in DNS response (authenticated data)
            // This would require special DoH support, so we note it as a limitation
            result.adFlagNote = 'Client-side DNSSEC validation has limitations; for full validation, use a DNSSEC-validating resolver';
            
            console.log(`  📊 DNSSEC status: ${result.status}`);
            
        } catch (error) {
            console.error(`  ❌ DNSSEC check failed:`, error);
            result.errors.push(`DNSSEC check failed: ${error.message}`);
            result.status = 'error';
        }
        
        return result;
    }
    
    // Parse DNSKEY flags from record data
    parseDNSKEYFlags(data) {
        // DNSKEY format: flags protocol algorithm public-key
        // Common flags: 256 (ZSK), 257 (KSK)
        const parts = data.split(/\s+/);
        const flags = parseInt(parts[0], 10);
        if (flags === 257) return { value: 257, type: 'KSK', description: 'Key Signing Key' };
        if (flags === 256) return { value: 256, type: 'ZSK', description: 'Zone Signing Key' };
        return { value: flags, type: 'Unknown', description: 'Unknown key type' };
    }
    
    // Parse DNSKEY algorithm from record data
    parseDNSKEYAlgorithm(data) {
        const parts = data.split(/\s+/);
        const algo = parseInt(parts[2], 10);
        const algorithms = {
            5: 'RSA/SHA-1',
            7: 'RSASHA1-NSEC3-SHA1',
            8: 'RSA/SHA-256',
            10: 'RSA/SHA-512',
            13: 'ECDSA/P-256/SHA-256',
            14: 'ECDSA/P-384/SHA-384',
            15: 'Ed25519',
            16: 'Ed448'
        };
        return algorithms[algo] || `Algorithm ${algo}`;
    }
    
    // Parse DS key tag from record data
    parseDSKeyTag(data) {
        const parts = data.split(/\s+/);
        return parseInt(parts[0], 10);
    }
    
    // Parse DS algorithm from record data  
    parseDSAlgorithm(data) {
        const parts = data.split(/\s+/);
        const algo = parseInt(parts[1], 10);
        const algorithms = {
            5: 'RSA/SHA-1',
            7: 'RSASHA1-NSEC3-SHA1',
            8: 'RSA/SHA-256',
            10: 'RSA/SHA-512',
            13: 'ECDSA/P-256/SHA-256',
            14: 'ECDSA/P-384/SHA-384',
            15: 'Ed25519',
            16: 'Ed448'
        };
        return algorithms[algo] || `Algorithm ${algo}`;
    }
    
    // Parse DS digest type from record data
    parseDSDigestType(data) {
        const parts = data.split(/\s+/);
        const digestType = parseInt(parts[2], 10);
        const digestTypes = {
            1: 'SHA-1',
            2: 'SHA-256',
            3: 'GOST R 34.11-94',
            4: 'SHA-384'
        };
        return digestTypes[digestType] || `Digest Type ${digestType}`;
    }

    // ==========================================
    // Email Security Analysis Features (H1-H3, H7)
    // ==========================================
    
    // H2: Check for MTA-STS (Mail Transfer Agent Strict Transport Security)
    // RFC 8461 - https://tools.ietf.org/html/rfc8461
    async checkMTASTS(domain) {
        console.log(`🔍 Checking MTA-STS for ${domain}`);
        
        const result = {
            domain: domain,
            enabled: false,
            record: null,
            version: null,
            id: null,
            error: null
        };
        
        try {
            // Query _mta-sts.{domain} TXT record
            const records = await this.queryDNS(`_mta-sts.${domain}`, 'TXT');
            
            if (records && records.length > 0) {
                // Look for v=STSv1 record
                for (const record of records) {
                    const data = record.data.replace(/^["']|["']$/g, '');
                    if (data.toLowerCase().includes('v=stsv1')) {
                        result.enabled = true;
                        result.record = data;
                        
                        // Parse version
                        const versionMatch = data.match(/v=([^;]+)/i);
                        if (versionMatch) result.version = versionMatch[1];
                        
                        // Parse ID (changes when policy is updated)
                        const idMatch = data.match(/id=([^;]+)/i);
                        if (idMatch) result.id = idMatch[1];
                        
                        console.log(`  ✅ MTA-STS enabled: ${data}`);
                        break;
                    }
                }
                
                if (!result.enabled) {
                    result.error = 'TXT record found but no valid MTA-STS policy';
                }
            } else {
                result.error = 'No MTA-STS TXT record found';
            }
        } catch (error) {
            result.error = error.message;
            console.warn(`  ⚠️ MTA-STS check failed: ${error.message}`);
        }
        
        return result;
    }
    
    // H3: Check for BIMI (Brand Indicators for Message Identification)
    // RFC draft - https://datatracker.ietf.org/doc/html/draft-blank-ietf-bimi
    async checkBIMI(domain) {
        console.log(`🔍 Checking BIMI for ${domain}`);
        
        const result = {
            domain: domain,
            enabled: false,
            record: null,
            version: null,
            logoUrl: null,
            certificateUrl: null,
            selector: 'default',
            error: null
        };
        
        try {
            // Query default._bimi.{domain} TXT record
            const records = await this.queryDNS(`default._bimi.${domain}`, 'TXT');
            
            if (records && records.length > 0) {
                // Look for v=BIMI1 record
                for (const record of records) {
                    const data = record.data.replace(/^["']|["']$/g, '');
                    if (data.toLowerCase().includes('v=bimi1')) {
                        result.enabled = true;
                        result.record = data;
                        
                        // Parse version
                        const versionMatch = data.match(/v=([^;]+)/i);
                        if (versionMatch) result.version = versionMatch[1];
                        
                        // Parse logo URL (l= tag)
                        const logoMatch = data.match(/l=([^;]+)/i);
                        if (logoMatch) result.logoUrl = logoMatch[1].trim();
                        
                        // Parse authority/certificate URL (a= tag)
                        const authMatch = data.match(/a=([^;]+)/i);
                        if (authMatch) result.certificateUrl = authMatch[1].trim();
                        
                        console.log(`  ✅ BIMI enabled: Logo=${result.logoUrl || 'not set'}`);
                        break;
                    }
                }
                
                if (!result.enabled) {
                    result.error = 'TXT record found but no valid BIMI policy';
                }
            } else {
                result.error = 'No BIMI TXT record found';
            }
        } catch (error) {
            result.error = error.message;
            console.warn(`  ⚠️ BIMI check failed: ${error.message}`);
        }
        
        return result;
    }
    
    // L10: Check for DANE/TLSA records (RFC 6698, RFC 7671)
    async checkDANETLSA(domain) {
        console.log(`🔍 Checking DANE/TLSA for ${domain}`);
        
        const result = {
            domain: domain,
            enabled: false,
            records: [],
            smtpDANE: false,
            httpsDANE: false,
            error: null
        };
        
        try {
            // Check for SMTP DANE (_25._tcp.domain)
            const smtpTLSA = await this.queryDNS(`_25._tcp.${domain}`, 'TLSA');
            if (smtpTLSA && smtpTLSA.length > 0) {
                result.smtpDANE = true;
                result.enabled = true;
                for (const record of smtpTLSA) {
                    result.records.push({
                        service: 'SMTP (port 25)',
                        data: record.data,
                        parsed: this.parseTLSARecord(record.data)
                    });
                }
                console.log(`  ✅ SMTP DANE enabled: ${smtpTLSA.length} TLSA records`);
            }
            
            // Check for SMTP Submission DANE (_587._tcp.domain)
            const submissionTLSA = await this.queryDNS(`_587._tcp.${domain}`, 'TLSA');
            if (submissionTLSA && submissionTLSA.length > 0) {
                result.enabled = true;
                for (const record of submissionTLSA) {
                    result.records.push({
                        service: 'SMTP Submission (port 587)',
                        data: record.data,
                        parsed: this.parseTLSARecord(record.data)
                    });
                }
            }
            
            // Check for HTTPS DANE (_443._tcp.domain)
            const httpsTLSA = await this.queryDNS(`_443._tcp.${domain}`, 'TLSA');
            if (httpsTLSA && httpsTLSA.length > 0) {
                result.httpsDANE = true;
                result.enabled = true;
                for (const record of httpsTLSA) {
                    result.records.push({
                        service: 'HTTPS (port 443)',
                        data: record.data,
                        parsed: this.parseTLSARecord(record.data)
                    });
                }
                console.log(`  ✅ HTTPS DANE enabled: ${httpsTLSA.length} TLSA records`);
            }
            
            if (!result.enabled) {
                result.error = 'No DANE/TLSA records found';
            }
            
        } catch (error) {
            result.error = error.message;
            console.warn(`  ⚠️ DANE/TLSA check failed: ${error.message}`);
        }
        
        return result;
    }
    
    // Parse TLSA record data
    parseTLSARecord(data) {
        // TLSA format: usage selector matchingType certificateData
        const parts = (data || '').split(/\s+/);
        if (parts.length < 4) return { raw: data };
        
        const usageTypes = {
            '0': 'PKIX-TA (CA constraint)',
            '1': 'PKIX-EE (Service certificate constraint)',
            '2': 'DANE-TA (Trust anchor assertion)',
            '3': 'DANE-EE (Domain-issued certificate)'
        };
        
        const selectorTypes = {
            '0': 'Full certificate',
            '1': 'SubjectPublicKeyInfo'
        };
        
        const matchingTypes = {
            '0': 'Full (no hash)',
            '1': 'SHA-256',
            '2': 'SHA-512'
        };
        
        return {
            usage: usageTypes[parts[0]] || `Usage ${parts[0]}`,
            selector: selectorTypes[parts[1]] || `Selector ${parts[1]}`,
            matchingType: matchingTypes[parts[2]] || `Matching ${parts[2]}`,
            certificateData: parts.slice(3).join('')
        };
    }

    // H7: Check for SMTP TLS Reporting (RFC 8460)
    async checkSMTPTLSReporting(domain) {
        console.log(`🔍 Checking SMTP TLS Reporting for ${domain}`);
        
        const result = {
            domain: domain,
            enabled: false,
            record: null,
            version: null,
            reportingAddresses: [],
            error: null
        };
        
        try {
            // Query _smtp._tls.{domain} TXT record
            const records = await this.queryDNS(`_smtp._tls.${domain}`, 'TXT');
            
            if (records && records.length > 0) {
                for (const record of records) {
                    const data = record.data.replace(/^["']|["']$/g, '');
                    if (data.toLowerCase().includes('v=tlsrptv1')) {
                        result.enabled = true;
                        result.record = data;
                        
                        // Parse version
                        const versionMatch = data.match(/v=([^;]+)/i);
                        if (versionMatch) result.version = versionMatch[1];
                        
                        // Parse reporting URIs (rua= tag)
                        const ruaMatch = data.match(/rua=([^;]+)/i);
                        if (ruaMatch) {
                            result.reportingAddresses = ruaMatch[1].split(',').map(addr => addr.trim());
                        }
                        
                        console.log(`  ✅ SMTP TLS Reporting enabled: ${result.reportingAddresses.length} reporting addresses`);
                        break;
                    }
                }
                
                if (!result.enabled) {
                    result.error = 'TXT record found but no valid TLS-RPT policy';
                }
            } else {
                result.error = 'No SMTP TLS Reporting TXT record found';
            }
        } catch (error) {
            result.error = error.message;
            console.warn(`  ⚠️ SMTP TLS Reporting check failed: ${error.message}`);
        }
        
        return result;
    }
    
    // ==========================================
    // SPF Include Chain Analysis (H1 Feature)
    // ==========================================
    
    // Analyze SPF record and recursively resolve include chains
    // RFC 7208 limits SPF to 10 DNS lookups (include, a, mx, ptr, exists, redirect)
    async analyzeSPFChain(domain) {
        console.log(`🔍 Starting SPF chain analysis for ${domain}`);
        
        const result = {
            domain: domain,
            spfRecord: null,
            lookupCount: 0,
            maxLookups: 10, // RFC 7208 limit
            includeChain: [],
            mechanisms: [],
            warnings: [],
            errors: [],
            isValid: true,
            exceededLimit: false,
            voidLookups: 0,
            flattenedRecord: null
        };
        
        try {
            // Get the initial SPF record
            const spfRecords = await this.queryDNS(domain, 'TXT');
            if (!spfRecords) {
                result.errors.push(`No TXT records found for ${domain}`);
                result.isValid = false;
                return result;
            }
            
            // Find SPF record
            const spfRecord = spfRecords.find(r => r.data && r.data.toLowerCase().includes('v=spf1'));
            if (!spfRecord) {
                result.errors.push(`No SPF record found for ${domain}`);
                result.isValid = false;
                return result;
            }
            
            result.spfRecord = spfRecord.data;
            console.log(`  📋 Found SPF record: ${spfRecord.data.substring(0, 80)}...`);
            
            // Parse and analyze the SPF record recursively
            await this.parseSPFRecord(spfRecord.data, domain, result, 0, [domain]);
            
            // Check if lookup limit was exceeded
            if (result.lookupCount > result.maxLookups) {
                result.exceededLimit = true;
                result.warnings.push(`SPF lookup limit exceeded: ${result.lookupCount}/${result.maxLookups} (RFC 7208 violation)`);
                result.isValid = false;
            } else if (result.lookupCount > 7) {
                result.warnings.push(`SPF approaching lookup limit: ${result.lookupCount}/${result.maxLookups} lookups used`);
            }
            
            // Check for void lookups
            if (result.voidLookups > 2) {
                result.warnings.push(`Excessive void lookups detected: ${result.voidLookups} (RFC 7208 recommends max 2)`);
            }
            
            // Generate flattened record suggestion if over limit
            if (result.exceededLimit) {
                result.flattenedRecord = this.generateFlattenedSPF(result);
            }
            
            console.log(`  ✅ SPF chain analysis complete: ${result.lookupCount} lookups, ${result.includeChain.length} includes`);
            
        } catch (error) {
            console.error(`  ❌ SPF chain analysis failed:`, error);
            result.errors.push(`Analysis failed: ${error.message}`);
            result.isValid = false;
        }
        
        return result;
    }
    
    // Parse SPF record and extract mechanisms
    async parseSPFRecord(spfData, domain, result, depth, visitedDomains) {
        if (depth > 10) {
            result.errors.push(`Maximum recursion depth reached at ${domain}`);
            return;
        }
        
        // Clean SPF data (remove quotes if present)
        const cleanData = spfData.replace(/^["']|["']$/g, '').replace(/"\s*"/g, '');
        
        // Parse mechanisms
        const parts = cleanData.split(/\s+/);
        
        for (const part of parts) {
            const lowerPart = part.toLowerCase();
            
            // Skip version tag
            if (lowerPart === 'v=spf1') continue;
            
            // Handle include mechanism
            if (lowerPart.startsWith('include:')) {
                const includeDomain = part.substring(8);
                result.lookupCount++;
                
                const includeEntry = {
                    type: 'include',
                    domain: includeDomain,
                    depth: depth,
                    parentDomain: domain,
                    resolved: false,
                    spfRecord: null,
                    error: null
                };
                
                // Prevent infinite loops
                if (visitedDomains.includes(includeDomain.toLowerCase())) {
                    includeEntry.error = 'Circular reference detected';
                    result.warnings.push(`Circular SPF reference: ${includeDomain}`);
                    result.includeChain.push(includeEntry);
                    continue;
                }
                
                try {
                    // Resolve the included domain's SPF
                    const includedRecords = await this.queryDNS(includeDomain, 'TXT');
                    if (includedRecords) {
                        const includedSPF = includedRecords.find(r => r.data && r.data.toLowerCase().includes('v=spf1'));
                        if (includedSPF) {
                            includeEntry.resolved = true;
                            includeEntry.spfRecord = includedSPF.data;
                            result.includeChain.push(includeEntry);
                            
                            // Recursively analyze
                            await this.parseSPFRecord(
                                includedSPF.data, 
                                includeDomain, 
                                result, 
                                depth + 1, 
                                [...visitedDomains, includeDomain.toLowerCase()]
                            );
                        } else {
                            includeEntry.error = 'No SPF record found';
                            result.voidLookups++;
                            result.includeChain.push(includeEntry);
                        }
                    } else {
                        includeEntry.error = 'Domain does not exist';
                        result.voidLookups++;
                        result.includeChain.push(includeEntry);
                    }
                } catch (error) {
                    includeEntry.error = error.message;
                    result.voidLookups++;
                    result.includeChain.push(includeEntry);
                }
            }
            // Handle redirect modifier
            else if (lowerPart.startsWith('redirect=')) {
                const redirectDomain = part.substring(9);
                result.lookupCount++;
                
                const redirectEntry = {
                    type: 'redirect',
                    domain: redirectDomain,
                    depth: depth,
                    parentDomain: domain,
                    resolved: false,
                    spfRecord: null,
                    error: null
                };
                
                if (!visitedDomains.includes(redirectDomain.toLowerCase())) {
                    try {
                        const redirectRecords = await this.queryDNS(redirectDomain, 'TXT');
                        if (redirectRecords) {
                            const redirectSPF = redirectRecords.find(r => r.data && r.data.toLowerCase().includes('v=spf1'));
                            if (redirectSPF) {
                                redirectEntry.resolved = true;
                                redirectEntry.spfRecord = redirectSPF.data;
                                result.includeChain.push(redirectEntry);
                                
                                await this.parseSPFRecord(
                                    redirectSPF.data, 
                                    redirectDomain, 
                                    result, 
                                    depth + 1, 
                                    [...visitedDomains, redirectDomain.toLowerCase()]
                                );
                            } else {
                                redirectEntry.error = 'No SPF record found';
                                result.voidLookups++;
                            }
                        }
                    } catch (error) {
                        redirectEntry.error = error.message;
                        result.voidLookups++;
                    }
                }
                result.includeChain.push(redirectEntry);
            }
            // Handle 'a' mechanism (counts as lookup)
            else if (lowerPart === 'a' || lowerPart.startsWith('a:') || lowerPart.startsWith('a/')) {
                result.lookupCount++;
                result.mechanisms.push({ type: 'a', value: part, domain: domain });
            }
            // Handle 'mx' mechanism (counts as lookup)
            else if (lowerPart === 'mx' || lowerPart.startsWith('mx:') || lowerPart.startsWith('mx/')) {
                result.lookupCount++;
                result.mechanisms.push({ type: 'mx', value: part, domain: domain });
            }
            // Handle 'ptr' mechanism (counts as lookup, deprecated)
            else if (lowerPart === 'ptr' || lowerPart.startsWith('ptr:')) {
                result.lookupCount++;
                result.mechanisms.push({ type: 'ptr', value: part, domain: domain });
                result.warnings.push(`Deprecated 'ptr' mechanism used in ${domain} (RFC 7208 recommends against use)`);
            }
            // Handle 'exists' mechanism (counts as lookup)
            else if (lowerPart.startsWith('exists:')) {
                result.lookupCount++;
                result.mechanisms.push({ type: 'exists', value: part, domain: domain });
            }
            // Handle ip4/ip6 mechanisms (no lookup)
            else if (lowerPart.startsWith('ip4:') || lowerPart.startsWith('ip6:')) {
                result.mechanisms.push({ type: lowerPart.startsWith('ip4') ? 'ip4' : 'ip6', value: part, domain: domain });
            }
            // Handle all mechanism
            else if (lowerPart === 'all' || lowerPart === '+all' || lowerPart === '-all' || lowerPart === '~all' || lowerPart === '?all') {
                result.mechanisms.push({ type: 'all', value: part, domain: domain });
            }
        }
    }
    
    // Generate a flattened SPF record suggestion
    generateFlattenedSPF(result) {
        const ip4s = new Set();
        const ip6s = new Set();
        
        // Collect all IP mechanisms from the chain
        for (const mech of result.mechanisms) {
            if (mech.type === 'ip4') {
                const ip = mech.value.replace(/^[+~?-]?ip4:/i, '');
                ip4s.add(ip);
            } else if (mech.type === 'ip6') {
                const ip = mech.value.replace(/^[+~?-]?ip6:/i, '');
                ip6s.add(ip);
            }
        }
        
        // Build flattened record
        let flattened = 'v=spf1';
        for (const ip of ip4s) {
            flattened += ` ip4:${ip}`;
        }
        for (const ip of ip6s) {
            flattened += ` ip6:${ip}`;
        }
        flattened += ' -all';
        
        return flattened.length > 255 ? 
            'Record too long - consider splitting across multiple domains' : 
            flattened;
    }

    // Detect subdomain takeover
    async detectTakeover(subdomain, cname) {
        try {
            const records = await this.queryDNS(cname, 'A');
            if (!records || records.length === 0) {
                return {
                    subdomain: subdomain,
                    cname: cname,
                    takeover: true,
                    risk: 'high',
                    description: 'CNAME target does not resolve'
                };
            }
            return null;
        } catch (error) {
            console.warn(`Failed to check takeover for ${subdomain}:`, error);
            return null;
        }
    }
}

// Rate limiter for DNS queries
class RateLimiter {
    constructor(maxRequests = 10, timeWindow = 1000) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
    }

    async throttle() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const waitTime = this.timeWindow - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.requests.push(now);
    }
} 