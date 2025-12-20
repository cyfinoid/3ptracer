// Export Manager - Handles JSON, PDF and XLSX export functionality
// Also includes M2: Analysis Snapshots with localStorage
class ExportManager {
    constructor() {
        this.analysisData = null;
        this.exportDomain = '';
        this.exportTimestamp = '';
        this.STORAGE_KEY = '3pt_analysis_history';
        this.MAX_SNAPSHOTS = 20; // Maximum snapshots to store
        this.setupEventListeners();
    }
    
    // ==========================================
    // M2: Analysis Snapshots Storage
    // ==========================================
    
    // Save current analysis to localStorage
    saveSnapshot() {
        if (!this.analysisData) {
            console.error('❌ No analysis data to save');
            alert('No analysis data available to save');
            return false;
        }
        
        try {
            const snapshots = this.getSnapshots();
            
            // Create snapshot with unique ID
            const snapshot = {
                id: `snapshot_${Date.now()}`,
                domain: this.exportDomain,
                timestamp: this.analysisData.timestamp,
                formattedTimestamp: this.analysisData.formattedTimestamp,
                savedAt: new Date().toISOString(),
                data: this.analysisData
            };
            
            // Add to beginning (most recent first)
            snapshots.unshift(snapshot);
            
            // Keep only the most recent MAX_SNAPSHOTS
            if (snapshots.length > this.MAX_SNAPSHOTS) {
                snapshots.splice(this.MAX_SNAPSHOTS);
            }
            
            // Compress data to save space
            const compressedData = JSON.stringify(snapshots);
            
            // Check storage quota (localStorage typically has 5-10MB limit)
            const sizeKB = (compressedData.length * 2) / 1024; // UTF-16 encoding
            if (sizeKB > 4000) {
                // Remove oldest snapshots if approaching limit
                while (snapshots.length > 5 && JSON.stringify(snapshots).length * 2 / 1024 > 4000) {
                    snapshots.pop();
                }
            }
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshots));
            console.log(`✅ Snapshot saved: ${snapshot.domain} (${sizeKB.toFixed(1)} KB)`);
            
            // Update UI
            this.updateHistoryButton();
            
            return true;
        } catch (error) {
            console.error('❌ Failed to save snapshot:', error);
            if (error.name === 'QuotaExceededError') {
                alert('Storage quota exceeded. Please delete some old snapshots.');
            } else {
                alert('Failed to save snapshot. Please try again.');
            }
            return false;
        }
    }
    
    // Get all saved snapshots
    getSnapshots() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('❌ Failed to load snapshots:', error);
            return [];
        }
    }
    
    // Get a specific snapshot by ID
    getSnapshot(id) {
        const snapshots = this.getSnapshots();
        return snapshots.find(s => s.id === id);
    }
    
    // Delete a snapshot by ID
    deleteSnapshot(id) {
        try {
            const snapshots = this.getSnapshots();
            const filtered = snapshots.filter(s => s.id !== id);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
            console.log(`🗑️ Snapshot deleted: ${id}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete snapshot:', error);
            return false;
        }
    }
    
    // Clear all snapshots
    clearAllSnapshots() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('🗑️ All snapshots cleared');
            return true;
        } catch (error) {
            console.error('❌ Failed to clear snapshots:', error);
            return false;
        }
    }
    
    // Update history button badge
    updateHistoryButton() {
        const historyBtn = document.getElementById('viewHistory');
        if (historyBtn) {
            const count = this.getSnapshots().length;
            const badge = historyBtn.querySelector('.history-badge') || document.createElement('span');
            badge.className = 'history-badge';
            badge.textContent = count > 0 ? count : '';
            badge.style.cssText = count > 0 ? 
                'background: var(--accent-blue); color: white; font-size: 0.7em; padding: 2px 6px; border-radius: 10px; margin-left: 5px;' : 
                'display: none;';
            
            if (!historyBtn.querySelector('.history-badge')) {
                historyBtn.appendChild(badge);
            }
        }
    }
    
    // Show history modal
    showHistoryModal() {
        const snapshots = this.getSnapshots();
        
        // Create or get modal
        let modal = document.getElementById('historyModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'historyModal';
            modal.className = 'history-modal';
            document.body.appendChild(modal);
        }
        
        let html = `
            <div class="history-modal-content" style="background: var(--card-bg); padding: 20px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative;">
                <button onclick="document.getElementById('historyModal').style.display='none'" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 1.5em; cursor: pointer; color: var(--text-secondary);">×</button>
                <h3 style="margin-top: 0; color: var(--text-color);">📂 Analysis History</h3>
        `;
        
        if (snapshots.length === 0) {
            html += `
                <div style="text-align: center; padding: 30px; color: var(--text-secondary);">
                    <p>No saved analyses yet.</p>
                    <p style="font-size: 0.9em;">Click "Save Analysis" after running an analysis to save it here.</p>
                </div>
            `;
        } else {
            html += `<div style="margin-bottom: 15px; font-size: 0.9em; color: var(--text-secondary);">${snapshots.length} saved analysis${snapshots.length !== 1 ? 'es' : ''}</div>`;
            
            for (const snapshot of snapshots) {
                const date = new Date(snapshot.savedAt).toLocaleString();
                html += `
                    <div class="snapshot-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 10px; background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div>
                            <div style="font-weight: bold; color: var(--accent-blue);">${snapshot.domain}</div>
                            <div style="font-size: 0.85em; color: var(--text-secondary);">${date}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="window.exportManager.loadSnapshot('${snapshot.id}')" style="padding: 6px 12px; background: var(--accent-blue); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">Load</button>
                            <button onclick="window.exportManager.exportSnapshotToJSON('${snapshot.id}')" style="padding: 6px 12px; background: var(--bg-secondary); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; font-size: 0.85em;">📋</button>
                            <button onclick="window.exportManager.confirmDeleteSnapshot('${snapshot.id}')" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">🗑️</button>
                        </div>
                    </div>
                `;
            }
            
            html += `
                <div style="margin-top: 20px; display: flex; justify-content: space-between; gap: 10px;">
                    <button onclick="window.exportManager.showComparisonSelector()" style="padding: 8px 16px; background: var(--accent-blue); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">📊 Compare Two</button>
                    <button onclick="window.exportManager.confirmClearAll()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">Clear All History</button>
                </div>
            `;
        }
        
        html += '</div>';
        
        modal.innerHTML = html;
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 1000;';
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }
    
    // Load a snapshot back into the UI (displays the data)
    loadSnapshot(id) {
        const snapshot = this.getSnapshot(id);
        if (!snapshot) {
            alert('Snapshot not found');
            return;
        }
        
        // Close modal
        const modal = document.getElementById('historyModal');
        if (modal) modal.style.display = 'none';
        
        // Set the analysis data
        this.analysisData = snapshot.data;
        this.exportDomain = snapshot.domain;
        this.exportTimestamp = snapshot.timestamp.split('T')[0];
        
        // Notify that this is a loaded snapshot
        alert(`Loaded analysis for ${snapshot.domain} from ${new Date(snapshot.savedAt).toLocaleString()}\n\nNote: This is historical data. Use the export buttons to generate reports.`);
        
        console.log(`✅ Snapshot loaded: ${snapshot.domain}`);
    }
    
    // Export a specific snapshot to JSON
    exportSnapshotToJSON(id) {
        const snapshot = this.getSnapshot(id);
        if (!snapshot) {
            alert('Snapshot not found');
            return;
        }
        
        try {
            const jsonString = JSON.stringify(snapshot.data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `3pt-analysis-${snapshot.domain}-${snapshot.timestamp.split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('❌ Failed to export snapshot:', error);
            alert('Failed to export snapshot');
        }
    }
    
    // Confirm delete snapshot
    confirmDeleteSnapshot(id) {
        if (confirm('Delete this saved analysis? This action cannot be undone.')) {
            this.deleteSnapshot(id);
            this.showHistoryModal(); // Refresh the modal
        }
    }
    
    // Confirm clear all
    confirmClearAll() {
        if (confirm('Delete ALL saved analyses? This action cannot be undone.')) {
            this.clearAllSnapshots();
            this.showHistoryModal(); // Refresh the modal
            this.updateHistoryButton();
        }
    }
    
    // ==========================================
    // M9: Analysis Comparison View
    // ==========================================
    
    // Show comparison modal to select two snapshots
    showComparisonSelector() {
        const snapshots = this.getSnapshots();
        
        if (snapshots.length < 2) {
            alert('You need at least 2 saved analyses to compare. Save more analyses first.');
            return;
        }
        
        let modal = document.getElementById('comparisonModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'comparisonModal';
            document.body.appendChild(modal);
        }
        
        let html = `
            <div style="background: var(--card-bg); padding: 20px; border-radius: 12px; max-width: 500px; width: 90%; position: relative;">
                <button onclick="document.getElementById('comparisonModal').style.display='none'" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 1.5em; cursor: pointer; color: var(--text-secondary);">×</button>
                <h3 style="margin-top: 0; color: var(--text-color);">📊 Compare Analyses</h3>
                <p style="color: var(--text-secondary); font-size: 0.9em;">Select two analyses to compare:</p>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: var(--text-color); display: block; margin-bottom: 5px;">First Analysis:</label>
                    <select id="compareSnapshot1" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-color);">
                        ${snapshots.map((s, i) => `<option value="${s.id}">${s.domain} - ${new Date(s.savedAt).toLocaleDateString()}</option>`).join('')}
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="color: var(--text-color); display: block; margin-bottom: 5px;">Second Analysis:</label>
                    <select id="compareSnapshot2" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-color);">
                        ${snapshots.map((s, i) => `<option value="${s.id}" ${i === 1 ? 'selected' : ''}>${s.domain} - ${new Date(s.savedAt).toLocaleDateString()}</option>`).join('')}
                    </select>
                </div>
                
                <button onclick="window.exportManager.compareSnapshots()" style="width: 100%; padding: 10px; background: var(--accent-blue); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em;">
                    Compare
                </button>
            </div>
        `;
        
        modal.innerHTML = html;
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 1000;';
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }
    
    // Compare two selected snapshots
    compareSnapshots() {
        const select1 = document.getElementById('compareSnapshot1');
        const select2 = document.getElementById('compareSnapshot2');
        
        if (!select1 || !select2) return;
        
        const snapshot1 = this.getSnapshot(select1.value);
        const snapshot2 = this.getSnapshot(select2.value);
        
        if (!snapshot1 || !snapshot2) {
            alert('Could not load selected snapshots');
            return;
        }
        
        if (snapshot1.id === snapshot2.id) {
            alert('Please select two different analyses to compare');
            return;
        }
        
        // Close selector modal
        document.getElementById('comparisonModal').style.display = 'none';
        
        // Show comparison results
        this.showComparisonResults(snapshot1, snapshot2);
    }
    
    // Show comparison results
    showComparisonResults(snapshot1, snapshot2) {
        let modal = document.getElementById('comparisonResultsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'comparisonResultsModal';
            document.body.appendChild(modal);
        }
        
        // Extract data
        const data1 = snapshot1.data?.processedData || {};
        const data2 = snapshot2.data?.processedData || {};
        
        // Compare subdomains
        const subs1 = new Set(this.extractSubdomainNames(data1.subdomains));
        const subs2 = new Set(this.extractSubdomainNames(data2.subdomains));
        
        const newSubs = [...subs2].filter(s => !subs1.has(s));
        const removedSubs = [...subs1].filter(s => !subs2.has(s));
        const unchangedSubs = [...subs1].filter(s => subs2.has(s));
        
        // Compare services
        const services1 = new Set(this.extractServiceNames(data1.services));
        const services2 = new Set(this.extractServiceNames(data2.services));
        
        const newServices = [...services2].filter(s => !services1.has(s));
        const removedServices = [...services1].filter(s => !services2.has(s));
        
        let html = `
            <div style="background: var(--card-bg); padding: 20px; border-radius: 12px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative;">
                <button onclick="document.getElementById('comparisonResultsModal').style.display='none'" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 1.5em; cursor: pointer; color: var(--text-secondary);">×</button>
                <h3 style="margin-top: 0; color: var(--text-color);">📊 Comparison Results</h3>
                
                <div style="display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px; padding: 10px; background: var(--bg-tertiary); border-radius: 6px;">
                        <div style="font-size: 0.8em; color: var(--text-secondary);">OLDER</div>
                        <div style="font-weight: bold; color: var(--text-color);">${snapshot1.domain}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">${new Date(snapshot1.savedAt).toLocaleString()}</div>
                    </div>
                    <div style="display: flex; align-items: center; color: var(--text-secondary);">→</div>
                    <div style="flex: 1; min-width: 200px; padding: 10px; background: var(--bg-tertiary); border-radius: 6px;">
                        <div style="font-size: 0.8em; color: var(--text-secondary);">NEWER</div>
                        <div style="font-weight: bold; color: var(--text-color);">${snapshot2.domain}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">${new Date(snapshot2.savedAt).toLocaleString()}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 20px;">
                    <div style="padding: 15px; background: rgba(40, 167, 69, 0.1); border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.5em; font-weight: bold; color: #28a745;">+${newSubs.length}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">New Subdomains</div>
                    </div>
                    <div style="padding: 15px; background: rgba(220, 53, 69, 0.1); border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.5em; font-weight: bold; color: #dc3545;">-${removedSubs.length}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">Removed Subdomains</div>
                    </div>
                    <div style="padding: 15px; background: rgba(40, 167, 69, 0.1); border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.5em; font-weight: bold; color: #28a745;">+${newServices.length}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">New Services</div>
                    </div>
                    <div style="padding: 15px; background: rgba(220, 53, 69, 0.1); border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.5em; font-weight: bold; color: #dc3545;">-${removedServices.length}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">Removed Services</div>
                    </div>
                </div>`;
        
        if (newSubs.length > 0) {
            html += `
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #28a745; margin-bottom: 10px;">➕ New Subdomains (${newSubs.length})</h4>
                    <div style="max-height: 150px; overflow-y: auto; padding: 10px; background: var(--bg-tertiary); border-radius: 4px; font-size: 0.85em;">
                        ${newSubs.slice(0, 50).join('<br>')}
                        ${newSubs.length > 50 ? `<br><em>...and ${newSubs.length - 50} more</em>` : ''}
                    </div>
                </div>`;
        }
        
        if (removedSubs.length > 0) {
            html += `
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #dc3545; margin-bottom: 10px;">➖ Removed Subdomains (${removedSubs.length})</h4>
                    <div style="max-height: 150px; overflow-y: auto; padding: 10px; background: var(--bg-tertiary); border-radius: 4px; font-size: 0.85em;">
                        ${removedSubs.slice(0, 50).join('<br>')}
                        ${removedSubs.length > 50 ? `<br><em>...and ${removedSubs.length - 50} more</em>` : ''}
                    </div>
                </div>`;
        }
        
        if (newServices.length > 0 || removedServices.length > 0) {
            html += `<div style="margin-bottom: 15px;"><h4 style="color: var(--text-color);">Service Changes</h4>`;
            if (newServices.length > 0) {
                html += `<div style="color: #28a745; font-size: 0.9em;">➕ ${newServices.join(', ')}</div>`;
            }
            if (removedServices.length > 0) {
                html += `<div style="color: #dc3545; font-size: 0.9em;">➖ ${removedServices.join(', ')}</div>`;
            }
            html += `</div>`;
        }
        
        html += '</div>';
        
        modal.innerHTML = html;
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 1000;';
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }
    
    // Helper: Extract subdomain names from data
    extractSubdomainNames(subdomains) {
        if (!subdomains) return [];
        const list = Array.isArray(subdomains) ? subdomains : Object.values(subdomains);
        return list.map(s => s.subdomain || s.name || s).filter(s => typeof s === 'string');
    }
    
    // Helper: Extract service names from data
    extractServiceNames(services) {
        if (!services) return [];
        const list = Array.isArray(services) ? services : Object.values(services);
        return list.map(s => s.name).filter(Boolean);
    }

    // Setup event listeners for export buttons
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            const exportPDFBtn = document.getElementById('exportPDF');
            const exportXLSXBtn = document.getElementById('exportXLSX');
            
            if (exportPDFBtn) {
                exportPDFBtn.addEventListener('click', () => this.exportToPDF());
            }
            
            if (exportXLSXBtn) {
                exportXLSXBtn.addEventListener('click', () => this.exportToXLSX());
            }
        });
    }

    // Store analysis data for export
    setAnalysisData(processedData, securityResults, domain, interestingFindings = []) {
        console.log('📊 ExportManager.setAnalysisData called with:', {
            domain,
            hasProcessedData: !!processedData,
            hasSecurityResults: !!securityResults,
            interestingFindingsCount: interestingFindings?.length || 0,
            processedDataKeys: processedData ? Object.keys(processedData) : 'none'
        });
        
        // Convert Map objects to plain objects for JSON serialization
        const serializedProcessedData = this.serializeDataForExport(processedData);
        
        this.analysisData = {
            processedData: serializedProcessedData,
            securityResults,
            interestingFindings: interestingFindings || [],
            domain,
            timestamp: new Date().toISOString(),
            formattedTimestamp: new Date().toLocaleString()
        };
        this.exportDomain = domain;
        this.exportTimestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        console.log('📊 Analysis data stored:', {
            domain: this.exportDomain,
            timestamp: this.exportTimestamp,
            hasData: !!this.analysisData,
            interestingFindings: this.analysisData.interestingFindings.length
        });
        
        // Show export section and add JSON export button
        this.showExportSection();
    }

    // Show export section with JSON option
    showExportSection() {
        const exportSection = document.getElementById('exportSection');
        if (exportSection) {
            exportSection.style.display = 'block';
            
            const exportButtons = exportSection.querySelector('.export-buttons');
            if (exportButtons) {
                // Add JSON export button if not already present
                if (!document.getElementById('exportJSON')) {
                    const jsonButton = document.createElement('button');
                    jsonButton.id = 'exportJSON';
                    jsonButton.className = 'export-btn export-json';
                    jsonButton.innerHTML = `
                        <span class="export-icon">📋</span>
                        <span class="export-text">Export as JSON</span>
                    `;
                    jsonButton.addEventListener('click', () => this.exportToJSON());
                    exportButtons.insertBefore(jsonButton, exportButtons.firstChild);
                }
                
                // M2: Add Save Analysis button
                if (!document.getElementById('saveAnalysis')) {
                    const saveButton = document.createElement('button');
                    saveButton.id = 'saveAnalysis';
                    saveButton.className = 'export-btn export-save';
                    saveButton.innerHTML = `
                        <span class="export-icon">💾</span>
                        <span class="export-text">Save Analysis</span>
                    `;
                    saveButton.addEventListener('click', () => {
                        if (this.saveSnapshot()) {
                            alert('Analysis saved! View it in History.');
                        }
                    });
                    exportButtons.appendChild(saveButton);
                }
                
                // M2: Add View History button
                if (!document.getElementById('viewHistory')) {
                    const historyButton = document.createElement('button');
                    historyButton.id = 'viewHistory';
                    historyButton.className = 'export-btn export-history';
                    historyButton.innerHTML = `
                        <span class="export-icon">📂</span>
                        <span class="export-text">History</span>
                    `;
                    historyButton.addEventListener('click', () => this.showHistoryModal());
                    exportButtons.appendChild(historyButton);
                    
                    // Update badge
                    this.updateHistoryButton();
                }
                
                // M7: Add Markdown export button
                if (!document.getElementById('exportMarkdown')) {
                    const mdButton = document.createElement('button');
                    mdButton.id = 'exportMarkdown';
                    mdButton.className = 'export-btn export-markdown';
                    mdButton.innerHTML = `
                        <span class="export-icon">📝</span>
                        <span class="export-text">Markdown</span>
                    `;
                    mdButton.addEventListener('click', () => this.exportToMarkdown());
                    exportButtons.appendChild(mdButton);
                }
                
                // M8: Add CSV export button
                if (!document.getElementById('exportCSV')) {
                    const csvButton = document.createElement('button');
                    csvButton.id = 'exportCSV';
                    csvButton.className = 'export-btn export-csv';
                    csvButton.innerHTML = `
                        <span class="export-icon">📊</span>
                        <span class="export-text">CSV</span>
                    `;
                    csvButton.addEventListener('click', () => this.exportToCSV());
                    exportButtons.appendChild(csvButton);
                }
            }
            
            console.log('✅ Export section made visible with all options');
        } else {
            console.error('❌ Export section not found in DOM');
        }
    }

    // Serialize data for export (convert Maps to Objects)
    serializeDataForExport(data) {
        if (!data) return null;
        
        const serialized = { ...data };
        
        // Convert services Map to Object
        if (data.services && data.services instanceof Map) {
            console.log('📊 Converting services Map to Object for serialization');
            const servicesObj = {};
            let index = 0;
            for (const [key, value] of data.services) {
                servicesObj[`service_${index}`] = {
                    originalKey: key,
                    ...value
                };
                index++;
            }
            serialized.services = servicesObj;
            console.log('📊 Converted services:', Object.keys(servicesObj).length, 'services');
        }
        
        return serialized;
    }

    // Export to JSON
    async exportToJSON() {
        console.log('📋 JSON export requested');
        console.log('📊 Analysis data available:', !!this.analysisData);
        
        if (!this.analysisData) {
            console.error('❌ No analysis data available for JSON export');
            alert('No analysis data available for export');
            return;
        }

        console.log('📋 Starting JSON export...');
        try {
            // Create a complete data dump
            const exportData = {
                meta: {
                    exportVersion: '1.0',
                    domain: this.exportDomain,
                    timestamp: this.analysisData.timestamp,
                    formattedTimestamp: this.analysisData.formattedTimestamp,
                    exportedAt: new Date().toISOString()
                },
                processedData: this.analysisData.processedData,
                securityResults: this.analysisData.securityResults,
                interestingFindings: this.analysisData.interestingFindings
            };

            // Convert to JSON string with pretty formatting
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // Create and download the file
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `3rd-party-analysis-${this.exportDomain}-${this.exportTimestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ JSON exported successfully');
            console.log('📊 Export data summary:', {
                domain: exportData.meta.domain,
                servicesCount: exportData.processedData.services ? Object.keys(exportData.processedData.services).length : 0,
                hasStats: !!exportData.processedData.stats,
                hasSecurityResults: !!exportData.securityResults
            });
            
        } catch (error) {
            console.error('❌ JSON export failed:', error);
            alert('Failed to export JSON. Please try again.');
        }
    }
    
    // ==========================================
    // M7: Markdown Export
    // ==========================================
    
    async exportToMarkdown() {
        console.log('📝 Markdown export requested');
        
        if (!this.analysisData) {
            alert('No analysis data available for export');
            return;
        }
        
        try {
            const data = this.analysisData.processedData;
            const security = this.analysisData.securityResults;
            const findings = this.analysisData.interestingFindings || [];
            
            let md = `# 3rd Party Tracer Report\n\n`;
            md += `**Domain:** ${this.exportDomain}\n`;
            md += `**Generated:** ${this.analysisData.formattedTimestamp}\n\n`;
            
            // Summary
            md += `## Summary\n\n`;
            if (data.stats) {
                md += `| Metric | Value |\n`;
                md += `|--------|-------|\n`;
                md += `| Services Detected | ${data.stats.totalServices || 0} |\n`;
                md += `| Active Subdomains | ${data.stats.totalSubdomains || 0} |\n`;
                md += `| Hosting Providers | ${data.stats.totalProviders || 0} |\n`;
                md += `| Security Issues | ${(security?.emailIssues?.length || 0) + (security?.dnsIssues?.length || 0) + (security?.cloudIssues?.length || 0)} |\n`;
                md += `\n`;
            }
            
            // Services
            if (data.services && Object.keys(data.services).length > 0) {
                md += `## Services Detected\n\n`;
                for (const [key, service] of Object.entries(data.services)) {
                    md += `### ${service.name || key}\n`;
                    md += `- **Type:** ${service.recordTypes?.join(', ') || 'Unknown'}\n`;
                    md += `- **Description:** ${service.description || 'N/A'}\n`;
                    if (service.records?.length > 0) {
                        md += `- **Records:** ${service.records.length}\n`;
                    }
                    md += `\n`;
                }
            }
            
            // Security Issues
            const allIssues = [
                ...(security?.emailIssues || []),
                ...(security?.dnsIssues || []),
                ...(security?.cloudIssues || [])
            ];
            
            if (allIssues.length > 0) {
                md += `## Security Issues\n\n`;
                for (const issue of allIssues) {
                    md += `### ⚠️ ${issue.type || issue.description}\n`;
                    md += `- **Risk:** ${issue.risk?.toUpperCase() || 'Unknown'}\n`;
                    md += `- **Description:** ${issue.description}\n`;
                    if (issue.recommendation) {
                        md += `- **Recommendation:** ${issue.recommendation}\n`;
                    }
                    md += `\n`;
                }
            }
            
            // Subdomains
            if (data.subdomains) {
                const subdomainList = Array.isArray(data.subdomains) ? data.subdomains : Object.values(data.subdomains);
                if (subdomainList.length > 0) {
                    md += `## Subdomains (${subdomainList.length})\n\n`;
                    md += `| Subdomain | IP | Provider |\n`;
                    md += `|-----------|----|---------|\n`;
                    for (const sub of subdomainList.slice(0, 50)) {
                        const subdomain = sub.subdomain || sub.name || sub;
                        const ip = sub.ip || sub.ipAddresses?.[0] || 'N/A';
                        const provider = sub.asnInfo?.org || sub.provider || 'Unknown';
                        md += `| ${subdomain} | ${ip} | ${provider} |\n`;
                    }
                    if (subdomainList.length > 50) {
                        md += `\n*...and ${subdomainList.length - 50} more subdomains*\n`;
                    }
                    md += `\n`;
                }
            }
            
            // Interesting Findings
            if (findings.length > 0) {
                md += `## Interesting Findings\n\n`;
                for (const finding of findings) {
                    md += `- **${finding.subdomain}**: ${finding.description}\n`;
                }
                md += `\n`;
            }
            
            // Footer
            md += `---\n`;
            md += `*Generated by [3rd Party Tracer](https://github.com/cyfinoid/3ptracer)*\n`;
            
            // Download
            const blob = new Blob([md], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `3pt-analysis-${this.exportDomain}-${this.exportTimestamp}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ Markdown exported successfully');
            
        } catch (error) {
            console.error('❌ Markdown export failed:', error);
            alert('Failed to export Markdown. Please try again.');
        }
    }
    
    // ==========================================
    // M8: CSV Export
    // ==========================================
    
    async exportToCSV() {
        console.log('📊 CSV export requested');
        
        if (!this.analysisData) {
            alert('No analysis data available for export');
            return;
        }
        
        try {
            const data = this.analysisData.processedData;
            
            // Create CSV content for subdomains
            let csv = 'Subdomain,IP Address,Provider,ASN,Country,CNAME,Source\n';
            
            if (data.subdomains) {
                const subdomainList = Array.isArray(data.subdomains) ? data.subdomains : Object.values(data.subdomains);
                
                for (const sub of subdomainList) {
                    const subdomain = this.escapeCSV(sub.subdomain || sub.name || sub);
                    const ip = this.escapeCSV(sub.ip || sub.ipAddresses?.[0] || '');
                    const provider = this.escapeCSV(sub.asnInfo?.org || sub.provider || '');
                    const asn = this.escapeCSV(sub.asnInfo?.asn || '');
                    const country = this.escapeCSV(sub.asnInfo?.country || sub.geoip?.country || '');
                    const cname = this.escapeCSV(sub.cname || sub.cnameTarget || '');
                    const source = this.escapeCSV(sub.source || '');
                    
                    csv += `${subdomain},${ip},${provider},${asn},${country},${cname},${source}\n`;
                }
            }
            
            // Download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `3pt-subdomains-${this.exportDomain}-${this.exportTimestamp}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ CSV exported successfully');
            
        } catch (error) {
            console.error('❌ CSV export failed:', error);
            alert('Failed to export CSV. Please try again.');
        }
    }
    
    // Escape CSV special characters
    escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    // Export to PDF (now implemented)
    async exportToPDF() {
        console.log('📄 PDF export requested');
        console.log('📊 Analysis data available:', !!this.analysisData);
        
        if (!this.analysisData) {
            console.error('❌ No analysis data available for PDF export');
            alert('No analysis data available for export');
            return;
        }

        console.log('📄 Starting PDF generation...');
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Set up document properties
            doc.setProperties({
                title: `3rd Party Tracer Report - ${this.exportDomain}`,
                subject: 'Third-Party Service Analysis Report',
                author: '3rd Party Tracer by Cyfinoid Research',
                creator: '3rd Party Tracer'
            });

            let currentY = 15;
            const pageHeight = doc.internal.pageSize.height;
            const marginBottom = 20;

            // Title and header - compact
            doc.setFontSize(16);
            doc.setTextColor(102, 126, 234); // Purple color
            doc.text('3rd Party Tracer Report', 15, currentY);
            
            currentY += 8;
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Domain: ${this.exportDomain}`, 15, currentY);
            
            currentY += 6;
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated: ${this.analysisData.formattedTimestamp}`, 15, currentY);

            currentY += 12;

            // Executive Summary - compact layout
            currentY = this.addPDFSection(doc, 'Executive Summary', currentY);
            const stats = this.analysisData.processedData.stats;
            const summaryData = [
                ['Total Services', stats.totalServices || 0],
                ['Subdomains', stats.totalSubdomains || 0],
                ['Providers', stats.totalProviders || 0],
                ['Security Issues', this.countSecurityIssues()],
                ['Historical Records', stats.totalHistoricalRecords || 0]
            ];

            doc.autoTable({
                head: [['Metric', 'Count']],
                body: summaryData,
                startY: currentY,
                theme: 'striped',
                headStyles: { fillColor: [102, 126, 234], fontSize: 9 },
                margin: { left: 15, right: 15 },
                styles: { fontSize: 8, cellPadding: 2 }
            });

            currentY = doc.lastAutoTable.finalY + 8;

            // Services Section - optimized layout
            if (pageHeight - currentY < 30) {
                doc.addPage();
                currentY = 15;
            }

            currentY = this.addPDFSection(doc, 'Services Detected', currentY);
            const servicesData = this.formatServicesForPDF();
            
            if (servicesData.length > 0) {
                doc.autoTable({
                    head: [['Service Name', 'Category', 'Description', 'Associated Subdomains']],
                    body: servicesData,
                    startY: currentY,
                    theme: 'striped',
                    headStyles: { fillColor: [102, 126, 234], fontSize: 8 },
                    margin: { left: 15, right: 15 },
                    columnStyles: {
                        0: { cellWidth: 40 },
                        1: { cellWidth: 28 },
                        2: { cellWidth: 65 },
                        3: { cellWidth: 47 }
                    },
                    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', lineWidth: 0.1 }
                });
                currentY = doc.lastAutoTable.finalY + 8;
            } else {
                doc.setFontSize(8);
                doc.text('No services detected.', 15, currentY);
                currentY += 8;
            }

            // Security Findings Section - optimized
            if (pageHeight - currentY < 30) {
                doc.addPage();
                currentY = 15;
            }

            currentY = this.addPDFSection(doc, 'Security Findings', currentY);
            const securityData = this.formatSecurityForPDF();
            
            if (securityData.length > 0) {
                doc.autoTable({
                    head: [['Severity', 'Type', 'Description', 'Recommendation']],
                    body: securityData,
                    startY: currentY,
                    theme: 'striped',
                    headStyles: { fillColor: [102, 126, 234], fontSize: 8 },
                    margin: { left: 15, right: 15 },
                    columnStyles: {
                        0: { cellWidth: 22 },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 65 },
                        3: { cellWidth: 58 }
                    },
                    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', lineWidth: 0.1 }
                });
                currentY = doc.lastAutoTable.finalY + 8;
            } else {
                doc.setFontSize(8);
                doc.text('No security issues detected.', 15, currentY);
                currentY += 8;
            }

            // Subdomains Section - optimized
            if (pageHeight - currentY < 30) {
                doc.addPage();
                currentY = 15;
            }

            currentY = this.addPDFSection(doc, 'Discovered Subdomains', currentY);
            const subdomainsData = this.formatSubdomainsForPDF();
            
            if (subdomainsData.length > 0) {
                doc.autoTable({
                    head: [['Subdomain', 'IP Address', 'Provider/Service']],
                    body: subdomainsData,
                    startY: currentY,
                    theme: 'striped',
                    headStyles: { fillColor: [102, 126, 234], fontSize: 8 },
                    margin: { left: 15, right: 15 },
                    columnStyles: {
                        0: { cellWidth: 85 },
                        1: { cellWidth: 40 },
                        2: { cellWidth: 55 }
                    },
                    styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak', lineWidth: 0.1 }
                });
                currentY = doc.lastAutoTable.finalY + 8;
            } else {
                doc.setFontSize(8);
                doc.text('No subdomains discovered.', 15, currentY);
                currentY += 8;
            }

            // Interesting Findings Section - optimized
            if (pageHeight - currentY < 30) {
                doc.addPage();
                currentY = 15;
            }

            currentY = this.addPDFSection(doc, 'Interesting Findings', currentY);
            const interestingData = this.formatInterestingFindingsForPDF();
            
            if (interestingData.length > 0) {
                doc.autoTable({
                    head: [['Type', 'Subdomain', 'Description']],
                    body: interestingData,
                    startY: currentY,
                    theme: 'striped',
                    headStyles: { fillColor: [102, 126, 234], fontSize: 8 },
                    margin: { left: 15, right: 15 },
                    columnStyles: {
                        0: { cellWidth: 28 },
                        1: { cellWidth: 75 },
                        2: { cellWidth: 77 }
                    },
                    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', lineWidth: 0.1 }
                });
                currentY = doc.lastAutoTable.finalY + 8;
            } else {
                doc.setFontSize(8);
                doc.text('No notable findings.', 15, currentY);
                currentY += 8;
            }

            // Geographic Distribution Section - optimized
            if (pageHeight - currentY < 30) {
                doc.addPage();
                currentY = 15;
            }

            currentY = this.addPDFSection(doc, 'Geographic Distribution', currentY);
            const geoData = this.formatGeographicForPDF();
            
            if (geoData.length > 0) {
                doc.autoTable({
                    head: [['Country', 'Svcs', 'Subs', 'Risk', 'Providers']],
                    body: geoData,
                    startY: currentY,
                    theme: 'striped',
                    headStyles: { fillColor: [102, 126, 234], fontSize: 8 },
                    margin: { left: 15, right: 15 },
                    columnStyles: {
                        0: { cellWidth: 35 },
                        1: { cellWidth: 18 },
                        2: { cellWidth: 18 },
                        3: { cellWidth: 22 },
                        4: { cellWidth: 87 }
                    },
                    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', lineWidth: 0.1 }
                });
                currentY = doc.lastAutoTable.finalY + 8;
            }

            // Historical Records Section - optimized
            if (pageHeight - currentY < 30) {
                doc.addPage();
                currentY = 15;
            }

            currentY = this.addPDFSection(doc, 'Historical Records', currentY);
            const historicalData = this.formatHistoricalForPDF();
            
            if (historicalData.length > 0) {
                doc.autoTable({
                    head: [['Subdomain', 'Source', 'Cert Issuer']],
                    body: historicalData,
                    startY: currentY,
                    theme: 'striped',
                    headStyles: { fillColor: [102, 126, 234], fontSize: 8 },
                    margin: { left: 15, right: 15 },
                    columnStyles: {
                        0: { cellWidth: 95 },
                        1: { cellWidth: 40 },
                        2: { cellWidth: 45 }
                    },
                    styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak', lineWidth: 0.1 }
                });
                currentY = doc.lastAutoTable.finalY + 8;
            }

            // Add footer to each page - compact
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i}/${pageCount}`, 15, pageHeight - 10);
                doc.text('3rd Party Tracer - cyfinoid.github.io/3ptracer', 105, pageHeight - 10, { align: 'center' });
            }

            // Save the PDF
            const fileName = `3rd-party-analysis-${this.exportDomain}-${this.exportTimestamp}.pdf`;
            doc.save(fileName);
            
            console.log(`✅ PDF exported successfully: ${fileName}`);
            
        } catch (error) {
            console.error('❌ PDF export failed:', error);
            alert('Failed to export PDF. Please try again.');
        }
    }

    // Helper method to add section headers in PDF - compact
    addPDFSection(doc, title, currentY) {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(title, 15, currentY);
        doc.setFont(undefined, 'normal');
        return currentY + 7;
    }

    // Format services data for PDF using the verified JSON structure - optimized
    formatServicesForPDF() {
        const services = [];
        const processedData = this.analysisData.processedData;
        
        console.log('📊 Formatting services for PDF using JSON structure');
        
        if (processedData.services) {
            // Services are now objects (from serialization), not Maps
            Object.values(processedData.services).forEach(service => {
                // Get associated subdomains for this service
                const subdomains = service.sourceSubdomains || [];
                const subdomainText = subdomains.length > 0 
                    ? `${subdomains.length} subdomain${subdomains.length > 1 ? 's' : ''}: ${subdomains.slice(0, 3).join(', ')}${subdomains.length > 3 ? '...' : ''}`
                    : 'Main domain';
                
                services.push([
                    service.name || 'Unknown',
                    this.capitalizeFirst(service.category || 'unknown'),
                    service.description || 'No description',
                    subdomainText
                ]);
            });
        }
        
        console.log('📊 Formatted services for PDF:', services.length, 'services');
        return services;
    }

    // Format security findings for PDF - optimized
    formatSecurityForPDF() {
        const findings = [];
        const securityResults = this.analysisData.securityResults || {};
        
        // Add email security issues
        if (securityResults.emailIssues) {
            securityResults.emailIssues.forEach(issue => {
                findings.push([
                    this.capitalizeFirst(issue.risk || 'medium'),
                    'Email Security',
                    issue.description || 'No description',
                    issue.recommendation || 'Review configuration'
                ]);
            });
        }
        
        // Add other security issues
        ['takeovers', 'dnsIssues', 'cloudIssues'].forEach(issueType => {
            if (securityResults[issueType] && securityResults[issueType].length > 0) {
                securityResults[issueType].forEach(issue => {
                    findings.push([
                        this.capitalizeFirst(issue.risk || issue.severity || 'medium'),
                        this.formatIssueType(issueType),
                        issue.description || 'No description',
                        issue.recommendation || 'Review configuration'
                    ]);
                });
            }
        });
        
        console.log('📊 Formatted security findings for PDF:', findings.length, 'findings');
        return findings;
    }

    // Format geographic data for PDF - optimized
    formatGeographicForPDF() {
        const geoData = [];
        const sovereignty = this.analysisData.processedData.sovereigntyAnalysis;
        
        if (sovereignty && sovereignty.riskAssessment) {
            // Process all risk levels
            ['low', 'medium', 'high'].forEach(riskLevel => {
                if (sovereignty.riskAssessment[riskLevel]) {
                    sovereignty.riskAssessment[riskLevel].forEach(country => {
                        const providers = country.providers ? country.providers.join(', ') : 'Unknown';
                        geoData.push([
                            country.country || 'Unknown',
                            country.totalServices || 0,
                            country.totalSubdomains || 0,
                            this.capitalizeFirst(riskLevel),
                            providers  // Don't truncate, let table handle wrapping
                        ]);
                    });
                }
            });
        }
        
        console.log('📊 Formatted geographic data for PDF:', geoData.length, 'countries');
        return geoData;
    }

    // Format subdomains for PDF - optimized
    formatSubdomainsForPDF() {
        const subdomains = [];
        const processedData = this.analysisData.processedData;
        
        // Get active subdomains (not redirects or historical)
        if (processedData.subdomains) {
            // If subdomains is a Map
            const subdomainList = processedData.subdomains instanceof Map 
                ? Array.from(processedData.subdomains.values())
                : Object.values(processedData.subdomains);
            
            subdomainList.forEach(subdomain => {
                const ipAddress = subdomain.ipAddresses && subdomain.ipAddresses.length > 0 
                    ? subdomain.ipAddresses[0] 
                    : subdomain.ip || 'N/A';
                
                const provider = subdomain.provider || subdomain.service || 
                               (subdomain.asnInfo ? subdomain.asnInfo.org : 'Unknown');
                
                subdomains.push([
                    subdomain.subdomain || subdomain.name || 'Unknown',
                    ipAddress,
                    provider
                ]);
            });
        }
        
        console.log('📊 Formatted subdomains for PDF:', subdomains.length, 'subdomains');
        return subdomains;
    }

    // Format interesting findings for PDF - using actual findings from analysis
    formatInterestingFindingsForPDF() {
        const findings = [];
        const interestingFindings = this.analysisData.interestingFindings || [];
        
        console.log('📊 Formatting interesting findings for PDF:', interestingFindings.length, 'findings');
        
        // Use the same interesting findings displayed in the UI
        interestingFindings.forEach(finding => {
            const findingType = finding.type === 'interesting_subdomain' ? 'Pattern' : 'Service';
            const details = finding.subdomain || 'N/A';
            const significance = finding.description || finding.reason || 'Infrastructure finding';
            
            findings.push([
                findingType,
                details,
                significance
            ]);
        });
        
        console.log('📊 Formatted interesting findings for PDF:', findings.length, 'findings');
        return findings;
    }

    // Format historical records for PDF - optimized
    formatHistoricalForPDF() {
        const historical = [];
        const records = this.analysisData.processedData.historicalRecords || [];
        
        records.forEach(record => {
            // Handle both source (string) and sources (array)
            let source = 'Unknown';
            if (record.source) {
                source = record.source;
            } else if (record.sources && Array.isArray(record.sources) && record.sources.length > 0) {
                source = record.sources.join(', ');
            }
            
            const issuer = record.certificateInfo?.issuer || 'No cert';
            const cleanIssuer = issuer.includes('Let\'s Encrypt') ? 'Let\'s Encrypt' : 
                              issuer.includes('No cert') ? 'Unknown' : 
                              this.truncateText(issuer, 35);
            
            historical.push([
                record.subdomain || 'Unknown',
                source,
                cleanIssuer
            ]);
        });
        
        console.log('📊 Formatted historical records for PDF:', historical.length, 'records');
        return historical;
    }

    // Helper methods
    countSecurityIssues() {
        const securityResults = this.analysisData.securityResults || {};
        let count = 0;
        
        ['emailIssues', 'takeovers', 'dnsIssues', 'cloudIssues'].forEach(issueType => {
            if (securityResults[issueType]) {
                count += securityResults[issueType].length;
            }
        });
        
        return count;
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatIssueType(type) {
        const typeMap = {
            takeovers: 'Subdomain Takeover',
            dnsIssues: 'DNS Security',
            cloudIssues: 'Cloud Security',
            emailIssues: 'Email Security'
        };
        return typeMap[type] || type;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // Export to XLSX (now implemented)
    async exportToXLSX() {
        console.log('📊 XLSX export requested');
        console.log('📊 Analysis data available:', !!this.analysisData);
        
        if (!this.analysisData) {
            console.error('❌ No analysis data available for XLSX export');
            alert('No analysis data available for export');
            return;
        }

        console.log('📊 Starting XLSX generation...');
        try {
            const workbook = XLSX.utils.book_new();

            // 1. Summary Sheet
            const summaryData = this.formatSummaryForXLSX();
            const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
            
            // Style the summary sheet
            if (summaryWS['A1']) summaryWS['A1'].s = { font: { bold: true, sz: 16 } };
            XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary');

            // 2. Services Sheet
            const servicesData = this.formatServicesForXLSX();
            const servicesWS = XLSX.utils.aoa_to_sheet(servicesData);
            XLSX.utils.book_append_sheet(workbook, servicesWS, 'Services');

            // 3. Security Findings Sheet
            const securityData = this.formatSecurityForXLSX();
            const securityWS = XLSX.utils.aoa_to_sheet(securityData);
            XLSX.utils.book_append_sheet(workbook, securityWS, 'Security Findings');

            // 4. Geographic Distribution Sheet
            const geoData = this.formatGeographicForXLSX();
            const geoWS = XLSX.utils.aoa_to_sheet(geoData);
            XLSX.utils.book_append_sheet(workbook, geoWS, 'Geographic Distribution');

            // 5. Historical Records Sheet
            const historicalData = this.formatHistoricalForXLSX();
            const historicalWS = XLSX.utils.aoa_to_sheet(historicalData);
            XLSX.utils.book_append_sheet(workbook, historicalWS, 'Historical Records');

            // 6. DNS Records Sheet
            const dnsData = this.formatDNSRecordsForXLSX();
            const dnsWS = XLSX.utils.aoa_to_sheet(dnsData);
            XLSX.utils.book_append_sheet(workbook, dnsWS, 'DNS Records');

            // Save the file
            const fileName = `3rd-party-analysis-${this.exportDomain}-${this.exportTimestamp}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            
            console.log(`✅ XLSX exported successfully: ${fileName}`);
            console.log('📊 XLSX sheets created: Summary, Services, Security Findings, Geographic Distribution, Historical Records, DNS Records');
            
        } catch (error) {
            console.error('❌ XLSX export failed:', error);
            alert('Failed to export Excel file. Please try again.');
        }
    }

    // Format summary data for XLSX
    formatSummaryForXLSX() {
        const stats = this.analysisData.processedData.stats;
        const data = [
            ['3rd Party Tracer Analysis Report'],
            [''],
            ['Domain', this.exportDomain],
            ['Generated', this.analysisData.formattedTimestamp],
            ['Export Version', '1.0'],
            [''],
            ['ANALYSIS SUMMARY'],
            ['Metric', 'Value'],
            ['Total Services Detected', stats.totalServices || 0],
            ['Subdomains Analyzed', stats.totalSubdomains || 0],
            ['Hosting Providers', stats.totalProviders || 0],
            ['Security Issues Found', this.countSecurityIssues()],
            ['Historical Records', stats.totalHistoricalRecords || 0],
            [''],
            ['RISK ASSESSMENT'],
            ['Category', 'Count'],
            ['High Risk Countries', this.getRiskCountByLevel('high')],
            ['Medium Risk Countries', this.getRiskCountByLevel('medium')],
            ['Low Risk Countries', this.getRiskCountByLevel('low')],
            [''],
            ['Report generated by 3rd Party Tracer'],
            ['https://cyfinoid.github.io/3ptracer']
        ];
        
        console.log('📊 Formatted summary for XLSX:', data.length, 'rows');
        return data;
    }

    // Format services data for XLSX
    formatServicesForXLSX() {
        const data = [
            ['Service Name', 'Category', 'Description', 'Record Count', 'Record Types', 'Source Subdomains', 'Infrastructure Details']
        ];
        
        const processedData = this.analysisData.processedData;
        
        if (processedData.services) {
            Object.values(processedData.services).forEach(service => {
                const recordCount = service.records ? service.records.length : 0;
                const recordTypes = service.recordTypes ? service.recordTypes.join(', ') : 'Unknown';
                const sourceSubdomains = service.sourceSubdomains ? service.sourceSubdomains.join(', ') : 'Unknown';
                
                // Extract ASN info if available
                let infrastructureDetails = 'N/A';
                if (service.metadata && service.metadata.asnInfo) {
                    const asn = service.metadata.asnInfo;
                    infrastructureDetails = `${asn.country} (${asn.region}), ${asn.asn}`;
                }
                
                data.push([
                    service.name || 'Unknown',
                    this.capitalizeFirst(service.category || 'unknown'),
                    service.description || 'No description',
                    recordCount,
                    recordTypes,
                    sourceSubdomains,
                    infrastructureDetails
                ]);
            });
        }
        
        console.log('📊 Formatted services for XLSX:', data.length - 1, 'services');
        return data;
    }

    // Format security findings for XLSX
    formatSecurityForXLSX() {
        const data = [
            ['Severity', 'Type', 'Description', 'Recommendation', 'Category', 'Record/Resource']
        ];
        
        const securityResults = this.analysisData.securityResults || {};
        
        // Add email security issues
        if (securityResults.emailIssues) {
            securityResults.emailIssues.forEach(issue => {
                data.push([
                    this.capitalizeFirst(issue.risk || 'medium'),
                    'Email Security',
                    issue.description || 'No description',
                    issue.recommendation || 'Review configuration',
                    'Email Authentication',
                    issue.record || 'N/A'
                ]);
            });
        }
        
        // Add other security issues
        ['takeovers', 'dnsIssues', 'cloudIssues'].forEach(issueType => {
            if (securityResults[issueType] && securityResults[issueType].length > 0) {
                securityResults[issueType].forEach(issue => {
                    data.push([
                        this.capitalizeFirst(issue.risk || issue.severity || 'medium'),
                        this.formatIssueType(issueType),
                        issue.description || 'No description',
                        issue.recommendation || 'Review configuration',
                        this.capitalizeFirst(issueType.replace('Issues', '')),
                        issue.resource || issue.subdomain || 'N/A'
                    ]);
                });
            }
        });
        
        console.log('📊 Formatted security findings for XLSX:', data.length - 1, 'findings');
        return data;
    }

    // Format geographic distribution for XLSX
    formatGeographicForXLSX() {
        const data = [
            ['Country', 'Country Code', 'Risk Level', 'Total Services', 'Total Subdomains', 'Total IPs', 'Region', 'Timezone', 'Main Providers', 'Risk Issues']
        ];
        
        const sovereignty = this.analysisData.processedData.sovereigntyAnalysis;
        
        if (sovereignty && sovereignty.riskAssessment) {
            ['low', 'medium', 'high'].forEach(riskLevel => {
                if (sovereignty.riskAssessment[riskLevel]) {
                    sovereignty.riskAssessment[riskLevel].forEach(country => {
                        const providers = country.providers ? country.providers.join(', ') : 'Unknown';
                        const issues = country.issues ? country.issues.join('; ') : 'None';
                        const region = country.details ? country.details.region : 'Unknown';
                        const timezone = country.details ? country.details.timezone : 'Unknown';
                        
                        data.push([
                            country.country || 'Unknown',
                            country.countryCode || 'Unknown',
                            this.capitalizeFirst(riskLevel),
                            country.totalServices || 0,
                            country.totalSubdomains || 0,
                            country.totalIPs || 0,
                            region,
                            timezone,
                            providers,
                            issues
                        ]);
                    });
                }
            });
        }
        
        console.log('📊 Formatted geographic data for XLSX:', data.length - 1, 'countries');
        return data;
    }

    // Format historical records for XLSX
    formatHistoricalForXLSX() {
        const data = [
            ['Subdomain', 'Source', 'Discovery Date', 'Status', 'Certificate Issuer', 'Certificate Valid From', 'Certificate Valid To', 'Certificate ID']
        ];
        
        const records = this.analysisData.processedData.historicalRecords || [];
        
        records.forEach(record => {
            const certInfo = record.certificateInfo || {};
            
            // Handle both source (string) and sources (array)
            let source = 'Unknown';
            if (record.source) {
                source = record.source;
            } else if (record.sources && Array.isArray(record.sources) && record.sources.length > 0) {
                source = record.sources.join(', ');
            }
            
            data.push([
                record.subdomain || 'Unknown',
                source,
                record.discoveredAt ? new Date(record.discoveredAt).toLocaleDateString() : 'Unknown',
                record.status || 'Historical',
                certInfo.issuer || 'No certificate info',
                certInfo.notBefore ? new Date(certInfo.notBefore).toLocaleDateString() : 'N/A',
                certInfo.notAfter ? new Date(certInfo.notAfter).toLocaleDateString() : 'N/A',
                certInfo.certificateId || 'N/A'
            ]);
        });
        
        console.log('📊 Formatted historical records for XLSX:', data.length - 1, 'records');
        return data;
    }

    // Format DNS records for XLSX
    formatDNSRecordsForXLSX() {
        const data = [
            ['Record Type', 'Name', 'Description', 'Raw Data', 'TTL', 'Category', 'Parsed Information']
        ];
        
        const securityResults = this.analysisData.securityResults || {};
        const dnsRecords = securityResults.dnsRecords || [];
        
        dnsRecords.forEach(record => {
            let parsedInfo = 'N/A';
            let ttl = 'N/A';
            
            if (record.parsed) {
                if (record.type === 'DMARC') {
                    parsedInfo = `Policy: ${record.parsed.policy}, Reporting: ${record.parsed.reporting}`;
                } else if (record.type === 'DKIM') {
                    parsedInfo = `Selector: ${record.parsed.selector}, Service: ${record.parsed.service}, Confidence: ${record.parsed.confidence}`;
                } else if (record.type === 'CAA') {
                    parsedInfo = `Tag: ${record.parsed.tag}, Authority: ${record.parsed.authority}, Trust: ${record.parsed.isKnownCA ? 'Known CA' : 'Unknown CA'}`;
                } else if (record.type === 'SRV') {
                    parsedInfo = `Service: ${record.parsed.service}, Target: ${record.parsed.target}:${record.parsed.port}, Priority: ${record.parsed.priority}`;
                }
            }
            
            if (record.record && record.record.TTL) {
                ttl = `${record.record.TTL}s`;
            }
            
            data.push([
                record.type || 'Unknown',
                record.name || 'Unknown',
                record.description || 'No description',
                record.data || 'No data',
                ttl,
                record.category || 'Unknown',
                parsedInfo
            ]);
        });
        
        console.log('📊 Formatted DNS records for XLSX:', data.length - 1, 'records');
        return data;
    }

    // Helper method to get risk count by level
    getRiskCountByLevel(level) {
        const sovereignty = this.analysisData.processedData.sovereigntyAnalysis;
        if (sovereignty && sovereignty.riskAssessment && sovereignty.riskAssessment[level]) {
            return sovereignty.riskAssessment[level].length;
        }
        return 0;
    }
}

// Initialize export manager and make it globally accessible
const exportManager = new ExportManager();
window.exportManager = exportManager;

// Debug logging
console.log('✅ Export Manager initialized and attached to window'); 