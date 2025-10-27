// Logging Utility - Conditional logging based on debug mode
class Logger {
    constructor() {
        this.debugMode = false;
    }

    // Set debug mode
    setDebugMode(enabled) {
        this.debugMode = enabled;
        if (enabled) {
            console.log('🔍 DEBUG MODE ENABLED - Detailed output will be shown');
        }
    }

    // Check if debug mode is enabled
    isDebugEnabled() {
        return this.debugMode;
    }

    // Debug logs - only shown when debug mode is enabled
    debug(message, ...args) {
        if (this.debugMode) {
            console.log(`🔍 DEBUG: ${message}`, ...args);
        }
    }

    // Info logs - always shown
    info(message, ...args) {
        console.log(message, ...args);
    }

    // Warning logs - always shown
    warn(message, ...args) {
        console.warn(message, ...args);
    }

    // Error logs - always shown
    error(message, ...args) {
        console.error(message, ...args);
    }

    // Success logs - always shown
    success(message, ...args) {
        console.log(`✅ ${message}`, ...args);
    }

    // JSON debug logging
    debugJSON(message, data) {
        if (this.debugMode) {
            console.log(`🔍 DEBUG: ${message}`);
            console.log(JSON.stringify(data, null, 2));
        }
    }

    // Stats logging - respects debug mode for details
    stats(message, stats) {
        if (this.debugMode) {
            console.log(`📊 DEBUG: ${message}`);
            console.log(JSON.stringify(stats, null, 2));
        } else {
            // Show simplified stats in non-debug mode
            if (stats.totalServices !== undefined && stats.totalSubdomains !== undefined) {
                console.log(`📊 ${message}: ${stats.totalServices} services, ${stats.totalSubdomains} subdomains`);
            } else {
                console.log(`📊 ${message}`);
            }
        }
    }
}

// Create global logger instance
const logger = new Logger();

// Make it globally accessible
window.logger = logger;

