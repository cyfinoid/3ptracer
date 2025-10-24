// Service Registry - Phase 2 Implementation
class ServiceRegistry {
    constructor() {
        this.services = new Map(); // serviceId -> ServiceData
        this.categories = {
            email: new Set(),
            cloud: new Set(),
            security: new Set(),
            analytics: new Set(),
            documentation: new Set(),
            feedback: new Set(),
            aws: new Set() // Special AWS services group
        };
        this.callbacks = new Map();
    }
    
    // Add or update service
    addService(service, sourceSubdomain = null) {
        const serviceId = this.generateServiceId(service);
        const existing = this.services.get(serviceId);
        
        if (existing) {
            // Merge with existing service
            this.mergeServiceData(existing, service, sourceSubdomain);
            this.triggerCallbacks('serviceUpdated', serviceId, existing);
        } else {
            // Create new service entry
            const newService = this.createServiceEntry(service, sourceSubdomain);
            this.services.set(serviceId, newService);
            this.addToCategory(newService);
            this.triggerCallbacks('serviceAdded', serviceId, newService);
        }
    }
    
    // Generate unique service ID
    generateServiceId(service) {
        // For vendor consolidation, use only the name for certain services
        const vendorServices = ['Amazon AWS', 'Microsoft Azure', 'Google Cloud Platform', 'DigitalOcean', 'Linode', 'Vultr', 'OVHcloud', 'Hetzner'];
        
        if (vendorServices.includes(service.name)) {
            // Use only name for vendor services to allow consolidation across categories
            return service.name.toLowerCase().replace(/\s+/g, '-');
        }
        
        return `${service.name}-${service.category}`.toLowerCase().replace(/\s+/g, '-');
    }
    
    // Create new service entry
    createServiceEntry(service, sourceSubdomain = null) {
        return {
            id: this.generateServiceId(service),
            name: service.name,
            category: service.category,
            description: service.description,
            
            // Source information
            sourceSubdomains: sourceSubdomain ? [sourceSubdomain] : [],
            discoveryTime: new Date(),
            lastUpdated: new Date(),
            
            // Service details
            records: service.records || [],
            recordTypes: service.recordTypes || [],
            infrastructure: service.infrastructure || null,
            isInfrastructure: service.isInfrastructure || false,
            primaryService: service.primaryService || null,
            
            // AWS specific
            isAWSService: this.isAWSService(service),
            awsGroup: null, // Will be set if part of AWS services
            
            // Usage statistics
            usageCount: 1,
            subdomainCount: sourceSubdomain ? 1 : 0
        };
    }
    
    // Merge service data
    mergeServiceData(existing, newService, sourceSubdomain) {
        existing.lastUpdated = new Date();
        existing.usageCount++;
        
        // Add source subdomain if not already present
        if (sourceSubdomain && !existing.sourceSubdomains.includes(sourceSubdomain)) {
            existing.sourceSubdomains.push(sourceSubdomain);
            existing.subdomainCount++;
        }
        
        // Merge records
        if (newService.records) {
            existing.records = [...existing.records, ...newService.records];
        }
        
        // Update infrastructure information
        if (newService.infrastructure) {
            existing.infrastructure = newService.infrastructure;
        }
        
        // Update AWS grouping
        if (newService.isAWSService && !existing.awsGroup) {
            existing.awsGroup = this.getOrCreateAWSGroup();
        }
        
        // For vendor services, prefer the more specific category (cloud over infrastructure)
        const vendorServices = ['Amazon AWS', 'Microsoft Azure', 'Google Cloud Platform', 'DigitalOcean', 'Linode', 'Vultr', 'OVHcloud', 'Hetzner'];
        if (vendorServices.includes(existing.name) && newService.category === 'cloud' && existing.category === 'infrastructure') {
            existing.category = 'cloud';
            existing.description = newService.description || existing.description;
        }
    }
    
    // Add service to appropriate category
    addToCategory(service) {
        if (service.isAWSService) {
            this.categories.aws.add(service.id);
        } else if (this.categories[service.category]) {
            this.categories[service.category].add(service.id);
        }
    }
    
    // Get services by category
    getServicesByCategory(category) {
        const serviceIds = this.categories[category] || new Set();
        return Array.from(serviceIds).map(id => this.services.get(id)).filter(Boolean);
    }
    
    // Get AWS services group
    getOrCreateAWSGroup() {
        const awsServices = this.getServicesByCategory('aws');
        if (awsServices.length === 0) return null;
        
        return {
            name: 'AWS Services',
            category: 'cloud',
            description: 'Amazon Web Services - Cloud computing platform',
            subServices: awsServices,
            totalServices: awsServices.length,
            records: awsServices.flatMap(service => service.records || [])
        };
    }
    
    // Check if service is AWS service
    isAWSService(service) {
        const awsServiceNames = [
            'AWS Global Accelerator',
            'AWS App Runner',
            'AWS SES',
            'Amazon Web Services (AWS)',
            'AWS CloudFront',
            'AWS Lambda',
            'AWS S3',
            'AWS EC2'
        ];
        return awsServiceNames.includes(service.name);
    }
    
    // Backward compatibility methods
    
    // Push service (for backward compatibility)
    push(service) {
        this.addService(service);
    }
    
    // Get services as array (for backward compatibility)
    getServicesArray(category) {
        return this.getServicesByCategory(category);
    }
    
    // Get AWS services (for backward compatibility)
    getAWSServices() {
        return this.getOrCreateAWSGroup();
    }
    
    // Get all services
    getAllServices() {
        return Array.from(this.services.values());
    }
    
    // Get service count by category
    getServiceCount(category) {
        return this.getServicesByCategory(category).length;
    }
    
    // Get total service count
    getTotalServiceCount() {
        return this.services.size;
    }
    
    // Register callback
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
                console.warn(`Service callback error for ${event}:`, error);
            }
        });
    }
    
    // Clear all services
    clear() {
        this.services.clear();
        Object.values(this.categories).forEach(category => category.clear());
    }
    
    // Get statistics
    getStats() {
        const stats = {};
        Object.keys(this.categories).forEach(category => {
            stats[category] = this.getServiceCount(category);
        });
        stats.total = this.getTotalServiceCount();
        return stats;
    }
} 