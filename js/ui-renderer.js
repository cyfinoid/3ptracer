// UI Rendering Engine
class UIRenderer {
    constructor() {
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultsDiv = document.getElementById('results');
        this.statsDiv = document.getElementById('stats');
        this.dynamicContainer = document.getElementById('dynamicResultsContainer');
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
                    <strong>Error:</strong> ${window.CommonUtils.escapeHtml(message)}
                </div>
            `;
        }
    }

    // Create a collapsible section
    // itemCount: number of items in section, dnsRecordCount: number of DNS records contributing to this section
    createCollapsibleSection(title, content, isExpanded = true, itemCount = null, dnsRecordCount = null) {
        const sectionId = `section-${++this.sectionCounter}`;
        let countText = '';
        if (itemCount !== null && itemCount > 0) {
            countText = ` (${itemCount})`;
            if (dnsRecordCount !== null && dnsRecordCount > 0) {
                countText += ` <span class="dns-record-count">from ${dnsRecordCount} DNS records</span>`;
            }
        } else if (itemCount === 0) {
            countText = ' (0)';
        }
        const expandedClass = isExpanded ? 'expanded' : '';
        const displayStyle = isExpanded ? 'block' : 'none';
        
        return `
            <div class="collapsible-section ${expandedClass}">
                <div class="section-header" onclick="toggleSection('${sectionId}')">
                    <div class="section-title">
                        <span class="toggle-icon">${isExpanded ? '▼' : '▶'}</span>
                        <h2>${title}${countText}</h2>
                    </div>
                </div>
                <div id="${sectionId}" class="section-content" style="display: ${displayStyle};">
                    ${content}
                </div>
            </div>
        `;
    }

    // Add Collapse/Expand All controls
    addCollapseControls() {
        const controlsHTML = `
            <div class="collapse-controls" style="display: flex; gap: 10px; margin-bottom: 15px; justify-content: flex-end;">
                <button onclick="window.uiRenderer.collapseAll()" class="collapse-control-btn" style="padding: 6px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; font-size: 0.85em; color: var(--text-primary);">
                    Collapse All
                </button>
                <button onclick="window.uiRenderer.expandAll()" class="collapse-control-btn" style="padding: 6px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; font-size: 0.85em; color: var(--text-primary);">
                    Expand All
                </button>
            </div>
        `;
        if (this.dynamicContainer) {
            this.dynamicContainer.innerHTML += controlsHTML;
        }
    }
    
    // Collapse all sections
    collapseAll() {
        // Collapse collapsible sections
        const sections = document.querySelectorAll('.collapsible-section');
        sections.forEach(section => {
            section.classList.remove('expanded');
            const content = section.querySelector('.section-content');
            const icon = section.querySelector('.toggle-icon');
            if (content) content.style.display = 'none';
            if (icon) icon.textContent = '▶';
        });
        
        // Collapse service categories
        const serviceCategories = document.querySelectorAll('.service-category');
        serviceCategories.forEach(category => {
            category.classList.add('collapsed');
        });
    }
    
    // Expand all sections
    expandAll() {
        // Expand collapsible sections
        const sections = document.querySelectorAll('.collapsible-section');
        sections.forEach(section => {
            section.classList.add('expanded');
            const content = section.querySelector('.section-content');
            const icon = section.querySelector('.toggle-icon');
            if (content) content.style.display = 'block';
            if (icon) icon.textContent = '▼';
        });
        
        // Expand service categories
        const serviceCategories = document.querySelectorAll('.service-category');
        serviceCategories.forEach(category => {
            category.classList.remove('collapsed');
        });
    }

    // Display a major section wrapped in collapsible container
    // dnsRecordCount: optional count of DNS records that contributed to this section's findings
    displayCollapsibleSection(title, renderFunction, isExpanded = true, itemCount = null, dnsRecordCount = null) {
        // Create a temporary container to capture the output
        const tempDiv = document.createElement('div');
        
        // Temporarily redirect the display method's output to our temp container
        const originalContainer = this.dynamicContainer;
        this.dynamicContainer = tempDiv;
        
        // Call the render function to generate content
        renderFunction();
        
        // Restore original container
        this.dynamicContainer = originalContainer;
        
        // Get the generated content
        const content = tempDiv.innerHTML;
        
        // Only create the section if there's actual content
        if (content.trim() && this.dynamicContainer) {
            const collapsibleHTML = this.createCollapsibleSection(title, content, isExpanded, itemCount, dnsRecordCount);
            this.dynamicContainer.innerHTML += collapsibleHTML;
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

    // Toggle collapse for inline expandable sections
    static toggleCollapse(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Find the parent container with the toggle icon
        const parent = element.previousElementSibling;
        const icon = parent ? parent.querySelector('span[style*="float: right"]') : null;
        
        if (element.style.display === 'none') {
            element.style.display = 'block';
            if (icon) icon.textContent = '▲';
        } else {
            element.style.display = 'none';
            if (icon) icon.textContent = '▼';
        }
    }

    // Display all results
    displayResults(processedData, securityResults, interestingFindings, apiNotifications, isProgressive = false) {
        if (this.resultsDiv) {
            this.resultsDiv.style.display = 'block';
        }

        // Initialize toggle function
        UIRenderer.initializeToggleFunction();

        // Clear dynamic content container for new results
        if (this.dynamicContainer) {
            this.dynamicContainer.innerHTML = '';
        }

        // Handle progressive status message
        if (isProgressive) {
            this.showProgressiveStatus(processedData.stats);
        } else {
            // Remove progressive status when displaying final results
            this.hideProgressiveStatus();
        }

        this.displayStats(processedData.stats, securityResults);
        this.displayAPINotifications(apiNotifications);
        
        // NEW: Display Raw DNS Records in Zone File Format inside export section (only for complete analysis)
        if (!isProgressive && processedData.dataProcessor && typeof processedData.dataProcessor.getRawDNSRecords === 'function') {
            const rawRecords = processedData.dataProcessor.getRawDNSRecords();
            this.displayRawDNSInExportSection(rawRecords);
        }
        
        // Add Collapse/Expand All controls
        this.addCollapseControls();
        
        // Calculate DNS record count for services
        const dnsRecordCount = processedData.dnsRecords?.length || 0;
        
        // Wrap major sections in collapsible containers
        this.displayCollapsibleSection('Third-Party Services', () => {
            this.displayServicesByVendor(processedData.services);
        }, true, processedData.stats.totalServices || 0, dnsRecordCount);
        
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
        
        // NEW: Display Subdomain Overview with ports and vulnerabilities
        this.displayCollapsibleSection('Subdomain Overview', () => {
            this.displaySubdomainOverview(processedData, isProgressive);
        }, true, processedData.stats.totalSubdomains || 0);
        
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

    // Display statistics based on analysis mode
    displayStats(stats, securityResults) {
        if (!this.statsDiv) return;

        const totalSecurityIssues = this.calculateTotalSecurityIssues(securityResults);
        const scanTime = stats.scanTime ? `${stats.scanTime}s` : '-';
        const analysisMode = stats.analysisMode || 'standard';
        
        let statsHTML = '';
        
        if (analysisMode === 'email') {
            // Email Scan: Services, MX Records, DKIM Selectors, SPF Lookups, Scan Time
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-number">${stats.totalServices || 0}</div>
                    <div class="stat-label">Email Services</div>
                    <div class="tooltip">
                        Email services detected from MX, SPF, and TXT records including 
                        Gmail, Microsoft 365, Proofpoint, Mimecast, and other providers.
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.mxRecords || 0}</div>
                    <div class="stat-label">MX Records</div>
                    <div class="tooltip">
                        Mail exchanger records that specify which mail servers accept 
                        email for this domain.
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.dkimSelectors || 0}</div>
                    <div class="stat-label">DKIM Selectors</div>
                    <div class="tooltip">
                        DKIM selectors found from 12 common selectors tested 
                        (google, selector1, selector2, k1, default, mail, etc.).
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.spfLookups || 0}</div>
                    <div class="stat-label">SPF Lookups</div>
                    <div class="tooltip">
                        Total DNS lookups in SPF include chain. RFC 7208 limits this to 10. 
                        Exceeding this limit causes SPF failures.
                    </div>
                </div>
                <div class="stat-card stat-card-time">
                    <div class="stat-number">${scanTime}</div>
                    <div class="stat-label">Scan Time</div>
                    <div class="tooltip">
                        Total time taken to complete the email security analysis.
                    </div>
                </div>
            `;
        } else if (analysisMode === 'quick') {
            // Quick Scan: Services, Security Issues, DNS Records, Scan Time
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-number">${stats.totalServices || 0}</div>
                    <div class="stat-label">Services Found</div>
                    <div class="tooltip">
                        Third-party services detected from DNS records of the main domain.
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalSecurityIssues}</div>
                    <div class="stat-label">Security Issues</div>
                    <div class="tooltip">
                        Potential security concerns found in DNS configuration.
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.totalProviders || 0}</div>
                    <div class="stat-label">Providers</div>
                    <div class="tooltip">
                        Unique hosting and infrastructure providers identified.
                    </div>
                </div>
                <div class="stat-card stat-card-time">
                    <div class="stat-number">${scanTime}</div>
                    <div class="stat-label">Scan Time</div>
                    <div class="tooltip">
                        Total time taken for quick domain analysis.
                    </div>
                </div>
            `;
        } else {
            // Standard Scan: Services, Subdomains, Providers, Security Issues, Scan Time (5 cards)
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-number">${stats.totalServices || 0}</div>
                    <div class="stat-label">Services Found</div>
                    <div class="tooltip">
                        Third-party services detected from DNS records including email providers, 
                        cloud platforms, analytics tools, and security services.
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.totalSubdomains || 0}</div>
                    <div class="stat-label">Subdomains</div>
                    <div class="tooltip">
                        Active subdomains discovered from certificate transparency logs and DNS analysis.
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.totalProviders || 0}</div>
                    <div class="stat-label">Providers</div>
                    <div class="tooltip">
                        Unique hosting and infrastructure providers identified through ASN lookups.
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalSecurityIssues}</div>
                    <div class="stat-label">Security Issues</div>
                    <div class="tooltip">
                        Potential security concerns including missing SPF/DMARC, weak policies, 
                        and possible subdomain takeover vulnerabilities.
                    </div>
                </div>
                <div class="stat-card stat-card-time">
                    <div class="stat-number">${scanTime}</div>
                    <div class="stat-label">Scan Time</div>
                    <div class="tooltip">
                        Total time taken to complete the full analysis.
                    </div>
                </div>
            `;
        }
        
        this.statsDiv.innerHTML = statsHTML;
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
            'background: rgba(253, 203, 82, 0.15); border-left: 4px solid var(--accent-yellow); padding: 8px; margin: 8px 0; border-radius: 4px;' :
            isAnyThirdParty ? 
            'background: rgba(70, 111, 224, 0.1); border-left: 4px solid var(--accent-blue); padding: 8px; margin: 8px 0; border-radius: 4px;' :
            '';
        
        let html = `
            <div class="${cardClass}">
                <div class="service-header">
                    <h3>${window.CommonUtils.escapeHtml(service.name)}${recordTypesText}</h3>
                </div>
                <p class="service-description">${window.CommonUtils.escapeHtml(service.description)}</p>
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
                        ${service.securityImplication ? window.CommonUtils.escapeHtml(service.securityImplication) : 'Email authentication data is shared externally.'}
                        ${service.reportingEmail ? `<br>📧 Reports sent to: ${window.CommonUtils.escapeHtml(service.reportingEmail)}` : ''}
                        ${service.domain ? `<br>🌐 External domain: ${window.CommonUtils.escapeHtml(service.domain)}` : ''}
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
        
        // Show ASN breakdown for consolidated vendor services
        if (service.isConsolidated && service.asnBreakdown) {
            const breakdownId = `asn_${service.originalKey}_${Math.random().toString(36).substr(2, 9)}`;
            html += `
                <div style="padding: 8px; margin: 8px 0; border-radius: 4px; border: 1px solid #17a2b8;">
                    <div style="cursor: pointer;" onclick="UIRenderer.toggleCollapse('${breakdownId}')">
                        <strong>🌐 ASN Breakdown (${service.asnBreakdown.length} ASNs)</strong>
                        <span style="float: right;">▲</span>
                    </div>
                    <div id="${breakdownId}" style="display: block; margin-top: 10px;">
                        <ul style="margin: 5px 0; padding-left: 20px; list-style: none;">`;
            
            service.asnBreakdown.forEach(asn => {
                html += `<li style="margin: 5px 0;">
                    📍 ${window.CommonUtils.escapeHtml(asn.name)} - ${asn.recordCount} ${asn.recordCount === 1 ? 'record' : 'records'}
                </li>`;
            });
            
            html += `</ul>
                    </div>
                </div>
            `;
        }
        
        // Show service breakdown for consolidated communication services
        if (service.isConsolidated && service.serviceBreakdown) {
            const breakdownId = `comm_${service.originalKey}_${Math.random().toString(36).substr(2, 9)}`;
            html += `
                <div style="background: #e8f4f8; padding: 8px; margin: 8px 0; border-radius: 4px; border-left: 3px solid #17a2b8;">
                    <div style="cursor: pointer;" onclick="UIRenderer.toggleCollapse('${breakdownId}')">
                        <strong>📞 Service Types (${service.serviceBreakdown.length} types)</strong>
                        <span style="float: right;">▲</span>
                    </div>
                    <div id="${breakdownId}" style="display: block; margin-top: 10px;">
                        <ul style="margin: 5px 0; padding-left: 20px; list-style: none;">`;
            
            service.serviceBreakdown.forEach(svc => {
                html += `<li style="margin: 5px 0;">
                    📡 ${window.CommonUtils.escapeHtml(svc.type.charAt(0).toUpperCase() + svc.type.slice(1))}: ${window.CommonUtils.escapeHtml(svc.name)} - ${svc.recordCount} ${svc.recordCount === 1 ? 'target' : 'targets'}
                </li>`;
            });
            
            html += `</ul>
                    </div>
                </div>
            `;
        }
        
        // Show infrastructure information
        if (service.infrastructure) {
            html += `
                <div class="service-infrastructure" style="background: var(--bg-tertiary); padding: 8px; margin: 8px 0; border-radius: 4px; border-left: 3px solid var(--accent-blue);">
                    <strong>🏗️ Infrastructure:</strong> ${window.CommonUtils.escapeHtml(service.infrastructure.name)}<br>
                    <span style="color: var(--text-secondary); font-size: 0.9em;">${window.CommonUtils.escapeHtml(service.infrastructure.description)}</span>
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

    // Removed duplicate - see line ~1293 for the actual implementation

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
        
        // Group by risk level first, then by type within each risk level
        const riskGroups = {
            high: this.groupSecurityIssuesByType(allIssues.filter(issue => issue.risk === 'high')),
            medium: this.groupSecurityIssuesByType(allIssues.filter(issue => issue.risk === 'medium')),
            low: this.groupSecurityIssuesByType(allIssues.filter(issue => issue.risk === 'low'))
        };
        
        let html = '';
        
        if (Object.keys(riskGroups.high).length > 0) {
            const totalIssues = Object.values(riskGroups.high).reduce((sum, group) => sum + group.length, 0);
            const typeCount = Object.keys(riskGroups.high).length;
            html += `<div class="risk-section"><h4>🚨 High Risk Issues (${typeCount} ${typeCount === 1 ? 'type' : 'types'}, ${totalIssues} total)</h4>`;
            html += this.formatGroupedSecurityIssues(riskGroups.high, 'high');
            html += '</div>';
        }
        
        if (Object.keys(riskGroups.medium).length > 0) {
            const totalIssues = Object.values(riskGroups.medium).reduce((sum, group) => sum + group.length, 0);
            const typeCount = Object.keys(riskGroups.medium).length;
            html += `<div class="risk-section"><h4>⚠️ Medium Risk Issues (${typeCount} ${typeCount === 1 ? 'type' : 'types'}, ${totalIssues} total)</h4>`;
            html += this.formatGroupedSecurityIssues(riskGroups.medium, 'medium');
            html += '</div>';
        }
        
        if (Object.keys(riskGroups.low).length > 0) {
            const totalIssues = Object.values(riskGroups.low).reduce((sum, group) => sum + group.length, 0);
            const typeCount = Object.keys(riskGroups.low).length;
            html += `<div class="risk-section"><h4>ℹ️ Low Risk Issues (${typeCount} ${typeCount === 1 ? 'type' : 'types'}, ${totalIssues} total)</h4>`;
            html += this.formatGroupedSecurityIssues(riskGroups.low, 'low');
            html += '</div>';
        }
        
        // H1: Add SPF Chain Analysis visualization if available
        let emailSecurityHtml = '';
        if (securityResults.spfChainAnalysis) {
            emailSecurityHtml += this.renderSPFChainAnalysis(securityResults.spfChainAnalysis);
        }
        
        // H2, H3, H7: Add Email Security Standards visualization
        if (securityResults.mtaSts || securityResults.bimi || securityResults.smtpTlsReporting) {
            emailSecurityHtml += this.renderEmailSecurityStandards(
                securityResults.mtaSts,
                securityResults.bimi,
                securityResults.smtpTlsReporting
            );
        }
        
        // Email Mode: Display MX Records
        if (securityResults.emailSecurity?.mxRecords?.length > 0) {
            emailSecurityHtml += this.renderMXRecords(securityResults.emailSecurity.mxRecords);
        }
        
        // Email Mode: Display DMARC Record
        if (securityResults.emailSecurity?.dmarcRecords?.length > 0) {
            emailSecurityHtml += this.renderDMARCRecord(securityResults.emailSecurity.dmarcRecords);
        }
        
        // Email Mode: Display extracted email addresses
        if (securityResults.emailSecurity?.extractedEmails) {
            emailSecurityHtml += this.renderExtractedEmails(securityResults.emailSecurity.extractedEmails);
        }
        
        // L6: Display DKIM selectors found in Email Mode
        if (securityResults.emailSecurity?.dkimSelectors?.length > 0) {
            emailSecurityHtml += this.renderDKIMSelectors(securityResults.emailSecurity.dkimSelectors);
        }
        
        // M1 & L10: Add DNSSEC and DANE/TLSA visualizations side by side
        if (securityResults.dnssec || securityResults.daneTLSA) {
            emailSecurityHtml += '<div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 20px;">';
            if (securityResults.dnssec) {
                emailSecurityHtml += this.renderDNSSECStatus(securityResults.dnssec, true); // true = inline mode
            }
            if (securityResults.daneTLSA) {
                emailSecurityHtml += this.renderDANETLSAStatus(securityResults.daneTLSA, true); // true = inline mode
            }
            emailSecurityHtml += '</div>';
        }
        
        container.innerHTML = html + emailSecurityHtml;
    }

    // Email Mode: Render extracted email addresses
    renderExtractedEmails(extractedEmails) {
        if (!extractedEmails) return '';
        
        const { internal, external } = extractedEmails;
        const totalEmails = (internal?.length || 0) + (external?.length || 0);
        
        if (totalEmails === 0) return '';
        
        let html = `
            <div class="extracted-emails-section" style="margin-top: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border-color);">
                <h4 style="margin-top: 0; color: var(--text-primary);">📧 Email Addresses Found (${totalEmails})</h4>
                <p style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 15px;">
                    Email addresses discovered in DMARC, TLS-RPT, and TXT records:
                </p>`;
        
        // Internal emails
        if (internal && internal.length > 0) {
            html += `
                <div style="margin-bottom: 15px;">
                    <h5 style="color: #28a745; margin-bottom: 10px; font-size: 0.95em;">
                        🏠 Internal Emails (${internal.length})
                    </h5>
                    <div style="display: flex; flex-direction: column; gap: 6px;">`;
            
            for (const emailInfo of internal) {
                html += `
                    <div style="padding: 8px 12px; background: var(--card-bg); border-radius: 4px; border-left: 3px solid #28a745; display: flex; justify-content: space-between; align-items: center;">
                        <code style="font-size: 0.9em; color: var(--text-primary);">${window.CommonUtils.escapeHtml(emailInfo.email)}</code>
                        <span style="font-size: 0.75em; color: var(--text-secondary);">${window.CommonUtils.escapeHtml(emailInfo.source)}</span>
                    </div>`;
            }
            
            html += `</div></div>`;
        }
        
        // External emails
        if (external && external.length > 0) {
            html += `
                <div>
                    <h5 style="color: #17a2b8; margin-bottom: 10px; font-size: 0.95em;">
                        🌐 External Emails (${external.length})
                    </h5>
                    <div style="display: flex; flex-direction: column; gap: 6px;">`;
            
            for (const emailInfo of external) {
                // Identify common external services
                let serviceTag = '';
                const domain = emailInfo.domain.toLowerCase();
                if (domain.includes('agari') || domain.includes('dmarcian')) serviceTag = 'DMARC Service';
                else if (domain.includes('google') || domain.includes('gmail')) serviceTag = 'Google';
                else if (domain.includes('microsoft') || domain.includes('outlook')) serviceTag = 'Microsoft';
                else if (domain.includes('proofpoint')) serviceTag = 'Proofpoint';
                else if (domain.includes('mimecast')) serviceTag = 'Mimecast';
                else if (domain.includes('cloudflare')) serviceTag = 'Cloudflare';
                else if (domain.includes('valimail')) serviceTag = 'Valimail';
                else if (domain.includes('fraudmarc')) serviceTag = 'Fraudmarc';
                else if (domain.includes('ondmarc')) serviceTag = 'OnDMARC';
                else if (domain.includes('emailauth') || domain.includes('easydmarc')) serviceTag = 'DMARC Service';
                
                html += `
                    <div style="padding: 8px 12px; background: var(--card-bg); border-radius: 4px; border-left: 3px solid #17a2b8; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 5px;">
                        <code style="font-size: 0.9em; color: var(--text-primary);">${window.CommonUtils.escapeHtml(emailInfo.email)}</code>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            ${serviceTag ? `<span style="font-size: 0.75em; padding: 2px 6px; background: var(--accent-blue); color: white; border-radius: 3px;">${window.CommonUtils.escapeHtml(serviceTag)}</span>` : ''}
                            <span style="font-size: 0.75em; color: var(--text-secondary);">${window.CommonUtils.escapeHtml(emailInfo.source)}</span>
                        </div>
                    </div>`;
            }
            
            html += `</div></div>`;
        }
        
        html += `</div>`;
        return html;
    }
    
    // Email Mode: Render MX Records
    renderMXRecords(mxRecords) {
        if (!mxRecords || mxRecords.length === 0) return '';
        
        let html = `
            <div class="mx-records-section" style="margin-top: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border-color);">
                <h4 style="margin-top: 0; color: var(--text-primary);">📬 MX Records (${mxRecords.length})</h4>
                <p style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 15px;">
                    Mail exchangers that handle email for this domain:
                </p>
                <div style="display: flex; flex-direction: column; gap: 8px;">`;
        
        // Extract MX data - handle different formats
        const mxData = mxRecords.map(mx => {
            // DNS response objects have a 'data' field with format "priority server"
            if (mx && typeof mx === 'object' && mx.data) {
                return mx.data;
            }
            // Already a string
            if (typeof mx === 'string') {
                return mx;
            }
            // Object with priority/exchange
            if (mx && mx.exchange) {
                return `${mx.priority || 10} ${mx.exchange}`;
            }
            return String(mx);
        });
        
        // Sort by priority
        const sortedMX = [...mxData].sort((a, b) => {
            const prioA = parseInt(a.split(' ')[0]) || 0;
            const prioB = parseInt(b.split(' ')[0]) || 0;
            return prioA - prioB;
        });
        
        for (const mxStr of sortedMX) {
            const parts = mxStr.split(' ');
            const priority = parts[0] || '10';
            const server = parts.slice(1).join(' ').replace(/\.$/, '') || mxStr;
            
            // Identify email provider from MX server
            let provider = 'Unknown';
            const serverLower = server.toLowerCase();
            if (serverLower.includes('google') || serverLower.includes('gmail') || serverLower.includes('aspmx')) provider = 'Google Workspace';
            else if (serverLower.includes('outlook') || serverLower.includes('microsoft') || serverLower.includes('protection.outlook')) provider = 'Microsoft 365';
            else if (serverLower.includes('proofpoint') || serverLower.includes('pphosted')) provider = 'Proofpoint';
            else if (serverLower.includes('mimecast')) provider = 'Mimecast';
            else if (serverLower.includes('barracuda')) provider = 'Barracuda';
            else if (serverLower.includes('zoho')) provider = 'Zoho Mail';
            else if (serverLower.includes('icloud') || serverLower.includes('apple')) provider = 'iCloud Mail';
            else if (serverLower.includes('secureserver') || serverLower.includes('godaddy')) provider = 'GoDaddy';
            else if (serverLower.includes('hostinger')) provider = 'Hostinger';
            else if (serverLower.includes('namecheap')) provider = 'Namecheap';
            else if (serverLower.includes('titan')) provider = 'Titan Email';
            else if (serverLower.includes('yandex')) provider = 'Yandex Mail';
            else if (serverLower.includes('mailgun')) provider = 'Mailgun';
            else if (serverLower.includes('sendgrid')) provider = 'SendGrid';
            
            html += `
                <div style="padding: 10px 12px; background: var(--card-bg); border-radius: 6px; border-left: 4px solid #17a2b8; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <code style="font-size: 0.9em; color: var(--text-primary);">${server}</code>
                        <span style="font-size: 0.8em; color: var(--text-secondary); margin-left: 10px;">Priority: ${priority}</span>
                    </div>
                    <span style="font-size: 0.85em; color: var(--accent-blue);">${provider}</span>
                </div>`;
        }
        
        html += `</div></div>`;
        return html;
    }
    
    // Email Mode: Render DMARC Record
    renderDMARCRecord(dmarcRecords) {
        if (!dmarcRecords || dmarcRecords.length === 0) return '';
        
        // Extract DMARC record string from DNS response object
        const rawRecord = dmarcRecords[0];
        const dmarcRecord = typeof rawRecord === 'string' ? rawRecord : (rawRecord?.data || String(rawRecord));
        
        // Parse DMARC record
        const policy = dmarcRecord.match(/p=(\w+)/)?.[1] || 'none';
        const subPolicy = dmarcRecord.match(/sp=(\w+)/)?.[1] || policy;
        const pct = dmarcRecord.match(/pct=(\d+)/)?.[1] || '100';
        const rua = dmarcRecord.match(/rua=([^;]+)/)?.[1] || '';
        const ruf = dmarcRecord.match(/ruf=([^;]+)/)?.[1] || '';
        
        const policyColor = policy === 'reject' ? '#28a745' : policy === 'quarantine' ? '#ffc107' : '#dc3545';
        const policyIcon = policy === 'reject' ? '✅' : policy === 'quarantine' ? '⚠️' : '❌';
        
        let html = `
            <div class="dmarc-record-section" style="margin-top: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border-color);">
                <h4 style="margin-top: 0; color: var(--text-primary);">🛡️ DMARC Policy</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0;">
                    <div style="padding: 12px; background: var(--card-bg); border-radius: 6px; text-align: center; border-left: 4px solid ${policyColor};">
                        <div style="font-size: 1.2em; font-weight: bold; color: ${policyColor};">${policyIcon} ${policy.toUpperCase()}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">Policy</div>
                    </div>
                    <div style="padding: 12px; background: var(--card-bg); border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--text-primary);">${pct}%</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">Percentage</div>
                    </div>
                    <div style="padding: 12px; background: var(--card-bg); border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--text-primary);">${subPolicy.toUpperCase()}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">Subdomain Policy</div>
                    </div>
                </div>`;
        
        if (rua || ruf) {
            // Clean up mailto: prefixes from reporting addresses
            const cleanRua = rua ? rua.split(',').map(e => e.replace(/^mailto:/i, '').trim()).join(', ') : '';
            const cleanRuf = ruf ? ruf.split(',').map(e => e.replace(/^mailto:/i, '').trim()).join(', ') : '';
            
            html += `<div style="margin-top: 10px; padding: 10px; background: var(--card-bg); border-radius: 6px;">
                <div style="font-size: 0.85em; color: var(--text-secondary);">Reporting:</div>`;
            if (cleanRua) html += `<div style="font-size: 0.85em; color: var(--text-primary);">Aggregate (rua): <code>${cleanRua}</code></div>`;
            if (cleanRuf) html += `<div style="font-size: 0.85em; color: var(--text-primary);">Forensic (ruf): <code>${cleanRuf}</code></div>`;
            html += `</div>`;
        }
        
        html += `
                <div style="margin-top: 10px;">
                    <details>
                        <summary style="cursor: pointer; font-size: 0.85em; color: var(--text-secondary);">View raw record</summary>
                        <code style="font-size: 0.75em; word-break: break-all; display: block; margin-top: 8px; padding: 8px; background: var(--card-bg); border-radius: 4px;">
                            ${dmarcRecord}
                        </code>
                    </details>
                </div>
            </div>`;
        
        return html;
    }
    
    // L6: Render DKIM Selectors found in Email Mode
    renderDKIMSelectors(dkimSelectors) {
        if (!dkimSelectors || dkimSelectors.length === 0) return '';
        
        let html = `
            <div class="dkim-selectors-section" style="margin-top: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border-color);">
                <h4 style="margin-top: 0; color: var(--text-primary);">🔑 DKIM Selectors Found (${dkimSelectors.length})</h4>
                <p style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 15px;">
                    Email mode probed 12 common DKIM selectors and found the following active ones:
                </p>
                <div style="display: flex; flex-direction: column; gap: 10px;">`;
        
        for (const dkim of dkimSelectors) {
            // Identify the email provider from selector name
            const providerMap = {
                'google': 'Google Workspace',
                'selector1': 'Microsoft 365',
                'selector2': 'Microsoft 365',
                'k1': 'Mailchimp',
                'mandrill': 'Mandrill',
                'amazonses': 'Amazon SES',
                'sendgrid': 'SendGrid',
                'mailchimp': 'Mailchimp',
                'default': 'Default',
                'mail': 'Generic',
                'dkim': 'Generic',
                'smtp': 'Generic'
            };
            const provider = providerMap[dkim.selector] || 'Unknown';
            
            html += `
                <div style="padding: 12px; background: var(--card-bg); border-radius: 6px; border-left: 4px solid #28a745;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="color: var(--text-primary);">${dkim.selector}._domainkey</strong>
                        <span style="font-size: 0.85em; color: var(--text-secondary);">${provider}</span>
                    </div>
                    <code style="font-size: 0.75em; word-break: break-all; color: var(--text-secondary); display: block; max-height: 60px; overflow: hidden;">
                        ${window.CommonUtils.escapeHtml(dkim.record.substring(0, 150))}${dkim.record.length > 150 ? '...' : ''}
                    </code>
                </div>`;
        }
        
        html += `</div></div>`;
        return html;
    }

    // H1: Render SPF Include Chain Analysis visualization
    renderSPFChainAnalysis(spfAnalysis) {
        if (!spfAnalysis || !spfAnalysis.spfRecord) {
            return '';
        }
        
        const statusColor = spfAnalysis.exceededLimit ? '#dc3545' : 
                           spfAnalysis.lookupCount > 7 ? '#ffc107' : '#28a745';
        const statusIcon = spfAnalysis.exceededLimit ? '🚨' : 
                          spfAnalysis.lookupCount > 7 ? '⚠️' : '✅';
        const statusText = spfAnalysis.exceededLimit ? 'LIMIT EXCEEDED' : 
                          spfAnalysis.lookupCount > 7 ? 'APPROACHING LIMIT' : 'OK';
        
        let html = `
            <div class="spf-chain-analysis" style="margin-top: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border-color);">
                <h4 style="margin-top: 0; color: var(--text-primary);">📧 SPF Include Chain Analysis</h4>
                
                <div style="display: flex; gap: 20px; margin-bottom: 15px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px; padding: 10px; background: var(--card-bg); border-radius: 6px;">
                        <div style="font-size: 0.9em; color: var(--text-secondary);">DNS Lookups</div>
                        <div style="font-size: 1.5em; font-weight: bold; color: ${statusColor};">
                            ${spfAnalysis.lookupCount} / ${spfAnalysis.maxLookups}
                        </div>
                        <div style="font-size: 0.8em; color: ${statusColor};">${statusIcon} ${statusText}</div>
                    </div>
                    <div style="flex: 1; min-width: 200px; padding: 10px; background: var(--card-bg); border-radius: 6px;">
                        <div style="font-size: 0.9em; color: var(--text-secondary);">Include Depth</div>
                        <div style="font-size: 1.5em; font-weight: bold; color: var(--text-primary);">
                            ${spfAnalysis.includeChain.length}
                        </div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">include/redirect mechanisms</div>
                    </div>
                    <div style="flex: 1; min-width: 200px; padding: 10px; background: var(--card-bg); border-radius: 6px;">
                        <div style="font-size: 0.9em; color: var(--text-secondary);">Void Lookups</div>
                        <div style="font-size: 1.5em; font-weight: bold; color: ${spfAnalysis.voidLookups > 2 ? 'var(--accent-yellow)' : 'var(--text-primary)'};">
                            ${spfAnalysis.voidLookups}
                        </div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">RFC 7208 recommends max 2</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong style="color: var(--text-primary);">SPF Record:</strong>
                    <div style="font-family: monospace; font-size: 0.85em; padding: 10px; background: var(--card-bg); border-radius: 4px; word-break: break-all; color: var(--text-primary); margin-top: 5px;">
                        ${window.CommonUtils.escapeHtml(spfAnalysis.spfRecord)}
                    </div>
                </div>`;
        
        // Display include chain as a tree
        if (spfAnalysis.includeChain.length > 0) {
            html += `
                <div style="margin-bottom: 15px;">
                    <strong style="color: var(--text-primary);">Include Chain:</strong>
                    <div style="margin-top: 10px; padding: 10px; background: var(--card-bg); border-radius: 4px;">
                        ${this.renderSPFIncludeTree(spfAnalysis.includeChain, spfAnalysis.domain)}
                    </div>
                </div>`;
        }
        
        // Display warnings
        if (spfAnalysis.warnings.length > 0) {
            html += `
                <div style="margin-bottom: 15px;">
                    <strong style="color: #ffc107;">⚠️ Warnings:</strong>
                    <ul style="margin: 5px 0; padding-left: 20px; color: var(--text-primary);">
                        ${spfAnalysis.warnings.map(w => `<li>${window.CommonUtils.escapeHtml(w)}</li>`).join('')}
                    </ul>
                </div>`;
        }
        
        // Display errors
        if (spfAnalysis.errors.length > 0) {
            html += `
                <div style="margin-bottom: 15px;">
                    <strong style="color: #dc3545;">❌ Errors:</strong>
                    <ul style="margin: 5px 0; padding-left: 20px; color: var(--text-primary);">
                        ${spfAnalysis.errors.map(e => `<li>${window.CommonUtils.escapeHtml(e)}</li>`).join('')}
                    </ul>
                </div>`;
        }
        
        // Flattened record suggestion if over limit
        if (spfAnalysis.flattenedRecord) {
            html += `
                <div style="padding: 10px; background: rgba(40, 167, 69, 0.1); border-radius: 4px; border: 1px solid #28a745;">
                    <strong style="color: #28a745;">💡 Suggestion: Flattened SPF Record</strong>
                    <div style="font-family: monospace; font-size: 0.85em; padding: 10px; background: var(--card-bg); border-radius: 4px; word-break: break-all; color: var(--text-primary); margin-top: 5px;">
                        ${window.CommonUtils.escapeHtml(spfAnalysis.flattenedRecord)}
                    </div>
                    <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 5px;">
                        Note: This is a simplified suggestion. A complete flattened record would need to resolve all A/MX records.
                    </div>
                </div>`;
        }
        
        html += '</div>';
        return html;
    }
    
    // Render SPF include chain as a tree visualization
    renderSPFIncludeTree(includeChain, rootDomain) {
        let html = '<div style="font-family: monospace; font-size: 0.85em; line-height: 1.8;">';
        
        // Group by depth
        const byDepth = {};
        for (const entry of includeChain) {
            const depth = entry.depth || 0;
            if (!byDepth[depth]) byDepth[depth] = [];
            byDepth[depth].push(entry);
        }
        
        // Render root
        html += `<div style="color: var(--accent-blue);">📌 ${rootDomain}</div>`;
        
        // Render each level
        for (const entry of includeChain) {
            const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(entry.depth + 1);
            const icon = entry.type === 'redirect' ? '➡️' : '📦';
            const statusIcon = entry.resolved ? '✅' : '❌';
            const statusColor = entry.resolved ? 'var(--text-primary)' : 'var(--accent-red)';
            
            html += `<div style="color: ${statusColor};">`;
            html += `${indent}├─ ${icon} ${window.CommonUtils.escapeHtml(entry.type)}: <strong>${window.CommonUtils.escapeHtml(entry.domain)}</strong> ${statusIcon}`;
            
            if (entry.error) {
                html += ` <span style="color: var(--accent-red); font-size: 0.9em;">(${window.CommonUtils.escapeHtml(entry.error)})</span>`;
            }
            
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }
    
    // H2, H3, H7: Render Email Security Standards (MTA-STS, BIMI, SMTP TLS Reporting)
    renderEmailSecurityStandards(mtaSts, bimi, smtpTlsReporting) {
        let html = `
            <div class="email-security-standards" style="margin-top: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border-color);">
                <h4 style="margin-top: 0; color: var(--text-primary);">📧 Email Security Standards</h4>
                
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">`;
        
        // MTA-STS Card (H2)
        if (mtaSts) {
            const statusColor = mtaSts.enabled ? 'var(--accent-green)' : 'var(--text-secondary)';
            const statusIcon = mtaSts.enabled ? '✅' : '❌';
            const statusText = mtaSts.enabled ? 'Enabled' : 'Not Configured';
            
            html += `
                <div style="flex: 1; min-width: 250px; padding: 15px; background: var(--card-bg); border-radius: 6px; border-left: 4px solid ${statusColor};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="color: var(--text-primary);">MTA-STS</strong>
                        <span style="color: ${statusColor}; font-size: 0.9em;">${statusIcon} ${statusText}</span>
                    </div>
                    <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 8px;">
                        Mail Transfer Agent Strict Transport Security (RFC 8461)
                    </div>`;
            
            if (mtaSts.enabled) {
                html += `
                    <div style="font-size: 0.85em; color: var(--text-primary);">
                        <strong>Version:</strong> ${mtaSts.version || 'Unknown'}<br>
                        ${mtaSts.id ? `<strong>Policy ID:</strong> ${mtaSts.id}<br>` : ''}
                    </div>`;
            } else {
                html += `
                    <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 8px; padding: 8px; background: rgba(108, 117, 125, 0.1); border-radius: 4px;">
                        💡 MTA-STS prevents SMTP downgrade attacks and man-in-the-middle attacks on email delivery.
                    </div>`;
            }
            
            html += '</div>';
        }
        
        // BIMI Card (H3)
        if (bimi) {
            const statusColor = bimi.enabled ? 'var(--accent-green)' : 'var(--text-secondary)';
            const statusIcon = bimi.enabled ? '✅' : '❌';
            const statusText = bimi.enabled ? 'Enabled' : 'Not Configured';
            
            html += `
                <div style="flex: 1; min-width: 250px; padding: 15px; background: var(--card-bg); border-radius: 6px; border-left: 4px solid ${statusColor};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="color: var(--text-primary);">BIMI</strong>
                        <span style="color: ${statusColor}; font-size: 0.9em;">${statusIcon} ${statusText}</span>
                    </div>
                    <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 8px;">
                        Brand Indicators for Message Identification
                    </div>`;
            
            if (bimi.enabled) {
                html += `
                    <div style="font-size: 0.85em; color: var(--text-primary);">
                        <strong>Version:</strong> ${bimi.version || 'Unknown'}<br>
                        ${bimi.logoUrl ? `<strong>Logo:</strong> <a href="${window.CommonUtils.escapeHtml(bimi.logoUrl)}" target="_blank" rel="noopener" style="color: var(--accent-blue);">${window.CommonUtils.escapeHtml(bimi.logoUrl.substring(0, 40))}...</a><br>` : '<strong>Logo:</strong> Not set<br>'}
                        ${bimi.certificateUrl ? `<strong>VMC:</strong> Configured<br>` : ''}
                    </div>`;
            } else {
                html += `
                    <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 8px; padding: 8px; background: rgba(108, 117, 125, 0.1); border-radius: 4px;">
                        💡 BIMI displays your brand logo in supported email clients, improving brand recognition and trust.
                    </div>`;
            }
            
            html += '</div>';
        }
        
        // SMTP TLS Reporting Card (H7)
        if (smtpTlsReporting) {
            const statusColor = smtpTlsReporting.enabled ? 'var(--accent-green)' : 'var(--text-secondary)';
            const statusIcon = smtpTlsReporting.enabled ? '✅' : '❌';
            const statusText = smtpTlsReporting.enabled ? 'Enabled' : 'Not Configured';
            
            html += `
                <div style="flex: 1; min-width: 250px; padding: 15px; background: var(--card-bg); border-radius: 6px; border-left: 4px solid ${statusColor};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="color: var(--text-primary);">TLS-RPT</strong>
                        <span style="color: ${statusColor}; font-size: 0.9em;">${statusIcon} ${statusText}</span>
                    </div>
                    <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 8px;">
                        SMTP TLS Reporting (RFC 8460)
                    </div>`;
            
            if (smtpTlsReporting.enabled) {
                html += `
                    <div style="font-size: 0.85em; color: var(--text-primary);">
                        <strong>Version:</strong> ${smtpTlsReporting.version || 'Unknown'}<br>
                        <strong>Reports sent to:</strong> ${smtpTlsReporting.reportingAddresses?.length || 0} address(es)
                    </div>`;
                if (smtpTlsReporting.reportingAddresses?.length > 0) {
                    html += `<div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 5px;">${smtpTlsReporting.reportingAddresses.join(', ')}</div>`;
                }
            } else {
                html += `
                    <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 8px; padding: 8px; background: rgba(108, 117, 125, 0.1); border-radius: 4px;">
                        💡 TLS-RPT provides reports about TLS connectivity issues with your mail servers.
                    </div>`;
            }
            
            html += '</div>';
        }
        
        html += '</div></div>';
        return html;
    }

    // L10: Render DANE/TLSA status
    renderDANETLSAStatus(dane, inline = false) {
        if (!dane) return '';
        
        const statusColor = dane.enabled ? 'var(--accent-green)' : 'var(--text-secondary)';
        const statusIcon = dane.enabled ? '✅' : '❌';
        const statusText = dane.enabled ? 'Enabled' : 'Not Configured';
        
        const marginTop = inline ? '0' : '20px';
        const flexBasis = inline ? '1' : 'auto';
        const minWidth = inline ? '300px' : 'auto';
        
        let html = `
            <div class="dane-status" style="margin-top: ${marginTop}; flex: ${flexBasis}; min-width: ${minWidth}; padding: 15px; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border-color);">
                <h4 style="margin-top: 0; color: var(--text-primary);">🔐 DANE/TLSA Status</h4>
                
                <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 250px; padding: 15px; background: var(--card-bg); border-radius: 6px; border-left: 4px solid ${statusColor};">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 1.2em; font-weight: bold; color: ${statusColor};">${statusIcon} ${statusText}</div>
                                <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 5px;">
                                    DNS-based Authentication of Named Entities (RFC 6698)
                                </div>
                            </div>
                        </div>
                    </div>`;
        
        if (dane.enabled) {
            // Show which services have DANE
            html += `
                    <div style="flex: 1; min-width: 200px; padding: 10px; background: var(--card-bg); border-radius: 6px;">
                        <div style="font-size: 0.9em; color: var(--text-secondary);">Protected Services</div>
                        <div style="margin-top: 5px;">
                            ${dane.smtpDANE ? '<span style="display: inline-block; padding: 2px 8px; margin: 2px; background: rgba(40, 167, 69, 0.1); border-radius: 3px; color: #28a745;">📧 SMTP</span>' : ''}
                            ${dane.httpsDANE ? '<span style="display: inline-block; padding: 2px 8px; margin: 2px; background: rgba(40, 167, 69, 0.1); border-radius: 3px; color: #28a745;">🌐 HTTPS</span>' : ''}
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 200px; padding: 10px; background: var(--card-bg); border-radius: 6px;">
                        <div style="font-size: 0.9em; color: var(--text-secondary);">TLSA Records</div>
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--text-primary);">${dane.records?.length || 0}</div>
                    </div>`;
        }
        
        html += '</div>';
        
        if (!dane.enabled) {
            html += `
                <div style="margin-top: 15px; padding: 10px; background: rgba(108, 117, 125, 0.1); border-radius: 4px; font-size: 0.85em; color: var(--text-secondary);">
                    💡 <strong>What is DANE?</strong> DANE uses TLSA DNS records to specify which TLS certificates are valid for your services. 
                    Combined with DNSSEC, it provides strong protection against certificate misissuance and man-in-the-middle attacks.
                </div>`;
        }
        
        html += '</div>';
        return html;
    }

    // M1: Render DNSSEC validation status
    renderDNSSECStatus(dnssec, inline = false) {
        if (!dnssec) return '';
        
        const statusColors = {
            'secure': 'var(--accent-green)',
            'insecure': 'var(--accent-yellow)',
            'unsigned': 'var(--text-secondary)',
            'error': 'var(--accent-red)',
            'unknown': 'var(--text-secondary)'
        };
        
        const statusIcons = {
            'secure': '✅',
            'insecure': '⚠️',
            'unsigned': '❌',
            'error': '❓',
            'unknown': '❓'
        };
        
        const statusLabels = {
            'secure': 'Secure (Validated)',
            'insecure': 'Insecure (Not Validated)',
            'unsigned': 'Not Configured',
            'error': 'Check Failed',
            'unknown': 'Unknown'
        };
        
        const color = statusColors[dnssec.status] || statusColors['unknown'];
        const icon = statusIcons[dnssec.status] || statusIcons['unknown'];
        const label = statusLabels[dnssec.status] || statusLabels['unknown'];
        
        const marginTop = inline ? '0' : '20px';
        const flexBasis = inline ? '1' : 'auto';
        const minWidth = inline ? '300px' : 'auto';
        
        let html = `
            <div class="dnssec-status" style="margin-top: ${marginTop}; flex: ${flexBasis}; min-width: ${minWidth}; padding: 15px; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border-color);">
                <h4 style="margin-top: 0; color: var(--text-primary);">🔐 DNSSEC Status</h4>
                
                <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 250px; padding: 15px; background: var(--card-bg); border-radius: 6px; border-left: 4px solid ${color};">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 1.2em; font-weight: bold; color: ${color};">${icon} ${label}</div>
                                <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 5px;">
                                    ${dnssec.details || 'No details available'}
                                </div>
                            </div>
                        </div>
                    </div>`;
        
        // Show DNSKEY info if present
        if (dnssec.dnskeyPresent && dnssec.records.dnskey.length > 0) {
            html += `
                    <div style="flex: 1; min-width: 200px; padding: 10px; background: var(--card-bg); border-radius: 6px;">
                        <div style="font-size: 0.9em; color: var(--text-secondary);">DNSKEY Records</div>
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--text-primary);">${dnssec.records.dnskey.length}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">`;
            
            for (const key of dnssec.records.dnskey) {
                html += `<span style="display: inline-block; padding: 2px 6px; margin: 2px; background: rgba(40, 167, 69, 0.1); border-radius: 3px;">${key.flags?.type || 'Key'}</span>`;
            }
            html += `</div></div>`;
        }
        
        // Show DS info if present
        if (dnssec.dsPresent && dnssec.records.ds.length > 0) {
            html += `
                    <div style="flex: 1; min-width: 200px; padding: 10px; background: var(--card-bg); border-radius: 6px;">
                        <div style="font-size: 0.9em; color: var(--text-secondary);">DS Records</div>
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--text-primary);">${dnssec.records.ds.length}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">`;
            
            for (const ds of dnssec.records.ds) {
                html += `<span style="display: inline-block; padding: 2px 6px; margin: 2px; background: rgba(40, 167, 69, 0.1); border-radius: 3px;">Key: ${ds.keyTag || '?'}</span>`;
            }
            html += `</div></div>`;
        }
        
        html += `
                </div>`;
        
        // Add explanation for unsigned domains
        if (dnssec.status === 'unsigned') {
            html += `
                <div style="margin-top: 15px; padding: 10px; background: rgba(108, 117, 125, 0.1); border-radius: 4px; font-size: 0.85em; color: var(--text-secondary);">
                    💡 <strong>Why DNSSEC matters:</strong> DNSSEC adds cryptographic signatures to DNS responses, protecting against DNS spoofing and cache poisoning attacks. 
                    Contact your domain registrar to enable DNSSEC for enhanced security.
                </div>`;
        }
        
        html += '</div>';
        return html;
    }

    // Group security issues by type and subtype
    groupSecurityIssuesByType(issues) {
        const groups = {};
        for (const issue of issues) {
            // Create a group key that includes type and service/pattern for better grouping
            let groupKey = issue.type;
            if (issue.type === 'exposed_cloud_service' && issue.service) {
                groupKey = `${issue.type}_${issue.service}`;
            }
            
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(issue);
        }
        return groups;
    }

    // Format grouped security issues with expandable sections
    formatGroupedSecurityIssues(groupedIssues, riskLevel) {
        const riskColors = {
            critical: 'var(--accent-red)', high: '#FF8C00', medium: 'var(--accent-yellow)',
            low: 'var(--accent-blue)', info: 'var(--text-primary)'
        };
        const color = riskColors[riskLevel] || 'var(--text-secondary)';
        
        let html = '';
        for (const [groupKey, issues] of Object.entries(groupedIssues)) {
            if (issues.length === 1) {
                // Single issue - display normally
                html += this.formatSecurityIssue(issues[0]);
            } else {
                // Multiple issues of same type - create grouped expandable section
                const firstIssue = issues[0];
                const categoryIcons = {
                    takeover: '🎯', dns: '🌐', email: '📧',
                    infrastructure: '🏗️', cloud: '☁️', certificate: '🔐'
                };
                const icon = categoryIcons[firstIssue.category] || '🔍';
                
                // Create group title
                let groupTitle = firstIssue.description;
                if (firstIssue.type === 'exposed_cloud_service' && firstIssue.service) {
                    groupTitle = `Potential exposed cloud services: ${firstIssue.service}`;
                }
                
                const groupId = `sec_${groupKey}_${Math.random().toString(36).substr(2, 9)}`;
                
                html += `
                    <div class="service-item security-issues" style="border-left: 4px solid ${color};">
                        <div class="service-name" style="cursor: pointer;" onclick="UIRenderer.toggleCollapse('${groupId}')">
                            ${icon} ${groupTitle} (${issues.length} ${issues.length === 1 ? 'subdomain' : 'subdomains'})
                            <span style="float: right;">▲</span>
                        </div>
                        <div id="${groupId}" style="display: block; margin-top: 10px;">
                            <div class="service-description">
                                <strong>Risk:</strong> ${firstIssue.risk.toUpperCase()}<br>
                                <strong>Type:</strong> ${firstIssue.type}<br>
                                ${firstIssue.recommendation ? `<strong>Recommendation:</strong> ${firstIssue.recommendation}<br>` : ''}
                            </div>
                            <div class="service-records">
                                <strong>Affected Subdomains:</strong><br>
                                <ul style="margin: 5px 0; padding-left: 20px;">`;
                
                issues.forEach(issue => {
                    html += `<li>${issue.subdomain ? this.createSubdomainLink(issue.subdomain) : 'Unknown'}`;
                    if (issue.ip) html += ` - IP: ${window.CommonUtils.escapeHtml(issue.ip)}`;
                    if (issue.issuer) html += ` - Issuer: ${window.CommonUtils.escapeHtml(issue.issuer)}`;
                    html += `</li>`;
                });
                
                html += `</ul>
                            </div>
                        </div>
                    </div>`;
            }
        }
        return html;
    }

    // Format details object for display
    formatDetails(details) {
        if (!details) return '';
        
        // If details is a string, return it escaped
        if (typeof details === 'string') {
            return window.CommonUtils.escapeHtml(details);
        }
        
        // If details is an object, format it appropriately
        if (typeof details === 'object') {
            // Handle wildcard certificate details with certificates array
            if (details.certificateCount !== undefined && details.certificates && Array.isArray(details.certificates)) {
                let formatted = `${details.certificateCount} certificate${details.certificateCount !== 1 ? 's' : ''} found`;
                
                // Show first few certificates as examples
                if (details.certificates.length > 0) {
                    const maxShow = 5;
                    const certsToShow = details.certificates.slice(0, maxShow);
                    formatted += '<ul style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary); font-size: 0.9em;">';
                    
                    certsToShow.forEach(cert => {
                        const domain = window.CommonUtils.escapeHtml(cert.domain || 'Unknown');
                        const issuer = window.CommonUtils.escapeHtml(cert.issuer || 'Unknown');
                        formatted += `<li><strong>${domain}</strong> - Issuer: ${issuer}`;
                        if (cert.validTo) {
                            const expiryDate = new Date(cert.validTo).toLocaleDateString();
                            formatted += ` (Expires: ${expiryDate})`;
                        }
                        formatted += '</li>';
                    });
                    
                    formatted += '</ul>';
                    
                    if (details.certificates.length > maxShow) {
                        formatted += `<em style="color: var(--text-secondary); font-size: 0.85em;">... and ${details.certificates.length - maxShow} more</em>`;
                    }
                }
                
                return formatted;
            }
            
            // Handle simple count objects (e.g., certificateCount, topLevelCount, subdomainCount)
            if (details.certificateCount !== undefined) {
                const counts = [];
                if (details.certificateCount !== undefined) {
                    counts.push(`Total: ${details.certificateCount}`);
                }
                if (details.topLevelCount !== undefined) {
                    counts.push(`Top-level: ${details.topLevelCount}`);
                }
                if (details.subdomainCount !== undefined) {
                    counts.push(`Subdomain: ${details.subdomainCount}`);
                }
                if (counts.length > 0) {
                    return counts.join(' • ');
                }
            }
            
            // Handle other object types - convert to formatted JSON
            try {
                return '<pre style="margin: 8px 0; padding: 8px; background: var(--bg-tertiary); border-radius: 4px; font-size: 0.85em; overflow-x: auto;">' + 
                       window.CommonUtils.escapeHtml(JSON.stringify(details, null, 2)) + 
                       '</pre>';
            } catch (e) {
                return window.CommonUtils.escapeHtml(String(details));
            }
        }
        
        // Fallback for other types
        return window.CommonUtils.escapeHtml(String(details));
    }

    // Format security issue
    formatSecurityIssue(issue) {
        const riskColors = {
            critical: 'var(--accent-red)', high: '#FF8C00', medium: 'var(--accent-yellow)',
            low: 'var(--accent-blue)', info: 'var(--text-primary)'
        };
        
        const categoryIcons = {
            takeover: '🎯', dns: '🌐', email: '📧',
            infrastructure: '🏗️', cloud: '☁️', certificate: '🔐'
        };
        
        const icon = categoryIcons[issue.category] || '🔍';
        const color = riskColors[issue.risk] || 'var(--text-secondary)';
        
        let html = `
            <div class="service-item security-issues" style="border-left: 4px solid ${color};">
                <div class="service-name">${icon} ${window.CommonUtils.escapeHtml(issue.description)}</div>
                <div class="service-description">
                    <strong>Risk:</strong> ${window.CommonUtils.escapeHtml(issue.risk.toUpperCase())}<br>
                    <strong>Type:</strong> ${window.CommonUtils.escapeHtml(issue.type)}<br>
                    ${issue.recommendation ? `<strong>Recommendation:</strong> ${window.CommonUtils.escapeHtml(issue.recommendation)}<br>` : ''}
                </div>
        `;
        
        // Add specific details
        if (issue.subdomain) html += `<div class="service-records"><strong>Subdomain:</strong> ${this.createSubdomainLink(issue.subdomain)}<br>`;
        if (issue.cname) html += `<strong>CNAME:</strong> ${window.CommonUtils.escapeHtml(issue.cname)}<br>`;
        if (issue.service) html += `<strong>Service:</strong> ${window.CommonUtils.escapeHtml(issue.service)}<br>`;
        if (issue.ip) html += `<strong>IP:</strong> ${window.CommonUtils.escapeHtml(issue.ip)}<br>`;
        if (issue.ipRange) html += `<strong>IP Range:</strong> ${window.CommonUtils.escapeHtml(issue.ipRange)}<br>`;
        if (issue.record) html += `<strong>Record:</strong> ${window.CommonUtils.escapeHtml(issue.record)}<br>`;
        if (issue.pattern) html += `<strong>Pattern:</strong> ${window.CommonUtils.escapeHtml(issue.pattern)}<br>`;
        if (issue.details) {
            html += `<strong>Details:</strong> ${this.formatDetails(issue.details)}<br>`;
        }
        
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
        const exposureFindings = interestingFindings.filter(f => f.type === 'infrastructure_exposure');
        
        let html = `<div class="risk-section"><h4>🔍 Interesting Infrastructure Findings (${interestingFindings.length})</h4>`;
        html += '<p style="color: #666; font-size: 0.9rem; margin-bottom: 15px;"><em>⚠️ Note: These findings are based on pattern matching of active subdomains only. Historical/obsolete subdomains are excluded. No actual content verification is performed.</em></p>';
        
        if (exposureFindings.length > 0) {
            html += `<div style="margin-bottom: 20px;"><h5 style="color: #ffc107; margin-bottom: 10px;">⚠️ Infrastructure Exposure (${exposureFindings.length})</h5>`;
            html += '<p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 10px;"><em>CNAME records reveal internal infrastructure details such as technology stack, service names, or architecture. Attackers can use this for targeted reconnaissance.</em></p>';
            exposureFindings.forEach(finding => {
                html += this.formatInterestingFinding(finding);
            });
            html += '</div>';
        }

        if (serviceFindings.length > 0) {
            html += `<div style="margin-bottom: 20px;"><h5 style="color: #17a2b8; margin-bottom: 10px;">🔧 Service-Related Subdomains (${serviceFindings.length})</h5>`;
            serviceFindings.forEach(finding => {
                html += this.formatInterestingFinding(finding);
            });
            html += '</div>';
        }
        
        if (patternFindings.length > 0) {
            // Group pattern findings by pattern
            const groupedPatterns = this.groupFindingsByPattern(patternFindings);
            const patternCount = Object.keys(groupedPatterns).length;
            
            html += `<div style="margin-bottom: 20px;"><h5 style="color: #17a2b8; margin-bottom: 10px;">🔍 Interesting Patterns (${patternCount} ${patternCount === 1 ? 'pattern' : 'patterns'}, ${patternFindings.length} ${patternFindings.length === 1 ? 'subdomain' : 'subdomains'})</h5>`;
            
            for (const [pattern, findings] of Object.entries(groupedPatterns)) {
                if (findings.length === 1) {
                    html += this.formatInterestingFinding(findings[0]);
                } else {
                    html += this.formatGroupedPatternFindings(pattern, findings);
                }
            }
            html += '</div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    // Format interesting finding
    formatInterestingFinding(finding) {
        const isExposure = finding.type === 'infrastructure_exposure';
        const borderColor = isExposure ? '#ffc107' : '#17a2b8';
        const icon = isExposure ? '⚠️' : '🔍';
        const riskBadge = isExposure
            ? `<span style="display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 0.75rem; font-weight: 600; background: ${finding.risk === 'low' ? 'rgba(255, 193, 7, 0.15); color: #ffc107;' : 'rgba(23, 162, 184, 0.15); color: #17a2b8;'}">${finding.risk === 'low' ? 'LOW' : 'INFO'}</span> `
            : '';

        let html = `
            <div class="service-item" style="border-left: 4px solid ${borderColor};">
                <div class="service-name">${icon} ${riskBadge}${window.CommonUtils.escapeHtml(finding.description)}</div>
                <div class="service-description">
        `;
        
        if (finding.type === 'interesting_subdomain') {
            html += `
                    <strong>Pattern:</strong> ${window.CommonUtils.escapeHtml(finding.pattern)}<br>
                    <strong>Subdomain:</strong> ${this.createSubdomainLink(finding.subdomain)}<br>
            `;
        } else if (finding.type === 'service_subdomain') {
            html += `
                    <strong>Service:</strong> ${window.CommonUtils.escapeHtml(finding.service.toUpperCase())}<br>
                    <strong>Subdomain:</strong> ${this.createSubdomainLink(finding.subdomain)}<br>
                    <strong>IP:</strong> ${window.CommonUtils.escapeHtml(finding.ip)}<br>
            `;
        } else if (finding.type === 'infrastructure_exposure') {
            html += `
                    <strong>Subdomain:</strong> ${this.createSubdomainLink(finding.subdomain)}<br>
                    <strong>CNAME Target:</strong> <code style="font-size: 0.85em; padding: 1px 4px; background: var(--bg-tertiary); border-radius: 3px;">${window.CommonUtils.escapeHtml(finding.cnameTarget)}</code><br>
                    <strong>Exposed Details:</strong> ${finding.exposedDetails.map(d => window.CommonUtils.escapeHtml(d)).join(', ')}<br>
            `;
        }
        
        html += `${finding.recommendation ? `<strong>Note:</strong> ${window.CommonUtils.escapeHtml(finding.recommendation)}<br>` : ''}
                </div>
            </div>
        `;
        
        return html;
    }

    // Group findings by pattern
    groupFindingsByPattern(findings) {
        const groups = {};
        for (const finding of findings) {
            const pattern = finding.pattern || 'unknown';
            if (!groups[pattern]) {
                groups[pattern] = [];
            }
            groups[pattern].push(finding);
        }
        return groups;
    }

    // Format grouped pattern findings with expandable section
    formatGroupedPatternFindings(pattern, findings) {
        const groupId = `pattern_${pattern}_${Math.random().toString(36).substr(2, 9)}`;
        
        let html = `
            <div class="service-item" style="border-left: 4px solid #17a2b8;">
                <div class="service-name" style="cursor: pointer;" onclick="UIRenderer.toggleCollapse('${groupId}')">
                    🔍 Interesting subdomain pattern: ${pattern} (${findings.length} ${findings.length === 1 ? 'subdomain' : 'subdomains'})
                    <span style="float: right;">▲</span>
                </div>
                <div id="${groupId}" style="display: block; margin-top: 10px;">
                    <div class="service-description">
                        <strong>Pattern:</strong> ${pattern}<br>
                        ${findings[0].recommendation ? `<strong>Note:</strong> ${findings[0].recommendation}<br>` : ''}
                    </div>
                    <div class="service-records">
                        <strong>Subdomains:</strong><br>
                        <ul style="margin: 5px 0; padding-left: 20px;">`;
        
        findings.forEach(finding => {
            html += `<li>${this.createSubdomainLink(finding.subdomain)}</li>`;
        });
        
        html += `</ul>
                    </div>
                </div>
            </div>`;
        
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
        const cnameSubdomains = (processedData.dataProcessor && typeof processedData.dataProcessor.getCNAMEMappings === 'function') ? 
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
                            // Add Shodan info (ports, vulnerabilities)
                            const shodanHtml = this.renderShodanInfo(sub.shodanInfo, true);
                            return `• ${this.createSubdomainLink(sub.subdomain)}${info}${shodanHtml ? '<br>&nbsp;&nbsp;' + shodanHtml : ''}`;
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
        const unclassifiedSubdomains = (processedData.dataProcessor && typeof processedData.dataProcessor.getUnclassifiedSubdomains === 'function') ? 
            processedData.dataProcessor.getUnclassifiedSubdomains() :
            []; // Fallback to empty array if dataProcessor not available
        
        if (unclassifiedSubdomains.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        
        if (section) section.style.display = 'block';
        
        // Group by provider (delegate to DataProcessor)
        const providerGroups = (processedData.dataProcessor && typeof processedData.dataProcessor.groupSubdomainsByProvider === 'function') ? 
            processedData.dataProcessor.groupSubdomainsByProvider(unclassifiedSubdomains) :
            [];
        
        let html = '';
        
        // Add Shodan summary if available
        const shodanSummary = this.renderShodanSummary(unclassifiedSubdomains);
        if (shodanSummary) {
            html += shodanSummary;
        }
        
        providerGroups.forEach(provider => {
            // Count Shodan findings for this provider
            const providerVulns = provider.subdomains.filter(s => s.shodanInfo && s.shodanInfo.vulns && s.shodanInfo.vulns.length > 0);
            const vulnIndicator = providerVulns.length > 0 ? ` • <span class="vuln-count">⚠️ ${providerVulns.length} with vulns</span>` : '';
            
            html += `
                <div class="service-item">
                    <div class="service-name">🏢 ${window.CommonUtils.escapeHtml(provider.vendor)}</div>
                    <div class="service-description">
                        ${provider.totalSubdomains} subdomains • ${provider.uniqueIPs} unique IPs${vulnIndicator}
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
                            
                            // Add Shodan info (ports, vulnerabilities)
                            const shodanHtml = this.renderShodanInfo(sub.shodanInfo, true);
                            
                            return `• ${this.createSubdomainLink(sub.subdomain)} (${info})${shodanHtml ? '<br>&nbsp;&nbsp;' + shodanHtml : ''}`;
                        }).join('<br>')}
                        ${provider.uniqueIPs > 1 ? `<br><br><strong>IPs:</strong><br>${provider.ips.join(', ')}` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // NEW: Display subdomain overview table with ports and vulnerabilities
    // Shows ALL discovered subdomains in a consolidated table view (similar to exports)
    // isProgressive: true when analysis is still in progress (Shodan data may be incomplete)
    displaySubdomainOverview(processedData, isProgressive = false) {
        const container = document.getElementById('subdomainOverview');
        const section = container?.closest('.service-category');
        
        if (!container) return;
        
        // Get ALL subdomains - support both live analysis and imported data
        // For live analysis: dataProcessor.processedData.subdomains
        // For imported data: processedData.subdomains (directly on processedData)
        let allSubdomains = [];
        
        // Try dataProcessor first (live analysis)
        if (processedData.dataProcessor?.processedData?.subdomains) {
            const subdomainsMap = processedData.dataProcessor.processedData.subdomains;
            if (subdomainsMap instanceof Map && subdomainsMap.size > 0) {
                allSubdomains = Array.from(subdomainsMap.values());
            }
        }
        
        // Fallback to processedData.subdomains (imported data)
        if (allSubdomains.length === 0 && processedData.subdomains) {
            if (processedData.subdomains instanceof Map) {
                allSubdomains = Array.from(processedData.subdomains.values());
            } else if (typeof processedData.subdomains === 'object') {
                // Handle plain object format
                allSubdomains = Object.values(processedData.subdomains);
            }
        }
        
        if (allSubdomains.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        
        if (section) section.style.display = 'block';
        
        // Count subdomains with Shodan data (exclude private IPs from scan counts)
        const scannableSubdomains = allSubdomains.filter(s => !s.isPrivateIP && !(s.shodanInfo && s.shodanInfo.notApplicable));
        const privateIPCount = allSubdomains.length - scannableSubdomains.length;
        const withShodanQueried = scannableSubdomains.filter(s => s.shodanInfo !== null && s.shodanInfo !== undefined);
        const withShodanData = scannableSubdomains.filter(s => s.shodanInfo && s.shodanInfo.hasData);
        const withPorts = scannableSubdomains.filter(s => s.shodanInfo && s.shodanInfo.ports && s.shodanInfo.ports.length > 0);
        const withVulns = scannableSubdomains.filter(s => s.shodanInfo && s.shodanInfo.vulns && s.shodanInfo.vulns.length > 0);
        
        // Check if Shodan data is still being fetched (not all scannable subdomains have been queried)
        const shodanPending = withShodanQueried.length < scannableSubdomains.length;
        
        let html = '';
        
        // Show loading indicator if Shodan data is still being fetched
        if (isProgressive || shodanPending) {
            html += `
                <div class="shodan-loading-notice" style="margin-bottom: 15px; padding: 12px 15px; background: rgba(253, 203, 82, 0.15); border: 1px solid rgba(253, 203, 82, 0.4); border-radius: 6px; color: var(--text-primary);">
                    <span style="display: inline-block; animation: pulse 1.5s infinite;">⏳</span>
                    <strong>Loading port scan data...</strong> 
                    <span style="color: var(--text-secondary);">Querying Shodan InternetDB for open ports and vulnerabilities. This table will update automatically.</span>
                    <span style="float: right; color: var(--text-secondary);">${withShodanQueried.length}/${scannableSubdomains.length} IPs scanned${privateIPCount > 0 ? ` (${privateIPCount} internal)` : ''}</span>
                </div>`;
        }
        
        // Summary stats
        html += `<div class="subdomain-overview-summary" style="margin-bottom: 15px; padding: 10px; background: var(--bg-tertiary); border-radius: 6px;">
            <strong>📊 Infrastructure Summary:</strong> 
            ${allSubdomains.length} subdomains discovered`;
        
        if (withPorts.length > 0) {
            html += ` • <span style="color: var(--accent-blue);">${withPorts.length} with open ports</span>`;
        }
        if (withVulns.length > 0) {
            html += ` • <span style="color: #dc3545;">${withVulns.length} with known vulnerabilities</span>`;
        }
        html += `</div>`;
        
        // Table
        html += `
            <div class="subdomain-overview-table-wrapper" style="overflow-x: auto;">
                <table class="subdomain-overview-table" style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                    <thead>
                        <tr style="background: var(--bg-tertiary); text-align: left;">
                            <th style="padding: 10px; border-bottom: 2px solid var(--border-color);">Subdomain</th>
                            <th style="padding: 10px; border-bottom: 2px solid var(--border-color);">IP Address</th>
                            <th style="padding: 10px; border-bottom: 2px solid var(--border-color);">Provider</th>
                            <th style="padding: 10px; border-bottom: 2px solid var(--border-color);">Open Ports</th>
                            <th style="padding: 10px; border-bottom: 2px solid var(--border-color);">Vulnerabilities</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        // Sort subdomains: those with vulnerabilities first, then by subdomain name
        const sortedSubdomains = [...allSubdomains].sort((a, b) => {
            const aVulns = (a.shodanInfo?.vulns?.length || 0);
            const bVulns = (b.shodanInfo?.vulns?.length || 0);
            if (bVulns !== aVulns) return bVulns - aVulns; // More vulns first
            return a.subdomain.localeCompare(b.subdomain);
        });
        
        sortedSubdomains.forEach(subdomain => {
            const ip = subdomain.ipAddresses?.[0] || 'N/A';
            const provider = subdomain.vendor?.vendor || subdomain.asnInfo?.isp || 'Unknown';
            const shodanInfo = subdomain.shodanInfo;
            const hasValidIP = ip && ip !== 'N/A';
            const isPrivate = subdomain.isPrivateIP || (shodanInfo && shodanInfo.notApplicable);
            
            // Format ports - link to Shodan host page
            let portsHtml = '';
            if (isPrivate) {
                portsHtml = '<span style="color: var(--text-secondary); font-style: italic;" title="Internal/private IP - not scannable from the internet">Internal IP</span>';
            } else if (shodanInfo === null || shodanInfo === undefined) {
                portsHtml = '<span style="color: var(--text-secondary);" title="Scanning...">⏳</span>';
            } else if (shodanInfo && shodanInfo.ports && shodanInfo.ports.length > 0) {
                const portLabels = this.getPortServiceLabels(shodanInfo.ports);
                const shodanUrl = hasValidIP ? `https://www.shodan.io/host/${encodeURIComponent(ip)}` : '#';
                portsHtml = `<a href="${shodanUrl}" target="_blank" rel="noopener" class="port-list-link" title="${portLabels.join(', ')} - Click to view on Shodan">${shodanInfo.ports.join(', ')}</a>`;
            } else {
                portsHtml = '<span style="color: var(--text-secondary);">—</span>';
            }
            
            // Format vulnerabilities
            let vulnsHtml = '<span style="color: #28a745;">None</span>';
            if (isPrivate) {
                vulnsHtml = '<span style="color: var(--text-secondary); font-style: italic;" title="Internal/private IP - not scannable from the internet">N/A</span>';
            } else if (shodanInfo && shodanInfo.vulns && shodanInfo.vulns.length > 0) {
                const vulnLinks = shodanInfo.vulns.slice(0, 3).map(cve => 
                    `<a href="https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve)}" target="_blank" rel="noopener" class="cve-link" style="color: #dc3545;">${window.CommonUtils.escapeHtml(cve)}</a>`
                ).join(', ');
                const hasMore = shodanInfo.vulns.length > 3 ? ` <span style="color: #dc3545;">+${shodanInfo.vulns.length - 3} more</span>` : '';
                vulnsHtml = vulnLinks + hasMore;
            } else if (shodanInfo === null || shodanInfo === undefined) {
                vulnsHtml = '<span style="color: var(--text-secondary);" title="Scanning...">⏳</span>';
            }
            
            // Row styling for vulnerabilities
            const rowStyle = (shodanInfo?.vulns?.length > 0) ? 
                'background: rgba(220, 53, 69, 0.1);' : '';
            
            html += `
                <tr style="${rowStyle}">
                    <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">
                        ${this.createSubdomainLink(subdomain.subdomain)}
                        ${subdomain.primaryService ? `<br><span style="font-size: 0.8em; color: var(--text-secondary);">→ ${window.CommonUtils.escapeHtml(subdomain.primaryService.name)}</span>` : ''}
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid var(--border-color); font-family: monospace;">${window.CommonUtils.escapeHtml(ip)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${window.CommonUtils.escapeHtml(provider)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${portsHtml}</td>
                    <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${vulnsHtml}</td>
                </tr>`;
        });
        
        html += `
                    </tbody>
                </table>
            </div>`;
        
        // Add note about Shodan data source
        html += `
            <div style="margin-top: 10px; font-size: 0.8em; color: var(--text-secondary);">
                💡 Port and vulnerability data from <a href="https://internetdb.shodan.io/" target="_blank" rel="noopener" style="color: var(--accent-blue);">Shodan InternetDB</a> (free, no API key required). Click port numbers to view full details on Shodan.
            </div>`;
        
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
                        <span class="dns-record-type">${window.CommonUtils.escapeHtml(record.type)}</span>
                        <span class="dns-record-name">${window.CommonUtils.escapeHtml(record.name)}</span>
                    </div>
                    <div class="dns-record-description">${window.CommonUtils.escapeHtml(record.description)}</div>
                    <div class="dns-record-data">
                        <code>${window.CommonUtils.escapeHtml(this.truncateText(record.data, 100))}</code>
                    </div>`;

                // Show parsed DMARC info if available
                if (record.parsed && record.type === 'DMARC') {
                    html += `<div class="dmarc-parsed">
                        <strong>Policy:</strong> ${window.CommonUtils.escapeHtml(record.parsed.policy)} | 
                        <strong>Reporting:</strong> ${window.CommonUtils.escapeHtml(record.parsed.reporting || 'None configured')}
                    </div>`;
                }

                // Show parsed DKIM info if available
                if (record.parsed && record.type === 'DKIM') {
                    const confidence = record.parsed.confidence;
                    const confidenceColor = confidence === 'high' ? 'var(--accent-green)' : 
                                           confidence === 'medium' ? 'var(--accent-yellow)' : 
                                           confidence === 'low' ? '#fd7e14' : 'var(--text-secondary)';
                    
                    html += `<div class="dkim-parsed">
                        <strong>Selector:</strong> ${window.CommonUtils.escapeHtml(record.parsed.selector)} | 
                        <strong>Service:</strong> <span style="color: ${confidenceColor};">${window.CommonUtils.escapeHtml(record.parsed.service)}</span> |
                        <strong>Key:</strong> ${window.CommonUtils.escapeHtml(record.parsed.keyType)} |
                        <strong>Confidence:</strong> <span style="color: ${confidenceColor};">${window.CommonUtils.escapeHtml(confidence)}</span>
                    </div>`;
                }

                // Show parsed CAA info if available
                if (record.parsed && record.type === 'CAA') {
                    const trustColor = record.parsed.isKnownCA ? '#28a745' : '#ffc107';
                    
                    html += `<div class="caa-parsed">
                        <strong>Tag:</strong> ${window.CommonUtils.escapeHtml(record.parsed.tag)} | 
                        <strong>Authority:</strong> <span style="color: ${trustColor};">${window.CommonUtils.escapeHtml(record.parsed.authority)}</span> |
                        <strong>Flags:</strong> ${window.CommonUtils.escapeHtml(record.parsed.flags)} |
                        <strong>Trust Level:</strong> <span style="color: ${trustColor};">${record.parsed.isKnownCA ? 'Known CA' : 'Unknown CA'}</span>
                    </div>`;
                }

                // Show parsed SRV info if available
                if (record.parsed && record.type === 'SRV') {
                    html += `<div class="srv-parsed">
                        <strong>Service:</strong> ${window.CommonUtils.escapeHtml(record.parsed.service)} | 
                        <strong>Target:</strong> ${window.CommonUtils.escapeHtml(record.parsed.target)}:${window.CommonUtils.escapeHtml(String(record.parsed.port))} |
                        <strong>Priority:</strong> ${window.CommonUtils.escapeHtml(String(record.parsed.priority))} |
                        <strong>Weight:</strong> ${window.CommonUtils.escapeHtml(String(record.parsed.weight))} |
                        <strong>Type:</strong> ${window.CommonUtils.escapeHtml(record.parsed.serviceType)}
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

        // Remove the status message after 10 seconds (fallback)
        setTimeout(() => {
            if (statusDiv && statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, 10000);
    }

    // Hide progressive status message (called when final results are ready)
    hideProgressiveStatus() {
        const statusDiv = document.getElementById('progressive-status');
        if (statusDiv && statusDiv.parentNode) {
            statusDiv.remove();
        }
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
                <table style="width: 100%; border-collapse: collapse; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.85rem; background: var(--card-bg); border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background: var(--table-header-bg); border-bottom: 2px solid var(--border-color);">
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 200px;">📜 Subdomain</th>
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 100px;">Source</th>
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 100px;">Discovered</th>
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 120px;">Issuer</th>
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 100px;">Expiry</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        historicalRecords.forEach(record => {
            const certInfo = record.certificateInfo || {};
            const discoveredDate = new Date(record.discoveredAt || Date.now()).toLocaleDateString();
            
            // Handle both source (string) and sources (array)
            let source = 'Unknown';
            if (record.source) {
                source = record.source;
            } else if (record.sources && Array.isArray(record.sources) && record.sources.length > 0) {
                source = record.sources.join(', ');
            }
            
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
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 12px 8px; color: var(--text-primary); word-break: break-all;">
                        ${this.createSubdomainLink(record.subdomain)}
                    </td>
                    <td style="padding: 12px 8px; color: var(--text-secondary); font-size: 0.8rem;">${window.CommonUtils.escapeHtml(source)}</td>
                    <td style="padding: 12px 8px; color: var(--text-secondary); font-size: 0.8rem;">${window.CommonUtils.escapeHtml(discoveredDate)}</td>
                    <td style="padding: 12px 8px; color: var(--text-secondary); font-size: 0.8rem;">${window.CommonUtils.escapeHtml(issuer)}</td>
                    <td style="padding: 12px 8px; color: var(--text-secondary); font-size: 0.8rem;">${window.CommonUtils.escapeHtml(expiryDate)}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    // Display raw DNS records in zone file format
    displayRawDNSRecords(rawRecords) {
        if (!this.dynamicContainer) return;
        
        if (!rawRecords || rawRecords.length === 0) {
            this.dynamicContainer.innerHTML += '<p>No DNS records available.</p>';
            return;
        }
        
        let html = `
            <div class="dns-records-table" style="overflow-x: auto; margin-top: 15px;">
                <table style="width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background: var(--bg-secondary);">
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 200px;">Host Label</th>
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 80px;">TTL</th>
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 80px;">Record Type</th>
                            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 300px;">Record Data</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        rawRecords.forEach(record => {
            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 12px 8px; color: var(--text-primary); word-break: break-all; font-family: monospace;">${record.host}</td>
                    <td style="padding: 12px 8px; color: var(--text-secondary); font-size: 0.9rem; font-family: monospace;">${record.ttl}</td>
                    <td style="padding: 12px 8px; color: var(--text-primary); font-weight: 600; font-family: monospace;">${record.type}</td>
                    <td style="padding: 12px 8px; color: var(--text-secondary); word-break: break-word; font-family: monospace; font-size: 0.9rem;">${record.data}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        this.dynamicContainer.innerHTML += html;
    }

    // Display Raw DNS Records right after the Export Section
    displayRawDNSInExportSection(rawRecords) {
        const exportSection = document.getElementById('exportSection');
        if (!exportSection) return;
        
        // Check if Raw DNS section already exists (avoid duplicates)
        const existingSection = document.getElementById('rawDNSWrapper');
        if (existingSection) {
            existingSection.remove();
        }
        
        if (!rawRecords || rawRecords.length === 0) {
            return;
        }
        
        // Create collapsible section matching the exact structure of other sections
        const sectionId = 'rawDNSContent';
        const itemCountText = ` (${rawRecords.length})`;
        
        // Build table content
        let tableRows = '';
        rawRecords.forEach(record => {
            tableRows += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 12px 8px; color: var(--text-primary); word-break: break-all; font-family: monospace;">${window.CommonUtils.escapeHtml(record.host)}</td>
                    <td style="padding: 12px 8px; color: var(--text-secondary); font-size: 0.9rem; font-family: monospace;">${window.CommonUtils.escapeHtml(record.ttl)}</td>
                    <td style="padding: 12px 8px; color: var(--text-primary); font-weight: 600; font-family: monospace;">${window.CommonUtils.escapeHtml(record.type)}</td>
                    <td style="padding: 12px 8px; color: var(--text-secondary); word-break: break-word; font-family: monospace; font-size: 0.9rem;">${window.CommonUtils.escapeHtml(record.data)}</td>
                </tr>
            `;
        });
        
        // Match the exact structure from createCollapsibleSection
        const sectionHTML = `
            <div id="rawDNSWrapper" class="collapsible-section">
                <div class="section-header" onclick="toggleSection('${sectionId}')">
                    <div class="section-title">
                        <span class="toggle-icon">▶</span>
                        <h2>Raw DNS Records (Zone File Format)${itemCountText}</h2>
                    </div>
                </div>
                <div id="${sectionId}" class="section-content" style="display: none;">
                    <div class="dns-records-table" style="overflow-x: auto; margin-top: 15px;">
                        <table style="width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 8px; overflow: hidden;">
                            <thead>
                                <tr style="background: var(--bg-secondary);">
                                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 200px;">Host Label</th>
                                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 80px;">TTL</th>
                                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 80px;">Record Type</th>
                                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid var(--border-color); min-width: 300px;">Record Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Insert right after the export section
        exportSection.insertAdjacentHTML('afterend', sectionHTML);
    }

    // Display API notifications - consolidated to show only one per service/API
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
        
        // Consolidate notifications by API name - keep only the most important one per API
        // Priority: error > warning > info > success
        const statusPriority = { 'error': 3, 'warning': 2, 'info': 1, 'success': 0 };
        const consolidated = new Map();
        
        errorNotifications.forEach(notification => {
            const apiName = notification.api;
            const existing = consolidated.get(apiName);
            
            if (!existing) {
                // First notification for this API
                consolidated.set(apiName, notification);
            } else {
                // Compare priority - keep the one with higher priority
                const existingPriority = statusPriority[existing.status] || 0;
                const newPriority = statusPriority[notification.status] || 0;
                
                if (newPriority > existingPriority) {
                    // New notification is more important, replace it
                    consolidated.set(apiName, notification);
                } else if (newPriority === existingPriority && notification.status === 'error') {
                    // Same priority but error - prefer the most recent error message
                    consolidated.set(apiName, notification);
                }
            }
        });
        
        // Convert map to array and display
        const uniqueNotifications = Array.from(consolidated.values());
        
        let html = '';
        uniqueNotifications.forEach(notification => {
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
        if (!subdomain) return '';
        const escapedSubdomain = window.CommonUtils.escapeHtml(subdomain);
        // URL encoding for href attribute (handles special characters in domain names)
        const urlEncodedSubdomain = encodeURIComponent(subdomain);
        return `<a href="https://${urlEncodedSubdomain}" target="_blank" rel="noopener" class="subdomain-link">${escapedSubdomain}</a>`;
    }

    // Render Shodan InternetDB information for a subdomain
    // Returns HTML string with ports, vulnerabilities, and tags
    renderShodanInfo(shodanInfo, compact = true) {
        if (!shodanInfo || !shodanInfo.hasData) {
            return '';
        }
        
        let html = '';
        
        // Ports display
        if (shodanInfo.ports && shodanInfo.ports.length > 0) {
            const portLabels = this.getPortServiceLabels(shodanInfo.ports);
            if (compact) {
                // Compact mode: just show port numbers with tooltip
                const portDisplay = shodanInfo.ports.slice(0, 5).join(', ');
                const hasMore = shodanInfo.ports.length > 5 ? `+${shodanInfo.ports.length - 5} more` : '';
                html += `<span class="shodan-ports" title="${portLabels.join(', ')}">🔓 ${portDisplay}${hasMore ? ' ' + hasMore : ''}</span>`;
            } else {
                // Full mode: show with service labels
                html += `<div class="shodan-ports-full"><strong>Open Ports:</strong> ${portLabels.join(', ')}</div>`;
            }
        }
        
        // Vulnerabilities display (always prominent)
        if (shodanInfo.vulns && shodanInfo.vulns.length > 0) {
            const vulnLinks = shodanInfo.vulns.slice(0, 3).map(cve => 
                `<a href="https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve)}" target="_blank" rel="noopener" class="cve-link">${window.CommonUtils.escapeHtml(cve)}</a>`
            ).join(', ');
            const hasMore = shodanInfo.vulns.length > 3 ? ` +${shodanInfo.vulns.length - 3} more` : '';
            html += `<span class="shodan-vulns">⚠️ ${vulnLinks}${hasMore}</span>`;
        }
        
        // Tags display (compact only shows if there are interesting tags)
        if (!compact && shodanInfo.tags && shodanInfo.tags.length > 0) {
            html += `<div class="shodan-tags"><strong>Tags:</strong> ${shodanInfo.tags.map(t => window.CommonUtils.escapeHtml(t)).join(', ')}</div>`;
        }
        
        // Hostnames from Shodan (reverse DNS)
        if (!compact && shodanInfo.hostnames && shodanInfo.hostnames.length > 0) {
            html += `<div class="shodan-hostnames"><strong>Hostnames:</strong> ${shodanInfo.hostnames.map(h => window.CommonUtils.escapeHtml(h)).join(', ')}</div>`;
        }
        
        // CPEs (software identification)
        if (!compact && shodanInfo.cpes && shodanInfo.cpes.length > 0) {
            const cpeLabels = shodanInfo.cpes.slice(0, 3).map(cpe => this.formatCPE(cpe));
            const hasMore = shodanInfo.cpes.length > 3 ? ` +${shodanInfo.cpes.length - 3} more` : '';
            html += `<div class="shodan-cpes"><strong>Software:</strong> ${cpeLabels.join(', ')}${hasMore}</div>`;
        }
        
        return html ? `<div class="shodan-info">${html}</div>` : '';
    }
    
    // Convert port numbers to service labels
    getPortServiceLabels(ports) {
        const portServices = {
            21: 'FTP',
            22: 'SSH',
            23: 'Telnet',
            25: 'SMTP',
            53: 'DNS',
            80: 'HTTP',
            110: 'POP3',
            143: 'IMAP',
            443: 'HTTPS',
            445: 'SMB',
            465: 'SMTPS',
            587: 'Submission',
            993: 'IMAPS',
            995: 'POP3S',
            1433: 'MSSQL',
            1521: 'Oracle',
            3306: 'MySQL',
            3389: 'RDP',
            5432: 'PostgreSQL',
            5900: 'VNC',
            6379: 'Redis',
            8080: 'HTTP-Alt',
            8443: 'HTTPS-Alt',
            27017: 'MongoDB'
        };
        
        return ports.map(port => {
            const service = portServices[port];
            return service ? `${port}/${service}` : `${port}`;
        });
    }
    
    // Format CPE string to human-readable
    formatCPE(cpe) {
        // CPE format: cpe:/a:vendor:product:version or cpe:2.3:a:vendor:product:version:...
        try {
            const parts = cpe.replace(/^cpe:(\/|2\.3:)/, '').split(':');
            if (parts.length >= 3) {
                const vendor = parts[1] || '';
                const product = parts[2] || '';
                const version = parts[3] || '';
                return `${vendor}/${product}${version ? ' ' + version : ''}`;
            }
        } catch (e) {
            // Fall back to raw CPE
        }
        return window.CommonUtils.escapeHtml(cpe);
    }
    
    // Render Shodan summary for a list of subdomains
    renderShodanSummary(subdomains) {
        const withShodan = subdomains.filter(s => s.shodanInfo && s.shodanInfo.hasData);
        const withVulns = subdomains.filter(s => s.shodanInfo && s.shodanInfo.vulns && s.shodanInfo.vulns.length > 0);
        const totalPorts = withShodan.reduce((sum, s) => sum + (s.shodanInfo.ports?.length || 0), 0);
        const totalVulns = withVulns.reduce((sum, s) => sum + (s.shodanInfo.vulns?.length || 0), 0);
        
        if (withShodan.length === 0) {
            return '';
        }
        
        let summaryHtml = `<div class="shodan-summary">`;
        summaryHtml += `<strong>Shodan Intelligence:</strong> `;
        summaryHtml += `${withShodan.length} IPs scanned, ${totalPorts} open ports detected`;
        
        if (totalVulns > 0) {
            summaryHtml += `, <span class="vuln-highlight">${totalVulns} known vulnerabilities across ${withVulns.length} IPs</span>`;
        }
        
        summaryHtml += `</div>`;
        return summaryHtml;
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
                            <span class="country-name">${window.CommonUtils.escapeHtml(location.country)}</span>
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
                                    `<li><span class="service-name">${window.CommonUtils.escapeHtml(service.name)}</span> <span class="service-provider">(${window.CommonUtils.escapeHtml(service.provider)})</span></li>`
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
                                    `<li><span class="subdomain-name">${window.CommonUtils.escapeHtml(subdomain.name)}</span> <span class="service-provider">(${window.CommonUtils.escapeHtml(subdomain.provider)})</span></li>`
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