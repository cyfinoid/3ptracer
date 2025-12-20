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
    }

    // M10: Quick Scan Mode - skip subdomain discovery for faster results
    async analyzeQuickScan(domain) {
        try {
            this.setupDebugMode();
            console.log(`⚡ Starting QUICK SCAN for domain: ${domain}`);
            
            this.clearInternalState(domain);
            this.setupAPINotifications();
            this.addAPINotification('Quick Scan', 'Running in Quick Scan mode - subdomain discovery skipped for faster results', 'info');
            
            // Phase 1: Analyze main domain only
            this.uiRenderer.updateProgress(20, 'Analyzing main domain...');
            const mainDomainResults = await this.analyzeMainDomain(domain);
            
            // Phase 2: Security analysis (no subdomains)
            this.uiRenderer.updateProgress(60, 'Performing security analysis...');
            const securityResults = await this.performSecurityAnalysis(mainDomainResults, []);
            
            // Phase 3: Final processing
            this.uiRenderer.updateProgress(90, 'Finalizing results...');
            const processedData = this.processResults(mainDomainResults, [], securityResults);
            
            // Phase 4: Display results
            this.uiRenderer.updateProgress(100, 'Quick scan complete!');
            this.displayResults(processedData, securityResults);
            
            // Enable export
            if (window.exportManager) {
                const interestingFindings = this.getInterestingFindings(processedData);
                const enhancedProcessedData = { ...processedData, dataProcessor: this.dataProcessor };
                window.exportManager.setAnalysisData(enhancedProcessedData, securityResults, domain, interestingFindings);
            }
            
            console.log(`⚡ Quick scan complete for ${domain}!`);
            
        } catch (error) {
            console.error('Quick scan failed:', error);
            this.uiRenderer.showError('Quick scan failed: ' + error.message);
            throw error;
        }
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
                
                // Get interesting findings (same as displayed in UI)
                const interestingFindings = this.getInterestingFindings(processedData);
                
                // Add dataProcessor reference to processedData for export (same as UIRenderer)
                const enhancedProcessedData = {
                    ...processedData,
                    dataProcessor: this.dataProcessor
                };
                
                window.exportManager.setAnalysisData(enhancedProcessedData, securityResults, domain, interestingFindings);
                console.log('✅ Export data set successfully');
            } else {
                console.error('❌ Export manager not available');
            }
            
            console.log(`🎉 Analysis complete for ${domain}!`);
            if (window.logger) {
                window.logger.stats('Analysis Complete', processedData.stats);
            }
            
        } catch (error) {
            console.error('❌ Analysis failed:', error);
            this.uiRenderer.showError('Analysis failed: ' + error.message);
        }
    }

    // Setup debug mode
    setupDebugMode() {
        const debugCheckbox = document.getElementById('debugMode');
        const isEnabled = debugCheckbox ? debugCheckbox.checked : false;
        
        // Set global logger debug mode
        if (window.logger) {
            window.logger.setDebugMode(isEnabled);
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
        if (window.logger) {
            window.logger.debugJSON('Main domain analysis complete:', mainDomainResults.records || {});
        }
        
        // Detect services from main domain
        if (mainDomainResults.records) {
            const services = this.serviceDetector.detectServices(mainDomainResults.records, domain);
            mainDomainResults.services = services;
            if (window.logger) {
                window.logger.debugJSON('Services detected from main domain:', services);
            }
            console.log(`✅ Found ${services.length} services from main domain`);
        }
        
        return mainDomainResults;
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
            
            if (window.logger) {
                window.logger.debugJSON('Subdomains discovered:', subdomains);
            }
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
                    timeoutMessage += 'External Certificate Transparency APIs (crt.sh, SSLMate CT Search, HackerTarget) are responding slowly';
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
        if (window.logger) {
            window.logger.debugJSON('Subdomain analysis results:', subdomains);
        }
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
                        if (window.logger) {
                            window.logger.debug(`ASN info for ${subdomain.ip}: ${asnInfo.asn || 'Unknown'}`);
                        }
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
            wildcardCertificates: [],
            spfChainAnalysis: null,  // H1: SPF Include Chain Analysis
            mtaSts: null,            // H2: MTA-STS Detection
            bimi: null,              // H3: BIMI Detection
            smtpTlsReporting: null,  // H7: SMTP TLS Reporting
            dnssec: null,            // M1: DNSSEC Validation
            danglingNS: null,        // M6: Dangling NS Record Detection
            daneTLSA: null           // L10: DANE/TLSA Record Checking
        };

        // H1: Perform SPF Include Chain Analysis
        if (mainDomainResults?.domain) {
            this.uiRenderer.updateProgress(86, 'Analyzing SPF include chain...');
            try {
                securityResults.spfChainAnalysis = await this.dnsAnalyzer.analyzeSPFChain(mainDomainResults.domain);
                if (window.logger) {
                    window.logger.debugJSON('SPF chain analysis:', securityResults.spfChainAnalysis);
                }
                
                // Add warnings/errors to email issues if limit exceeded
                if (securityResults.spfChainAnalysis?.exceededLimit) {
                    securityResults.emailIssues.push({
                        type: 'SPF Lookup Limit Exceeded',
                        risk: 'high',
                        description: `SPF record exceeds RFC 7208 lookup limit: ${securityResults.spfChainAnalysis.lookupCount}/${securityResults.spfChainAnalysis.maxLookups} lookups. This may cause email delivery failures.`,
                        recommendation: 'Flatten SPF record by replacing include mechanisms with direct IP addresses, or use SPF macros strategically.'
                    });
                }
                
                // Add void lookup warnings
                if (securityResults.spfChainAnalysis?.voidLookups > 2) {
                    securityResults.emailIssues.push({
                        type: 'Excessive SPF Void Lookups',
                        risk: 'medium',
                        description: `SPF record has ${securityResults.spfChainAnalysis.voidLookups} void lookups (domains that don't exist or have no SPF). RFC 7208 recommends max 2.`,
                        recommendation: 'Remove invalid include mechanisms from SPF record.'
                    });
                }
            } catch (error) {
                console.warn('SPF chain analysis failed:', error.message);
            }
            
            // H2: Check MTA-STS
            this.uiRenderer.updateProgress(87, 'Checking MTA-STS configuration...');
            try {
                securityResults.mtaSts = await this.dnsAnalyzer.checkMTASTS(mainDomainResults.domain);
                if (window.logger) {
                    window.logger.debugJSON('MTA-STS check:', securityResults.mtaSts);
                }
                
                // Add informational finding if MTA-STS is not enabled
                if (!securityResults.mtaSts?.enabled) {
                    securityResults.emailIssues.push({
                        type: 'MTA-STS Not Configured',
                        risk: 'low',
                        description: 'MTA-STS (Mail Transfer Agent Strict Transport Security) is not configured. This email security standard helps prevent man-in-the-middle attacks on email delivery.',
                        recommendation: 'Consider implementing MTA-STS by creating _mta-sts TXT record and hosting policy file at mta-sts.domain/.well-known/mta-sts.txt'
                    });
                }
            } catch (error) {
                console.warn('MTA-STS check failed:', error.message);
            }
            
            // H3: Check BIMI
            this.uiRenderer.updateProgress(87, 'Checking BIMI configuration...');
            try {
                securityResults.bimi = await this.dnsAnalyzer.checkBIMI(mainDomainResults.domain);
                if (window.logger) {
                    window.logger.debugJSON('BIMI check:', securityResults.bimi);
                }
                // BIMI is optional, no warning if not configured
            } catch (error) {
                console.warn('BIMI check failed:', error.message);
            }
            
            // H7: Check SMTP TLS Reporting
            this.uiRenderer.updateProgress(87, 'Checking SMTP TLS Reporting...');
            try {
                securityResults.smtpTlsReporting = await this.dnsAnalyzer.checkSMTPTLSReporting(mainDomainResults.domain);
                if (window.logger) {
                    window.logger.debugJSON('SMTP TLS Reporting check:', securityResults.smtpTlsReporting);
                }
                // TLS-RPT is optional, no warning if not configured
            } catch (error) {
                console.warn('SMTP TLS Reporting check failed:', error.message);
            }
            
            // M1: Check DNSSEC
            this.uiRenderer.updateProgress(88, 'Checking DNSSEC configuration...');
            try {
                securityResults.dnssec = await this.dnsAnalyzer.checkDNSSEC(mainDomainResults.domain);
                if (window.logger) {
                    window.logger.debugJSON('DNSSEC check:', securityResults.dnssec);
                }
                
                // Add security finding if DNSSEC is not configured
                if (securityResults.dnssec?.status === 'unsigned') {
                    securityResults.dnsIssues.push({
                        type: 'DNSSEC Not Configured',
                        risk: 'low',
                        description: 'DNSSEC is not configured for this domain. DNSSEC provides authentication of DNS responses and protection against DNS spoofing.',
                        recommendation: 'Consider enabling DNSSEC with your domain registrar and DNS provider to enhance DNS security.'
                    });
                } else if (securityResults.dnssec?.status === 'insecure') {
                    securityResults.dnsIssues.push({
                        type: 'DNSSEC Partially Configured',
                        risk: 'medium',
                        description: 'DNSSEC keys are present but the chain of trust is not complete. DS records may be missing at the parent zone.',
                        recommendation: 'Verify that DS records are published at your domain registrar to complete the DNSSEC chain of trust.'
                    });
                }
            } catch (error) {
                console.warn('DNSSEC check failed:', error.message);
            }
            
            // M6: Check for dangling NS records
            this.uiRenderer.updateProgress(89, 'Checking for dangling NS records...');
            try {
                securityResults.danglingNS = await this.dnsAnalyzer.checkDanglingNS(mainDomainResults.domain);
                if (window.logger) {
                    window.logger.debugJSON('Dangling NS check:', securityResults.danglingNS);
                }
                
                // Add any dangling NS issues to DNS issues
                if (securityResults.danglingNS?.issues?.length > 0) {
                    for (const issue of securityResults.danglingNS.issues) {
                        securityResults.dnsIssues.push({
                            type: issue.type,
                            risk: issue.risk,
                            description: issue.description,
                            recommendation: issue.recommendation,
                            details: `Nameserver: ${issue.nameserver}`
                        });
                    }
                }
            } catch (error) {
                console.warn('Dangling NS check failed:', error.message);
            }
            
            // L10: Check for DANE/TLSA records
            this.uiRenderer.updateProgress(89, 'Checking DANE/TLSA records...');
            try {
                securityResults.daneTLSA = await this.dnsAnalyzer.checkDANETLSA(mainDomainResults.domain);
                if (window.logger) {
                    window.logger.debugJSON('DANE/TLSA check:', securityResults.daneTLSA);
                }
                // DANE is informational - no warning if not configured
            } catch (error) {
                console.warn('DANE/TLSA check failed:', error.message);
            }
        }

        if (mainDomainResults?.records) {
            // DNS security issues
            securityResults.dnsIssues = this.serviceDetector.detectDNSSecurityIssues(mainDomainResults.records);
            if (window.logger) {
                window.logger.debugJSON('DNS security issues:', securityResults.dnsIssues);
            }
            
            // Email security issues
            securityResults.emailIssues = this.serviceDetector.detectEmailSecurityIssues(mainDomainResults.records);
            if (window.logger) {
                window.logger.debugJSON('Email security issues:', securityResults.emailIssues);
            }
            
            // Cloud security issues
            securityResults.cloudIssues = this.serviceDetector.detectCloudSecurityIssues(mainDomainResults.records, subdomainResults);
            if (window.logger) {
                window.logger.debugJSON('Cloud security issues:', securityResults.cloudIssues);
            }
            
            // Subdomain takeover detection
            if (mainDomainResults.records.CNAME) {
                securityResults.takeovers = this.serviceDetector.detectTakeoverFromCNAME(mainDomainResults.records.CNAME);
                if (window.logger) {
                    window.logger.debugJSON('Takeover vulnerabilities:', securityResults.takeovers);
                }
            }
        }

        // Wildcard certificate security analysis
        const wildcardCerts = this.dnsAnalyzer.getWildcardCertificates();
        if (wildcardCerts && wildcardCerts.length > 0) {
            securityResults.wildcardCertificates = this.serviceDetector.detectWildcardCertificateIssues(wildcardCerts);
            if (window.logger) {
                window.logger.debugJSON('Wildcard certificate issues:', securityResults.wildcardCertificates);
            }
        }

        // CAA record validation against certificates
        if (mainDomainResults?.records?.CAA && subdomainResults && subdomainResults.length > 0) {
            const caaViolations = this.serviceDetector.validateCertificatesAgainstCAA(
                mainDomainResults.records.CAA,
                subdomainResults
            );
            if (caaViolations.length > 0) {
                securityResults.cloudIssues.push(...caaViolations);
                if (window.logger) {
                    window.logger.debugJSON('CAA violations:', caaViolations);
                }
            }
        }

        // Check IPs and domains against abuse blocklists
        this.uiRenderer.updateProgress(88, 'Checking IPs and domains against abuse blocklists...');
        const blocklistIssues = await this.checkBlocklists(mainDomainResults, subdomainResults);
        if (blocklistIssues.length > 0) {
            securityResults.cloudIssues.push(...blocklistIssues);
            if (window.logger) {
                window.logger.debugJSON('Blocklist issues:', blocklistIssues);
            }
        }

        // Process DNS records separately from services
        const dnsRecords = mainDomainResults?.records ? 
            this.serviceDetector.processDNSRecords(mainDomainResults.records) : [];
        if (window.logger) {
            window.logger.debugJSON('DNS records:', dnsRecords);
        }
        
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
        
        if (window.logger) {
            window.logger.debugJSON('Processed data:', processedData);
        }
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
        
        if (window.logger) {
            window.logger.debug(`Analyzing interesting findings for ${activeSubdomains.length} active subdomains (out of ${totalSubdomains} total)`);
        }
        
        return this.serviceDetector.detectInterestingInfrastructureFindings({}, activeSubdomains);
    }

    // Check IPs and domains against abuse blocklists
    async checkBlocklists(mainDomainResults, subdomainResults) {
        const issues = [];
        const checkedIPs = new Set();
        const checkedDomains = new Set();

        console.log(`🔍 Checking IPs and domains against abuse blocklists...`);

        // Check main domain against all blocklists (Spamhaus DBL, SURBL, URIBL)
        if (mainDomainResults?.domain) {
            const domain = mainDomainResults.domain;
            if (!checkedDomains.has(domain)) {
                checkedDomains.add(domain);
                try {
                    // M5: Check against all blocklists
                    const blocklistResults = await this.dnsAnalyzer.checkDomainAgainstAllBlocklists(domain);
                    for (const result of blocklistResults) {
                        if (result.listed) {
                            issues.push({
                                type: 'malicious_domain',
                                risk: result.severity,
                                description: `Domain is listed in ${result.blocklist}: ${result.threats}`,
                                recommendation: 'This domain is flagged in abuse blocklists. Review and investigate the domain reputation. Consider removing or replacing this domain if it is associated with malicious activity.',
                                domain: domain,
                                blocklist: result.blocklist,
                                threats: result.threats,
                                codes: result.codes?.join(', ') || result.lists?.join(', ') || ''
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to check domain ${domain} against blocklists:`, error.message);
                }
            }
        }

        // Check subdomain IPs against Spamhaus ZEN
        if (subdomainResults && subdomainResults.length > 0) {
            for (const subdomain of subdomainResults) {
                const ipToCheck = subdomain.ip || (subdomain.ipAddresses && subdomain.ipAddresses.length > 0 ? subdomain.ipAddresses[0] : null);
                
                if (ipToCheck && !checkedIPs.has(ipToCheck)) {
                    // Skip private IPs (already handled by internal_ip_exposure)
                    const privateIPInfo = this.serviceDetector.isPrivateIP(ipToCheck);
                    if (!privateIPInfo || !privateIPInfo.isPrivate) {
                        checkedIPs.add(ipToCheck);
                        try {
                            const zenResult = await this.dnsAnalyzer.checkIPAgainstSpamhausZEN(ipToCheck);
                            if (zenResult && zenResult.listed) {
                                issues.push({
                                    type: 'abuse_ip',
                                    risk: zenResult.severity,
                                    description: `IP address ${ipToCheck} is listed in ${zenResult.blocklist}: ${zenResult.blocklists}`,
                                    recommendation: 'This IP address is flagged in abuse blocklists. Review the subdomain and IP association. Consider removing or investigating this IP if it is associated with malicious activity.',
                                    subdomain: subdomain.subdomain,
                                    ip: ipToCheck,
                                    blocklist: zenResult.blocklist,
                                    blocklists: zenResult.blocklists,
                                    codes: zenResult.codes.join(', ')
                                });
                            }
                        } catch (error) {
                            console.warn(`Failed to check IP ${ipToCheck} against blocklist:`, error.message);
                        }
                    }
                }

                // M5: Check subdomain against all blocklists (Spamhaus DBL, SURBL, URIBL)
                if (subdomain.subdomain && !checkedDomains.has(subdomain.subdomain)) {
                    checkedDomains.add(subdomain.subdomain);
                    try {
                        const blocklistResults = await this.dnsAnalyzer.checkDomainAgainstAllBlocklists(subdomain.subdomain);
                        for (const result of blocklistResults) {
                            if (result.listed) {
                                issues.push({
                                    type: 'malicious_domain',
                                    risk: result.severity,
                                    description: `Subdomain is listed in ${result.blocklist}: ${result.threats}`,
                                    recommendation: 'This subdomain is flagged in abuse blocklists. Review and investigate the subdomain reputation. Consider removing or replacing this subdomain if it is associated with malicious activity.',
                                    subdomain: subdomain.subdomain,
                                    blocklist: result.blocklist,
                                    threats: result.threats,
                                    codes: result.codes?.join(', ') || result.lists?.join(', ') || ''
                                });
                            }
                        }
                    } catch (error) {
                        console.warn(`Failed to check subdomain ${subdomain.subdomain} against blocklists:`, error.message);
                    }
                }
            }
        }

        console.log(`✅ Blocklist checking complete: ${issues.length} issues found`);
        return issues;
    }

    // Add API notification
    addAPINotification(apiName, status, message) {
        this.apiNotifications.push({
            api: apiName,
            status: status,
            message: message,
            timestamp: new Date().toLocaleTimeString()
        });
        if (window.logger) {
            window.logger.debug(`API ${apiName}: ${status} - ${message}`);
        }
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