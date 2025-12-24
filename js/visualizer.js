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

    // Build and display network graph from CNAME chains and subdomain relationships
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

        // Check if vis.js is available
        if (typeof vis === 'undefined') {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">Network visualization library not loaded.</div>';
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

        // Check if we have enough subdomains for a meaningful visualization
        if (subdomains.length < 2) {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">Not enough subdomain data for network visualization. Need at least 2 subdomains.</div>';
            console.log('ℹ️ Skipping network graph - not enough subdomain data (need at least 2, found ' + subdomains.length + ')');
            return;
        }

        const nodes = [];
        const edges = [];
        const nodeIds = new Set();

        // Get domain from stats or first subdomain
        const domain = data.stats?.domain || 'domain';

        // Add root domain node (colors from CSS variables)
        nodes.push({
            id: domain,
            label: domain,
            shape: 'diamond',
            color: { 
                background: getCSSVar('--accent-blue', '#466fe0'), 
                border: getCSSVar('--accent-blue', '#466fe0') 
            },
            font: { color: getCSSVar('--text-primary', '#ffffff') },
            size: 30
        });
        nodeIds.add(domain);

        // Enhanced provider detection and grouping
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
        
        // Check for email services (MX-based) that should create provider boxes even without subdomains
        // Services are stored in processedData.services (Map or Object)
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

        for (const sub of subdomains.slice(0, 100)) { // Limit to 100 nodes for performance
            const subName = sub.subdomain || sub.name || sub;
            if (!subName || nodeIds.has(subName)) continue;

            nodeIds.add(subName);
            
            // Detect provider for this subdomain
            const provider = detectProvider(sub);
            
            // Use default "Other" provider if none detected
            const displayProvider = provider || { name: 'Other', color: '#6c757d', group: 'other' };
            
            // Build tooltip with IP and provider
            let tooltip = `${subName}\nIP: ${sub.ip || sub.ipAddresses?.[0] || 'N/A'}\nProvider: ${displayProvider.name}`;
            if (sub.asnInfo?.org) {
                tooltip += `\nASN: ${sub.asnInfo.org}`;
            }
            
            // Add subdomain node with provider group (only if provider detected, otherwise no group)
            nodes.push({
                id: subName,
                label: subName.replace(`.${domain}`, ''),
                shape: 'dot',
                color: { background: displayProvider.color, border: displayProvider.color },
                size: 15,
                group: provider ? provider.group : undefined, // Only set group if provider detected
                title: tooltip
            });

            // Add edge to parent domain
            edges.push({
                from: domain,
                to: subName,
                color: { 
                    color: getCSSVar('--text-secondary', '#cccccc'), 
                    opacity: 0.5 
                },
                width: 1
            });

            // Add IP node and edge if IP exists
            const ip = sub.ip || sub.ipAddresses?.[0];
            if (ip && ip !== 'N/A') {
                const ipNodeId = `ip_${ip}`;
                if (!nodeIds.has(ipNodeId)) {
                    nodeIds.add(ipNodeId);
                    
                    // Build IP tooltip with PTR records
                    let ipTooltip = `IP: ${ip}`;
                    if (sub.records && sub.records.PTR && sub.records.PTR.length > 0) {
                        const ptrHostnames = sub.records.PTR.map(ptr => ptr.hostname || ptr.data).join(', ');
                        ipTooltip += `\nPTR: ${ptrHostnames}`;
                    }
                    if (sub.asnInfo?.org) {
                        ipTooltip += `\nASN: ${sub.asnInfo.org}`;
                    }
                    
                    nodes.push({
                        id: ipNodeId,
                        label: ip,
                        shape: 'square',
                        color: { 
                            background: getCSSVar('--accent-blue', '#17a2b8'), 
                            border: getCSSVar('--accent-blue', '#17a2b8') 
                        },
                        font: { color: getCSSVar('--text-primary', '#ffffff'), size: 10 },
                        size: 12,
                        title: ipTooltip
                    });
                }
                
                // Add edge from subdomain to IP
                edges.push({
                    from: subName,
                    to: ipNodeId,
                    arrows: 'to',
                    color: { color: getCSSVar('--accent-blue', '#17a2b8') },
                    width: 1,
                    label: 'A'
                });
                
                // Add PTR edges if available
                if (sub.records && sub.records.PTR && sub.records.PTR.length > 0) {
                    for (const ptr of sub.records.PTR) {
                        const ptrHostname = ptr.hostname || ptr.data;
                        if (ptrHostname && !nodeIds.has(ptrHostname)) {
                            nodeIds.add(ptrHostname);
                            nodes.push({
                                id: ptrHostname,
                                label: ptrHostname.length > 20 ? ptrHostname.substring(0, 20) + '...' : ptrHostname,
                                shape: 'triangle',
                                color: { 
                                    background: getCSSVar('--accent-yellow', '#ffc107'), 
                                    border: getCSSVar('--accent-yellow', '#ffc107') 
                                },
                                font: { color: '#000000', size: 9 },
                                size: 10,
                                title: `PTR: ${ptrHostname}\nReverse DNS for ${ip}`
                            });
                        }
                        
                        // Add reverse edge from IP to PTR hostname
                        edges.push({
                            from: ipNodeId,
                            to: ptrHostname,
                            arrows: 'to',
                            color: { color: getCSSVar('--accent-yellow', '#ffc107') },
                            dashes: [5, 5],
                            width: 1,
                            label: 'PTR'
                        });
                    }
                }
            }

            // Add CNAME edges if present
            if (sub.cname || sub.cnameTarget) {
                const cnameTarget = sub.cname || sub.cnameTarget;
                if (!nodeIds.has(cnameTarget)) {
                    nodeIds.add(cnameTarget);
                    nodes.push({
                        id: cnameTarget,
                        label: cnameTarget.substring(0, 20) + '...',
                        shape: 'box',
                        color: { 
                            background: getCSSVar('--accent-green', '#28a745'), 
                            border: getCSSVar('--accent-green', '#28a745') 
                        },
                        font: { color: getCSSVar('--text-primary', '#ffffff'), size: 10 },
                        size: 10,
                        title: `CNAME Target: ${cnameTarget}`
                    });
                }
                edges.push({
                    from: subName,
                    to: cnameTarget,
                    arrows: 'to',
                    color: { color: getCSSVar('--accent-green', '#28a745') },
                    dashes: true,
                    width: 1,
                    label: 'CNAME'
                });
            }
        }

        // Create provider container boxes with structured layout
        const providerBoxes = [];
        const subdomainPositions = new Map();
        const boxWidth = 300;
        const boxHeight = 400;
        const subdomainSpacing = 40;
        const boxSpacing = 50;
        
        // Calculate grid layout for provider boxes
        const boxesPerRow = Math.ceil(Math.sqrt(providerGroups.size));
        let boxIndex = 0;
        
        for (const [groupKey, groupData] of providerGroups) {
            // Skip only if no subdomains AND it's not an email service provider
            // Email service providers (like Google Workspace) may have no subdomains but should still show
            const hasEmailService = services.some(service => {
                const serviceName = (service.name || '').toLowerCase();
                const serviceCategory = (service.category || '').toLowerCase();
                if (serviceCategory === 'email' || serviceCategory === 'email-service') {
                    const emailServiceToProvider = {
                        'google workspace': 'google',
                        'gmail': 'google',
                        'microsoft 365': 'azure',
                        'microsoft office 365': 'azure',
                        'outlook': 'azure'
                    };
                    for (const [emailServiceName, providerGroup] of Object.entries(emailServiceToProvider)) {
                        if (providerGroup === groupKey && serviceName.includes(emailServiceName)) {
                            return true;
                        }
                    }
                }
                return false;
            });
            
            // Skip if no subdomains and no email service
            if (groupData.subdomains.length === 0 && !hasEmailService) continue;
            
            const row = Math.floor(boxIndex / boxesPerRow);
            const col = boxIndex % boxesPerRow;
            
            // Position provider box
            const boxX = col * (boxWidth + boxSpacing) + boxWidth / 2;
            const boxY = row * (boxHeight + boxSpacing) + boxHeight / 2 + 100; // Offset for root domain
            
            const groupNodeId = `provider_box_${groupKey}`;
            
            // Determine label based on whether there are subdomains or just email service
            let boxLabel = groupData.provider.name;
            let boxTitle = groupData.provider.name;
            if (groupData.subdomains.length > 0) {
                boxLabel += `\n(${groupData.subdomains.length} subdomain${groupData.subdomains.length !== 1 ? 's' : ''})`;
                boxTitle += `\n${groupData.subdomains.length} subdomain(s)`;
            } else if (hasEmailService) {
                boxLabel += '\n(Email Service)';
                boxTitle += '\nEmail Service';
            }
            
            // Create provider box node (larger, as container)
            // Use CSS variable for background with opacity
            const providerColor = groupData.provider.color;
            providerBoxes.push({
                id: groupNodeId,
                label: boxLabel,
                shape: 'box',
                color: { 
                    background: providerColor + '40', // Semi-transparent
                    border: providerColor,
                    highlight: { 
                        background: providerColor + '60', 
                        border: providerColor 
                    }
                },
                font: { color: providerColor, size: 16, face: 'Arial', bold: true },
                size: { width: boxWidth, height: boxHeight },
                x: boxX,
                y: boxY,
                fixed: { x: true, y: true },
                physics: false,
                title: boxTitle,
                margin: 10
            });
            
            // Position subdomains within the box (grid layout)
            const subdomainsInBox = groupData.subdomains.slice(0, 50); // Limit per box
            const subsPerRow = Math.ceil(Math.sqrt(subdomainsInBox.length));
            const subBoxWidth = boxWidth - 40; // Padding
                const subBoxHeight = boxHeight - 60; // Padding for label
            
            let subIndex = 0;
            for (const sub of subdomainsInBox) {
                const subName = sub.subdomain || sub.name || sub;
                if (!nodeIds.has(subName)) continue;
                
                const subRow = Math.floor(subIndex / subsPerRow);
                const subCol = subIndex % subsPerRow;
                
                const subX = boxX - boxWidth/2 + 20 + (subCol + 0.5) * (subBoxWidth / subsPerRow);
                const subY = boxY - boxHeight/2 + 40 + (subRow + 0.5) * (subBoxHeight / subsPerRow);
                
                // Update subdomain node position
                const nodeIndex = nodes.findIndex(n => n.id === subName);
                if (nodeIndex !== -1) {
                    nodes[nodeIndex].x = subX;
                    nodes[nodeIndex].y = subY;
                    nodes[nodeIndex].fixed = { x: true, y: true };
                    nodes[nodeIndex].physics = false;
                }
                
                subdomainPositions.set(subName, { x: subX, y: subY, provider: groupKey });
                subIndex++;
            }
            
            boxIndex++;
        }
        
        // Add provider box nodes
        nodes.push(...providerBoxes);

        // Position root domain node at top center
        const rootNodeIndex = nodes.findIndex(n => n.id === domain);
        if (rootNodeIndex !== -1) {
            const totalWidth = boxesPerRow * (boxWidth + boxSpacing);
            nodes[rootNodeIndex].x = totalWidth / 2;
            nodes[rootNodeIndex].y = 50;
            nodes[rootNodeIndex].fixed = { x: true, y: true };
            nodes[rootNodeIndex].physics = false;
        }
        
        // Position IP and PTR nodes near their subdomains (or in a separate area)
        // For now, position them near their connected subdomains
        for (const edge of edges) {
            if (edge.label === 'A' && edge.from && edge.to) {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);
                if (fromNode && toNode && fromNode.fixed && !toNode.fixed) {
                    // Position IP node to the right of subdomain
                    toNode.x = fromNode.x + 60;
                    toNode.y = fromNode.y;
                    toNode.fixed = { x: true, y: true };
                    toNode.physics = false;
                }
            }
        }
        
        // Create the network
        const graphData = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        
        // Define node groups for styling with theme-aware colors
        const groups = {};
        for (const [groupKey, groupData] of providerGroups) {
            groups[groupKey] = {
                color: { background: groupData.provider.color, border: groupData.provider.color },
                font: { color: getCSSVar('--text-primary', '#ffffff'), size: 12 }
            };
        }
        groups['other'] = {
            color: { background: '#6c757d', border: '#545b62' },
            font: { color: getCSSVar('--text-primary', '#ffffff'), size: 12 }
        };
        
        const options = {
            nodes: {
                font: { size: 11, color: getCSSVar('--text-primary', '#333333') },
                shapeProperties: {
                    useBorderWithImage: true,
                    borderRadius: 4
                },
                borderWidth: 2,
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.2)',
                    size: 5,
                    x: 2,
                    y: 2
                }
            },
            edges: {
                font: { size: 9, color: getCSSVar('--text-secondary', '#8a8f98') },
                smooth: {
                    type: 'curvedCW',
                    roundness: 0.2
                },
                selectionWidth: 2,
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 0.8
                    }
                },
                color: {
                    color: getCSSVar('--text-secondary', '#cccccc'),
                    highlight: getCSSVar('--accent-blue', '#466fe0'),
                    hover: getCSSVar('--accent-blue', '#466fe0')
                }
            },
            groups: groups,
            physics: {
                enabled: false // Disable physics for fixed layout
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true,
                selectConnectedEdges: true,
                dragNodes: false // Prevent dragging since positions are fixed
            },
            layout: {
                improvedLayout: false,
                hierarchical: {
                    enabled: false
                }
            },
            configure: {
                enabled: false
            }
        };

        // Calculate container size based on layout
        const totalRows = Math.ceil(providerGroups.size / boxesPerRow);
        const containerHeight = Math.max(600, totalRows * (boxHeight + boxSpacing) + 150);
        const containerWidth = Math.max(800, boxesPerRow * (boxWidth + boxSpacing) + 100);
        
        container.style.height = `${containerHeight}px`;
        container.style.width = '100%';
        container.style.border = `1px solid ${getCSSVar('--border-color', 'rgba(80, 200, 120, 0.2)')}`;
        container.style.borderRadius = '8px';
        container.style.background = getCSSVar('--card-bg', '#1e1e1e');
        container.style.position = 'relative';
        container.style.overflow = 'auto';

        // Add provider legend (CSS variables handle theme automatically)
        const legendHtml = `
            <div style="position: absolute; top: 10px; right: 10px; background: var(--card-bg); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); z-index: 1000; font-size: 0.85em; max-width: 200px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="font-weight: bold; margin-bottom: 8px; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">Cloud Providers</div>
                ${Array.from(providerGroups.values()).map(groupData => `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                        <div style="width: 12px; height: 12px; background: ${groupData.provider.color}; border-radius: 2px; flex-shrink: 0;"></div>
                        <span style="color: var(--text-primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${groupData.provider.name}</span>
                        <span style="color: var(--text-secondary); font-size: 0.9em; flex-shrink: 0;">(${groupData.subdomains.length})</span>
                    </div>
                `).join('')}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', legendHtml);

        this.networkGraph = new vis.Network(container, graphData, options);
        
        // Fit to viewport after a short delay
        setTimeout(() => {
            this.networkGraph.fit({
                animation: {
                    duration: 500,
                    easingFunction: 'easeInOutQuad'
                }
            });
        }, 100);
        
        console.log(`✅ Network graph created with ${nodes.length} nodes, ${edges.length} edges, and ${providerGroups.size} provider boxes in structured layout`);
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
        
        console.log(`📅 Certificate timeline: Found ${historicalRecords.length} historical records`);
        
        if (historicalRecords.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">No certificate timeline data available.</div>';
            return;
        }

        // Group records by subdomain and collect ALL certificates
        const subdomainData = new Map();
        
        // First pass: Collect all certificates for each subdomain
        for (const record of historicalRecords) {
            const subdomain = record.subdomain || record.name;
            if (!subdomain) continue;
            
            if (!subdomainData.has(subdomain)) {
                subdomainData.set(subdomain, {
                    subdomain: subdomain,
                    certificates: [],
                    discoveryDates: [] // Track discovery dates as fallback
                });
            }
            
            const subData = subdomainData.get(subdomain);
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

        // Filter out subdomains without valid dates
        const validSubdomains = Array.from(subdomainData.values()).filter(s => s.firstSeen && s.lastSeen);
        
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
            section.className = 'service-category';
            section.innerHTML = `
                <h2>📊 Visual Analytics</h2>
                <div class="viz-tabs" style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                    <button class="viz-tab active" data-viz="network" onclick="window.visualizer.switchTab('network')">🕸️ Network Graph</button>
                    <button class="viz-tab" data-viz="map" onclick="window.visualizer.switchTab('map')">🗺️ Geographic Map</button>
                    <button class="viz-tab" data-viz="timeline" onclick="window.visualizer.switchTab('timeline')">📅 Certificate Timeline</button>
                </div>
                <div id="networkGraphContainer" class="viz-content" style="display: block;"></div>
                <div id="geoMapContainer" class="viz-content" style="display: none;"></div>
                <div id="certTimelineContainer" class="viz-content" style="display: none;"></div>
            `;
            results.insertBefore(section, results.firstChild);
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

