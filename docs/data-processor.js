// Data Processing Engine
class DataProcessor {
    constructor() {
        this.processedData = {
            services: new Map(),
            subdomains: new Map(),
            redirectsToMain: [],
            historicalRecords: [],
            dnsRecords: []
        };
    }

    // Process and consolidate all analysis results
    processAnalysisResults(mainDomainResults, subdomainResults, historicalRecords, dnsRecords = []) {
        // Clear previous data
        this.clearProcessedData();

        // Process main domain services
        if (mainDomainResults?.services) {
            this.processServices(mainDomainResults.services, mainDomainResults.domain);
        }

        // Process subdomains and separate redirects
        const { regularSubdomains, redirects, historicalSubdomains } = this.separateRedirects(subdomainResults);
        
        // Store redirects
        this.processedData.redirectsToMain = redirects;

        // Process regular subdomains (these are active subdomains with DNS records)
        for (const subdomain of regularSubdomains) {
            this.processSubdomain(subdomain);
        }

        // Process historical records (combine CT logs and inactive discovered subdomains)
        const allHistoricalRecords = [...historicalRecords, ...historicalSubdomains];
        this.processedData.historicalRecords = this.deduplicateHistoricalRecords(allHistoricalRecords);
        
        // Store DNS records separately from services
        this.processedData.dnsRecords = dnsRecords || [];

        console.log(`📊 Data processing complete: ${regularSubdomains.length} active subdomains, ${allHistoricalRecords.length} historical records`);

        return this.getProcessedData();
    }

    // Separate redirects, active subdomains, and historical subdomains
    separateRedirects(subdomainResults) {
        const regularSubdomains = [];
        const redirects = [];
        const historicalSubdomains = [];

        for (const subdomain of subdomainResults) {
            if (subdomain.isRedirectToMain) {
                redirects.push({
                    subdomain: subdomain.subdomain,
                    redirectTarget: subdomain.redirectTarget,
                    source: 'batch-analysis'
                });
            } else if (this.isHistoricalSubdomain(subdomain)) {
                // Subdomain with no DNS records - categorize as historical
                historicalSubdomains.push({
                    subdomain: subdomain.subdomain,
                    sources: subdomain.sources || ['discovery'],
                    discoveredAt: subdomain.discoveredAt || new Date(),
                    status: 'historical'
                });
            } else {
                regularSubdomains.push(subdomain);
            }
        }

        return { regularSubdomains, redirects, historicalSubdomains };
    }

    // Process services and add to consolidated map
    processServices(services, sourceSubdomain = null) {
        for (const service of services) {
            const serviceKey = this.generateServiceKey(service);
            
            if (this.processedData.services.has(serviceKey)) {
                // Merge with existing service
                this.mergeService(this.processedData.services.get(serviceKey), service, sourceSubdomain);
            } else {
                // Add new service
                this.processedData.services.set(serviceKey, this.createServiceEntry(service, sourceSubdomain));
            }
        }
    }

    // Process a single subdomain
    processSubdomain(subdomain) {
        const subdomainKey = subdomain.subdomain;
        
        // Create standardized subdomain data with safe defaults
        const subdomainData = {
            subdomain: subdomain.subdomain,
            records: subdomain.records || {},
            ipAddresses: subdomain.ip ? [subdomain.ip] : [],
            cnameChain: subdomain.cnameChain || [],
            cnameTarget: subdomain.cnameTarget || null,
            primaryService: subdomain.primaryService || null,
            infrastructure: subdomain.infrastructure || null,
            vendor: (subdomain.vendor && typeof subdomain.vendor === 'object') ? 
                subdomain.vendor : { vendor: 'Unknown', category: 'Unknown' },
            takeover: subdomain.takeover || null,
            // FIXED: Keep ASN info for sovereignty analysis
            asnInfo: subdomain.asnInfo || null,
            status: 'analyzed'
        };

        // Process CNAME-detected service if available
        if (subdomain.detectedService) {
            console.log(`🔧 Processing CNAME-detected service: ${subdomain.detectedService.name} for ${subdomain.subdomain}`);
            
            // Convert detected service to service entry format
            const serviceEntry = {
                name: subdomain.detectedService.name,
                description: subdomain.detectedService.description,
                category: subdomain.detectedService.category,
                confidence: 'high',
                evidenceType: 'CNAME',
                records: [
                    {
                        type: 'CNAME',
                        subdomain: subdomain.subdomain,
                        data: subdomain.cnameTarget
                    }
                ],
                // FIXED: Include ASN info in service metadata
                metadata: {
                    asnInfo: subdomain.asnInfo,
                    sourceSubdomain: subdomain.subdomain
                }
            };
            
            // Add the service to our services collection
            this.processServices([serviceEntry], subdomain.subdomain);
            
            // Link the primary service to the subdomain
            subdomainData.primaryService = {
                name: subdomain.detectedService.name,
                category: subdomain.detectedService.category
            };
        }

        this.processedData.subdomains.set(subdomainKey, subdomainData);

        // Process services from this subdomain
        if (subdomain.detectedServices) {
            this.processServices(subdomain.detectedServices, subdomain.subdomain);
        }

        // Process primary service if exists
        if (subdomain.primaryService) {
            const primaryServiceData = {
                name: subdomain.primaryService.name,
                category: subdomain.primaryService.category,
                description: subdomain.primaryService.description,
                records: this.buildCNAMERecords(subdomain),
                recordTypes: ['CNAME'],
                // FIXED: Include ASN info in service metadata
                metadata: {
                    asnInfo: subdomain.asnInfo,
                    sourceSubdomain: subdomain.subdomain
                }
            };
            this.processServices([primaryServiceData], subdomain.subdomain);
        }

        // Process vendor-based service if no primary service
        if (!subdomain.primaryService && 
            subdomainData.vendor && 
            subdomainData.vendor.vendor && 
            subdomainData.vendor.vendor !== 'Unknown' &&
            subdomainData.ipAddresses.length > 0) {
            const vendorService = {
                name: subdomainData.vendor.vendor,
                category: 'infrastructure',
                description: 'Infrastructure service based on IP classification',
                records: [{
                    type: 1, // A record
                    data: subdomainData.ipAddresses[0], // Use standardized ipAddresses array
                    subdomain: subdomain.subdomain
                }],
                recordTypes: ['A'],
                // FIXED: Include ASN info in service metadata
                metadata: {
                    asnInfo: subdomain.asnInfo,
                    sourceSubdomain: subdomain.subdomain
                }
            };
            this.processServices([vendorService], subdomain.subdomain);
        }
    }

    // Merge data with existing subdomain
    mergeSubdomainData(existing, newData) {
        // Merge IP addresses
        if (newData.ip && !existing.ipAddresses.includes(newData.ip)) {
            existing.ipAddresses.push(newData.ip);
        }
        
        // Update CNAME info if available
        if (newData.cnameTarget) {
            existing.cnameTarget = newData.cnameTarget;
        }
        
        if (newData.cnameChain) {
            existing.cnameChain = newData.cnameChain;
        }
        
        // Update vendor info if more specific
        if (newData.vendor && newData.vendor.vendor !== 'Unknown') {
            existing.vendor = newData.vendor;
        }
        
        // Update ASN info
        if (newData.asnInfo) {
            existing.asnInfo = newData.asnInfo;
        }
        
        // Update takeover info
        if (newData.takeover) {
            existing.takeover = newData.takeover;
        }
        
        // Merge records
        if (newData.records) {
            existing.records = { ...existing.records, ...newData.records };
        }
    }

    // Process services from various sources
    // Build CNAME records from subdomain chain data
    buildCNAMERecords(subdomain) {
        const cnameRecords = [];
        
        if (subdomain.cnameChain && subdomain.cnameChain.length > 0) {
            subdomain.cnameChain.forEach(link => {
                cnameRecords.push({
                    type: 5, // CNAME
                    data: link.to,
                    subdomain: subdomain.subdomain,
                    TTL: link.ttl || null
                });
            });
        } else if (subdomain.cnameTarget) {
            cnameRecords.push({
                type: 5, // CNAME
                data: subdomain.cnameTarget,
                subdomain: subdomain.subdomain
            });
        }
        
        return cnameRecords;
    }

    // Generate unique service key
    generateServiceKey(service) {
        // For vendor consolidation, use only name for certain services
        const vendorServices = ['Amazon AWS', 'Microsoft Azure', 'Google Cloud Platform', 'DigitalOcean', 'Linode', 'Hetzner'];
        
        if (vendorServices.includes(service.name)) {
            return service.name.toLowerCase().replace(/\s+/g, '-');
        }
        
        return `${service.name}-${service.category}`.toLowerCase().replace(/\s+/g, '-');
    }

    // Create new service entry
    createServiceEntry(service, sourceSubdomain = null) {
        return {
            name: service.name,
            category: service.category,
            description: service.description,
            records: service.records || [],
            recordTypes: service.recordTypes || [],
            sourceSubdomains: sourceSubdomain ? [sourceSubdomain] : [],
            infrastructure: service.infrastructure || null,
            isInfrastructure: service.isInfrastructure || false,
            primaryService: service.primaryService || null,
            // FIXED: Include metadata for sovereignty analysis
            metadata: service.metadata || {}
        };
    }

    // Merge services
    mergeService(existingService, newService, sourceSubdomain) {
        // Add source subdomain if not already present
        if (sourceSubdomain && !existingService.sourceSubdomains.includes(sourceSubdomain)) {
            existingService.sourceSubdomains.push(sourceSubdomain);
        }

        // Merge records
        if (newService.records) {
            existingService.records = [...existingService.records, ...newService.records];
        }

        // Merge record types
        if (newService.recordTypes) {
            for (const recordType of newService.recordTypes) {
                if (!existingService.recordTypes.includes(recordType)) {
                    existingService.recordTypes.push(recordType);
                }
            }
        }

        // Update infrastructure information
        if (newService.infrastructure) {
            existingService.infrastructure = newService.infrastructure;
        }
        
        // FIXED: Merge metadata including ASN info
        if (newService.metadata) {
            existingService.metadata = { ...existingService.metadata, ...newService.metadata };
        }

        // Prefer cloud category over infrastructure for vendor services
        const vendorServices = ['Amazon AWS', 'Microsoft Azure', 'Google Cloud Platform', 'DigitalOcean', 'Linode', 'Hetzner'];
        if (vendorServices.includes(existingService.name) && 
            newService.category === 'cloud' && 
            existingService.category === 'infrastructure') {
            existingService.category = 'cloud';
            existingService.description = newService.description || existingService.description;
        }
    }

    // Deduplicate historical records
    deduplicateHistoricalRecords(historicalRecords) {
        const recordsMap = new Map();
        const uniqueRecords = [];

        for (const record of historicalRecords) {
            const key = record.subdomain;
            
            if (!recordsMap.has(key)) {
                recordsMap.set(key, record);
                uniqueRecords.push(record);
            } else {
                // Keep the record with more information
                const existingRecord = recordsMap.get(key);
                const existingScore = this.getRecordInfoScore(existingRecord);
                const newScore = this.getRecordInfoScore(record);
                
                if (newScore > existingScore) {
                    const index = uniqueRecords.findIndex(r => r.subdomain === key);
                    if (index !== -1) {
                        uniqueRecords[index] = record;
                        recordsMap.set(key, record);
                    }
                }
            }
        }

        return uniqueRecords;
    }

    // Score record information completeness
    getRecordInfoScore(record) {
        let score = 0;
        
        if (record.issuer && record.issuer !== 'Unknown') score += 2;
        if (record.expiry && record.expiry !== 'Unknown') score += 2;
        if (record.source && record.source !== 'Unknown') score += 1;
        if (record.discovered) score += 1;
        
        // Prefer certain sources
        if (record.source === 'crt.sh') score += 1;
        if (record.source === 'Cert Spotter') score += 1;
        
        return score;
    }

    // Get services by category
    getServicesByCategory(category) {
        return Array.from(this.processedData.services.values())
            .filter(service => service.category === category);
    }

    // Get services by vendor
    getServicesByVendor(vendor) {
        return Array.from(this.processedData.services.values())
            .filter(service => this.getVendorFromService(service) === vendor);
    }

    // Get vendor from service
    getVendorFromService(service) {
        if (service.name.includes('Microsoft')) return 'Microsoft';
        if (service.name.includes('Amazon') || service.name.includes('AWS')) return 'Amazon AWS';
        if (service.name.includes('ProofPoint')) return 'ProofPoint';
        if (service.name.includes('Google')) return 'Google';
        if (service.name.includes('Cloudflare')) return 'Cloudflare';
        if (service.name.includes('DigitalOcean')) return 'DigitalOcean';
        return 'Other';
    }

    // Get all services
    getAllServices() {
        return Array.from(this.processedData.services.values());
    }

    // Get unclassified subdomains (only those that don't appear anywhere else)
    getUnclassifiedSubdomains() {
        const allServices = this.getAllServices();
        const categorizedSubdomains = new Set();
        
        // Collect all subdomains that are categorized in services
        for (const service of allServices) {
            if (service.sourceSubdomains) {
                service.sourceSubdomains.forEach(sub => categorizedSubdomains.add(sub));
            }
        }

        // Also collect subdomains that appear in CNAME mappings
        const cnameSubdomains = this.getCNAMEMappings();
        const cnameSubdomainNames = new Set(cnameSubdomains.map(sub => sub.subdomain));

        // Return subdomains that are:
        // 1. Not categorized in any service
        // 2. Not in CNAME mappings
        // 3. Have IP addresses (not historical)
        // 4. Not redirects to main domain
        const unclassified = Array.from(this.processedData.subdomains.values()).filter(subdomain => 
            !categorizedSubdomains.has(subdomain.subdomain) && 
            !cnameSubdomainNames.has(subdomain.subdomain) &&
            subdomain.ipAddresses.length > 0 &&
            !this.hasSignificantCNAME(subdomain)
        );

        console.log(`🔍 Subdomain classification: ${categorizedSubdomains.size} in services, ${cnameSubdomainNames.size} in CNAME mappings, ${unclassified.length} unclassified`);
        
        return unclassified;
    }

    // Check if subdomain has significant CNAME (for CNAME mappings section)
    hasSignificantCNAME(subdomain) {
        return (subdomain.cnameTarget && subdomain.cnameTarget !== subdomain.subdomain) ||
               (subdomain.cnameChain && subdomain.cnameChain.length > 0);
    }

    // Get CNAME mappings
    getCNAMEMappings() {
        const allServices = this.getAllServices();
        const categorizedSubdomains = new Set();
        
        // Collect categorized subdomains
        for (const service of allServices) {
            if (service.sourceSubdomains) {
                service.sourceSubdomains.forEach(sub => categorizedSubdomains.add(sub));
            }
        }

        // Return subdomains with CNAME that are not categorized
        return Array.from(this.processedData.subdomains.values()).filter(subdomain => 
            this.hasSignificantCNAME(subdomain) && 
            !categorizedSubdomains.has(subdomain.subdomain)
        );
    }

    // Get all services
    getAllServices() {
        return Array.from(this.processedData.services.values());
    }

    // Calculate statistics
    calculateStats() {
        const services = Array.from(this.processedData.services.values());
        const subdomains = Array.from(this.processedData.subdomains.values());
        
        // Provider analysis
        const providers = new Set();
        services.forEach(service => {
            if (service.metadata?.provider) {
                providers.add(service.metadata.provider);
            }
        });
        
        subdomains.forEach(subdomain => {
            if (subdomain.asnInfo?.isp && subdomain.asnInfo.isp !== 'Unknown') {
                providers.add(subdomain.asnInfo.isp);
            }
        });

        return {
            totalServices: services.length,
            totalSubdomains: subdomains.length,
            totalProviders: providers.size,
            totalHistoricalRecords: this.processedData.historicalRecords.length
        };
    }

    // Data Sovereignty Analysis - NEW FEATURE
    analyzeSovereignty() {
        const sovereigntyData = {
            countryDistribution: new Map(),
            services: new Map(),
            subdomains: new Map(),
            potentialIssues: [],
            riskAssessment: {
                high: [],
                medium: [],
                low: []
            },
            statistics: {
                totalIPs: 0,
                uniqueCountries: 0,
                primaryDataLocations: [],
                complianceAlerts: []
            }
        };

        console.log('🌍 Starting data sovereignty analysis...');

        // DEBUG: Log the data structures we're working with
        const services = Array.from(this.processedData.services.values());
        const subdomains = Array.from(this.processedData.subdomains.values());
        
        console.log(`🔍 DEBUG: Found ${services.length} services and ${subdomains.length} subdomains to analyze`);
        
        // DEBUG: Sample a few entries to see the structure
        if (services.length > 0) {
            console.log('🔍 DEBUG: Sample service structure:', JSON.stringify(services[0], null, 2));
        }
        if (subdomains.length > 0) {
            console.log('🔍 DEBUG: Sample subdomain structure:', JSON.stringify(subdomains[0], null, 2));
        }

        // Analyze services by geographic location
        let servicesWithASN = 0;
        services.forEach(service => {
            if (service.metadata?.asnInfo) {
                servicesWithASN++;
                console.log(`🔍 DEBUG: Processing service ${service.name} with ASN info:`, service.metadata.asnInfo);
                this.processSovereigntyLocation(service.metadata.asnInfo, service.name, 'service', sovereigntyData);
            } else {
                console.log(`🔍 DEBUG: Service ${service.name} has no ASN info. Metadata:`, service.metadata);
            }
        });

        // Analyze subdomains by geographic location  
        let subdomainsWithASN = 0;
        subdomains.forEach(subdomain => {
            if (subdomain.asnInfo) {
                subdomainsWithASN++;
                this.processSovereigntyLocation(subdomain.asnInfo, subdomain.subdomain, 'subdomain', sovereigntyData);
            }
            // Skip subdomains without ASN info (no IP addresses) - this is normal
        });

        console.log(`🌍 Sovereignty: ${servicesWithASN} services and ${subdomainsWithASN} subdomains with ASN data`);

        // Calculate statistics
        sovereigntyData.statistics.totalIPs = [...services, ...subdomains].reduce((count, item) => {
            const ips = item.ipAddresses || (item.metadata?.asnInfo ? 1 : 0);
            return count + (Array.isArray(ips) ? ips.length : ips ? 1 : 0);
        }, 0);

        sovereigntyData.statistics.uniqueCountries = sovereigntyData.countryDistribution.size;

        // Determine primary data locations (countries with most services/IPs)
        const sortedCountries = Array.from(sovereigntyData.countryDistribution.entries())
            .sort((a, b) => (b[1].totalIPs + b[1].services.length) - (a[1].totalIPs + a[1].services.length))
            .slice(0, 5);

        sovereigntyData.statistics.primaryDataLocations = sortedCountries.map(([country, data]) => ({
            country: data.countryName,
            countryCode: country,
            totalIPs: data.totalIPs,
            services: data.services.length,
            subdomains: data.subdomains.length
        }));

        // Identify potential sovereignty issues
        this.identifySovereigntyIssues(sovereigntyData);

        console.log(`🌍 Sovereignty analysis complete: ${sovereigntyData.statistics.uniqueCountries} countries, ${sovereigntyData.statistics.totalIPs} IP addresses`);

        return sovereigntyData;
    }

    // Process individual location for sovereignty analysis
    processSovereigntyLocation(asnInfo, entityName, entityType, sovereigntyData) {
        if (!asnInfo || !asnInfo.country || asnInfo.country === 'Unknown') {
            return;
        }

        const country = asnInfo.country;
        const countryName = asnInfo.countryName || country;

        // Initialize country data if not exists
        if (!sovereigntyData.countryDistribution.has(country)) {
            sovereigntyData.countryDistribution.set(country, {
                country: country,
                countryName: countryName,
                region: asnInfo.region || 'Unknown',
                timezone: asnInfo.timezone || 'Unknown',
                services: [],
                subdomains: [],
                totalIPs: 0,
                providers: new Set()
            });
        }

        const countryData = sovereigntyData.countryDistribution.get(country);

        // Add entity to appropriate collection
        if (entityType === 'service') {
            countryData.services.push({
                name: entityName,
                provider: asnInfo.isp || 'Unknown',
                city: asnInfo.city || 'Unknown',
                asn: asnInfo.asn || 'Unknown'
            });
            countryData.totalIPs += 1;
        } else if (entityType === 'subdomain') {
            countryData.subdomains.push({
                name: entityName,
                provider: asnInfo.isp || 'Unknown',
                city: asnInfo.city || 'Unknown',
                asn: asnInfo.asn || 'Unknown'
            });
            countryData.totalIPs += 1;
        }

        // Track providers
        if (asnInfo.isp && asnInfo.isp !== 'Unknown') {
            countryData.providers.add(asnInfo.isp);
        }
    }

    // Identify potential data sovereignty issues
    identifySovereigntyIssues(sovereigntyData) {
        const countries = Array.from(sovereigntyData.countryDistribution.entries());

        // Define compliance frameworks and their requirements
        const complianceFrameworks = {
            'GDPR': {
                name: 'GDPR (EU)',
                restrictedTransfers: ['CN', 'RU', 'US*'], // US requires adequacy decision or SCCs
                preferredLocations: ['EU', 'UK', 'CA', 'JP', 'KR', 'NZ', 'CH', 'AD', 'AR', 'UY', 'IL'],
                euCountries: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']
            },
            'CCPA': {
                name: 'CCPA (California)',
                restrictedTransfers: ['CN', 'RU'],
                preferredLocations: ['US', 'CA', 'EU']
            },
            'PIPEDA': {
                name: 'PIPEDA (Canada)',
                restrictedTransfers: ['CN', 'RU'],
                preferredLocations: ['CA', 'US', 'EU']
            },
            'DPA': {
                name: 'Data Protection Act (UK)',
                restrictedTransfers: ['CN', 'RU'],
                preferredLocations: ['GB', 'EU', 'US', 'CA']
            }
        };

        // Check for high-risk countries
        const highRiskCountries = ['CN', 'RU', 'IR', 'KP'];  // Countries with data localization requirements or restricted access
        const mediumRiskCountries = ['US', 'IN', 'VN', 'TR']; // Countries with some data access laws

        countries.forEach(([countryCode, countryData]) => {
            const totalEntities = countryData.services.length + countryData.subdomains.length;
            
            if (totalEntities === 0) return;

            let riskLevel = 'low';
            let issues = [];

            // High-risk country assessment
            if (highRiskCountries.includes(countryCode)) {
                riskLevel = 'high';
                issues.push(`Data stored in ${countryData.countryName} may be subject to local data access laws`);
                issues.push(`Consider data localization requirements in ${countryData.countryName}`);
            } else if (mediumRiskCountries.includes(countryCode)) {
                riskLevel = 'medium';
                issues.push(`${countryData.countryName} has data access laws that may affect data sovereignty`);
            }

            // Cross-border transfer assessment
            if (countryCode === 'US' && totalEntities > 3) {
                issues.push('Multiple services in US - verify Privacy Shield successor/SCCs for EU data transfers');
            }

            // China-specific issues
            if (countryCode === 'CN') {
                issues.push('Data in China subject to National Intelligence Law - consider implications');
                issues.push('Cybersecurity Law may require data localization');
            }

            // Russia-specific issues
            if (countryCode === 'RU') {
                issues.push('Russian data localization laws may apply');
                issues.push('Personal data of Russian citizens must be stored in Russia');
            }

            // Add GDPR compliance check
            const isEUCountry = complianceFrameworks.GDPR.euCountries.includes(countryCode);
            if (!isEUCountry && totalEntities > 2) {
                issues.push(`Non-EU location: Verify adequacy decision or appropriate safeguards for GDPR compliance`);
            }

            // Create risk assessment entry
            const riskEntry = {
                country: countryData.countryName,
                countryCode: countryCode,
                riskLevel: riskLevel,
                totalServices: countryData.services.length,
                totalSubdomains: countryData.subdomains.length,
                totalIPs: countryData.totalIPs,
                issues: issues,
                providers: Array.from(countryData.providers),
                details: {
                    region: countryData.region,
                    timezone: countryData.timezone,
                    mainProviders: Array.from(countryData.providers).slice(0, 3)
                }
            };

            sovereigntyData.riskAssessment[riskLevel].push(riskEntry);
            
            // Add to potential issues list
            if (issues.length > 0) {
                sovereigntyData.potentialIssues.push(...issues.map(issue => ({
                    country: countryData.countryName,
                    countryCode: countryCode,
                    issue: issue,
                    severity: riskLevel,
                    affectedServices: countryData.services.length,
                    affectedSubdomains: countryData.subdomains.length
                })));
            }
        });

        // Generate compliance alerts
        const totalCountries = countries.length;
        if (totalCountries > 10) {
            sovereigntyData.statistics.complianceAlerts.push({
                type: 'multi-jurisdiction',
                message: `Data spread across ${totalCountries} countries - review cross-border transfer agreements`,
                severity: 'medium'
            });
        }

        if (sovereigntyData.riskAssessment.high.length > 0) {
            sovereigntyData.statistics.complianceAlerts.push({
                type: 'high-risk-countries',
                message: `Data present in ${sovereigntyData.riskAssessment.high.length} high-risk jurisdictions`,
                severity: 'high'
            });
        }

        // Check for common compliance scenarios
        const hasEUData = countries.some(([code]) => complianceFrameworks.GDPR.euCountries.includes(code));
        const hasUSData = countries.some(([code]) => code === 'US');
        const hasChinaData = countries.some(([code]) => code === 'CN');

        if (hasEUData && hasUSData) {
            sovereigntyData.statistics.complianceAlerts.push({
                type: 'eu-us-transfer',
                message: 'EU-US data transfers detected - verify adequacy framework compliance',
                severity: 'medium'
            });
        }

        if (hasEUData && hasChinaData) {
            sovereigntyData.statistics.complianceAlerts.push({
                type: 'eu-china-transfer',
                message: 'EU-China data transfers detected - high compliance risk',
                severity: 'high'
            });
        }
    }

    // Check if a subdomain should be categorized as historical (no active DNS records)
    isHistoricalSubdomain(subdomain) {
        // Subdomain is historical if it has no IP addresses and no significant CNAME records
        const hasNoIPs = !subdomain.ip && (!subdomain.ipAddresses || subdomain.ipAddresses.length === 0);
        const hasNoSignificantCNAME = !this.hasSignificantCNAME(subdomain);
        
        return hasNoIPs && hasNoSignificantCNAME;
    }

    // Get active subdomains (include all processed subdomains, even inactive ones)
    getActiveSubdomains() {
        return Array.from(this.processedData.subdomains.values());
    }

    // Get processed data
    getProcessedData() {
        return {
            services: this.processedData.services,
            subdomains: this.processedData.subdomains,
            redirectsToMain: this.processedData.redirectsToMain,
            historicalRecords: this.processedData.historicalRecords,
            stats: this.calculateStats()
        };
    }

    // Clear all processed data
    clearProcessedData() {
        this.processedData.services.clear();
        this.processedData.subdomains.clear();
        this.processedData.redirectsToMain = [];
        this.processedData.historicalRecords = [];
        this.processedData.dnsRecords = [];
    }

    // Group subdomains by provider (for display)
    groupSubdomainsByProvider(subdomains) {
        const providerMap = new Map();
        
        for (const subdomain of subdomains) {
            let vendor = 'Unknown';
            
            if (subdomain.primaryService && subdomain.primaryService.name) {
                vendor = subdomain.primaryService.name;
            } else if (subdomain.vendor && 
                       typeof subdomain.vendor === 'object' && 
                       subdomain.vendor.vendor) {
                vendor = subdomain.vendor.vendor;
            }
            
            if (!providerMap.has(vendor)) {
                providerMap.set(vendor, {
                    vendor: vendor,
                    subdomains: [],
                    totalSubdomains: 0,
                    ips: new Set()
                });
            }
            
            const provider = providerMap.get(vendor);
            provider.subdomains.push(subdomain);
            provider.totalSubdomains++;
            
            if (subdomain.ipAddresses.length > 0) {
                subdomain.ipAddresses.forEach(ip => provider.ips.add(ip));
            }
        }
        
        // Convert to array format
        return Array.from(providerMap.values()).map(provider => ({
            ...provider,
            ips: Array.from(provider.ips),
            uniqueIPs: provider.ips.size
        }));
    }
} 