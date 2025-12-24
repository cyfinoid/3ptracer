// Common Utilities - Shared functions used across multiple modules
// This file should be loaded before other JS files that depend on it

const CommonUtils = {
    /**
     * Safely check if a target domain is the same as or a subdomain of a given domain.
     * This prevents domain confusion attacks where 'evil-example.com' could match 'example.com'.
     * 
     * @param {string} target - The domain/hostname to check
     * @param {string} domain - The base domain to compare against
     * @returns {boolean} - True if target equals domain or is a subdomain of it
     * 
     * @example
     * isDomainOrSubdomain('example.com', 'example.com') // true
     * isDomainOrSubdomain('sub.example.com', 'example.com') // true
     * isDomainOrSubdomain('evil-example.com', 'example.com') // false
     * isDomainOrSubdomain('notexample.com', 'example.com') // false
     */
    isDomainOrSubdomain(target, domain) {
        if (!target || !domain) return false;
        
        const targetLower = target.toLowerCase().trim();
        const domainLower = domain.toLowerCase().trim();
        
        // Exact match
        if (targetLower === domainLower) return true;
        
        // Subdomain match - must end with .domain (not just contain it)
        if (targetLower.endsWith('.' + domainLower)) return true;
        
        return false;
    },

    /**
     * Validate if a string looks like a valid domain name.
     * 
     * @param {string} domain - The domain to validate
     * @returns {boolean} - True if it looks like a valid domain
     */
    isValidDomain(domain) {
        if (!domain || typeof domain !== 'string') return false;
        
        // Basic domain pattern: at least one dot, valid characters
        const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
        return domainPattern.test(domain.trim());
    },

    /**
     * Extract the base domain from a full hostname.
     * Note: This is a simple implementation that works for most cases.
     * For complex TLDs (co.uk, com.au), a proper public suffix list would be needed.
     * 
     * @param {string} hostname - The full hostname (e.g., 'sub.example.com')
     * @returns {string} - The base domain (e.g., 'example.com')
     */
    extractBaseDomain(hostname) {
        if (!hostname) return '';
        
        const parts = hostname.toLowerCase().trim().split('.');
        if (parts.length <= 2) return hostname;
        
        // Simple extraction - take last two parts
        // This won't work perfectly for co.uk, com.au, etc.
        return parts.slice(-2).join('.');
    },

    /**
     * Safely get string data from a DNS record (handles both string and object formats).
     * 
     * @param {string|object} record - DNS record (can be string or {data: string})
     * @returns {string} - The record data as a string
     */
    getRecordData(record) {
        if (!record) return '';
        if (typeof record === 'string') return record;
        if (record.data) return String(record.data);
        return String(record);
    }
};

// Export to window for global access
window.CommonUtils = CommonUtils;

