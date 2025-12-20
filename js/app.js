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

// Main analysis function (called from HTML)
async function analyzeDomain() {
    // L4: Check if batch mode is enabled
    const batchModeCheckbox = document.getElementById('batchMode');
    if (batchModeCheckbox && batchModeCheckbox.checked) {
        await analyzeBatch();
        return;
    }
    
    const domainInput = document.getElementById('domain');
    const analyzeBtn = document.querySelector('.analyze-btn');
    const quickScanCheckbox = document.getElementById('quickScan');
    const domain = domainInput.value.trim();
    
    if (!domain) {
        alert('Please enter a domain name');
        return;
    }
    
    // Check analysis mode options
    const isQuickScan = quickScanCheckbox?.checked || false;
    const emailModeCheckbox = document.getElementById('emailMode');
    const deepScanCheckbox = document.getElementById('deepScan');
    const isEmailMode = emailModeCheckbox?.checked || false;
    const isDeepScan = deepScanCheckbox?.checked || false;
    
    // Determine analysis mode
    let modeLabel = 'Analyzing';
    if (isQuickScan) modeLabel = 'Quick Scanning';
    else if (isEmailMode) modeLabel = 'Email Analyzing';
    else if (isDeepScan) modeLabel = 'Deep Scanning';
    
    // Disable button and show progress
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = `${modeLabel}...`;
    analysisInProgress = true;
    
    // Hide previous results
    document.getElementById('results').style.display = 'none';
    
    try {
        if (isQuickScan) {
            // M10: Quick Scan Mode - skip subdomain discovery
            await app.analysisController.analyzeQuickScan(domain);
        } else if (isEmailMode) {
            // L6: Email-focused analysis mode
            await app.analysisController.analyzeEmailMode(domain);
        } else if (isDeepScan) {
            // L7: Deep scan mode
            await app.analysisController.analyzeDeepScan(domain);
        } else {
            await app.analyzeDomain(domain);
        }
        app.saveResults();
    } catch (error) {
        console.error('Analysis failed:', error);
    } finally {
        // Re-enable button
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Domain';
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
                analyzeDomain();
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

function setupBatchMode() {
    const batchToggle = document.getElementById('batchMode');
    const domainInput = document.getElementById('domain');
    const batchTextarea = document.getElementById('batchDomains');
    
    if (batchToggle) {
        batchToggle.addEventListener('change', function() {
            const singleInput = document.querySelector('.single-domain-input');
            const batchInput = document.querySelector('.batch-domain-input');
            
            if (this.checked) {
                if (singleInput) singleInput.style.display = 'none';
                if (batchInput) batchInput.style.display = 'block';
                // Copy current domain to batch textarea
                if (domainInput && batchTextarea && domainInput.value.trim()) {
                    batchTextarea.value = domainInput.value.trim();
                }
            } else {
                if (singleInput) singleInput.style.display = 'block';
                if (batchInput) batchInput.style.display = 'none';
            }
        });
    }
}

async function analyzeBatch() {
    const batchTextarea = document.getElementById('batchDomains');
    const analyzeBtn = document.querySelector('.analyze-btn');
    const batchProgress = document.getElementById('batchProgress');
    
    if (!batchTextarea) return;
    
    // Parse domains (one per line, comma-separated, or space-separated)
    const text = batchTextarea.value.trim();
    const domains = text.split(/[\n,\s]+/)
        .map(d => d.trim())
        .filter(d => d && d.includes('.'))
        .slice(0, 10); // Limit to 10 domains
    
    if (domains.length === 0) {
        alert('Please enter at least one valid domain');
        return;
    }
    
    batchInProgress = true;
    batchResults = [];
    
    // Disable inputs
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = `Batch Analyzing (0/${domains.length})...`;
    
    // Show progress
    if (batchProgress) {
        batchProgress.style.display = 'block';
        batchProgress.innerHTML = '<div class="batch-status">Starting batch analysis...</div>';
    }
    
    const results = [];
    
    for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        analyzeBtn.textContent = `Batch Analyzing (${i + 1}/${domains.length})...`;
        
        if (batchProgress) {
            batchProgress.innerHTML = `
                <div class="batch-status">
                    <strong>Processing ${i + 1}/${domains.length}:</strong> ${domain}
                    <div class="batch-progress-bar" style="margin-top: 5px; background: var(--bg-tertiary); height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${((i + 1) / domains.length) * 100}%; height: 100%; background: var(--accent-blue); transition: width 0.3s;"></div>
                    </div>
                </div>
            `;
        }
        
        try {
            // Use quick scan for batch mode to save time
            await app.analysisController.analyzeQuickScan(domain);
            
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
    
    // Re-enable inputs
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze Domain';
    
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
        html += `
            <div class="batch-result-item" style="padding: 8px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <span>${icon} ${result.domain}</span>
                ${result.status === 'success' ? `
                    <button class="batch-view-btn" onclick="viewBatchResult('${result.domain}')" style="padding: 4px 8px; font-size: 0.85em; cursor: pointer;">View</button>
                ` : `
                    <span style="color: var(--danger-color); font-size: 0.85em;">${result.error || 'Failed'}</span>
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

function registerServiceWorker() {
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
                console.log('ℹ️ Service Worker not registered (local dev):', error.message);
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
        // Handle Enter key in input field
        domainInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                analyzeDomain();
            }
        });
        
        // L4: Setup batch mode toggle
        setupBatchMode();
        
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
                    analyzeDomain();
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
}); 