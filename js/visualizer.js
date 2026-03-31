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
        const nodes = [];
        const edges = [];
        const nodeIds = new Set();

        // Get domain from stats or first subdomain
        const domain = data.stats?.domain || 'domain';

        // Add root domain node
        nodes.push({
            id: domain,
            label: domain,
            shape: 'diamond',
            color: { background: '#667eea', border: '#5a6fd6' },
            font: { color: '#ffffff' },
            size: 30
        });
        nodeIds.add(domain);

        // Process subdomains
        const subdomains = data.subdomains ? 
            (Array.isArray(data.subdomains) ? data.subdomains : Object.values(data.subdomains)) : [];

        // Color map for providers
        const providerColors = {
            'cloudflare': '#f38020',
            'amazon': '#ff9900',
            'aws': '#ff9900',
            'google': '#4285f4',
            'microsoft': '#00a4ef',
            'azure': '#00a4ef',
            'digitalocean': '#0080ff',
            'akamai': '#009aff',
            'fastly': '#ff282d'
        };

        const getNodeColor = (subdomain) => {
            const provider = (subdomain.asnInfo?.org || subdomain.provider || '').toLowerCase();
            for (const [key, color] of Object.entries(providerColors)) {
                if (provider.includes(key)) {
                    return { background: color, border: color };
                }
            }
            return { background: '#6c757d', border: '#545b62' };
        };

        for (const sub of subdomains.slice(0, 100)) { // Limit to 100 nodes for performance
            const subName = sub.subdomain || sub.name || sub;
            if (!subName || nodeIds.has(subName)) continue;

            nodeIds.add(subName);
            
            // Add subdomain node
            nodes.push({
                id: subName,
                label: subName.replace(`.${domain}`, ''),
                shape: 'dot',
                color: getNodeColor(sub),
                size: 15,
                title: `${subName}\nIP: ${sub.ip || 'N/A'}\nProvider: ${sub.asnInfo?.org || 'Unknown'}`
            });

            // Add edge to parent domain
            edges.push({
                from: domain,
                to: subName,
                color: { color: '#cccccc', opacity: 0.5 },
                width: 1
            });

            // Add CNAME edges if present
            if (sub.cname || sub.cnameTarget) {
                const cnameTarget = sub.cname || sub.cnameTarget;
                if (!nodeIds.has(cnameTarget)) {
                    nodeIds.add(cnameTarget);
                    nodes.push({
                        id: cnameTarget,
                        label: cnameTarget.substring(0, 20) + '...',
                        shape: 'box',
                        color: { background: '#28a745', border: '#1e7b34' },
                        font: { color: '#ffffff', size: 10 },
                        size: 10,
                        title: `CNAME Target: ${cnameTarget}`
                    });
                }
                edges.push({
                    from: subName,
                    to: cnameTarget,
                    arrows: 'to',
                    color: { color: '#28a745' },
                    dashes: true,
                    width: 1,
                    label: 'CNAME'
                });
            }
        }

        // Create the network
        const graphData = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        
        const options = {
            nodes: {
                font: { size: 12, color: '#333' }
            },
            edges: {
                font: { size: 10 },
                smooth: { type: 'continuous' }
            },
            physics: {
                stabilization: { iterations: 100 },
                barnesHut: {
                    gravitationalConstant: -2000,
                    centralGravity: 0.3,
                    springLength: 150,
                    springConstant: 0.04
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true
            }
        };

        container.style.height = '500px';
        container.style.border = '1px solid var(--border-color)';
        container.style.borderRadius = '8px';
        container.style.background = 'var(--card-bg)';

        this.networkGraph = new vis.Network(container, graphData, options);
        
        console.log(`✅ Network graph created with ${nodes.length} nodes and ${edges.length} edges`);
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
        const subdomains = data.subdomains ? 
            (Array.isArray(data.subdomains) ? data.subdomains : Object.values(data.subdomains)) : [];

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

    // Display certificate issuance timeline
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
        const historicalRecords = data.historicalRecords || [];
        
        if (historicalRecords.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">No certificate timeline data available.</div>';
            return;
        }

        // Group by date
        const byDate = new Map();
        for (const record of historicalRecords) {
            const date = record.lastSeen || record.firstSeen || 'Unknown';
            if (date === 'Unknown') continue;
            
            const dateKey = date.split('T')[0];
            if (!byDate.has(dateKey)) {
                byDate.set(dateKey, []);
            }
            byDate.get(dateKey).push(record);
        }

        // Sort dates
        const sortedDates = Array.from(byDate.keys()).sort().reverse();

        if (sortedDates.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">No dated records available for timeline.</div>';
            return;
        }

        // Build timeline HTML
        let html = '<div class="cert-timeline" style="padding: 10px;">';
        
        for (const date of sortedDates.slice(0, 20)) {
            const records = byDate.get(date);
            const formattedDate = new Date(date).toLocaleDateString('en-US', { 
                year: 'numeric', month: 'short', day: 'numeric' 
            });

            html += `
                <div class="timeline-item" style="display: flex; margin-bottom: 15px; padding-left: 20px; border-left: 3px solid var(--accent-blue); position: relative;">
                    <div class="timeline-dot" style="position: absolute; left: -8px; top: 0; width: 12px; height: 12px; background: var(--accent-blue); border-radius: 50%;"></div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: var(--text-primary); margin-bottom: 5px;">${formattedDate}</div>
                        <div style="font-size: 0.85em; color: var(--text-secondary);">
                            ${records.length} certificate${records.length !== 1 ? 's' : ''} observed
                        </div>
                        <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 3px;">
                            ${records.slice(0, 3).map(r => {
                                const text = r.subdomain || r.name || '';
                                return window.CommonUtils ? window.CommonUtils.escapeHtml(text) : text.replace(/[<>&"']/g, m => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'}[m]));
                            }).join(', ')}
                            ${records.length > 3 ? ` +${records.length - 3} more` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;

        console.log(`✅ Certificate timeline created with ${sortedDates.length} dates`);
    }

    // ==========================================
    // Helper: Create visualization containers in UI
    // ==========================================

    // Check if we have enough data to show visualizations
    hasVisualizableData() {
        if (!this.analysisData?.processedData) return false;
        
        const data = this.analysisData.processedData;
        const subdomains = data.subdomains ? 
            (Array.isArray(data.subdomains) ? data.subdomains : Object.values(data.subdomains)) : [];
        
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
                if (!this.networkGraph) this.showNetworkGraph();
                break;
            case 'map':
                document.getElementById('geoMapContainer').style.display = 'block';
                if (!this.geoMap) this.showGeoMap();
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

