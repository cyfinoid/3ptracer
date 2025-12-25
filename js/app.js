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
}

// Global app instance
const app = new App();
window.app = app; // Expose globally for import functionality

// Standard analysis function - Full analysis with subdomain discovery (called from HTML)
async function analyzeStandard() {
    const domainInput = document.getElementById('domain');
    const standardBtn = document.getElementById('analyzeStandardBtn');
    const quickEmailBtn = document.getElementById('analyzeQuickEmailBtn');
    const inputValue = domainInput.value.trim();
    
    if (!inputValue) {
        alert('Please enter a domain name');
        return;
    }
    
    // L4: Auto-detect batch mode from comma-separated input
    const domains = inputValue.split(/[,\s]+/)
        .map(d => d.trim())
        .filter(d => d && d.includes('.'));
    
    if (domains.length > 1) {
        await analyzeBatchDomains(domains);
        return;
    }
    
    const domain = domains[0] || inputValue;
    
    // Disable buttons and show progress
    if (standardBtn) {
        standardBtn.disabled = true;
        standardBtn.querySelector('.btn-text').textContent = 'Analyzing...';
    }
    if (quickEmailBtn) quickEmailBtn.disabled = true;
    analysisInProgress = true;
    
    // Hide previous results
    document.getElementById('results').style.display = 'none';
    
    try {
        await app.analyzeDomain(domain);
        app.saveResults();
    } catch (error) {
        console.error('Analysis failed:', error);
    } finally {
        // Re-enable buttons
        if (standardBtn) {
            standardBtn.disabled = false;
            standardBtn.querySelector('.btn-text').textContent = 'Analyze Domain';
        }
        if (quickEmailBtn) quickEmailBtn.disabled = false;
        analysisInProgress = false;
    }
}

// Quick + Email Checks - Fast analysis without subdomain discovery (called from HTML)
async function analyzeQuickEmail() {
    const domainInput = document.getElementById('domain');
    const standardBtn = document.getElementById('analyzeStandardBtn');
    const quickEmailBtn = document.getElementById('analyzeQuickEmailBtn');
    const inputValue = domainInput.value.trim();
    
    if (!inputValue) {
        alert('Please enter a domain name');
        return;
    }
    
    // L4: Auto-detect batch mode from comma-separated input
    const domains = inputValue.split(/[,\s]+/)
        .map(d => d.trim())
        .filter(d => d && d.includes('.'));
    
    if (domains.length > 1) {
        await analyzeBatchDomains(domains);
        return;
    }
    
    const domain = domains[0] || inputValue;
    
    // Disable buttons and show progress
    if (quickEmailBtn) {
        quickEmailBtn.disabled = true;
        quickEmailBtn.querySelector('.btn-text').textContent = 'Scanning...';
    }
    if (standardBtn) standardBtn.disabled = true;
    analysisInProgress = true;
    
    // Hide previous results
    document.getElementById('results').style.display = 'none';
    
    try {
        await app.analysisController.analyzeQuickEmail(domain);
        app.saveResults();
    } catch (error) {
        console.error('Quick + Email checks failed:', error);
    } finally {
        // Re-enable buttons
        if (quickEmailBtn) {
            quickEmailBtn.disabled = false;
            quickEmailBtn.querySelector('.btn-text').textContent = 'Quick + Email Checks';
        }
        if (standardBtn) standardBtn.disabled = false;
        analysisInProgress = false;
    }
}

// ==========================================
// M4: Keyboard Shortcuts
// ==========================================

// Global flag to track if analysis is in progress
let analysisInProgress = false;
let analysisAbortController = null;

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Don't trigger shortcuts when typing in input fields (except specific ones)
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (activeElement.tagName === 'TEXTAREA' || 
            (activeElement.tagName === 'INPUT' && activeElement.type !== 'checkbox'));
        
        // Ctrl/Cmd + Enter: Start analysis (works even in input field)
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!analysisInProgress) {
                analyzeStandard();
            }
            return;
        }
        
        // Skip other shortcuts if typing in input
        if (isInputFocused) return;
        
        // Ctrl/Cmd + E: Export PDF
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            const exportPDFBtn = document.getElementById('exportPDF');
            if (exportPDFBtn && exportPDFBtn.offsetParent !== null) {
                exportPDFBtn.click();
            }
            return;
        }
        
        // Ctrl/Cmd + J: Export JSON
        if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
            e.preventDefault();
            const exportJSONBtn = document.getElementById('exportJSON');
            if (exportJSONBtn && exportJSONBtn.offsetParent !== null) {
                exportJSONBtn.click();
            }
            return;
        }
        
        // Ctrl/Cmd + S: Save analysis
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const saveBtn = document.getElementById('saveAnalysis');
            if (saveBtn && saveBtn.offsetParent !== null) {
                saveBtn.click();
            }
            return;
        }
        
        // Ctrl/Cmd + D: Toggle dark mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.click();
            }
            return;
        }
        
        // Ctrl/Cmd + H: View history
        if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
            e.preventDefault();
            if (window.exportManager) {
                window.exportManager.showHistoryModal();
            }
            return;
        }
        
        // Escape: Close modals or cancel analysis
        if (e.key === 'Escape') {
            // Close history modal if open
            const historyModal = document.getElementById('historyModal');
            if (historyModal && historyModal.style.display !== 'none') {
                historyModal.style.display = 'none';
                return;
            }
            
            // Note: Canceling analysis would require AbortController support
            // which would need deeper changes to the async flow
            return;
        }
        
        // / or Ctrl+K: Focus search/domain input
        if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
            e.preventDefault();
            const domainInput = document.getElementById('domain');
            if (domainInput) {
                domainInput.focus();
                domainInput.select();
            }
            return;
        }
        
        // ?: Show keyboard shortcuts help
        if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            showKeyboardShortcutsHelp();
            return;
        }
    });
}

// Show keyboard shortcuts help
function showKeyboardShortcutsHelp() {
    let modal = document.getElementById('shortcutsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'shortcutsModal';
        document.body.appendChild(modal);
    }
    
    const shortcuts = [
        { key: 'Ctrl + Enter', action: 'Start analysis' },
        { key: 'Ctrl + E', action: 'Export as PDF' },
        { key: 'Ctrl + J', action: 'Export as JSON' },
        { key: 'Ctrl + S', action: 'Save analysis' },
        { key: 'Ctrl + D', action: 'Toggle dark/light mode' },
        { key: 'Ctrl + H', action: 'View history' },
        { key: '/ or Ctrl + K', action: 'Focus domain input' },
        { key: 'Escape', action: 'Close modals' },
        { key: '?', action: 'Show this help' }
    ];
    
    let html = `
        <div style="background: var(--card-bg); padding: 20px; border-radius: 12px; max-width: 400px; width: 90%; position: relative;">
            <button onclick="document.getElementById('shortcutsModal').style.display='none'" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 1.5em; cursor: pointer; color: var(--text-secondary);">×</button>
            <h3 style="margin-top: 0; color: var(--text-color);">⌨️ Keyboard Shortcuts</h3>
            <table style="width: 100%; border-collapse: collapse;">
    `;
    
    for (const shortcut of shortcuts) {
        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 8px 0;"><kbd style="background: var(--bg-tertiary); padding: 3px 8px; border-radius: 4px; font-family: monospace; border: 1px solid var(--border-color);">${shortcut.key}</kbd></td>
                <td style="padding: 8px 0; color: var(--text-color);">${shortcut.action}</td>
            </tr>
        `;
    }
    
    html += `
            </table>
            <div style="margin-top: 15px; font-size: 0.85em; color: var(--text-secondary);">
                Tip: On Mac, use Cmd instead of Ctrl
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 1000;';
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// ==========================================
// M3: Shareable URL Links
// ==========================================

// Parse URL parameters
function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        domain: params.get('d') || params.get('domain'),
        autoStart: params.get('auto') === '1' || params.get('auto') === 'true'
    };
}

// Generate shareable link for current domain
function generateShareableLink(domain) {
    const url = new URL(window.location.href);
    url.search = ''; // Clear existing params
    url.searchParams.set('d', domain);
    return url.toString();
}

// Copy shareable link to clipboard
function copyShareableLink() {
    const domainInput = document.getElementById('domain');
    const domain = domainInput?.value?.trim();
    
    if (!domain) {
        alert('Please enter a domain first');
        return;
    }
    
    const link = generateShareableLink(domain);
    
    navigator.clipboard.writeText(link).then(() => {
        // Show success feedback
        const copyBtn = document.getElementById('copyLink');
        if (copyBtn) {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span class="export-icon">✓</span><span class="export-text">Copied!</span>';
            copyBtn.style.background = 'rgba(40, 167, 69, 0.2)';
            copyBtn.style.borderColor = '#28a745';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '';
                copyBtn.style.borderColor = '';
            }, 2000);
        }
        
        console.log('📋 Shareable link copied:', link);
    }).catch(err => {
        console.error('Failed to copy link:', err);
        // Fallback: show link in prompt
        prompt('Copy this shareable link:', link);
    });
}

// Add Copy Link button to export section
function addCopyLinkButton() {
    const exportSection = document.getElementById('exportSection');
    if (!exportSection || document.getElementById('copyLink')) return;
    
    const exportButtons = exportSection.querySelector('.export-buttons');
    if (exportButtons) {
        const copyButton = document.createElement('button');
        copyButton.id = 'copyLink';
        copyButton.className = 'export-btn export-link';
        copyButton.innerHTML = `
            <span class="export-icon">🔗</span>
            <span class="export-text">Copy Link</span>
        `;
        copyButton.addEventListener('click', copyShareableLink);
        exportButtons.appendChild(copyButton);
    }
}

// ==========================================
// L4: Batch Analysis Mode
// ==========================================

let batchResults = [];
let batchInProgress = false;

async function analyzeBatchDomains(domains) {
    const standardBtn = document.getElementById('analyzeStandardBtn');
    const quickEmailBtn = document.getElementById('analyzeQuickEmailBtn');
    const batchProgress = document.getElementById('batchProgress');
    
    // Limit to 10 domains
    domains = domains.slice(0, 10);
    
    if (domains.length === 0) {
        alert('Please enter at least one valid domain');
        return;
    }
    
    batchInProgress = true;
    batchResults = [];
    
    // Disable buttons
    if (standardBtn) {
        standardBtn.disabled = true;
        standardBtn.querySelector('.btn-text').textContent = `Batch (0/${domains.length})...`;
    }
    if (quickEmailBtn) quickEmailBtn.disabled = true;
    
    // Show progress
    if (batchProgress) {
        batchProgress.style.display = 'block';
        batchProgress.innerHTML = '<div class="batch-status">Starting batch analysis...</div>';
    }
    
    const results = [];
    
    for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        if (standardBtn) {
            standardBtn.querySelector('.btn-text').textContent = `Batch (${i + 1}/${domains.length})...`;
        }
        
        if (batchProgress) {
            batchProgress.innerHTML = `
                <div class="batch-status">
                    <strong>Processing ${i + 1}/${domains.length}:</strong> ${window.CommonUtils.escapeHtml(domain)}
                    <div class="batch-progress-bar" style="margin-top: 5px; background: var(--bg-tertiary); height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${((i + 1) / domains.length) * 100}%; height: 100%; background: var(--accent-blue); transition: width 0.3s;"></div>
                    </div>
                </div>
            `;
        }
        
        try {
            // Use Quick + Email checks for batch mode to save time
            await app.analysisController.analyzeQuickEmail(domain);
            
            // Get the analysis data
            if (window.exportManager && window.exportManager.analysisData) {
                results.push({
                    domain: domain,
                    status: 'success',
                    data: JSON.parse(JSON.stringify(window.exportManager.analysisData))
                });
            }
        } catch (error) {
            console.error(`Batch analysis failed for ${domain}:`, error);
            results.push({
                domain: domain,
                status: 'error',
                error: error.message
            });
        }
        
        // Small delay between domains to avoid rate limiting
        if (i < domains.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    batchResults = results;
    batchInProgress = false;
    
    // Re-enable buttons
    if (standardBtn) {
        standardBtn.disabled = false;
        standardBtn.querySelector('.btn-text').textContent = 'Analyze Domain';
    }
    if (quickEmailBtn) quickEmailBtn.disabled = false;
    
    // Show batch results summary
    showBatchResults(results);
}

function showBatchResults(results) {
    const batchProgress = document.getElementById('batchProgress');
    if (!batchProgress) return;
    
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    
    let html = `
        <div class="batch-summary" style="margin-top: 15px; padding: 15px; background: var(--bg-secondary); border-radius: 8px;">
            <h4 style="margin-top: 0;">📊 Batch Analysis Complete</h4>
            <p><strong>${successful}</strong> successful, <strong>${failed}</strong> failed</p>
            <div class="batch-results-list" style="max-height: 200px; overflow-y: auto;">
    `;
    
    for (const result of results) {
        const icon = result.status === 'success' ? '✅' : '❌';
        const escapedDomain = window.CommonUtils.escapeHtml(result.domain);
        const escapedError = result.error ? window.CommonUtils.escapeHtml(result.error) : 'Failed';
        html += `
            <div class="batch-result-item" style="padding: 8px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <span>${icon} ${escapedDomain}</span>
                ${result.status === 'success' ? `
                    <button class="batch-view-btn" onclick="viewBatchResult(${JSON.stringify(result.domain)})" style="padding: 4px 8px; font-size: 0.85em; cursor: pointer;">View</button>
                ` : `
                    <span style="color: var(--danger-color); font-size: 0.85em;">${escapedError}</span>
                `}
            </div>
        `;
    }
    
    html += `
            </div>
            <button onclick="exportBatchResults()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">Export All as JSON</button>
        </div>
    `;
    
    batchProgress.innerHTML = html;
}

function viewBatchResult(domain) {
    const result = batchResults.find(r => r.domain === domain);
    if (result && result.data && window.exportManager) {
        // Reload this result's data
        const data = result.data;
        window.exportManager.setAnalysisData(
            data.processedData,
            data.securityResults,
            domain,
            data.interestingFindings || []
        );
        // Trigger re-render
        if (window.visualizer) {
            window.visualizer.setData(data.processedData, data.securityResults);
        }
        alert(`Viewing results for ${domain}. Check the results section.`);
    }
}

function exportBatchResults() {
    if (batchResults.length === 0) {
        alert('No batch results to export');
        return;
    }
    
    const exportData = {
        timestamp: new Date().toISOString(),
        totalDomains: batchResults.length,
        successful: batchResults.filter(r => r.status === 'success').length,
        results: batchResults
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3pt-batch-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ==========================================
// L3: PWA Service Worker Registration
// ==========================================
// Note: Service workers only work over HTTPS or localhost.
// They do NOT work with file:// protocol (opening HTML directly).
// This is fine - PWA features are optional enhancements.
// Core functionality works without service worker.

function registerServiceWorker() {
    // Skip registration for file:// protocol
    if (window.location.protocol === 'file:') {
        console.log('ℹ️ PWA features disabled (file:// protocol). Serve over HTTPS for full PWA support.');
        return;
    }
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content available, show update prompt
                            if (confirm('New version available! Reload to update?')) {
                                newWorker.postMessage('skipWaiting');
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(error => {
                // Common reasons: localhost without HTTPS, insecure context
                console.log('ℹ️ Service Worker not registered:', error.message);
            });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // L3: Register service worker for PWA
    registerServiceWorker();
    
    // M4: Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    const domainInput = document.getElementById('domain');
    
    if (domainInput) {
        // Handle Enter key in input field - defaults to standard analysis
        domainInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                analyzeStandard();
            }
        });
        
        // M3: Check URL parameters first
        const urlParams = getURLParams();
        
        if (urlParams.domain) {
            // URL parameter takes priority
            domainInput.value = urlParams.domain;
            console.log(`📋 Domain from URL: ${urlParams.domain}`);
            
            // Auto-start analysis if requested
            if (urlParams.autoStart) {
                console.log('🚀 Auto-starting analysis...');
                // Small delay to ensure DOM is fully ready
                setTimeout(() => {
                    analyzeStandard();
                }, 100);
            }
        } else {
            // Load saved domain from localStorage
            const savedDomain = localStorage.getItem('3ptracer_last_domain');
            if (savedDomain) {
                domainInput.value = savedDomain;
            }
        }
    }
    
    // Add Copy Link button once export section is visible
    // Use MutationObserver to detect when export section becomes visible
    const exportSection = document.getElementById('exportSection');
    if (exportSection) {
        const observer = new MutationObserver((mutations) => {
            if (exportSection.style.display !== 'none') {
                addCopyLinkButton();
            }
        });
        observer.observe(exportSection, { attributes: true, attributeFilter: ['style'] });
    }
    
    // Initialize collapsible service categories
    initializeCollapsibleCategories();
});

// ==========================================
// JSON Import Functionality
// ==========================================

// Handle file import
async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
        alert('Please select a valid JSON file');
        return;
    }
    
    try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        // Validate import data structure
        if (!importData.meta || !importData.processedData) {
            alert('Invalid JSON file format. Please import a file exported from 3rd Party Tracer.');
            return;
        }
        
        // Import and display the data
        await importAnalysisData(importData);
        
        // Reset file input
        event.target.value = '';
        
    } catch (error) {
        console.error('❌ Import failed:', error);
        alert('Failed to import JSON file. Please check the file format and try again.');
    }
}

// Import and display analysis data
async function importAnalysisData(importData) {
    console.log('📥 Importing analysis data...');
    
    try {
        // Convert serialized data back to Maps
        const processedData = deserializeImportedData(importData.processedData);
        
        // Get security results and interesting findings
        const securityResults = importData.securityResults || null;
        const interestingFindings = importData.interestingFindings || [];
        
        // Hide progress section
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
        
        // Show results section
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.style.display = 'block';
        }
        
        // Get UI renderer instance
        // Try window.app first, fallback to global app constant
        const appInstance = window.app || (typeof app !== 'undefined' ? app : null);
        const analysisController = appInstance?.analysisController;
        
        if (!analysisController || !analysisController.uiRenderer) {
            console.error('❌ AnalysisController or UIRenderer not available', {
                hasWindowApp: !!window.app,
                hasApp: typeof app !== 'undefined',
                hasAnalysisController: !!analysisController,
                hasUIRenderer: !!analysisController?.uiRenderer
            });
            alert('Error: Unable to display imported data. Please refresh the page and try again.');
            return;
        }
        
        // Add dataProcessor reference to processedData (required by UI renderer)
        // This allows the UI to access methods like getRawDNSRecords() even for imported data
        if (analysisController.dataProcessor) {
            processedData.dataProcessor = analysisController.dataProcessor;
        }
        
        // Ensure window.uiRenderer is set for button onclick handlers
        if (!window.uiRenderer) {
            window.uiRenderer = analysisController.uiRenderer;
        }
        
        // Display the imported results
        analysisController.uiRenderer.displayResults(
            processedData,
            securityResults,
            interestingFindings,
            [] // No API notifications for imported data
        );
        
        // Update export manager with imported data
        if (window.exportManager) {
            // Export manager will serialize the data internally
            // Signature: setAnalysisData(processedData, securityResults, domain, interestingFindings)
            window.exportManager.setAnalysisData(
                processedData,
                securityResults,
                importData.meta.domain,
                interestingFindings
            );
        } else {
            console.warn('⚠️ Export manager not available. Export options may not be shown.');
        }
        
        // Set domain input to imported domain
        const domainInput = document.getElementById('domain');
        if (domainInput && importData.meta.domain) {
            domainInput.value = importData.meta.domain;
        }
        
        console.log('✅ Import completed successfully');
        console.log('📊 Imported data summary:', {
            domain: importData.meta.domain,
            servicesCount: processedData.services instanceof Map ? processedData.services.size : Object.keys(processedData.services || {}).length,
            subdomainsCount: processedData.subdomains instanceof Map ? processedData.subdomains.size : Object.keys(processedData.subdomains || {}).length,
            hasSecurityResults: !!securityResults
        });
        
    } catch (error) {
        console.error('❌ Failed to import analysis data:', error);
        alert('Failed to process imported data. Please check the file format.');
    }
}

// Deserialize imported data (convert objects back to Maps)
function deserializeImportedData(processedData) {
    if (!processedData) return null;
    
    const deserialized = { ...processedData };
    
    // Convert services object back to Map
    if (processedData.services && !(processedData.services instanceof Map)) {
        const servicesMap = new Map();
        
        // Handle serialized format (service_0, service_1, etc.)
        if (typeof processedData.services === 'object') {
            for (const [key, value] of Object.entries(processedData.services)) {
                if (value && value.originalKey) {
                    // Restore original key
                    servicesMap.set(value.originalKey, { ...value });
                    delete value.originalKey;
                } else if (value && value.name) {
                    // Use service name as key
                    servicesMap.set(value.name, value);
                } else {
                    // Fallback: use the object key
                    servicesMap.set(key, value);
                }
            }
        }
        
        deserialized.services = servicesMap;
        console.log('📊 Converted services object to Map:', servicesMap.size, 'services');
    }
    
    // Convert subdomains object back to Map (if it exists and is an object)
    if (processedData.subdomains && !(processedData.subdomains instanceof Map)) {
        const subdomainsMap = new Map();
        
        if (typeof processedData.subdomains === 'object') {
            for (const [key, value] of Object.entries(processedData.subdomains)) {
                if (value && value.subdomain) {
                    subdomainsMap.set(value.subdomain, value);
                } else {
                    subdomainsMap.set(key, value);
                }
            }
        }
        
        deserialized.subdomains = subdomainsMap;
        console.log('📊 Converted subdomains object to Map:', subdomainsMap.size, 'subdomains');
    } else if (!processedData.subdomains) {
        // Initialize empty Map if subdomains don't exist
        deserialized.subdomains = new Map();
    }
    
    // Convert sovereigntyAnalysis objects back to Maps and Sets
    if (processedData.sovereigntyAnalysis && typeof processedData.sovereigntyAnalysis === 'object') {
        console.log('📊 Converting sovereigntyAnalysis objects back to Maps and Sets');
        const sovereignty = { ...processedData.sovereigntyAnalysis };
        
        // Convert countryDistribution object back to Map
        if (sovereignty.countryDistribution && !(sovereignty.countryDistribution instanceof Map)) {
            const countryDistMap = new Map();
            if (typeof sovereignty.countryDistribution === 'object') {
                for (const [key, value] of Object.entries(sovereignty.countryDistribution)) {
                    const countryData = { ...value };
                    // Convert providers array back to Set
                    if (Array.isArray(value.providers)) {
                        countryData.providers = new Set(value.providers);
                    } else if (!(value.providers instanceof Set)) {
                        countryData.providers = new Set();
                    }
                    countryDistMap.set(key, countryData);
                }
            }
            sovereignty.countryDistribution = countryDistMap;
            console.log('📊 Converted countryDistribution to Map:', countryDistMap.size, 'countries');
        }
        
        // Convert services Map in sovereignty
        if (sovereignty.services && !(sovereignty.services instanceof Map)) {
            const servicesMap = new Map();
            if (typeof sovereignty.services === 'object') {
                for (const [key, value] of Object.entries(sovereignty.services)) {
                    servicesMap.set(key, value);
                }
            }
            sovereignty.services = servicesMap;
        }
        
        // Convert subdomains Map in sovereignty
        if (sovereignty.subdomains && !(sovereignty.subdomains instanceof Map)) {
            const subdomainsMap = new Map();
            if (typeof sovereignty.subdomains === 'object') {
                for (const [key, value] of Object.entries(sovereignty.subdomains)) {
                    subdomainsMap.set(key, value);
                }
            }
            sovereignty.subdomains = subdomainsMap;
        }
        
        deserialized.sovereigntyAnalysis = sovereignty;
        console.log('📊 Converted sovereigntyAnalysis');
    }
    
    return deserialized;
}


// Initialize collapsible functionality for service categories
function initializeCollapsibleCategories() {
    // Use event delegation to handle clicks on category headers
    document.addEventListener('click', function(e) {
        const categoryHeader = e.target.closest('.category-header, .service-category > h2');
        if (categoryHeader) {
            const serviceCategory = categoryHeader.closest('.service-category');
            if (serviceCategory) {
                serviceCategory.classList.toggle('collapsed');
            }
        }
    });
    
    // Initialize existing categories (set all to expanded by default)
    const categories = document.querySelectorAll('.service-category');
    categories.forEach(category => {
        // Only collapse if it's empty or has display:none
        const serviceList = category.querySelector('.service-list');
        if (!serviceList || serviceList.children.length === 0) {
            // Don't auto-collapse, let user control it
        }
    });
} 