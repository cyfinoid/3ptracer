// Visualizer Module - Handles network graphs, maps, and timeline visualizations
// L1: Network Graph, L2: Geographic Map, L5: Certificate Timeline

class Visualizer {
    constructor() {
        this.networkGraph = null;
        this.geoMap = null;
        this.analysisData = null;
    }

    // Set analysis data for visualization
    setData(processedData, securityResults) {
        this.analysisData = { processedData, securityResults };
    }

    // ==========================================
    // L1: Interactive Network Graph
    // ==========================================

    // Build and display simple hierarchical network view
    showNetworkGraph(containerId = 'networkGraphContainer') {
        if (!this.analysisData?.processedData) {
            console.warn('No analysis data available for network graph');
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const data = this.analysisData.processedData;
        
        // Helper to get CSS variable values (CSS handles theme switching automatically)
        const getCSSVar = (varName, fallback = '') => {
            return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
        };
        
        // Process subdomains - handle Map, Array, or Object
        let subdomains = [];
        if (data.subdomains) {
            if (data.subdomains instanceof Map) {
                subdomains = Array.from(data.subdomains.values());
            } else if (Array.isArray(data.subdomains)) {
                subdomains = data.subdomains;
            } else {
                subdomains = Object.values(data.subdomains);
            }
        }

        // Get domain from stats or first subdomain
        const domain = data.stats?.domain || 'domain';
        
        // Get services
        let services = [];
        if (data.services) {
            if (data.services instanceof Map) {
                services = Array.from(data.services.values());
            } else if (Array.isArray(data.services)) {
                services = data.services;
            } else {
                services = Object.values(data.services);
            }
        }

        // Simple hierarchical HTML view - build provider groups
        const providerMap = {
            'cloudflare': { name: 'Cloudflare', color: '#f38020', group: 'cloudflare' },
            'amazon': { name: 'Amazon AWS', color: '#ff9900', group: 'aws' },
            'aws': { name: 'Amazon AWS', color: '#ff9900', group: 'aws' },
            'google': { name: 'Google Cloud', color: '#4285f4', group: 'google' },
            'gcp': { name: 'Google Cloud', color: '#4285f4', group: 'google' },
            'microsoft': { name: 'Microsoft Azure', color: '#00a4ef', group: 'azure' },
            'azure': { name: 'Microsoft Azure', color: '#00a4ef', group: 'azure' },
            'digitalocean': { name: 'DigitalOcean', color: '#0080ff', group: 'digitalocean' },
            'akamai': { name: 'Akamai', color: '#009aff', group: 'akamai' },
            'fastly': { name: 'Fastly', color: '#ff282d', group: 'fastly' },
            'vercel': { name: 'Vercel', color: '#000000', group: 'vercel' },
            'netlify': { name: 'Netlify', color: '#00ad9f', group: 'netlify' },
            'heroku': { name: 'Heroku', color: '#6762a6', group: 'heroku' }
        };

        // Detect provider from subdomain data - only if actual service usage is detected
        const detectProvider = (subdomain) => {
            // Priority 1: Check infrastructure (CNAME targets pointing to provider domains)
            const infrastructure = (subdomain.infrastructure?.name || '').toLowerCase();
            if (infrastructure) {
                for (const [key, providerInfo] of Object.entries(providerMap)) {
                    if (infrastructure.includes(key)) {
                        return providerInfo;
                    }
                }
            }
            
            // Priority 2: Check primary service (detected services from CNAME analysis)
            const primaryService = (subdomain.primaryService?.name || '').toLowerCase();
            if (primaryService) {
                for (const [key, providerInfo] of Object.entries(providerMap)) {
                    if (primaryService.includes(key)) {
                        return providerInfo;
                    }
                }
            }
            
            // Priority 3: Check detected services array
            if (subdomain.detectedServices && Array.isArray(subdomain.detectedServices)) {
                const serviceNames = subdomain.detectedServices.map(s => (s.name || '').toLowerCase()).join(' ');
                for (const [key, providerInfo] of Object.entries(providerMap)) {
                    if (serviceNames.includes(key)) {
                        return providerInfo;
                    }
                }
            }
            
            // Priority 4: Check CNAME target directly (if infrastructure wasn't set)
            const cnameTarget = (subdomain.cname || subdomain.cnameTarget || '').toLowerCase();
            if (cnameTarget) {
                for (const [key, providerInfo] of Object.entries(providerMap)) {
                    // Check if CNAME points to provider's domain
                    if (cnameTarget.includes(key) && (
                        cnameTarget.includes('.amazonaws.com') ||
                        cnameTarget.includes('.azurewebsites.net') ||
                        cnameTarget.includes('.cloudflare.com') ||
                        cnameTarget.includes('.ondigitalocean.app') ||
                        cnameTarget.includes('.vercel.app') ||
                        cnameTarget.includes('.netlify.app') ||
                        cnameTarget.includes('.herokuapp.com')
                    )) {
                        return providerInfo;
                    }
                }
            }
            
            // Priority 5: Check vendor (only if it's a known cloud provider, not just ASN)
            const vendor = (subdomain.vendor?.vendor || '').toLowerCase();
            if (vendor && (vendor.includes('amazon') || vendor.includes('aws') || vendor.includes('microsoft') || vendor.includes('azure') || vendor.includes('google'))) {
                for (const [key, providerInfo] of Object.entries(providerMap)) {
                    if (vendor.includes(key)) {
                        return providerInfo;
                    }
                }
            }
            
            // Priority 6: Check ASN org (only for known cloud providers, and only if subdomain has an IP)
            // This ensures we detect providers based on IP ownership
            if (subdomain.ip || (subdomain.ipAddresses && subdomain.ipAddresses.length > 0)) {
                const asnOrg = (subdomain.asnInfo?.org || '').toLowerCase();
                if (asnOrg) {
                    // Check for known cloud provider ASNs
                    for (const [key, providerInfo] of Object.entries(providerMap)) {
                        if (asnOrg.includes(key)) {
                            return providerInfo;
                        }
                    }
                }
            }
            
            // Return 'Other' if no service usage or provider IP detected
            return { name: 'Other', color: '#6c757d', group: 'other' };
        };

        // Group subdomains by provider - only include providers with actual service usage
        const providerGroups = new Map();
        for (const sub of subdomains) {
            const provider = detectProvider(sub);
            // Only add to provider groups if it's not "Other" (meaning actual service usage detected)
            if (provider && provider.group !== 'other') {
                if (!providerGroups.has(provider.group)) {
                    providerGroups.set(provider.group, {
                        provider: provider,
                        subdomains: []
                    });
                }
                providerGroups.get(provider.group).subdomains.push(sub);
            }
        }
        
        // Map email service names to provider groups
        const emailServiceToProvider = {
            'Google Workspace': 'google',
            'Gmail': 'google',
            'Microsoft 365': 'azure',
            'Microsoft Office 365': 'azure',
            'Outlook': 'azure'
        };
        
        // Check for email services and add providers if found
        for (const service of services) {
            const serviceName = (service.name || '').toLowerCase();
            const serviceCategory = (service.category || '').toLowerCase();
            
            // Check if this is an email service that maps to a provider
            if (serviceCategory === 'email' || serviceCategory === 'email-service') {
                for (const [emailServiceName, providerGroup] of Object.entries(emailServiceToProvider)) {
                    if (serviceName.includes(emailServiceName.toLowerCase())) {
                        // Add provider group if it doesn't exist
                        if (!providerGroups.has(providerGroup)) {
                            const providerInfo = providerMap[providerGroup] || providerMap[emailServiceName.toLowerCase().split(' ')[0]];
                            if (providerInfo) {
                                providerGroups.set(providerGroup, {
                                    provider: providerInfo,
                                    subdomains: [] // Empty subdomains list - service is at domain level
                                });
                            }
                        }
                        break;
                    }
                }
            }
        }
        
        // Filter out provider groups with no subdomains AND no services (safety check)
        // But keep groups that have services even if no subdomains
        for (const [groupKey, groupData] of providerGroups) {
            // Keep the group if it has subdomains OR if we found a matching email service
            const hasEmailService = services.some(service => {
                const serviceName = (service.name || '').toLowerCase();
                const serviceCategory = (service.category || '').toLowerCase();
                if (serviceCategory === 'email' || serviceCategory === 'email-service') {
                    for (const [emailServiceName, providerGroup] of Object.entries(emailServiceToProvider)) {
                        if (providerGroup === groupKey && serviceName.includes(emailServiceName.toLowerCase())) {
                            return true;
                        }
                    }
                }
                return false;
            });
            
            // Only delete if no subdomains AND no email service
            if (groupData.subdomains.length === 0 && !hasEmailService) {
                providerGroups.delete(groupKey);
            }
        }

        // Also group subdomains without providers into "Other"
        const otherSubdomains = [];
        for (const sub of subdomains) {
            const provider = detectProvider(sub);
            if (!provider || provider.group === 'other') {
                otherSubdomains.push(sub);
            }
        }
        
        // Add "Other" group if there are subdomains without providers
        if (otherSubdomains.length > 0) {
            providerGroups.set('other', {
                provider: { name: 'Other', color: '#6c757d', group: 'other' },
                subdomains: otherSubdomains
            });
        }
        
        // Also group services by provider
        const providerServices = new Map();
        for (const service of services) {
            const serviceName = (service.name || '').toLowerCase();
            const serviceCategory = (service.category || '').toLowerCase();
            
            // Check if this service maps to a provider
            let providerGroup = null;
            
            // Check email services
            if (serviceCategory === 'email' || serviceCategory === 'email-service') {
                for (const [emailServiceName, providerGroupKey] of Object.entries(emailServiceToProvider)) {
                    if (serviceName.includes(emailServiceName.toLowerCase())) {
                        providerGroup = providerGroupKey;
                        break;
                    }
                }
            }
            
            // Check service name for provider keywords
            if (!providerGroup) {
                for (const [key, providerInfo] of Object.entries(providerMap)) {
                    if (serviceName.includes(key)) {
                        providerGroup = providerInfo.group;
                        break;
                    }
                }
            }
            
            if (providerGroup) {
                if (!providerServices.has(providerGroup)) {
                    providerServices.set(providerGroup, []);
                }
                providerServices.get(providerGroup).push(service);
            } else {
                // Add to "Other" group
                if (!providerServices.has('other')) {
                    providerServices.set('other', []);
                }
                providerServices.get('other').push(service);
            }
        }
        
        // Build simple HTML hierarchical view
        let html = `
            <div style="padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
                <!-- Domain at top -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: var(--card-bg); border: 2px solid var(--accent-blue); border-radius: 12px;">
                    <h2 style="margin: 0; color: var(--text-color); font-size: 24px;">${window.CommonUtils ? window.CommonUtils.escapeHtml(domain) : domain}</h2>
                    <div style="margin-top: 8px; color: var(--text-secondary); font-size: 14px;">Root Domain</div>
                </div>
                
                <!-- Provider boxes -->
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
        `;
        
        // Sort providers by name for consistent display
        const sortedProviders = Array.from(providerGroups.entries()).sort((a, b) => {
            if (a[0] === 'other') return 1;
            if (b[0] === 'other') return -1;
            return a[1].provider.name.localeCompare(b[1].provider.name);
        });
        
        for (const [groupKey, groupData] of sortedProviders) {
            const provider = groupData.provider;
            const providerServicesList = providerServices.get(groupKey) || [];
            const totalItems = groupData.subdomains.length + providerServicesList.length;
            
            if (totalItems === 0) continue;
            
            const boxId = `provider-box-${groupKey}`;
            const contentId = `provider-content-${groupKey}`;
            
            html += `
                <div style="background: var(--card-bg); border: 2px solid ${provider.color}; border-radius: 12px; overflow: hidden;">
                    <div style="background: ${provider.color}20; padding: 15px; cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center;" onclick="toggleProviderBox('${contentId}')">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span class="provider-toggle-icon" id="icon-${contentId}" style="font-size: 14px; color: ${provider.color}; font-weight: bold;">▼</span>
                            <h3 style="margin: 0; color: ${provider.color}; font-size: 18px; font-weight: 600;">${window.CommonUtils ? window.CommonUtils.escapeHtml(provider.name) : provider.name}</h3>
                        </div>
                        <div style="color: var(--text-secondary); font-size: 14px;">${totalItems} item${totalItems !== 1 ? 's' : ''}</div>
                    </div>
                    <div id="${contentId}" style="display: block; padding: 15px;">
            `;
            
            // Show subdomains
            if (groupData.subdomains.length > 0) {
                html += `<div style="margin-bottom: ${providerServicesList.length > 0 ? '15px' : '0'};"><strong style="color: var(--text-color); font-size: 14px; display: block; margin-bottom: 8px;">Subdomains:</strong>`;
                for (const sub of groupData.subdomains) {
                    const subName = sub.subdomain || sub.name || sub;
                    const escapedSubdomain = window.CommonUtils ? window.CommonUtils.escapeHtml(subName) : subName.replace(/[<>&"']/g, m => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'}[m]));
                    const ip = sub.ip || sub.ipAddresses?.[0] || 'N/A';
                    html += `
                        <div style="padding: 8px; margin-bottom: 6px; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid ${provider.color};">
                            <div style="color: var(--text-color); font-weight: 500;">
                                <a href="https://${escapedSubdomain}" target="_blank" rel="noopener" style="color: var(--accent-blue); text-decoration: none;">${escapedSubdomain}</a>
                            </div>
                            ${ip !== 'N/A' ? `<div style="color: var(--text-secondary); font-size: 12px; margin-top: 4px;">IP: ${window.CommonUtils ? window.CommonUtils.escapeHtml(ip) : ip}</div>` : ''}
                        </div>
                    `;
                }
                html += `</div>`;
            }
            
            // Show services
            if (providerServicesList.length > 0) {
                html += `<div><strong style="color: var(--text-color); font-size: 14px; display: block; margin-bottom: 8px;">Services:</strong>`;
                for (const service of providerServicesList) {
                    const serviceName = service.name || 'Unknown Service';
                    const escapedName = window.CommonUtils ? window.CommonUtils.escapeHtml(serviceName) : serviceName.replace(/[<>&"']/g, m => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'}[m]));
                    html += `
                        <div style="padding: 8px; margin-bottom: 6px; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid ${provider.color};">
                            <div style="color: var(--text-color); font-weight: 500;">${escapedName}</div>
                            ${service.category ? `<div style="color: var(--text-secondary); font-size: 12px; margin-top: 4px;">${window.CommonUtils ? window.CommonUtils.escapeHtml(service.category) : service.category}</div>` : ''}
                        </div>
                    `;
                }
                html += `</div>`;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        // Add toggle function
        if (!window.toggleProviderBox) {
            window.toggleProviderBox = function(contentId) {
                const content = document.getElementById(contentId);
                const icon = document.getElementById(`icon-${contentId}`);
                if (content && icon) {
                    if (content.style.display === 'none') {
                        content.style.display = 'block';
                        icon.textContent = '▼';
                    } else {
                        content.style.display = 'none';
                        icon.textContent = '▶';
                    }
                }
            };
        }
        
        container.innerHTML = html;
        container.style.padding = '0';
        container.style.background = 'transparent';
        
        console.log(`✅ Simple network view created with ${providerGroups.size} provider groups`);
    }

    // ==========================================
    // L2: Geographic Distribution Map
    // ==========================================

    // Display geographic distribution of infrastructure
    showGeoMap(containerId = 'geoMapContainer') {
        if (!this.analysisData?.processedData) {
            console.warn('No analysis data available for geo map');
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        // Check if Leaflet is available
        if (typeof L === 'undefined') {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">Map visualization library not loaded.</div>';
            return;
        }

        const data = this.analysisData.processedData;
        let subdomains = [];
        if (data.subdomains) {
            if (data.subdomains instanceof Map) {
                subdomains = Array.from(data.subdomains.values());
            } else if (Array.isArray(data.subdomains)) {
                subdomains = data.subdomains;
            } else {
                subdomains = Object.values(data.subdomains);
            }
        }

        // Country coordinates (approximate centers)
        const countryCoords = {
            'US': [39.8, -98.5], 'CA': [56.1, -106.3], 'GB': [54.0, -2.0], 'DE': [51.2, 10.5],
            'FR': [46.2, 2.2], 'NL': [52.1, 5.3], 'JP': [36.2, 138.3], 'AU': [-25.3, 133.8],
            'SG': [1.4, 103.8], 'IE': [53.4, -8.2], 'BR': [-14.2, -51.9], 'IN': [20.6, 78.9],
            'CN': [35.9, 104.2], 'KR': [35.9, 127.8], 'SE': [60.1, 18.6], 'CH': [46.8, 8.2],
            'IT': [41.9, 12.6], 'ES': [40.5, -3.7], 'PL': [51.9, 19.1], 'RU': [61.5, 105.3],
            'default': [0, 0]
        };

        // Collect locations from subdomains
        const locations = new Map();
        
        for (const sub of subdomains) {
            const country = sub.asnInfo?.country || sub.geoip?.country;
            if (country) {
                const key = country;
                if (!locations.has(key)) {
                    locations.set(key, { country, count: 0, subdomains: [], coords: countryCoords[country] || countryCoords['default'] });
                }
                const loc = locations.get(key);
                loc.count++;
                if (loc.subdomains.length < 5) {
                    loc.subdomains.push(sub.subdomain || sub.name);
                }
            }
        }

        if (locations.size === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">No geographic data available. Run a full scan with ASN enrichment.</div>';
            return;
        }

        // Setup map
        container.style.height = '400px';
        container.style.borderRadius = '8px';
        container.style.overflow = 'hidden';

        // Clear existing map
        if (this.geoMap) {
            this.geoMap.remove();
        }

        this.geoMap = L.map(container).setView([30, 0], 2);

        // Add tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.geoMap);

        // Add markers for each location
        const bounds = [];
        for (const [key, loc] of locations) {
            if (loc.coords[0] === 0 && loc.coords[1] === 0) continue;

            bounds.push(loc.coords);
            
            const radius = Math.min(Math.max(loc.count * 3, 10), 50);
            const circle = L.circleMarker(loc.coords, {
                radius: radius,
                fillColor: '#667eea',
                color: '#5a6fd6',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.6
            }).addTo(this.geoMap);

            circle.bindPopup(`
                <strong>${loc.country}</strong><br>
                <strong>${loc.count}</strong> subdomain${loc.count !== 1 ? 's' : ''}<br>
                <small>${loc.subdomains.join('<br>')}</small>
            `);
        }

        // Fit bounds if we have markers
        if (bounds.length > 0) {
            this.geoMap.fitBounds(bounds, { padding: [50, 50] });
        }

        console.log(`✅ Geo map created with ${locations.size} locations`);
    }

    // ==========================================
    // L5: Certificate Timeline
    // ==========================================

    // Display certificate timeline as monthly Gantt chart
    showCertificateTimeline(containerId = 'certTimelineContainer') {
        if (!this.analysisData?.processedData) {
            console.warn('No analysis data available for certificate timeline');
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const data = this.analysisData.processedData;
        
        // Extract historical records with timestamps
        // Check multiple possible locations for historicalRecords
        let historicalRecords = data.historicalRecords || [];
        if (historicalRecords.length === 0 && data.dataProcessor?.processedData?.historicalRecords) {
            historicalRecords = data.dataProcessor.processedData.historicalRecords;
        }
        if (historicalRecords.length === 0 && data.processedData?.historicalRecords) {
            historicalRecords = data.processedData.historicalRecords;
        }
        
        // Get current/active subdomains
        let currentSubdomains = [];
        if (data.subdomains) {
            if (data.subdomains instanceof Map) {
                currentSubdomains = Array.from(data.subdomains.values());
            } else if (Array.isArray(data.subdomains)) {
                currentSubdomains = data.subdomains;
            } else {
                currentSubdomains = Object.values(data.subdomains);
            }
        }
        
        // Also collect subdomains from services (sourceSubdomains)
        const serviceSubdomains = new Set();
        if (data.services) {
            let services = [];
            if (data.services instanceof Map) {
                services = Array.from(data.services.values());
            } else if (Array.isArray(data.services)) {
                services = data.services;
            } else {
                services = Object.values(data.services);
            }
            
            for (const service of services) {
                if (service.sourceSubdomains && Array.isArray(service.sourceSubdomains)) {
                    service.sourceSubdomains.forEach(sub => {
                        if (sub && typeof sub === 'string') {
                            serviceSubdomains.add(sub);
                        }
                    });
                }
            }
        }
        
        console.log(`📅 Certificate timeline: Found ${historicalRecords.length} historical records, ${currentSubdomains.length} current subdomains, ${serviceSubdomains.size} service subdomains`);
        
        // If we have no data at all, show message
        if (historicalRecords.length === 0 && currentSubdomains.length === 0 && serviceSubdomains.size === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">No subdomain data available for timeline.</div>';
            return;
        }

        // Group records by subdomain and collect ALL certificates
        const subdomainData = new Map();
        
        // First pass: Collect historical records with certificates
        for (const record of historicalRecords) {
            const subdomain = record.subdomain || record.name;
            if (!subdomain) continue;
            
            // Normalize subdomain (remove trailing dot if present)
            const normalizedSubdomain = subdomain.replace(/\.$/, '');
            
            if (!subdomainData.has(normalizedSubdomain)) {
                subdomainData.set(normalizedSubdomain, {
                    subdomain: normalizedSubdomain,
                    certificates: [],
                    discoveryDates: [],
                    isHistorical: true
                });
            }
            
            const subData = subdomainData.get(normalizedSubdomain);
            const certInfo = record.certificateInfo || {};
            
            // Collect certificate if it has dates
            if (certInfo.notBefore || certInfo.notAfter) {
                subData.certificates.push({
                    notBefore: certInfo.notBefore ? new Date(certInfo.notBefore) : null,
                    notAfter: certInfo.notAfter ? new Date(certInfo.notAfter) : null,
                    issuer: certInfo.issuer || 'Unknown',
                    certificateId: certInfo.certificateId || null
                });
            }
            
            // Track discovery dates as fallback
            if (record.discoveredAt) {
                subData.discoveryDates.push(new Date(record.discoveredAt));
            }
        }
        
        // Second pass: Add current/active subdomains (only if they have certificate info)
        for (const subdomain of currentSubdomains) {
            const subdomainName = subdomain.subdomain || subdomain.name || subdomain;
            if (!subdomainName) continue;
            
            // Only process if subdomain has certificate info
            if (!subdomain.certificateInfo) continue;
            
            const certInfo = subdomain.certificateInfo;
            // Only add if certificate has dates
            if (!certInfo.notBefore && !certInfo.notAfter) continue;
            
            // Normalize subdomain (remove trailing dot if present)
            const normalizedSubdomain = subdomainName.replace(/\.$/, '');
            
            if (!subdomainData.has(normalizedSubdomain)) {
                subdomainData.set(normalizedSubdomain, {
                    subdomain: normalizedSubdomain,
                    certificates: [],
                    discoveryDates: [],
                    isHistorical: false
                });
            }
            
            const subData = subdomainData.get(normalizedSubdomain);
            
            // Add certificate info
            subData.certificates.push({
                notBefore: certInfo.notBefore ? new Date(certInfo.notBefore) : null,
                notAfter: certInfo.notAfter ? new Date(certInfo.notAfter) : null,
                issuer: certInfo.issuer || 'Unknown',
                certificateId: certInfo.certificateId || null
            });
            
            // Track discovery dates
            if (subdomain.discoveredAt) {
                subData.discoveryDates.push(new Date(subdomain.discoveredAt));
            }
        }
        
        // Second pass: Calculate firstSeen and lastSeen from ALL certificates
        for (const [subdomain, subData] of subdomainData) {
            // Find the OLDEST certificate's notBefore date (earliest appearance)
            let oldestNotBefore = null;
            // Find the LATEST certificate's notAfter date (most recent expiration)
            let latestNotAfter = null;
            
            // Process all certificates to find oldest notBefore and latest notAfter
            for (const cert of subData.certificates) {
                if (cert.notBefore) {
                    if (!oldestNotBefore || cert.notBefore < oldestNotBefore) {
                        oldestNotBefore = cert.notBefore;
                    }
                }
                if (cert.notAfter) {
                    if (!latestNotAfter || cert.notAfter > latestNotAfter) {
                        latestNotAfter = cert.notAfter;
                    }
                }
            }
            
            // Set firstSeen: use oldest certificate notBefore, or earliest discovery date as fallback
            if (oldestNotBefore) {
                subData.firstSeen = oldestNotBefore;
            } else if (subData.discoveryDates.length > 0) {
                subData.firstSeen = new Date(Math.min(...subData.discoveryDates.map(d => d.getTime())));
            }
            
            // Set lastSeen: use latest certificate notAfter, or latest discovery date as fallback
            if (latestNotAfter) {
                subData.lastSeen = latestNotAfter;
            } else if (subData.discoveryDates.length > 0) {
                subData.lastSeen = new Date(Math.max(...subData.discoveryDates.map(d => d.getTime())));
            }
        }

        // Only include subdomains that have certificates (with dates)
        const validSubdomains = Array.from(subdomainData.values()).filter(s => {
            // Must have at least one certificate with dates
            const hasCertDates = s.certificates.length > 0 && s.certificates.some(cert => cert.notBefore || cert.notAfter);
            // Must have valid firstSeen and lastSeen
            return hasCertDates && s.firstSeen && s.lastSeen;
        });
        
        console.log(`📅 Certificate timeline: ${subdomainData.size} unique subdomains found, ${validSubdomains.length} with valid dates`);
        if (subdomainData.size > validSubdomains.length) {
            const invalidSubdomains = Array.from(subdomainData.values()).filter(s => !s.firstSeen || !s.lastSeen);
            console.log(`📅 Certificate timeline: ${invalidSubdomains.length} subdomains filtered out (missing dates):`, invalidSubdomains.map(s => s.subdomain));
        }
        
        if (validSubdomains.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">No dated records available for timeline.</div>';
            return;
        }

        // Sort by first seen date (oldest first)
        validSubdomains.sort((a, b) => a.firstSeen - b.firstSeen);

        // Calculate date range for the chart
        const allDates = validSubdomains.flatMap(s => [s.firstSeen, s.lastSeen]);
        let minDate = new Date(Math.min(...allDates));
        let maxDate = new Date(Math.max(...allDates));
        
        // Expand date range for better visualization (at least 6 months before and after)
        const now = new Date();
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAhead = new Date(now);
        sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);
        
        // If all dates are the same (e.g., all discovered today), show a wider range
        if (minDate.getTime() === maxDate.getTime()) {
            // Show 12 months before and 6 months after the discovery date
            minDate = new Date(minDate);
            minDate.setMonth(minDate.getMonth() - 12);
            maxDate = new Date(maxDate);
            maxDate.setMonth(maxDate.getMonth() + 6);
        } else {
            // Expand range by at least 3 months on each side
            const rangeMonths = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24 * 30));
            const paddingMonths = Math.max(3, Math.ceil(rangeMonths * 0.2));
            
            minDate = new Date(minDate);
            minDate.setMonth(minDate.getMonth() - paddingMonths);
            maxDate = new Date(maxDate);
            maxDate.setMonth(maxDate.getMonth() + paddingMonths);
        }
        
        // Ensure we don't go too far into the past (limit to 5 years)
        const fiveYearsAgo = new Date(now);
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        if (minDate < fiveYearsAgo) {
            minDate = fiveYearsAgo;
        }
        
        // Ensure we don't go too far into the future (limit to 2 years)
        const twoYearsAhead = new Date(now);
        twoYearsAhead.setFullYear(twoYearsAhead.getFullYear() + 2);
        if (maxDate > twoYearsAhead) {
            maxDate = twoYearsAhead;
        }
        
        // Generate monthly buckets
        const months = [];
        const current = new Date(minDate);
        current.setDate(1); // Start of month
        
        while (current <= maxDate) {
            months.push(new Date(current));
            current.setMonth(current.getMonth() + 1);
        }

        // Build Gantt chart HTML
        const monthWidth = 60; // pixels per month
        const rowHeight = 35; // pixels per subdomain row
        const maxSubdomains = 50; // Limit display to prevent overwhelming UI
        const displaySubdomains = validSubdomains.slice(0, maxSubdomains);
        
        let html = `
            <div style="padding: 15px; overflow-x: auto;">
                <div style="margin-bottom: 15px; color: var(--text-color);">
                    <strong>Subdomain Timeline (${displaySubdomains.length}${validSubdomains.length > maxSubdomains ? ` of ${validSubdomains.length}` : ''} subdomains)</strong>
                    <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 5px;">
                        Showing when subdomains first appeared (from certificate dates)
                    </div>
                </div>
                <div style="position: relative; min-width: ${months.length * monthWidth + 200}px;">
                    <!-- Month headers -->
                    <div style="display: flex; margin-left: 200px; margin-bottom: 5px; border-bottom: 2px solid var(--border-color);">
        `;
        
        for (const month of months) {
            const monthLabel = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            html += `<div style="width: ${monthWidth}px; text-align: center; font-size: 0.75em; color: var(--text-secondary); padding: 5px;">${monthLabel}</div>`;
        }
        
        html += `
                    </div>
                    <!-- Subdomain rows -->
        `;
        
        for (const subData of displaySubdomains) {
            const subdomain = subData.subdomain;
            const escapedSubdomain = window.CommonUtils ? window.CommonUtils.escapeHtml(subdomain) : subdomain.replace(/[<>&"']/g, m => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'}[m]));
            
            // Calculate position and width of the bar
            // Find the month that contains firstSeen (month where firstSeen falls)
            const startMonthIndex = months.findIndex(m => {
                const monthStart = new Date(m);
                const monthEnd = new Date(m);
                monthEnd.setMonth(monthEnd.getMonth() + 1);
                return subData.firstSeen >= monthStart && subData.firstSeen < monthEnd;
            });
            
            // Find the first month after lastSeen
            const endMonthIndex = months.findIndex(m => {
                const monthStart = new Date(m);
                return monthStart > subData.lastSeen;
            });
            const actualEndIndex = endMonthIndex === -1 ? months.length : endMonthIndex;
            
            if (startMonthIndex === -1) continue;
            
            const barStart = startMonthIndex * monthWidth;
            const barWidth = (actualEndIndex - startMonthIndex) * monthWidth;
            
            html += `
                <div style="display: flex; align-items: center; height: ${rowHeight}px; margin-bottom: 2px; border-bottom: 1px solid var(--border-color);">
                    <!-- Subdomain label -->
                    <div style="width: 200px; padding: 5px 10px; font-size: 0.85em; color: var(--text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0;" title="${escapedSubdomain}">
                        ${escapedSubdomain}
                    </div>
                    <!-- Timeline bar area -->
                    <div style="position: relative; flex: 1; height: 100%;">
                        <!-- Background grid -->
                        <div style="display: flex; height: 100%;">
            `;
            
            for (let i = 0; i < months.length; i++) {
                const isEven = i % 2 === 0;
                html += `<div style="width: ${monthWidth}px; height: 100%; background: ${isEven ? 'transparent' : 'rgba(0,0,0,0.02)'}; border-right: 1px solid var(--border-color);"></div>`;
            }
            
            html += `
                        </div>
                        <!-- Existence bar -->
                        <div style="position: absolute; left: ${barStart}px; top: 5px; width: ${barWidth}px; height: ${rowHeight - 10}px; background: var(--accent-blue); opacity: 0.6; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.7em; font-weight: bold;" title="First appeared: ${subData.firstSeen.toLocaleDateString()} | Last seen: ${subData.lastSeen.toLocaleDateString()} | ${subData.certificates.length} certificate(s) found">
                            ${subData.certificates.length > 0 ? subData.certificates.length : ''}
                        </div>
            `;
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += `
                </div>
                <!-- Legend -->
                <div style="margin-top: 20px; padding: 10px; background: var(--card-bg); border-radius: 8px; font-size: 0.85em; color: var(--text-color);">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 20px; height: 15px; background: var(--accent-blue); opacity: 0.6; border-radius: 4px;"></div>
                            <span>Subdomain existence period</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;

        console.log(`✅ Certificate timeline Gantt chart created with ${displaySubdomains.length} subdomains across ${months.length} months`);
    }

    // ==========================================
    // Helper: Create visualization containers in UI
    // ==========================================

    // Check if we have enough data to show visualizations
    hasVisualizableData() {
        if (!this.analysisData?.processedData) return false;
        
        const data = this.analysisData.processedData;
        let subdomains = [];
        
        if (data.subdomains) {
            if (data.subdomains instanceof Map) {
                subdomains = Array.from(data.subdomains.values());
            } else if (Array.isArray(data.subdomains)) {
                subdomains = data.subdomains;
            } else {
                subdomains = Object.values(data.subdomains);
            }
        }
        
        // Need at least 2 subdomains for meaningful visualizations
        return subdomains.length >= 2;
    }

    // Create and show all visualizations
    showAllVisualizations(targetSection = 'visualizations') {
        // Don't show visualizations if there's not enough data
        if (!this.hasVisualizableData()) {
            console.log('ℹ️ Skipping visualizations - not enough subdomain data');
            // Remove existing visualization section if present
            const existingSection = document.getElementById(targetSection);
            if (existingSection) existingSection.remove();
            return;
        }
        
        // Find or create the visualization section
        let section = document.getElementById(targetSection);
        
        if (!section) {
            // Create visualization section in results
            const results = document.getElementById('results');
            if (!results) return;

            section = document.createElement('div');
            section.id = targetSection;
            
            // Create collapsible structure for Visual Analytics (collapsed by default)
            const sectionId = `section-visualizations`;
            section.className = 'collapsible-section';
            section.innerHTML = `
                <div class="section-header" onclick="toggleSection('${sectionId}')">
                    <div class="section-title">
                        <span class="toggle-icon">▶</span>
                        <h2>📊 Visual Analytics</h2>
                    </div>
                </div>
                <div id="${sectionId}" class="section-content" style="display: none;">
                    <div class="viz-tabs" style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                        <button class="viz-tab active" data-viz="network" onclick="window.visualizer.switchTab('network')">🕸️ Network Graph</button>
                        <button class="viz-tab" data-viz="map" onclick="window.visualizer.switchTab('map')">🗺️ Geographic Map</button>
                        <button class="viz-tab" data-viz="timeline" onclick="window.visualizer.switchTab('timeline')">📅 Certificate Timeline</button>
                    </div>
                    <div id="networkGraphContainer" class="viz-content" style="display: block;"></div>
                    <div id="geoMapContainer" class="viz-content" style="display: none;"></div>
                    <div id="certTimelineContainer" class="viz-content" style="display: none;"></div>
                </div>
            `;
            
            // Insert after RAW DNS Records section (or after API Issues if no RAW DNS)
            const rawDNSSection = document.getElementById('rawDNSWrapper');
            const apiIssuesSection = document.querySelector('.collapsible-section h2')?.textContent?.includes('API Issues') 
                ? document.querySelector('.collapsible-section h2')?.closest('.collapsible-section')
                : null;
            const collapseControls = document.getElementById('collapseControlsContainer');
            
            if (rawDNSSection) {
                // Insert after RAW DNS section
                rawDNSSection.insertAdjacentElement('afterend', section);
            } else if (apiIssuesSection) {
                // If no RAW DNS, insert after API Issues
                apiIssuesSection.insertAdjacentElement('afterend', section);
            } else if (collapseControls) {
                // If no API Issues, insert after collapse controls
                collapseControls.insertAdjacentElement('afterend', section);
            } else {
                // Fallback: insert after stats
                const statsDiv = document.getElementById('stats');
                if (statsDiv) {
                    statsDiv.insertAdjacentElement('afterend', section);
                } else {
                    results.insertBefore(section, results.firstChild);
                }
            }
        }

        // Show the first visualization
        this.showNetworkGraph();
    }

    // Switch between visualization tabs
    switchTab(vizType) {
        // Update tab buttons
        document.querySelectorAll('.viz-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.viz === vizType) tab.classList.add('active');
        });

        // Hide all containers
        document.querySelectorAll('.viz-content').forEach(c => c.style.display = 'none');

        // Show selected container and load visualization
        switch (vizType) {
            case 'network':
                document.getElementById('networkGraphContainer').style.display = 'block';
                // Only create graph if we have enough data
                if (this.hasVisualizableData() && !this.networkGraph) {
                    this.showNetworkGraph();
                }
                break;
            case 'map':
                document.getElementById('geoMapContainer').style.display = 'block';
                if (!this.geoMap && this.hasVisualizableData()) {
                    this.showGeoMap();
                }
                break;
            case 'timeline':
                document.getElementById('certTimelineContainer').style.display = 'block';
                this.showCertificateTimeline();
                break;
        }
    }
}

// Global instance
window.visualizer = new Visualizer();

