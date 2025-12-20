// Logging Utility
class Logger {
    // Debug logs
    debug(message, ...args) {
        console.log(`🔍 ${message}`, ...args);
    }

    // JSON debug logging
    debugJSON(message, data) {
        console.log(`🔍 ${message}`, data);
    }

    // Stats logging
    stats(message, stats) {
        if (stats && stats.totalServices !== undefined && stats.totalSubdomains !== undefined) {
            console.log(`📊 ${message}: ${stats.totalServices} services, ${stats.totalSubdomains} subdomains`);
        } else {
            console.log(`📊 ${message}`);
        }
    }
}

// Create global logger instance
window.logger = new Logger();
