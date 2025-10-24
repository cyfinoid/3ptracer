// Analysis Controller - Orchestrates the entire analysis process
class AnalysisController {
    constructor(dependencies = {}) {
        // Use dependency injection with fallbacks
        this.dnsAnalyzer = dependencies.dnsAnalyzer || new DNSAnalyzer();
        this.serviceDetector = dependencies.serviceDetector || new ServiceDetectionEngine();
        this.dataProcessor = dependencies.dataProcessor || new DataProcessor();
        this.uiRenderer = dependencies.uiRenderer || new UIRenderer();
        
        // API notifications
        this.apiNotifications = [];
        
        // Debug utility
        this.debug = {
            isEnabled: false,
            log: (message, data = null) => {
                if (this.debug.isEnabled) {
                    if (data) {
                        console.log(`🔍 DEBUG: ${message}`, data);
                    } else {
                        console.log(`🔍 DEBUG: ${message}`);
                    }
                }
            },
            logJSON: (message, data) => {
                if (this.debug.isEnabled) {
                    console.log(`🔍 DEBUG: ${message}`);
                    console.log(JSON.stringify(data, null, 2));
                }
            },
            logStats: (stats) => {
                if (this.debug.isEnabled) {
                    console.log('📊 DEBUG: Final Statistics');
                    console.log(JSON.stringify(stats, null, 2));
                } else {
                    console.log(`📊 Analysis Complete: ${stats.totalServices} services, ${stats.totalSubdomains} subdomains`);
                }
            }
        };
    }

    // Main analysis method with progressive display
    async analyzeDomain(domain) {
        try {
            // Setup debug mode
            this.setupDebugMode();
            
            console.log(`🚀 Starting analysis for domain: ${domain}`);
            
            // Clear all internal state
            this.clearInternalState(domain);
            
            // Setup API notification handling
            this.setupAPINotifications();
            
            // Phase 1: Analyze main domain (fast)
            this.uiRenderer.updateProgress(10, 'Analyzing main domain...');
            const mainDomainResults = await this.analyzeMainDomain(domain);
            
            // 🚀 SHOW IMMEDIATE RESULTS - Display main domain analysis right away
            this.uiRenderer.updateProgress(15, 'Displaying initial results...');
            await this.displayProgressiveResults(mainDomainResults, [], [], {});
            
            // Phase 2: Discover subdomains (slow - can take 10-30 seconds)
            this.uiRenderer.updateProgress(20, 'Discovering subdomains from multiple sources...');
            const subdomains = await this.discoverSubdomainsWithProgress(domain);
            
            // Phase 3: Analyze subdomains progressively
            this.uiRenderer.updateProgress(40, 'Analyzing discovered subdomains...');
            const subdomainResults = await this.analyzeSubdomainsWithProgress(subdomains, mainDomainResults);
            
            // Phase 4: Get ASN information
            this.uiRenderer.updateProgress(70, 'Getting network information...');
            await this.enrichWithASNInfo(subdomainResults);
            
            // Phase 5: Security analysis
            this.uiRenderer.updateProgress(85, 'Performing security analysis...');
            const securityResults = await this.performSecurityAnalysis(mainDomainResults, subdomainResults);
            
            // Phase 6: Final processing and display
            this.uiRenderer.updateProgress(95, 'Finalizing results...');
            const processedData = this.processResults(mainDomainResults, subdomainResults, securityResults);
            
            // Phase 7: Show complete results
            this.uiRenderer.updateProgress(100, 'Analysis complete!');
            this.displayResults(processedData, securityResults);
            
            // Enable export functionality with enhanced data
            console.log('🔍 Checking export manager availability:', !!window.exportManager);
            if (window.exportManager) {
                console.log('📊 Setting analysis data for export...');
                
                // Add dataProcessor reference to processedData for export (same as UIRenderer)
                const enhancedProcessedData = {
                    ...processedData,
                    dataProcessor: this.dataProcessor
                };
                
                window.exportManager.setAnalysisData(enhancedProcessedData, securityResults, domain);
                console.log('✅ Export data set successfully');
            } else {
                console.error('❌ Export manager not available');
            }
            
            console.log(`🎉 Analysis complete for ${domain}!`);
            this.debug.logStats(processedData.stats);
            
        } catch (error) {
            console.error('❌ Analysis failed:', error);
            this.uiRenderer.showError('Analysis failed: ' + error.message);
        }
    }

    // Setup debug mode
    setupDebugMode() {
        const debugCheckbox = document.getElementById('debugMode');
        this.debug.isEnabled = debugCheckbox ? debugCheckbox.checked : false;
        
        if (this.debug.isEnabled) {
            console.log('🔍 DEBUG MODE ENABLED - Detailed output will be shown');
        }
    }

    // Clear all internal state
    clearInternalState(domain) {
        this.dnsAnalyzer.resetStats();
        this.dnsAnalyzer.setCurrentDomain(domain);
        this.dataProcessor.clearProcessedData();
        this.apiNotifications = [];
        
        console.log('🧹 All internal state cleared for new analysis');
    }

    // Setup API notification handling
    setupAPINotifications() {
        this.dnsAnalyzer.onAPINotification((apiName, status, message) => {
            this.addAPINotification(apiName, status, message);
        });
    }

    // Analyze main domain
    async analyzeMainDomain(domain) {
        console.log(`📋 Analyzing main domain: ${domain}`);
        
        const mainDomainResults = await this.dnsAnalyzer.analyzeMainDomain(domain);
        this.debug.logJSON('Main domain analysis complete:', mainDomainResults.records || {});
        
        // Detect services from main domain
        if (mainDomainResults.records) {
            const services = this.serviceDetector.detectServices(mainDomainResults.records, domain);
            mainDomainResults.services = services;
            this.debug.logJSON('Services detected from main domain:', services);
            console.log(`✅ Found ${services.length} services from main domain`);
        }
        
        return mainDomainResults;
    }

    // Discover subdomains
    async discoverSubdomains(domain) {
        console.log(`🔍 Discovering subdomains for: ${domain}`);
        
        const subdomains = await this.dnsAnalyzer.getSubdomainsFromCT(domain);
        this.debug.logJSON('Subdomains discovered:', subdomains);
        console.log(`✅ Found ${subdomains.length} subdomains`);
        
        return subdomains;
    }

    // Discover subdomains with progress feedback and timeout
    async discoverSubdomainsWithProgress(domain) {
        console.log(`🔍 Discovering subdomains for ${domain} with progress feedback...`);
        
        // Update progress for each source
        this.uiRenderer.updateProgress(22, 'Querying Certificate Transparency logs...');
        this.addAPINotification('Certificate Transparency', 'Querying crt.sh and other CT logs (may take 30-90 seconds)...', 'info');
        
        try {
            // Use the new optimized discovery approach
            const subdomains = await this.dnsAnalyzer.getSubdomainsFromCT(domain);
            
            // Get final stats from discovery queue
            const discoveryStats = this.dnsAnalyzer.discoveryQueue.getStats();
            
            this.uiRenderer.updateProgress(35, `Found ${discoveryStats.total} subdomains, processed ${discoveryStats.processed}`);
            this.addAPINotification('Subdomain Discovery', `Found ${discoveryStats.total} subdomains from Certificate Transparency logs`, 'success');
            
            this.debug.logJSON('Subdomains discovered:', subdomains);
            console.log(`✅ Found and processed ${subdomains.length} subdomains`);
            
            return subdomains;
            
        } catch (error) {
            console.warn(`⚠️ Subdomain discovery error:`, error.message);
            
            // Get detailed API status information
            const apiStatuses = this.dnsAnalyzer.getCTApiStatuses();
            
            if (error.message.includes('timeout')) {
                // Generate detailed timeout message
                let timeoutMessage = 'Certificate Transparency APIs timeout after 90 seconds: ';
                const timeoutDetails = [];
                
                // Check if we have API status information
                if (apiStatuses && (apiStatuses.completed.length > 0 || apiStatuses.timeout.length > 0 || apiStatuses.failed.length > 0)) {
                    if (apiStatuses.completed.length > 0) {
                        timeoutDetails.push(`✅ ${apiStatuses.completed.join(', ')} succeeded`);
                    }
                    if (apiStatuses.timeout.length > 0) {
                        timeoutDetails.push(`⏰ ${apiStatuses.timeout.join(', ')} timed out`);
                    }
                    if (apiStatuses.failed.length > 0) {
                        timeoutDetails.push(`❌ ${apiStatuses.failed.join(', ')} failed`);
                    }
                    timeoutMessage += timeoutDetails.join('; ');
                } else {
                    // Fallback message when API status tracking isn't available
                    timeoutMessage += 'External Certificate Transparency APIs (crt.sh, Cert Spotter, OTX, HackerTarget) are responding slowly';
                }
                
                this.addAPINotification('Certificate Transparency', timeoutMessage + '. Continuing analysis with any available subdomain data.', 'warning');
            } else {
                this.addAPINotification('Subdomain Discovery', `Warning: ${error.message}. Continuing with available data.`, 'warning');
            }
            
            // FIXED: Return processed subdomain results even when discovery times out
            const processedResults = this.dnsAnalyzer.getProcessedSubdomainResults();
            if (processedResults.length > 0) {
                console.log(`✅ Returning ${processedResults.length} processed subdomain results despite timeout`);
                this.addAPINotification('Subdomain Discovery', `Found ${processedResults.length} subdomains that were processed before timeout`, 'success');
                return processedResults.map(result => result.subdomain);
            }
            
            // Continue with empty array if no processed results available
            return [];
        }
    }

    // Analyze subdomains
    async analyzeSubdomains(subdomains) {
        console.log(`📊 Analyzing ${subdomains.length} subdomains...`);
        
        const subdomainResults = await this.dnsAnalyzer.analyzeSubdomains(subdomains);
        this.debug.logJSON('Subdomain analysis results:', subdomainResults);
        console.log(`✅ Analyzed ${subdomainResults.length} subdomains`);
        
        return subdomainResults;
    }

    // Analyze subdomains with progressive updates
    async analyzeSubdomainsWithProgress(subdomains, mainDomainResults) {
        console.log(`📊 Analyzing ${subdomains.length} subdomains with progressive updates...`);
        
        if (subdomains.length === 0) {
            console.log(`ℹ️ No subdomains to analyze`);
            
            // FIXED: Check if we have processed results available
            const processedResults = this.dnsAnalyzer.getProcessedSubdomainResults();
            if (processedResults.length > 0) {
                console.log(`✅ Found ${processedResults.length} processed subdomain results, using those instead`);
                this.addAPINotification('DNS Analysis', `Using ${processedResults.length} previously processed subdomains`, 'info');
                return processedResults;
            }
            
            return [];
        }

        // With the new discovery queue approach, subdomains are already processed
        // Just return them directly since they're already analyzed
        console.log(`✅ Subdomains already processed via discovery queue, returning ${subdomains.length} results`);
        
        // Show progressive results with subdomains
        this.uiRenderer.updateProgress(60, `Returning ${subdomains.length} processed subdomains...`);
        await this.displayProgressiveResults(mainDomainResults, subdomains, [], {});
        
        this.addAPINotification('DNS Analysis', `Completed analysis of ${subdomains.length} subdomains`, 'success');
        this.debug.logJSON('Subdomain analysis results:', subdomains);
        console.log(`✅ Subdomain analysis complete: ${subdomains.length} results`);
        
        return subdomains;
    }

    // Enrich subdomain results with ASN information
    async enrichWithASNInfo(subdomainResults) {
        console.log(`📡 Getting ASN information for subdomain IPs...`);
        
        for (const subdomain of subdomainResults) {
            // Initialize vendor with safe default
            if (!subdomain.vendor) {
                subdomain.vendor = { vendor: 'Unknown', category: 'Unknown' };
            }
            
            if (subdomain.ip && !subdomain.isRedirectToMain) {
                try {
                    const asnInfo = await this.dnsAnalyzer.getASNInfo(subdomain.ip);
                    if (asnInfo && typeof asnInfo === 'object') {
                        subdomain.vendor = this.serviceDetector.classifyVendor(asnInfo);
                        // FIXED: Store the raw ASN info for sovereignty analysis
                        subdomain.asnInfo = asnInfo;
                        this.debug.log(`ASN info for ${subdomain.ip}: ${asnInfo.asn || 'Unknown'}`);
                    } else {
                        console.warn(`⚠️ Invalid ASN response for ${subdomain.ip}`);
                        subdomain.vendor = { vendor: 'Unknown', category: 'Unknown' };
                        subdomain.asnInfo = null;
                    }
                } catch (error) {
                    console.warn(`⚠️ ASN lookup failed for ${subdomain.ip}:`, error.message);
                    subdomain.vendor = { vendor: 'Unknown', category: 'Unknown' };
                    subdomain.asnInfo = null;
                }
            }
        }
        
        console.log(`✅ ASN enrichment complete`);
    }

    // Perform comprehensive security analysis
    async performSecurityAnalysis(mainDomainResults, subdomainResults) {
        console.log(`🔒 Performing security analysis...`);
        
        const securityResults = {
            takeovers: [],
            dnsIssues: [],
            emailIssues: [],
            cloudIssues: [],
            wildcardCertificates: []
        };

        if (mainDomainResults?.records) {
            // DNS security issues
            securityResults.dnsIssues = this.serviceDetector.detectDNSSecurityIssues(mainDomainResults.records);
            this.debug.logJSON('DNS security issues:', securityResults.dnsIssues);
            
            // Email security issues
            securityResults.emailIssues = this.serviceDetector.detectEmailSecurityIssues(mainDomainResults.records);
            this.debug.logJSON('Email security issues:', securityResults.emailIssues);
            
            // Cloud security issues
            securityResults.cloudIssues = this.serviceDetector.detectCloudSecurityIssues(mainDomainResults.records, subdomainResults);
            this.debug.logJSON('Cloud security issues:', securityResults.cloudIssues);
            
            // Subdomain takeover detection
            if (mainDomainResults.records.CNAME) {
                securityResults.takeovers = this.serviceDetector.detectTakeoverFromCNAME(mainDomainResults.records.CNAME);
                this.debug.logJSON('Takeover vulnerabilities:', securityResults.takeovers);
            }
        }

        // Wildcard certificate security analysis
        const wildcardCerts = this.dnsAnalyzer.getWildcardCertificates();
        if (wildcardCerts && wildcardCerts.length > 0) {
            securityResults.wildcardCertificates = this.serviceDetector.detectWildcardCertificateIssues(wildcardCerts);
            this.debug.logJSON('Wildcard certificate issues:', securityResults.wildcardCertificates);
        }

        // Process DNS records separately from services
        const dnsRecords = mainDomainResults?.records ? 
            this.serviceDetector.processDNSRecords(mainDomainResults.records) : [];
        this.debug.logJSON('DNS records:', dnsRecords);
        
        securityResults.dnsRecords = dnsRecords;

        const totalIssues = Object.values(securityResults).reduce((sum, issues) => sum + issues.length, 0);
        console.log(`✅ Security analysis complete: ${totalIssues} issues found`);
        
        return securityResults;
    }

    // Process and consolidate all results
    processResults(mainDomainResults, subdomainResults, securityResults) {
        console.log(`🔄 Processing and consolidating results...`);
        
        // Get historical records
        const historicalRecords = this.dnsAnalyzer.getHistoricalRecords();
        
        // Process all data through the data processor, including DNS records
        const processedData = this.dataProcessor.processAnalysisResults(
            mainDomainResults,
            subdomainResults,
            historicalRecords,
            securityResults?.dnsRecords || []
        );
        
        // Add XMPP subdomain service detection
        if (subdomainResults && subdomainResults.length > 0) {
            console.log(`🗨️ Detecting XMPP services from subdomains...`);
            const xmppServices = this.serviceDetector.detectXMPPServices(subdomainResults);
            if (xmppServices.length > 0) {
                console.log(`✅ Found ${xmppServices.length} XMPP services`);
                // Add XMPP services to the processed data services
                if (!processedData.services) processedData.services = new Map();
                xmppServices.forEach(service => {
                    const key = `${service.subdomain}-xmpp`;
                    processedData.services.set(key, service);
                });
            }
        }
        
        // NEW: Add Data Sovereignty Analysis
        console.log(`🌍 Running data sovereignty analysis...`);
        const sovereigntyData = this.dataProcessor.analyzeSovereignty();
        processedData.sovereigntyAnalysis = sovereigntyData;
        
        this.debug.logJSON('Processed data:', processedData);
        console.log(`✅ Data processing complete with sovereignty analysis`);
        
        return processedData;
    }

    // Display progressive results (main domain first, then updates)
    async displayProgressiveResults(mainDomainResults, subdomainResults, historicalRecords, securityResults) {
        console.log(`🎨 Displaying progressive results (${subdomainResults.length} subdomains so far)...`);
        
        // Process available data
        const processedData = this.processResults(mainDomainResults, subdomainResults, securityResults);
        
        // Get interesting findings from available subdomains
        const interestingFindings = subdomainResults.length > 0 ? 
            this.getInterestingFindings(processedData) : [];
        
        // Add dataProcessor reference to processedData for UIRenderer
        const enhancedProcessedData = {
            ...processedData,
            dataProcessor: this.dataProcessor
        };
        
        // Display what we have so far with progressive flag
        this.uiRenderer.displayResults(
            enhancedProcessedData,
            securityResults,
            interestingFindings,
            this.apiNotifications,
            true // isProgressive = true
        );
        
        console.log(`✅ Progressive results displayed`);
    }

    // Display all results
    displayResults(processedData, securityResults) {
        console.log(`🎨 Rendering results...`);
        
        // Get interesting findings
        const interestingFindings = this.getInterestingFindings(processedData);
        
        // Add dataProcessor reference to processedData for UIRenderer
        const enhancedProcessedData = {
            ...processedData,
            dataProcessor: this.dataProcessor
        };
        
        // Render everything
        this.uiRenderer.displayResults(
            enhancedProcessedData,
            securityResults,
            interestingFindings,
            this.apiNotifications
        );
        
        console.log(`✅ Results displayed successfully`);
    }

    // Get interesting infrastructure findings (only from active subdomains)
    getInterestingFindings(processedData) {
        // Use the DataProcessor's method to get only active subdomains
        const activeSubdomains = this.dataProcessor.getActiveSubdomains();
        const totalSubdomains = Array.from(processedData.subdomains.values()).length;
        
        this.debug.log(`Analyzing interesting findings for ${activeSubdomains.length} active subdomains (out of ${totalSubdomains} total)`);
        
        return this.serviceDetector.detectInterestingInfrastructureFindings({}, activeSubdomains);
    }

    // Add API notification
    addAPINotification(apiName, status, message) {
        this.apiNotifications.push({
            api: apiName,
            status: status,
            message: message,
            timestamp: new Date().toLocaleTimeString()
        });
        this.debug.log(`API ${apiName}: ${status} - ${message}`);
    }

    // Get analysis statistics
    getAnalysisStats() {
        return this.dnsAnalyzer.stats;
    }

    // Print final statistics
    printFinalStats() {
        this.dnsAnalyzer.printStats();
    }

    // Static factory method for creating a configured instance
    static create() {
        const dnsAnalyzer = new DNSAnalyzer();
        const serviceDetector = new ServiceDetectionEngine();
        const dataProcessor = new DataProcessor();
        const uiRenderer = new UIRenderer();

        return new AnalysisController({
            dnsAnalyzer,
            serviceDetector,
            dataProcessor,
            uiRenderer
        });
    }
} 