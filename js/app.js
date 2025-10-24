// Simplified Main Application - now just a wrapper around AnalysisController
class App {
    constructor() {
        this.analysisController = AnalysisController.create();
        this.currentDomain = '';
    }

    // Main analysis function - now delegates to AnalysisController
    async analyzeDomain(domain) {
        this.currentDomain = domain;
        await this.analysisController.analyzeDomain(domain);
    }

    // Save results to localStorage
    saveResults() {
        if (this.currentDomain) {
            localStorage.setItem(`3ptracer_last_domain`, this.currentDomain);
        }
    }

    // Load results from localStorage (simplified)
    loadResults(domain) {
        const saved = localStorage.getItem(`3ptracer_last_domain`);
        return saved === domain;
    }
}

// Global app instance
const app = new App();

// Main analysis function (called from HTML)
async function analyzeDomain() {
    const domainInput = document.getElementById('domain');
    const analyzeBtn = document.querySelector('.analyze-btn');
    const domain = domainInput.value.trim();
    
    if (!domain) {
        alert('Please enter a domain name');
        return;
    }
    
    // Disable button and show progress
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    
    // Hide previous results
    document.getElementById('results').style.display = 'none';
    
    try {
        await app.analyzeDomain(domain);
        app.saveResults();
    } catch (error) {
        console.error('Analysis failed:', error);
    } finally {
        // Re-enable button
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Domain';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Handle Enter key in input field
    const domainInput = document.getElementById('domain');
    if (domainInput) {
        domainInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                analyzeDomain();
            }
        });
        
        // Load saved domain
        const savedDomain = localStorage.getItem('3ptracer_last_domain');
        if (savedDomain) {
            domainInput.value = savedDomain;
        }
    }
}); 