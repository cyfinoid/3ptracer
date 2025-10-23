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
        
        // Callbacks for real-time notifications
        this.subdomainCallbacks = [];
        this.apiCallbacks = [];
        
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
        this.subdomainCallbacks = [];
        this.apiCallbacks = [];
        this.currentDomain = null;
        
        console.log('🧹 DNS Analyzer internal state cleared for new analysis');
    }
    
    // Set current domain for intelligent record querying
    setCurrentDomain(domain) {
        this.currentDomain = domain;
    }

    // Print final statistics
    printStats() {
        const duration = (Date.now() - this.stats.startTime) / 1000;
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 ANALYSIS STATISTICS');
        console.log('='.repeat(60));
        console.log(`⏱️  Total Duration: ${duration.toFixed(2)} seconds`);
        console.log(`🔍 DNS Queries: ${this.stats.dnsQueries}`);
        console.log(`🌐 API Calls: ${this.stats.apiCalls}`);
        console.log(`🔍 Subdomains Discovered: ${this.stats.subdomainsDiscovered}`);
        console.log(`⚡ Subdomains Analyzed: ${this.stats.subdomainsAnalyzed}`);
        console.log(`🏢 ASN Lookups: ${this.stats.asnLookups}`);
        console.log(`🔧 Services Detected: ${this.stats.servicesDetected}`);
        console.log(`⚠️  Takeovers Detected: ${this.stats.takeoversDetected}`);
        console.log(`📈 Performance: ${this.stats.subdomainsAnalyzed > 0 ? (this.stats.subdomainsAnalyzed / duration).toFixed(2) : 0} subdomains/second`);
        console.log('='.repeat(60));
    }

    // Register callback for real-time subdomain updates
    onSubdomainDiscovered(callback) {
        this.subdomainCallbacks.push(callback);
    }

    // Register callback for API notifications
    onAPINotification(callback) {
        this.apiCallbacks.push(callback);
    }

    // Notify all callbacks about new subdomain
    notifySubdomainDiscovered(subdomain, source) {
        this.processedSubdomains.add(subdomain);
        this.stats.subdomainsDiscovered++;
        console.log(`🆕 New subdomain discovered: ${subdomain} (from ${source})`);
        
        // Notify all registered callbacks
        this.subdomainCallbacks.forEach(callback => {
            try {
                callback(subdomain, source);
            } catch (error) {
                console.warn('Callback error:', error);
            }
        });
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
            15: 'MX',
            16: 'TXT',
            28: 'AAAA',
            257: 'CAA'
        };
        return types[typeNumber] || `TYPE${typeNumber}`;
    }

    // Fallback method for specific record type queries
    async querySpecificRecordTypes(domain, results) {
        const recordTypes = ['A', 'CNAME', 'TXT', 'MX', 'NS', 'CAA'];
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
                    
                    // Notify about redirect completion
                    this.subdomainCallbacks.forEach(callback => {
                        try {
                            callback(subdomain, source, analysis);
                        } catch (error) {
                            console.warn('Redirect callback error:', error);
                        }
                    });
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
            
            // Notify about completion
            this.subdomainCallbacks.forEach(callback => {
                try {
                    callback(subdomain, source, analysis);
                } catch (error) {
                    console.warn('Subdomain callback error:', error);
                }
            });
            
        } catch (error) {
            console.warn(`❌ Failed to process subdomain ${subdomain}:`, error.message);
            
            // Store error result
            const errorResult = {
                subdomain: subdomain,
                records: {},
                ip: null,
                status: 'error',
                error: error.message
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
                
                // For subdomains, we don't need to query MX, TXT, or NS records
                // These are typically only relevant for the main domain:
                // - MX: Email routing (domain-level)
                // - TXT: Domain policies like SPF, DMARC, verification (domain-level)  
                // - NS: Authoritative nameservers (domain-level)
                // Subdomains typically only need A/AAAA and CNAME records
                
                console.log(`  ✅ Subdomain ${subdomain} analysis complete - skipping MX/TXT/NS queries`);
                
                // Get ASN info if we have an IP
                if (analysis.ip && /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(analysis.ip)) {
                    try {
                        const asnInfo = await this.getASNInfo(analysis.ip);
                        analysis.vendor = this.classifyVendor(asnInfo);
                        this.stats.asnLookups++;
                        console.log(`  ✅ ASN info for ${analysis.ip}: ${asnInfo.org || 'Unknown'}`);
                    } catch (error) {
                        console.warn(`  ⚠️  ASN lookup failed for ${analysis.ip}:`, error.message);
                    }
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
            { pattern: 'gitpod.io', name: 'Gitpod', category: 'development', description: 'Cloud development environment' }
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
        
        // AWS services
        if (target.includes('awsglobalaccelerator.com')) {
            return { name: 'AWS Global Accelerator', category: 'cloud', description: 'Global application accelerator' };
        }
        if (target.includes('awsapprunner.com')) {
            return { name: 'AWS App Runner', category: 'cloud', description: 'Containerized application hosting' };
        }
        if (target.includes('amazonaws.com')) {
            return { name: 'Amazon Web Services (AWS)', category: 'cloud', description: 'Cloud computing platform' };
        }
        
        // Azure services
        if (target.includes('azurewebsites.net')) {
            return { name: 'Microsoft Azure', category: 'cloud', description: 'Cloud computing platform' };
        }
        
        // DigitalOcean services
        if (target.includes('ondigitalocean.app')) {
            return { name: 'DigitalOcean App Platform', category: 'cloud', description: 'Application hosting platform' };
        }
        
        // Cloudflare
        if (target.includes('cloudflare.com')) {
            return { name: 'Cloudflare', category: 'cloud', description: 'CDN and security services' };
        }
        
        return null; // No infrastructure detected
    }
    
    // Use primary service detection for CNAME targets
    detectCNAMEService(cnameTarget) {
        return this.detectPrimaryService(cnameTarget);
    }

    // Start certificate transparency queries early (non-blocking)
    startCTQueries(domain) {
        if (this.ctCache.has(domain)) {
            return this.ctCache.get(domain);
        }
        
        console.log(`🚀 Starting early CT queries for ${domain}...`);
        const promise = this.getSubdomainsFromCT(domain);
        this.ctCache.set(domain, promise);
        return promise;
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
            if (server.includes('dns.google')) {
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
            } else if (server.includes('cloudflare-dns.com')) {
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
            } else if (server.includes('doh.pub')) {
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
            } else if (server.includes('dns.alidns.com')) {
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
                    const typeName = this.getRecordTypeName(record.type);
                    if (!recordsByType[typeName]) {
                        recordsByType[typeName] = [];
                    }
                    recordsByType[typeName].push(record);
                    foundTypes.add(typeName);
                }
                
                console.log(`  📋 Primary query found: ${Array.from(foundTypes).join(', ')}`);
                results.records = recordsByType;
                
                // Now query for other important record types (TXT, MX, NS, CAA)
                // Skip CNAME since we already know from the primary query if it exists
                const otherTypes = ['TXT', 'MX', 'NS', 'CAA'];
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
        const discoveryPromises = [
            this.queryCrtSh(domain),
            this.queryOTX(domain),
            this.queryHackerTarget(domain),
            this.queryCertSpotter(domain)
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
                this.discoveryQueue.markCompleted(subdomain, result);
                results.push(result);
                
                // Notify about completion
                this.subdomainCallbacks.forEach(callback => {
                    try {
                        callback(subdomain, 'Sequential Processing', result);
                    } catch (error) {
                        console.warn('Subdomain callback error:', error);
                    }
                });
                
            } catch (error) {
                console.warn(`❌ Failed to process ${subdomain}:`, error.message);
                this.discoveryQueue.markCompleted(subdomain, {
                    subdomain: subdomain,
                    status: 'error',
                    error: error.message
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
            for (const entry of data) {
                const nameValue = entry.name_value;
                if (nameValue && !nameValue.startsWith('*.')) {
                    // Handle case where name_value contains multiple subdomains separated by newlines
                    const subdomains = nameValue.split(/\n|,/).map(s => s.trim()).filter(s => s && !s.startsWith('*.'));
                    
                    for (const subdomain of subdomains) {
                        if (subdomain && subdomain.endsWith(`.${domain}`) && subdomain !== domain) {
                            processedCount++;
                            // Check if this subdomain was actually added (not a duplicate)
                            const beforeCount = this.discoveryQueue.discoveredSubdomains.size;
                            this.discoveryQueue.addDiscovered(subdomain, 'crt.sh');
                            const afterCount = this.discoveryQueue.discoveredSubdomains.size;
                            if (afterCount > beforeCount) {
                                addedCount++;
                            }
                        }
                    }
                }
            }
            
            console.log(`    ✅ crt.sh: Processed ${processedCount} entries, added ${addedCount} unique subdomains to discovery queue`);
            this.notifyAPIStatus('crt.sh', 'success', `Found ${addedCount} unique subdomains from ${processedCount} entries`);
            
        } catch (error) {
            console.log(`    ❌ crt.sh failed:`, error.message);
            this.notifyAPIStatus('crt.sh', 'error', error.message);
        }
    }

    // Query Cert Spotter for subdomains
    async queryCertSpotter(domain) {
        console.log(`  📡 Querying Cert Spotter for subdomains...`);
        this.stats.apiCalls++;
        
        try {
            const response = await fetch(`https://certspotter.com/api/v0/certs?domain=${domain}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorMsg = `Service unavailable (${response.status})`;
                this.notifyAPIStatus('Cert Spotter', 'error', errorMsg);
                throw new Error(`Cert Spotter query failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`    📊 Cert Spotter returned ${data.length} certificates`);
            
            // Process entries and add to discovery queue
            let processedCount = 0;
            let addedCount = 0;
            for (const cert of data) {
                if (cert.dns_names) {
                    for (const dnsName of cert.dns_names) {
                        if (dnsName.endsWith(`.${domain}`) && dnsName !== domain) {
                            processedCount++;
                            // Check if this subdomain was actually added (not a duplicate)
                            const beforeCount = this.discoveryQueue.discoveredSubdomains.size;
                            this.discoveryQueue.addDiscovered(dnsName, 'Cert Spotter');
                            const afterCount = this.discoveryQueue.discoveredSubdomains.size;
                            if (afterCount > beforeCount) {
                                addedCount++;
                            }
                        }
                    }
                }
            }
            
            console.log(`    ✅ Cert Spotter: Processed ${processedCount} entries, added ${addedCount} unique subdomains to discovery queue`);
            this.notifyAPIStatus('Cert Spotter', 'success', `Found ${addedCount} unique subdomains from ${processedCount} entries`);
            
        } catch (error) {
            console.log(`    ❌ Cert Spotter failed:`, error.message);
            this.notifyAPIStatus('Cert Spotter', 'error', error.message);
        }
    }



    // Query OTX AlienVault for subdomains
    async queryOTX(domain) {
        console.log(`  📡 Querying OTX AlienVault for subdomains...`);
        this.stats.apiCalls++;
        
        try {
            const response = await fetch(`https://otx.alienvault.com/api/v1/indicators/domain/${domain}/passive_dns`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorMsg = `Service unavailable (${response.status})`;
                this.notifyAPIStatus('OTX AlienVault', 'error', errorMsg);
                throw new Error(`OTX query failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`    📊 OTX returned ${data.passive_dns?.length || 0} entries`);
            
            // Process entries and add to discovery queue
            let processedCount = 0;
            let addedCount = 0;
            if (data.passive_dns) {
                for (const entry of data.passive_dns) {
                    const subdomain = entry.hostname;
                    if (subdomain && subdomain.endsWith(`.${domain}`) && subdomain !== domain) {
                        processedCount++;
                        // Check if this subdomain was actually added (not a duplicate)
                        const beforeCount = this.discoveryQueue.discoveredSubdomains.size;
                        this.discoveryQueue.addDiscovered(subdomain, 'OTX AlienVault');
                        const afterCount = this.discoveryQueue.discoveredSubdomains.size;
                        if (afterCount > beforeCount) {
                            addedCount++;
                        }
                    }
                }
            }
            
            console.log(`    ✅ OTX: Processed ${processedCount} entries, added ${addedCount} unique subdomains to discovery queue`);
            this.notifyAPIStatus('OTX AlienVault', 'success', `Found ${addedCount} unique subdomains from ${processedCount} entries`);
            
        } catch (error) {
            console.log(`    ❌ OTX failed:`, error.message);
            this.notifyAPIStatus('OTX AlienVault', 'error', error.message);
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



    // Analyze subdomains
    async analyzeSubdomains(subdomains) {
        const results = [];
        
        console.log(`🔍 Analyzing ${subdomains.length} subdomains...`);
        
        for (const subdomain of subdomains) {
            try {
                console.log(`  📡 Querying DNS for subdomain: ${subdomain}`);
                // Query for both A and CNAME records to detect redirects
                const records = await this.queryDNS(subdomain);
                if (records && records.length > 0) {
                    // Check for CNAME records first
                    const cnameRecords = records.filter(r => r.type === 5); // CNAME type
                    const aRecords = records.filter(r => r.type === 1); // A type
                    
                    if (cnameRecords.length > 0) {
                        const cnameTarget = cnameRecords[0].data;
                        
                        // Check if this is a redirect to main domain
                        if (this.isCNAMEToMainDomain(cnameTarget)) {
                            console.log(`  🔄 Redirect detected: ${subdomain} → ${cnameTarget} (main domain)`);
                            results.push({
                                subdomain: subdomain,
                                records: records,
                                isRedirectToMain: true,
                                redirectTarget: cnameTarget,
                                ip: null
                            });
                            continue; // Skip further analysis for redirects
                        }
                        
                        // Regular CNAME (not to main domain)
                        console.log(`  🔗 Subdomain ${subdomain} has CNAME to ${cnameTarget}`);
                        
                        // Detect third-party service from CNAME target
                        const detectedService = this.detectPrimaryService(cnameTarget);
                        
                        const subdomainResult = {
                            subdomain: subdomain,
                            records: records,
                            ip: null, // CNAME doesn't have direct IP
                            cnameTarget: cnameTarget
                        };
                        
                        // Add service information if detected
                        if (detectedService) {
                            subdomainResult.detectedService = detectedService;
                            console.log(`  🎯 Detected service: ${detectedService.name} (${detectedService.category}) for ${subdomain}`);
                        }
                        
                        results.push(subdomainResult);
                    } else if (aRecords.length > 0) {
                        // Check if the record data is an IP address
                        const recordData = aRecords[0].data;
                        const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(recordData);
                        
                        if (isIP) {
                            results.push({
                                subdomain: subdomain,
                                records: records,
                                ip: recordData
                            });
                            console.log(`  ✅ Subdomain ${subdomain} resolved to IP ${recordData}`);
                        } else {
                            console.log(`  ⚠️  Subdomain ${subdomain} resolved to domain ${recordData} (not an IP)`);
                            results.push({
                                subdomain: subdomain,
                                records: records,
                                ip: null
                            });
                        }
                    } else {
                        console.log(`  ⚠️  Subdomain ${subdomain} has no A or CNAME records`);
                        results.push({
                            subdomain: subdomain,
                            records: records,
                            ip: null
                        });
                    }
                } else {
                    console.log(`  ⚠️  Subdomain ${subdomain} has no DNS records`);
                    results.push({
                        subdomain: subdomain,
                        records: [],
                        ip: null
                    });
                }
            } catch (error) {
                console.warn(`  ❌ Failed to analyze subdomain ${subdomain}:`, error.message);
                results.push({
                    subdomain: subdomain,
                    records: [],
                    ip: null
                });
            }
        }

        console.log(`📊 Subdomain analysis complete: ${results.length}/${subdomains.length} subdomains resolved`);
        return results;
    }

    // Query DKIM records using common selectors
    async queryDKIMRecords(domain) {
        const dkimRecords = [];
        
        // Common DKIM selectors used by various email services
        const commonSelectors = [
            // Generic/Default selectors
            'default', 'selector1', 'selector2', 'dkim', 'key1', 'key2', 's1', 's2',
            
            // Google Workspace / Gmail
            'google', '20161025', '20210112',
            
            // Microsoft Office 365 / Outlook
            'selector1', 'selector2', 'sig1', 'sig2',
            
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
                    for (const record of records) {
                        // Check if this is a valid DKIM record
                        if (this.isDKIMRecord(record.data)) {
                            const dkimInfo = {
                                ...record,
                                selector: selector,
                                subdomain: dkimSubdomain,
                                parsedInfo: this.parseDKIMRecord(record.data, selector)
                            };
                            
                            dkimRecords.push(dkimInfo);
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
        
        // Microsoft Office 365 patterns
        if (lowerSelector.includes('selector') || 
            lowerSelector.includes('sig')) {
            return { name: 'Microsoft Office 365', category: 'email-service', confidence: 'low' };
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

        for (const provider of providers) {
            try {
                const response = await fetch(provider.url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': '3rdPartyTracer/1.0'
                    }
                });

                if (!response.ok) {
                    console.warn(`Provider ${provider.name} failed for ${ip}: ${response.status}`);
                    continue;
                }

                const data = await response.json();
                
                // Check if we got valid data
                if (data && (data.asn || data.org || data.as)) {
                    const result = provider.transform(data);
                    console.log(`✅ ASN info for ${ip} from ${provider.name}:`, result);
                    return result;
                }
            } catch (error) {
                console.warn(`Provider ${provider.name} error for ${ip}:`, error.message);
                continue;
            }
        }

        // All providers failed
        console.warn(`❌ All ASN providers failed for ${ip}`);
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