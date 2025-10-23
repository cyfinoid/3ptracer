// UI Rendering Engine
class UIRenderer {
    constructor() {
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultsDiv = document.getElementById('results');
        this.statsDiv = document.getElementById('stats');
        this.sectionCounter = 0; // For unique section IDs
    }

    // Update progress bar
    updateProgress(percentage, text) {
        if (this.progressSection) this.progressSection.style.display = 'block';
        if (this.progressFill) this.progressFill.style.width = percentage + '%';
        if (this.progressText) this.progressText.textContent = text;
    }

    // Show error message
    showError(message) {
        if (this.resultsDiv) {
            this.resultsDiv.style.display = 'block';
            this.resultsDiv.innerHTML = `
                <div class="error-message">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        }
    }

    // Create a collapsible section
    createCollapsibleSection(title, content, isExpanded = true, itemCount = null) {
        const sectionId = `section-${++this.sectionCounter}`;
        const itemCountText = itemCount ? ` (${itemCount})` : '';
        const expandedClass = isExpanded ? 'expanded' : '';
        const displayStyle = isExpanded ? 'block' : 'none';
        
        return `
            <div class="collapsible-section ${expandedClass}">
                <div class="section-header" onclick="toggleSection('${sectionId}')">
                    <div class="section-title">
                        <span class="toggle-icon">${isExpanded ? '▼' : '▶'}</span>
                        <h2>${title}${itemCountText}</h2>
                    </div>
                </div>
                <div id="${sectionId}" class="section-content" style="display: ${displayStyle};">
                    ${content}
                </div>
            </div>
        `;
    }

    // Display a major section wrapped in collapsible container
    displayCollapsibleSection(title, renderFunction, isExpanded = true, itemCount = null) {
        // Create a temporary container to capture the output
        const tempDiv = document.createElement('div');
        
        // Temporarily redirect the display method's output to our temp container
        const originalDiv = this.resultsDiv;
        this.resultsDiv = tempDiv;
        
        // Call the render function to generate content
        renderFunction();
        
        // Restore original results div
        this.resultsDiv = originalDiv;
        
        // Get the generated content
        const content = tempDiv.innerHTML;
        
        // Only create the section if there's actual content
        if (content.trim()) {
            const collapsibleHTML = this.createCollapsibleSection(title, content, isExpanded, itemCount);
            this.resultsDiv.innerHTML += collapsibleHTML;
        }
    }

    // Global toggle function (needs to be accessible from onclick)
    static initializeToggleFunction() {
        if (!window.toggleSection) {
            window.toggleSection = function(sectionId) {
                const content = document.getElementById(sectionId);
                const section = content.closest('.collapsible-section');
                const icon = section.querySelector('.toggle-icon');
                
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    icon.textContent = '▼';
                    section.classList.add('expanded');
                } else {
                    content.style.display = 'none';
                    icon.textContent = '▶';
                    section.classList.remove('expanded');
                }
            };
        }
    }

    // Display all results
    displayResults(processedData, securityResults, interestingFindings, apiNotifications, isProgressive = false) {
        if (this.resultsDiv) {
            this.resultsDiv.style.display = 'block';
        }

        // Initialize toggle function
        UIRenderer.initializeToggleFunction();

        // Add progressive status message if this is a progressive update
        if (isProgressive) {
            this.showProgressiveStatus(processedData.stats);
        }

        this.displayStats(processedData.stats, securityResults);
        this.displayAPINotifications(apiNotifications);
        
        // Wrap major sections in collapsible containers
        this.displayCollapsibleSection('Third-Party Services', () => {
            this.displayServicesByVendor(processedData.services);
        }, true, processedData.stats.totalServices || 0);
        
        // NEW: Display Data Sovereignty Analysis (only for complete analysis)
        if (!isProgressive && processedData.sovereigntyAnalysis) {
            this.displayCollapsibleSection('Data Sovereignty Analysis', () => {
                this.displayDataSovereignty(processedData.sovereigntyAnalysis);
            }, false); 
        }
        
        this.displayCollapsibleSection('Security Issues', () => {
            this.displaySecurity(securityResults);
        }, true, this.calculateTotalSecurityIssues(securityResults));
        
        this.displayCollapsibleSection('Infrastructure Analysis', () => {
            this.displayInterestingFindings(interestingFindings);
        }, false, interestingFindings?.length || 0);
        
        this.displayCollapsibleSection('Domain Redirects', () => {
            this.displayRedirectsToMain(processedData.redirectsToMain);
        }, false, processedData.redirectsToMain?.length || 0);
        
        this.displayCollapsibleSection('CNAME Mappings', () => {
            this.displayCNAMEMappings(processedData);
        }, false, processedData.cnameCount || 0);
        
        this.displayCollapsibleSection('DNS Records', () => {
            this.displayDNSRecords(processedData.dnsRecords);
        }, false, processedData.dnsRecords?.length || 0);
        
        this.displayCollapsibleSection('Subdomains', () => {
            this.displaySubdomains(processedData);
        }, true, processedData.stats.totalSubdomains || 0);
        
        this.displayCollapsibleSection('Historical Records', () => {
            this.displayHistoricalRecords(processedData.historicalRecords);
        }, false, processedData.historicalRecords?.length || 0);
    }

    // Display statistics
    displayStats(stats, securityResults) {
        if (!this.statsDiv) return;

        const totalSecurityIssues = this.calculateTotalSecurityIssues(securityResults);

        this.statsDiv.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${stats.totalServices}</div>
                <div class="stat-label">Services Found</div>
                <div class="tooltip">
                    Third-party services detected from DNS records including email providers (Gmail, Outlook), 
                    cloud platforms (AWS, Cloudflare), analytics tools (Google Analytics), and security services. 
                    Found via MX, CNAME, TXT, and SPF record analysis.
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.totalSubdomains}</div>
                <div class="stat-label">Subdomains</div>
                <div class="tooltip">
                    Active subdomains discovered from certificate transparency logs and DNS analysis. 
                    Only includes subdomains that currently resolve to IP addresses. 
                    Excludes historical/obsolete subdomains and redirects to main domain.
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.totalProviders || 0}</div>
                <div class="stat-label">Hosting Providers</div>
                <div class="tooltip">
                    Unique hosting and infrastructure providers identified through service detection and 
                    ASN (Autonomous System Number) lookups. Includes cloud providers, CDNs, email services, 
                    and DNS providers used by this domain.
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalSecurityIssues}</div>
                <div class="stat-label">Security Issues</div>
                <div class="tooltip">
                    Potential security concerns including missing SPF/DMARC records, weak email policies, 
                    possible subdomain takeover vulnerabilities, and exposed cloud services. 
                    Requires manual verification - automated detection only.
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.totalHistoricalRecords || 0}</div>
                <div class="stat-label">Historical Records</div>
                <div class="tooltip">
                    Subdomains found in certificate transparency logs but no longer have active DNS records. 
                    These represent historical infrastructure that may have been decommissioned or moved. 
                    Useful for understanding past domain usage.
                </div>
            </div>
        `;
    }

    // Calculate total security issues
    calculateTotalSecurityIssues(securityResults) {
        return (securityResults.takeovers?.length || 0) +
               (securityResults.dnsIssues?.length || 0) +
               (securityResults.emailIssues?.length || 0) +
               (securityResults.cloudIssues?.length || 0);
    }

    // Display services grouped by vendor
    displayServicesByVendor(services) {
        const vendors = ['Microsoft', 'Amazon AWS', 'ProofPoint', 'Google', 'Cloudflare', 'DigitalOcean', 'Linode', 'Hetzner', 'Other'];
        
        vendors.forEach(vendor => {
            const vendorServices = Array.from(services.values()).filter(service => 
                this.getVendorFromService(service) === vendor
            );
            
            this.displayVendorServices(vendor, vendorServices);
        });
    }

    // Hide all vendor sections
    hideAllVendorSections() {
        const vendorSections = [
            'microsoftServices', 'awsServices', 'proofpointServices',
            'googleServices', 'cloudflareServices', 'digitaloceanServices',
            'linodeServices', 'hetznerServices', 'otherServices'
        ];
        
        vendorSections.forEach(containerId => {
            const container = document.getElementById(containerId);
            const section = container?.closest('.service-category');
            if (section) {
                section.style.display = 'none';
            }
        });
    }

    // Get vendor from service
    getVendorFromService(service) {
        if (service.name.includes('Microsoft')) return 'Microsoft';
        if (service.name.includes('Amazon') || service.name.includes('AWS')) return 'Amazon AWS';
        if (service.name.includes('ProofPoint')) return 'ProofPoint';
        if (service.name.includes('Google')) return 'Google';
        if (service.name.includes('Cloudflare')) return 'Cloudflare';
        if (service.name.includes('DigitalOcean')) return 'DigitalOcean';
        if (service.name.includes('Linode')) return 'Linode';
        if (service.name.includes('Hetzner')) return 'Hetzner';
        return 'Other';
    }

    // Display services for a specific vendor
    displayVendorServices(vendor, services) {
        const containerId = this.getVendorContainerId(vendor);
        const container = document.getElementById(containerId);
        const section = container?.closest('.service-category');
        
        if (!container) return;
        
        if (services.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        
        if (section) section.style.display = 'block';
        
        let html = '';
        services.forEach(service => {
            html += this.renderService(service);
        });
        
        container.innerHTML = html;
    }

    // Get container ID for vendor
    getVendorContainerId(vendor) {
        const vendorMap = {
            'Microsoft': 'microsoftServices',
            'Amazon AWS': 'awsServices',
            'ProofPoint': 'proofpointServices',
            'Google': 'googleServices',
            'Cloudflare': 'cloudflareServices',
            'DigitalOcean': 'digitaloceanServices',
            'Linode': 'linodeServices',
            'Hetzner': 'hetznerServices',
            'Other': 'otherServices'
        };
        
        return vendorMap[vendor] || 'otherServices';
    }

    // Render a single service
    renderService(service) {
        const uniqueSubdomains = new Set();
        for (const record of service.records || []) {
            if (record.subdomain) {
                uniqueSubdomains.add(record.subdomain);
            }
        }
        
        const subdomainCount = uniqueSubdomains.size;
        const recordTypes = service.recordTypes || [];
        const recordTypesText = recordTypes.length > 1 ? 
            ` (${recordTypes.join(', ')} records)` : 
            ` (${subdomainCount} records)`;
        
        // Check if this is a third-party DMARC service
        const isThirdPartyDMARC = service.isThirdParty && recordTypes.includes('DMARC');
        const isUnknownThirdParty = isThirdPartyDMARC && !service.isKnownService;
        
        // Check if this is a third-party email service (DKIM)
        const isThirdPartyEmail = service.isThirdParty && service.isEmailService;
        const isHighConfidenceEmail = isThirdPartyEmail && service.confidence === 'high';
        
        // Determine overall third-party status
        const isAnyThirdParty = isThirdPartyDMARC || isThirdPartyEmail;
        const isHighRiskThirdParty = isUnknownThirdParty || isHighConfidenceEmail;
        
        // Special styling for third-party services
        const cardClass = isAnyThirdParty ? 
            (isThirdPartyDMARC ? 'service-card third-party-dmarc' : 'service-card third-party-email') : 
            'service-card';
            
        const alertStyle = isHighRiskThirdParty ? 
            'background: #fff3cd; border-left: 4px solid #ff6b35; padding: 8px; margin: 8px 0; border-radius: 4px;' :
            isAnyThirdParty ? 
            'background: #e8f4f8; border-left: 4px solid #17a2b8; padding: 8px; margin: 8px 0; border-radius: 4px;' :
            '';
        
        let html = `
            <div class="${cardClass}">
                <div class="service-header">
                    <h3>${service.name}${recordTypesText}</h3>
                </div>
                <p class="service-description">${service.description}</p>
        `;
        
        // Add third-party DMARC warning
        if (isThirdPartyDMARC) {
            const warningIcon = isUnknownThirdParty ? '🚨' : '⚠️';
            const warningText = isUnknownThirdParty ? 
                'UNKNOWN EXTERNAL DEPENDENCY: This domain receives your DMARC reports but is not a recognized service provider.' :
                'THIRD-PARTY DEPENDENCY: Your DMARC reports are sent to this external service.';
            
            html += `
                <div style="${alertStyle}">
                    <strong>${warningIcon} ${warningText}</strong><br>
                    <span style="color: #666; font-size: 0.9em;">
                        ${service.securityImplication || 'Email authentication data is shared externally.'}
                        ${service.reportingEmail ? `<br>📧 Reports sent to: ${service.reportingEmail}` : ''}
                        ${service.domain ? `<br>🌐 External domain: ${service.domain}` : ''}
                    </span>
                </div>
            `;
        }

        // Add third-party email service warning (DKIM)
        if (isThirdPartyEmail) {
            const warningIcon = isHighConfidenceEmail ? '🚨' : '⚠️';
            const confidenceText = service.confidence === 'high' ? 'CONFIRMED' : 
                                 service.confidence === 'medium' ? 'LIKELY' : 'POSSIBLE';
            const warningText = `${confidenceText} THIRD-PARTY EMAIL SERVICE: Your emails are being sent through an external service.`;
            
            html += `
                <div style="${alertStyle}">
                    <strong>${warningIcon} ${warningText}</strong><br>
                    <span style="color: #666; font-size: 0.9em;">
                        ${service.securityImplication || 'Email delivery handled by external service.'}
                        ${service.selector ? `<br>🔑 DKIM Selector: ${service.selector}` : ''}
                        ${service.keyType ? `<br>🔐 Key Type: ${service.keyType}` : ''}
                        ${service.confidence ? `<br>📊 Confidence: ${service.confidence}` : ''}
                    </span>
                </div>
            `;
        }
        
        // Show infrastructure information
        if (service.infrastructure) {
            html += `
                <div class="service-infrastructure" style="background: #f8f9fa; padding: 8px; margin: 8px 0; border-radius: 4px; border-left: 3px solid #007bff;">
                    <strong>🏗️ Infrastructure:</strong> ${service.infrastructure.name}<br>
                    <span style="color: #666; font-size: 0.9em;">${service.infrastructure.description}</span>
                </div>
            `;
        }
        
        html += '<div class="service-records">';
        
        // Group records by type
        const groupedRecords = this.groupRecordsByType(service.records || []);
        
        for (const [recordType, records] of Object.entries(groupedRecords)) {
            const uniqueSubdomains = new Set(records.map(r => r.subdomain).filter(Boolean));
            const countText = uniqueSubdomains.size > 1 ? ` (${uniqueSubdomains.size} records)` : '';
            
            html += `<strong>${recordType}${countText}:</strong><br>`;
            
            // Group by subdomain
            const subdomainGroups = this.groupRecordsBySubdomain(records);
            
            for (const [subdomain, subdomainRecords] of Object.entries(subdomainGroups)) {
                if (subdomainRecords.length > 1) {
                    // Only CNAME records should be chained (they represent actual DNS resolution chains)
                    if (recordType === 'CNAME') {
                        const chain = [this.createSubdomainLink(subdomain)];
                        subdomainRecords.forEach(record => {
                            chain.push(record.data);
                        });
                        html += `• ${chain.join(' → ')}<br>`;
                    } else {
                        // All other record types (TXT, MX, NS, etc.) should be separate line items
                        subdomainRecords.forEach(record => {
                            let recordText = `• ${this.createSubdomainLink(subdomain)} → ${record.data}`;
                            if (record.TTL) {
                                recordText += ` (TTL: ${record.TTL}s)`;
                            }
                            if (record.priority !== null && record.priority !== undefined) {
                                recordText += ` (Priority: ${record.priority})`;
                            }
                            html += `${recordText}<br>`;
                        });
                    }
                } else {
                    // Single record
                    const record = subdomainRecords[0];
                    let recordText = `• ${this.createSubdomainLink(subdomain)} → ${record.data}`;
                    if (record.TTL) {
                        recordText += ` (TTL: ${record.TTL}s)`;
                    }
                    if (record.priority !== null && record.priority !== undefined) {
                        recordText += ` (Priority: ${record.priority})`;
                    }
                    html += `${recordText}<br>`;
                }
            }
        }
        
        html += '</div></div>';
        return html;
    }

    // Group records by type
    groupRecordsByType(records) {
        const grouped = {};
        for (const record of records) {
            const recordType = this.getDNSRecordTypeName(record.type) || 'UNKNOWN';
            if (!grouped[recordType]) {
                grouped[recordType] = [];
            }
            grouped[recordType].push(record);
        }
        return grouped;
    }

    // Group records by subdomain
    groupRecordsBySubdomain(records) {
        const grouped = {};
        for (const record of records) {
            const subdomain = record.subdomain || 'unknown';
            if (!grouped[subdomain]) {
                grouped[subdomain] = [];
            }
            grouped[subdomain].push(record);
        }
        return grouped;
    }

    // Create subdomain link
    createSubdomainLink(subdomain) {
        return `<a href="https://${subdomain}" target="_blank" style="color: #2196f3; text-decoration: underline;">${subdomain}</a>`;
    }

    // Get DNS record type name
    getDNSRecordTypeName(typeNumber) {
        const recordTypes = {
            1: 'A', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA',
            2: 'NS', 12: 'PTR', 33: 'SRV', 46: 'RRSIG', 47: 'NSEC',
            48: 'DNSKEY', 43: 'DS', 44: 'SSHFP', 45: 'IPSECKEY',
            99: 'SPF', 250: 'CAA', 257: 'CAA'
        };
        return recordTypes[typeNumber] || `Type ${typeNumber}`;
    }

    // Display security issues
    displaySecurity(securityResults) {
        const container = document.getElementById('securityServices');
        const section = container?.closest('.service-category');
        
        if (!container) return;
        
        // Collect all security issues including wildcard certificates
        const allIssues = [
            ...(securityResults.takeovers || []).map(issue => ({ ...issue, category: 'takeover' })),
            ...(securityResults.dnsIssues || []).map(issue => ({ ...issue, category: 'dns' })),
            ...(securityResults.emailIssues || []).map(issue => ({ ...issue, category: 'email' })),
            ...(securityResults.cloudIssues || []).map(issue => ({ ...issue, category: 'cloud' })),
            ...(securityResults.wildcardCertificates || []).map(issue => ({ ...issue, category: 'certificate' }))
        ];
        
        if (allIssues.length === 0) {
            if (section) section.style.display = 'none';
            return;   
        }
        
        if (section) section.style.display = 'block';
        
        // Group by risk level
        const riskGroups = {
            high: allIssues.filter(issue => issue.risk === 'high'),
            medium: allIssues.filter(issue => issue.risk === 'medium'),
            low: allIssues.filter(issue => issue.risk === 'low')
        };
        
        let html = '';
        
        if (riskGroups.high.length > 0) {
            html += `<div class="risk-section"><h4>🚨 High Risk Issues (${riskGroups.high.length})</h4>`;
            riskGroups.high.forEach(issue => {
                html += this.formatSecurityIssue(issue);
            });
            html += '</div>';
        }
        
        if (riskGroups.medium.length > 0) {
            html += `<div class="risk-section"><h4>⚠️ Medium Risk Issues (${riskGroups.medium.length})</h4>`;
            riskGroups.medium.forEach(issue => {
                html += this.formatSecurityIssue(issue);
            });
            html += '</div>';
        }
        
        if (riskGroups.low.length > 0) {
            html += `<div class="risk-section"><h4>ℹ️ Low Risk Issues (${riskGroups.low.length})</h4>`;
            riskGroups.low.forEach(issue => {
                html += this.formatSecurityIssue(issue);
            });
            html += '</div>';
        }
        
        container.innerHTML = html;
    }

    // Format security issue
    formatSecurityIssue(issue) {
        const riskColors = {
            critical: '#8B0000', high: '#FF8C00', medium: '#FFD700',
            low: '#0066CC', info: '#FFFFFF'
        };
        
        const categoryIcons = {
            takeover: '🎯', dns: '🌐', email: '📧',
            infrastructure: '🏗️', cloud: '☁️', certificate: '🔐'
        };
        
        const icon = categoryIcons[issue.category] || '🔍';
        const color = riskColors[issue.risk] || '#6c757d';
        
        let html = `
            <div class="service-item security-issues" style="border-left: 4px solid ${color};">
                <div class="service-name">${icon} ${issue.description}</div>
                <div class="service-description">
                    <strong>Risk:</strong> ${issue.risk.toUpperCase()}<br>
                    <strong>Type:</strong> ${issue.type}<br>
                    ${issue.recommendation ? `<strong>Recommendation:</strong> ${issue.recommendation}<br>` : ''}
                </div>
        `;
        
        // Add specific details
        if (issue.subdomain) html += `<div class="service-records"><strong>Subdomain:</strong> ${this.createSubdomainLink(issue.subdomain)}<br>`;
        if (issue.cname) html += `<strong>CNAME:</strong> ${issue.cname}<br>`;
        if (issue.service) html += `<strong>Service:</strong> ${issue.service}<br>`;
        if (issue.ip) html += `<strong>IP:</strong> ${issue.ip}<br>`;
        if (issue.record) html += `<strong>Record:</strong> ${issue.record}<br>`;
        if (issue.pattern) html += `<strong>Pattern:</strong> ${issue.pattern}<br>`;
        
        html += '</div></div>';
        return html;
    }

    // Display interesting findings
    displayInterestingFindings(interestingFindings) {
        const container = document.getElementById('interestingFindings');
        const section = container?.closest('.service-category');
        
        if (!container) return;
        
        if (!interestingFindings || interestingFindings.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        
        if (section) section.style.display = 'block';
        
        const patternFindings = interestingFindings.filter(f => f.type === 'interesting_subdomain');
        const serviceFindings = interestingFindings.filter(f => f.type === 'service_subdomain');
        
        let html = `<div class="risk-section"><h4>🔍 Interesting Infrastructure Findings (${interestingFindings.length})</h4>`;
        html += '<p style="color: #666; font-size: 0.9rem; margin-bottom: 15px;"><em>⚠️ Note: These findings are based on pattern matching of active subdomains only. Historical/obsolete subdomains are excluded. No actual content verification is performed.</em></p>';
        
        if (serviceFindings.length > 0) {
            html += `<div style="margin-bottom: 20px;"><h5 style="color: #17a2b8; margin-bottom: 10px;">🔧 Service-Related Subdomains (${serviceFindings.length})</h5>`;
            serviceFindings.forEach(finding => {
                html += this.formatInterestingFinding(finding);
            });
            html += '</div>';
        }
        
        if (patternFindings.length > 0) {
            html += `<div style="margin-bottom: 20px;"><h5 style="color: #17a2b8; margin-bottom: 10px;">🔍 Interesting Patterns (${patternFindings.length})</h5>`;
            patternFindings.forEach(finding => {
                html += this.formatInterestingFinding(finding);
            });
            html += '</div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    // Format interesting finding
    formatInterestingFinding(finding) {
        let html = `
            <div class="service-item" style="border-left: 4px solid #17a2b8;">
                <div class="service-name">🔍 ${finding.description}</div>
                <div class="service-description">
        `;
        
        if (finding.type === 'interesting_subdomain') {
            html += `
                    <strong>Pattern:</strong> ${finding.pattern}<br>
                    <strong>Subdomain:</strong> ${this.createSubdomainLink(finding.subdomain)}<br>
            `;
        } else if (finding.type === 'service_subdomain') {
            html += `
                    <strong>Service:</strong> ${finding.service.toUpperCase()}<br>
                    <strong>Subdomain:</strong> ${this.createSubdomainLink(finding.subdomain)}<br>
                    <strong>IP:</strong> ${finding.ip}<br>
            `;
        }
        
        html += `${finding.recommendation ? `<strong>Note:</strong> ${finding.recommendation}<br>` : ''}
                </div>
            </div>
        `;
        
        return html;
    }

    // Display redirects to main domain (compact version)
    displayRedirectsToMain(redirects) {
        const container = document.getElementById('redirectsToMain');
        const section = container?.closest('.service-category');
        if (!container) return;
        
        if (!redirects || redirects.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        
        // Create compact hyperlinked list
        const redirectLinks = redirects.map(redirect => 
            this.createSubdomainLink(redirect.subdomain)
        ).join(', ');
        
        let html = `
            <div class="service-item" style="border-left: 4px solid #28a745;">
                <div class="service-description">
                    <em>These ${redirects.length} subdomain${redirects.length > 1 ? 's' : ''} redirect to the main domain and serve the same content:</em><br>
                    <div class="redirect-links">${redirectLinks}</div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        if (section) section.style.display = 'block';
    }

    // Display CNAME mappings
    displayCNAMEMappings(processedData) {
        const container = document.getElementById('cnameMappings');
        const section = container?.closest('.service-category');
        if (!container) return;
        
        // Get properly filtered CNAME mappings from data processor
        const cnameSubdomains = processedData.dataProcessor ? 
            processedData.dataProcessor.getCNAMEMappings() : [];
        
        if (cnameSubdomains.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        
        if (section) section.style.display = 'block';
        
        // Group by CNAME target
        const cnameGroups = this.groupCNAMEsByTarget(cnameSubdomains);
        
        let html = '';
        Object.entries(cnameGroups).forEach(([target, subdomains]) => {
            const domainName = this.extractDomainFromCNAME(target);
            
            html += `
                <div class="service-item">
                    <div class="service-name">🎯 ${domainName}</div>
                    <div class="service-description">
                        ${subdomains.length} subdomain${subdomains.length > 1 ? 's' : ''} pointing to this service
                    </div>
                    <div class="service-records">
                        <strong>Subdomains:</strong><br>
                        ${subdomains.map(sub => {
                            let info = sub.ipAddresses[0] || '';
                            if (sub.cnameChain && sub.cnameChain.length > 0) {
                                const chain = [sub.subdomain];
                                sub.cnameChain.forEach(link => chain.push(link.to));
                                if (sub.ipAddresses[0]) chain.push(sub.ipAddresses[0]);
                                info = ` → ${chain.join(' → ')}`;
                            } else if (sub.ipAddresses[0]) {
                                info = ` → ${sub.ipAddresses[0]}`;
                            }
                            return `• ${this.createSubdomainLink(sub.subdomain)}${info}`;
                        }).join('<br>')}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Check if subdomain has significant CNAME
    hasSignificantCNAME(subdomain) {
        return (subdomain.cnameTarget && subdomain.cnameTarget !== subdomain.subdomain) ||
               (subdomain.cnameChain && subdomain.cnameChain.length > 0);
    }

    // Group CNAMEs by target
    groupCNAMEsByTarget(cnameSubdomains) {
        const groups = {};
        cnameSubdomains.forEach(subdomain => {
            const target = subdomain.cnameTarget || 
                          (subdomain.cnameChain && subdomain.cnameChain.length > 0 ? 
                           subdomain.cnameChain[0].to : null);
            if (target) {
                if (!groups[target]) groups[target] = [];
                groups[target].push(subdomain);
            }
        });
        return groups;
    }

    // Extract domain from CNAME target
    extractDomainFromCNAME(cnameTarget) {
        if (!cnameTarget) return '';
        
        let domain = cnameTarget.replace(/\.$/, '');
        const parts = domain.split('.');
        
        if (parts.length >= 2) {
            const specialTLDs = ['co.uk', 'com.au', 'co.za', 'co.nz'];
            
            for (const specialTLD of specialTLDs) {
                if (domain.endsWith('.' + specialTLD)) {
                    const beforeSpecialTLD = domain.substring(0, domain.length - specialTLD.length - 1);
                    const beforeParts = beforeSpecialTLD.split('.');
                    if (beforeParts.length >= 1) {
                        return beforeParts[beforeParts.length - 1] + '.' + specialTLD;
                    }
                }
            }
            
            return parts.slice(-2).join('.');
        }
        
        return domain;
    }

    // Display subdomains (delegate filtering to DataProcessor)
    displaySubdomains(processedData) {
        const container = document.getElementById('subdomainServices');
        const section = container?.closest('.service-category');
        
        if (!container) return;
        
        // Use DataProcessor to get properly filtered unclassified subdomains
        // This ensures no duplicates with other sections
        const unclassifiedSubdomains = processedData.dataProcessor ? 
            processedData.dataProcessor.getUnclassifiedSubdomains() :
            []; // Fallback to empty array if dataProcessor not available
        
        if (unclassifiedSubdomains.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        
        if (section) section.style.display = 'block';
        
        // Group by provider (delegate to DataProcessor)
        const providerGroups = processedData.dataProcessor ? 
            processedData.dataProcessor.groupSubdomainsByProvider(unclassifiedSubdomains) :
            [];
        
        let html = '';
        providerGroups.forEach(provider => {
            html += `
                <div class="service-item">
                    <div class="service-name">🏢 ${provider.vendor}</div>
                    <div class="service-description">
                        ${provider.totalSubdomains} subdomains • ${provider.uniqueIPs} unique IPs
                    </div>
                    <div class="service-records">
                        <strong>Subdomains:</strong><br>
                        ${provider.subdomains.map(sub => {
                            let info = sub.ipAddresses[0] || 'no IP';
                            if (sub.cnameChain && sub.cnameChain.length > 0) {
                                const chain = [sub.subdomain];
                                sub.cnameChain.forEach(link => chain.push(link.to));
                                if (sub.ipAddresses[0]) chain.push(sub.ipAddresses[0]);
                                info = chain.join(' → ');
                            } else if (sub.cnameTarget) {
                                if (sub.ipAddresses[0]) {
                                    info = `CNAME → ${sub.cnameTarget} → ${sub.ipAddresses[0]}`;
                                } else {
                                    info = `CNAME → ${sub.cnameTarget}`;
                                }
                            }
                            return `• ${this.createSubdomainLink(sub.subdomain)} (${info})`;
                        }).join('<br>')}
                        ${provider.uniqueIPs > 1 ? `<br><br><strong>IPs:</strong><br>${provider.ips.join(', ')}` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }



    // Display DNS records (SPF, DMARC, etc.)
    displayDNSRecords(dnsRecords) {
        const container = document.getElementById('dnsRecords');
        const section = container?.closest('.service-category');
        if (!container) return;

        if (!dnsRecords || dnsRecords.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }

        if (section) section.style.display = 'block';
        let html = '';

        // Group DNS records by category
        const recordsByCategory = {};
        dnsRecords.forEach(record => {
            const category = record.category || 'other';
            if (!recordsByCategory[category]) {
                recordsByCategory[category] = [];
            }
            recordsByCategory[category].push(record);
        });

        // Display each category
        Object.keys(recordsByCategory).forEach(category => {
            const categoryName = category === 'email-security' ? 'Email Security' : category.toUpperCase();
            html += `<div class="dns-category">
                <h4 class="dns-category-title">${categoryName}</h4>`;

            recordsByCategory[category].forEach(record => {
                html += `<div class="dns-record">
                    <div class="dns-record-header">
                        <span class="dns-record-type">${record.type}</span>
                        <span class="dns-record-name">${record.name}</span>
                    </div>
                    <div class="dns-record-description">${record.description}</div>
                    <div class="dns-record-data">
                        <code>${this.truncateText(record.data, 100)}</code>
                    </div>`;

                // Show parsed DMARC info if available
                if (record.parsed && record.type === 'DMARC') {
                    html += `<div class="dmarc-parsed">
                        <strong>Policy:</strong> ${record.parsed.policy} | 
                        <strong>Reporting:</strong> ${record.parsed.reporting || 'None configured'}
                    </div>`;
                }

                // Show parsed DKIM info if available
                if (record.parsed && record.type === 'DKIM') {
                    const confidence = record.parsed.confidence;
                    const confidenceColor = confidence === 'high' ? '#28a745' : 
                                           confidence === 'medium' ? '#ffc107' : 
                                           confidence === 'low' ? '#fd7e14' : '#6c757d';
                    
                    html += `<div class="dkim-parsed">
                        <strong>Selector:</strong> ${record.parsed.selector} | 
                        <strong>Service:</strong> <span style="color: ${confidenceColor};">${record.parsed.service}</span> |
                        <strong>Key:</strong> ${record.parsed.keyType} |
                        <strong>Confidence:</strong> <span style="color: ${confidenceColor};">${confidence}</span>
                    </div>`;
                }

                // Show parsed CAA info if available
                if (record.parsed && record.type === 'CAA') {
                    const trustColor = record.parsed.isKnownCA ? '#28a745' : '#ffc107';
                    
                    html += `<div class="caa-parsed">
                        <strong>Tag:</strong> ${record.parsed.tag} | 
                        <strong>Authority:</strong> <span style="color: ${trustColor};">${record.parsed.authority}</span> |
                        <strong>Flags:</strong> ${record.parsed.flags} |
                        <strong>Trust Level:</strong> <span style="color: ${trustColor};">${record.parsed.isKnownCA ? 'Known CA' : 'Unknown CA'}</span>
                    </div>`;
                }

                // Show parsed SRV info if available
                if (record.parsed && record.type === 'SRV') {
                    html += `<div class="srv-parsed">
                        <strong>Service:</strong> ${record.parsed.service} | 
                        <strong>Target:</strong> ${record.parsed.target}:${record.parsed.port} |
                        <strong>Priority:</strong> ${record.parsed.priority} |
                        <strong>Weight:</strong> ${record.parsed.weight} |
                        <strong>Type:</strong> ${record.parsed.serviceType}
                    </div>`;
                }

                html += `</div>`;
            });

            html += `</div>`;
        });

        container.innerHTML = html;
    }

    // Show progressive status message
    showProgressiveStatus(stats) {
        // Add a temporary status message at the top of results
        let statusDiv = document.getElementById('progressive-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'progressive-status';
            statusDiv.className = 'progressive-status';
            this.resultsDiv.insertBefore(statusDiv, this.resultsDiv.firstChild);
        }

        const subdomainCount = stats.totalSubdomains || 0;
        const serviceCount = stats.totalServices || 0;

        statusDiv.innerHTML = `
            <div class="status-message">
                <span class="status-icon">⏳</span>
                <span class="status-text">
                    <strong>Analysis in progress...</strong> 
                    Showing ${serviceCount} services and ${subdomainCount} subdomains discovered so far.
                    Additional results will appear as external APIs respond.
                </span>
            </div>
        `;

        // Remove the status message after 10 seconds
        setTimeout(() => {
            if (statusDiv && statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, 10000);
    }

    // Display historical records
    displayHistoricalRecords(historicalRecords) {
        const container = document.getElementById('historicalRecords');
        const section = container?.closest('.service-category');
        if (!container) return;
        
        if (!historicalRecords || historicalRecords.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        
        if (section) section.style.display = 'block';
        
        let html = '<h3>📜 Historical/Obsolete Records</h3>';
        html += '<p style="color: #666; margin-bottom: 15px;">These subdomains were found in certificate transparency logs but have no active DNS records.</p>';
        
        html += `
            <div style="overflow-x: auto; margin-top: 15px;">
                <table style="width: 100%; border-collapse: collapse; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.85rem; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6; min-width: 200px;">📜 Subdomain</th>
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6; min-width: 100px;">Source</th>
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6; min-width: 100px;">Discovered</th>
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6; min-width: 120px;">Issuer</th>
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6; min-width: 100px;">Expiry</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        historicalRecords.forEach(record => {
            const certInfo = record.certificateInfo || {};
            const discoveredDate = new Date(record.discoveredAt || Date.now()).toLocaleDateString();
            
            let issuer = 'Unknown';
            if (certInfo.issuer && certInfo.issuer !== 'No certificate found') {
                if (certInfo.issuer === 'No certificate info available') {
                    issuer = 'DNS Source';
                } else if (certInfo.issuer.includes('Let\'s Encrypt')) issuer = 'Let\'s Encrypt';
                else if (certInfo.issuer.includes('DigiCert')) issuer = 'DigiCert';
                else if (certInfo.issuer.includes('Comodo')) issuer = 'Comodo';
                else if (certInfo.issuer.includes('GoDaddy')) issuer = 'GoDaddy';
                else if (certInfo.issuer.includes('GlobalSign')) issuer = 'GlobalSign';
                else {
                    const cnMatch = certInfo.issuer.match(/CN=([^,]+)/);
                    issuer = cnMatch ? cnMatch[1] : 'Unknown';
                }
            }
            
            let expiryDate = 'Unknown';
            if (certInfo.notAfter) {
                expiryDate = new Date(certInfo.notAfter).toLocaleDateString();
            }
            
            html += `
                <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 12px 8px; color: #495057; word-break: break-all;">
                        ${this.createSubdomainLink(record.subdomain)}
                    </td>
                    <td style="padding: 12px 8px; color: #6c757d; font-size: 0.8rem;">${record.source}</td>
                    <td style="padding: 12px 8px; color: #6c757d; font-size: 0.8rem;">${discoveredDate}</td>
                    <td style="padding: 12px 8px; color: #6c757d; font-size: 0.8rem;">${issuer}</td>
                    <td style="padding: 12px 8px; color: #6c757d; font-size: 0.8rem;">${expiryDate}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    // Display API notifications
    displayAPINotifications(apiNotifications) {
        const container = document.getElementById('apiNotifications');
        const section = document.getElementById('apiStatusSection');
        if (!container || !section) return;
        
        const errorNotifications = apiNotifications.filter(n => n.status === 'error' || n.status === 'warning');
        
        if (errorNotifications.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        
        let html = '';
        errorNotifications.forEach(notification => {
            const statusIcon = notification.status === 'warning' ? '⚠️' : '❌';
            const statusClass = notification.status === 'warning' ? 'warning' : 'error';
            
            html += `
                <div class="api-notification ${statusClass}">
                    <span class="api-name">${statusIcon} ${notification.api}</span>
                    <span class="api-message">${notification.message}</span>
                    <span class="api-time">${notification.timestamp}</span>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // Create subdomain link (for consistent linking behavior)
    createSubdomainLink(subdomain) {
        return `<a href="https://${subdomain}" target="_blank" rel="noopener" class="subdomain-link">${subdomain}</a>`;
    }

    // Truncate text for display
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // NEW: Display Data Sovereignty Analysis
    displayDataSovereignty(sovereigntyData) {
        const container = document.getElementById('dataSovereigntyAnalysis');
        const section = container?.closest('.service-category');
        
        if (!container) {
            console.warn('Data sovereignty container not found');
            return;
        }

        // Hide section if no meaningful sovereignty data
        if (!sovereigntyData || 
            sovereigntyData.statistics.uniqueCountries === 0 || 
            sovereigntyData.statistics.totalIPs === 0 ||
            sovereigntyData.countryDistribution.size === 0) {
            if (section) section.style.display = 'none';
            return;
        }

        // Show section since we have data to display
        if (section) section.style.display = 'block';

        let html = `
            <div class="sovereignty-disclaimer">
                <div class="disclaimer-header">
                    <span class="disclaimer-icon">⚠️</span>
                    <strong>Important Disclaimer</strong>
                </div>
                <div class="disclaimer-content">
                    <p><strong>This analysis is based solely on DNS resolutions received from your current location and may not represent the complete picture.</strong></p>
                    <ul class="disclaimer-list">
                        <li><strong>Geographic Variations:</strong> DNS queries from different locations may return different IP addresses due to CDN routing, load balancing, and regional infrastructure.</li>
                        <li><strong>Anycast & CDN Networks:</strong> Services using Cloudflare, AWS CloudFront, or similar networks may appear to be in different countries depending on your location.</li>
                        <li><strong>Dynamic Routing:</strong> Load balancers and traffic managers can route requests to different data centers based on current load, performance, or availability.</li>
                        <li><strong>Time-Sensitive:</strong> Infrastructure locations can change over time as organizations migrate services or adjust routing policies.</li>
                        <li><strong>Limited Scope:</strong> This analysis only covers DNS-discoverable infrastructure and may not capture all data processing locations, backup sites, or third-party integrations.</li>
                    </ul>
                    <p class="disclaimer-recommendation">
                        <strong>Recommendation:</strong> Use this analysis as a starting point for data sovereignty assessment. For comprehensive compliance evaluation, conduct analysis from multiple geographic locations and consult directly with service providers about their actual data processing locations and cross-border data flows.
                    </p>
                </div>
            </div>
            
            <div class="sovereignty-summary">
                <div class="sovereignty-stat">
                    <div class="stat-number">${sovereigntyData.statistics.uniqueCountries}</div>
                    <div class="stat-label">Countries</div>
                </div>
                <div class="sovereignty-stat">
                    <div class="stat-number">${sovereigntyData.statistics.totalIPs}</div>
                    <div class="stat-label">IP Addresses</div>
                </div>
                <div class="sovereignty-stat">
                    <div class="stat-number">${sovereigntyData.riskAssessment.high.length}</div>
                    <div class="stat-label">High Risk</div>
                </div>
                <div class="sovereignty-stat">
                    <div class="stat-number">${sovereigntyData.statistics.complianceAlerts.length}</div>
                    <div class="stat-label">Compliance Alerts</div>
                </div>
            </div>
        `;

        // Compliance Alerts Section
        if (sovereigntyData.statistics.complianceAlerts.length > 0) {
            html += `
                <div class="sovereignty-section">
                    <h4 class="sovereignty-section-title">🚨 Compliance Alerts</h4>
                    <div class="sovereignty-alerts">
            `;

            sovereigntyData.statistics.complianceAlerts.forEach(alert => {
                const alertClass = alert.severity === 'high' ? 'alert-high' : alert.severity === 'medium' ? 'alert-medium' : 'alert-low';
                html += `
                    <div class="sovereignty-alert ${alertClass}">
                        <div class="alert-severity">${alert.severity.toUpperCase()}</div>
                        <div class="alert-message">${alert.message}</div>
                        <div class="alert-type">${alert.type.replace('-', ' ').toUpperCase()}</div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // Primary Data Locations
        if (sovereigntyData.statistics.primaryDataLocations.length > 0) {
            html += `
                <div class="sovereignty-section">
                    <h4 class="sovereignty-section-title">🌍 Primary Data Locations</h4>
                    <div class="location-grid">
            `;

            sovereigntyData.statistics.primaryDataLocations.forEach(location => {
                const flag = this.getCountryFlag(location.countryCode);
                
                // Get the full country data to show detailed listings
                const countryData = sovereigntyData.countryDistribution.get(location.countryCode);
                
                html += `
                    <div class="location-card">
                        <div class="location-header">
                            <span class="country-flag">${flag}</span>
                            <span class="country-name">${location.country}</span>
                        </div>
                        <div class="location-stats">
                            <span class="location-stat">${location.services} services</span>
                            <span class="location-stat">${location.subdomains} subdomains</span>
                            <span class="location-stat">${location.totalIPs} IPs</span>
                        </div>
                `;
                
                // Show detailed services if any
                if (countryData && countryData.services.length > 0) {
                    html += `
                        <div class="location-details">
                            <strong>Services:</strong>
                            <ul class="location-list">
                                ${countryData.services.map(service => 
                                    `<li><span class="service-name">${service.name}</span> <span class="service-provider">(${service.provider})</span></li>`
                                ).join('')}
                            </ul>
                        </div>
                    `;
                }
                
                // Show detailed subdomains if any
                if (countryData && countryData.subdomains.length > 0) {
                    html += `
                        <div class="location-details">
                            <strong>Subdomains:</strong>
                            <ul class="location-list">
                                ${countryData.subdomains.map(subdomain => 
                                    `<li><span class="subdomain-name">${subdomain.name}</span> <span class="service-provider">(${subdomain.provider})</span></li>`
                                ).join('')}
                            </ul>
                        </div>
                    `;
                }
                
                // Show unique providers for this location
                if (countryData && countryData.providers.size > 0) {
                    const providers = Array.from(countryData.providers);
                    html += `
                        <div class="location-details">
                            <strong>Providers:</strong>
                            <div class="provider-tags">
                                ${providers.map(provider => 
                                    `<span class="provider-tag">${provider}</span>`
                                ).join('')}
                            </div>
                        </div>
                    `;
                }
                
                html += `
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // Risk Assessment by Level
        ['high', 'medium', 'low'].forEach(riskLevel => {
            const risks = sovereigntyData.riskAssessment[riskLevel];
            if (risks.length > 0) {
                const riskIcon = riskLevel === 'high' ? '🔴' : riskLevel === 'medium' ? '🟡' : '🟢';
                const riskTitle = riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) + ' Risk Countries';
                
                html += `
                    <div class="sovereignty-section">
                        <h4 class="sovereignty-section-title">${riskIcon} ${riskTitle}</h4>
                        <div class="risk-cards">
                `;

                risks.forEach(risk => {
                    const flag = this.getCountryFlag(risk.countryCode);
                    html += `
                        <div class="risk-card risk-${riskLevel}">
                            <div class="risk-header">
                                <span class="country-flag">${flag}</span>
                                <span class="country-name">${risk.country}</span>
                                <span class="risk-level">${riskLevel.toUpperCase()}</span>
                            </div>
                            <div class="risk-stats">
                                <span class="risk-stat">${risk.totalServices} services</span>
                                <span class="risk-stat">${risk.totalSubdomains} subdomains</span>
                                <span class="risk-stat">${risk.totalIPs} IPs</span>
                            </div>
                            ${risk.details.region !== 'Unknown' ? `<div class="risk-region">Region: ${risk.details.region}</div>` : ''}
                            ${risk.details.timezone !== 'Unknown' ? `<div class="risk-timezone">Timezone: ${risk.details.timezone}</div>` : ''}
                            
                            ${risk.issues.length > 0 ? `
                                <div class="risk-issues">
                                    <strong>Issues:</strong>
                                    <ul>
                                        ${risk.issues.map(issue => `<li>${issue}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            
                            ${risk.providers.length > 0 ? `
                                <div class="risk-providers">
                                    <strong>Providers:</strong> ${risk.providers.slice(0, 3).join(', ')}${risk.providers.length > 3 ? `... (+${risk.providers.length - 3} more)` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            }
        });

        // Geographic Distribution
        if (sovereigntyData.countryDistribution.size > 0) {
            html += `
                <div class="sovereignty-section">
                    <h4 class="sovereignty-section-title">🗺️ Complete Geographic Distribution</h4>
                    <div class="distribution-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Country</th>
                                    <th>Region</th>
                                    <th>Services</th>
                                    <th>Subdomains</th>
                                    <th>IPs</th>
                                    <th>Providers</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            const sortedCountries = Array.from(sovereigntyData.countryDistribution.entries())
                .sort((a, b) => (b[1].totalIPs + b[1].services.length) - (a[1].totalIPs + a[1].services.length));

            sortedCountries.forEach(([countryCode, countryData]) => {
                const flag = this.getCountryFlag(countryCode);
                const providers = Array.from(countryData.providers);
                
                html += `
                    <tr>
                        <td>
                            <span class="country-flag">${flag}</span>
                            ${countryData.countryName}
                        </td>
                        <td>${countryData.region}</td>
                        <td>${countryData.services.length}</td>
                        <td>${countryData.subdomains.length}</td>
                        <td>${countryData.totalIPs}</td>
                        <td>${providers.slice(0, 2).join(', ')}${providers.length > 2 ? ` (+${providers.length - 2})` : ''}</td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    // Helper method to get country flag emoji
    getCountryFlag(countryCode) {
        const flagMap = {
            'US': '🇺🇸', 'CA': '🇨🇦', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷', 'JP': '🇯🇵', 
            'AU': '🇦🇺', 'BR': '🇧🇷', 'IN': '🇮🇳', 'CN': '🇨🇳', 'RU': '🇷🇺', 'NL': '🇳🇱', 
            'SG': '🇸🇬', 'IE': '🇮🇪', 'CH': '🇨🇭', 'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 
            'FI': '🇫🇮', 'IT': '🇮🇹', 'ES': '🇪🇸', 'BE': '🇧🇪', 'AT': '🇦🇹', 'PL': '🇵🇱', 
            'CZ': '🇨🇿', 'HU': '🇭🇺', 'GR': '🇬🇷', 'PT': '🇵🇹', 'KR': '🇰🇷', 'TW': '🇹🇼', 
            'HK': '🇭🇰', 'MX': '🇲🇽', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'TH': '🇹🇭', 
            'MY': '🇲🇾', 'ID': '🇮🇩', 'PH': '🇵🇭', 'VN': '🇻🇳', 'BD': '🇧🇩', 'PK': '🇵🇰', 
            'IL': '🇮🇱', 'SA': '🇸🇦', 'AE': '🇦🇪', 'EG': '🇪🇬', 'ZA': '🇿🇦', 'TR': '🇹🇷', 
            'NZ': '🇳🇿', 'UA': '🇺🇦', 'IR': '🇮🇷', 'IQ': '🇮🇶'
        };
        return flagMap[countryCode] || '🏳️';
    }
} 