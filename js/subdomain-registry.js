// Subdomain Registry - Phase 1 Implementation
class SubdomainRegistry {
    constructor() {
        this.subdomains = new Map(); // subdomain -> SubdomainData
        this.discoveredSources = new Set(); // Track discovery sources
        this.processingQueue = new Set(); // Track subdomains being processed
        this.callbacks = new Map(); // Event callbacks
    }
    
    // Add or update subdomain
    addSubdomain(subdomain, source, data = null) {
        const existing = this.subdomains.get(subdomain);
        
        if (existing) {
            // Merge with existing data
            this.mergeSubdomainData(existing, data, source);
            this.triggerCallbacks('subdomainUpdated', subdomain, existing);
        } else {
            // Create new subdomain entry
            const newSubdomain = this.createSubdomainEntry(subdomain, source, data);
            this.subdomains.set(subdomain, newSubdomain);
            this.triggerCallbacks('subdomainAdded', subdomain, newSubdomain);
        }
        
        this.discoveredSources.add(source);
    }
    
    // Get subdomain by name
    getSubdomain(subdomain) {
        return this.subdomains.get(subdomain);
    }
    
    // Get all subdomains
    getAllSubdomains() {
        return Array.from(this.subdomains.values());
    }
    
    // Get subdomains by status
    getSubdomainsByStatus(status) {
        return this.getAllSubdomains().filter(sub => sub.status === status);
    }
    
    // Get subdomains by source
    getSubdomainsBySource(source) {
        return this.getAllSubdomains().filter(sub => 
            sub.discoverySources.includes(source)
        );
    }
    
    // Find subdomain index by predicate
    findIndex(predicate) {
        const subdomains = this.getAllSubdomains();
        return subdomains.findIndex(predicate);
    }
    
    // Register callback for events
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }
    
    // Trigger callbacks
    triggerCallbacks(event, ...args) {
        const callbacks = this.callbacks.get(event) || [];
        callbacks.forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.warn(`Callback error for ${event}:`, error);
            }
        });
    }
    
    // Create new subdomain entry
    createSubdomainEntry(subdomain, source, data = null) {
        return {
            subdomain: subdomain,
            status: 'discovered', // discovered, processing, analyzed, error
            discoverySources: [source],
            discoveryTime: new Date(),
            lastUpdated: new Date(),
            
            // DNS Analysis
            records: data?.records || {},
            ipAddresses: data?.ipAddresses || [],
            cnameChain: data?.cnameChain || [],
            
            // Service Detection
            primaryService: data?.primaryService || null,
            infrastructure: data?.infrastructure || null,
            detectedServices: data?.detectedServices || [],
            
            // Vendor Information
            vendor: data?.vendor || { vendor: 'Unknown', category: 'Unknown' },
            
            // Security Analysis
            takeover: data?.takeover || null,
            vulnerabilities: data?.vulnerabilities || [],
            
            // Processing Information
            processingAttempts: 0,
            lastProcessingAttempt: null,
            processingErrors: []
        };
    }
    
    // Merge subdomain data
    mergeSubdomainData(existing, newData, source) {
        // Add discovery source if not already present
        if (!existing.discoverySources.includes(source)) {
            existing.discoverySources.push(source);
        }
        
        // Update timestamp
        existing.lastUpdated = new Date();
        
        // Merge DNS records
        if (newData?.records) {
            existing.records = { ...existing.records, ...newData.records };
        }
        
        // Merge IP addresses
        if (newData?.ipAddresses) {
            existing.ipAddresses = [...new Set([...existing.ipAddresses, ...newData.ipAddresses])];
        }
        
        // Update CNAME chain if new one is more complete
        if (newData?.cnameChain && newData.cnameChain.length > existing.cnameChain.length) {
            existing.cnameChain = newData.cnameChain;
        }
        
        // Update services (prefer newer information)
        if (newData?.primaryService) {
            existing.primaryService = newData.primaryService;
        }
        
        if (newData?.infrastructure) {
            existing.infrastructure = newData.infrastructure;
        }
        
        if (newData?.detectedServices) {
            existing.detectedServices = [...existing.detectedServices, ...newData.detectedServices];
        }
        
        // Update vendor information
        if (newData?.vendor && newData.vendor.vendor !== 'Unknown') {
            existing.vendor = newData.vendor;
        }
        
        // Update security information
        if (newData?.takeover) {
            existing.takeover = newData.takeover;
        }
        
        if (newData?.vulnerabilities) {
            existing.vulnerabilities = [...existing.vulnerabilities, ...newData.vulnerabilities];
        }
        
        // Update status
        if (newData?.status) {
            existing.status = newData.status;
        }

    }
    
    // Get statistics
    getStats() {
        const subdomains = this.getAllSubdomains();
        return {
            total: subdomains.length,
            byStatus: {
                discovered: subdomains.filter(s => s.status === 'discovered').length,
                processing: subdomains.filter(s => s.status === 'processing').length,
                analyzed: subdomains.filter(s => s.status === 'analyzed').length,
                error: subdomains.filter(s => s.status === 'error').length
            },
            bySource: Object.fromEntries(
                Array.from(this.discoveredSources).map(source => [
                    source, 
                    this.getSubdomainsBySource(source).length
                ])
            )
        };
    }
    
    // Clear all subdomains
    clear() {
        this.subdomains.clear();
        this.discoveredSources.clear();
        this.processingQueue.clear();
    }
} 