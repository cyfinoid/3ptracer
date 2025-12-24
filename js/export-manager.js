// Export Manager - Handles JSON, PDF, XLSX and Markdown export functionality
class ExportManager {
    constructor() {
        this.analysisData = null;
        this.exportDomain = '';
        this.exportTimestamp = '';
        this.setupEventListeners();
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
                
                // Add Markdown export button
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
                    md += `| Subdomain | IP | Provider | PTR Records |\n`;
                    md += `|-----------|----|---------|-------------|\n`;
                    for (const sub of subdomainList.slice(0, 50)) {
                        const subdomain = sub.subdomain || sub.name || sub;
                        const ip = sub.ip || sub.ipAddresses?.[0] || 'N/A';
                        const provider = sub.asnInfo?.org || sub.provider || 'Unknown';
                        
                        // Add PTR records
                        let ptrRecords = 'N/A';
                        if (sub.records && sub.records.PTR && sub.records.PTR.length > 0) {
                            ptrRecords = sub.records.PTR.map(ptr => ptr.hostname || ptr.data).join(', ');
                        }
                        
                        md += `| ${subdomain} | ${ip} | ${provider} | ${ptrRecords} |\n`;
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

    // Export to PDF
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

            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            const marginBottom = 20;

            // ===== COVER PAGE =====
            doc.setPage(1);
            
            // Center content vertically
            const centerY = pageHeight / 2;
            
            // Tool name - large and prominent
            doc.setFontSize(32);
            doc.setTextColor(102, 126, 234); // Purple color
            doc.setFont(undefined, 'bold');
            const toolName = '3rd Party Tracer';
            const toolNameWidth = doc.getTextWidth(toolName);
            doc.text(toolName, (pageWidth - toolNameWidth) / 2, centerY - 30);
            
            // Domain name - medium size
            doc.setFontSize(20);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            const domainText = `Analysis Report for: ${this.exportDomain}`;
            const domainWidth = doc.getTextWidth(domainText);
            doc.text(domainText, (pageWidth - domainWidth) / 2, centerY + 10);
            
            // Generated date - small
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            const dateText = `Generated: ${this.analysisData.formattedTimestamp}`;
            const dateWidth = doc.getTextWidth(dateText);
            doc.text(dateText, (pageWidth - dateWidth) / 2, centerY + 30);
            
            // ===== CONTENT PAGES START =====
            doc.addPage();
            let currentY = 15;

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
                    head: [['Subdomain', 'IP Address', 'Provider/Service', 'PTR Records']],
                    body: subdomainsData,
                    startY: currentY,
                    theme: 'striped',
                    headStyles: { fillColor: [102, 126, 234], fontSize: 8 },
                    margin: { left: 15, right: 15 },
                    columnStyles: {
                        0: { cellWidth: 70 },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 45 },
                        3: { cellWidth: 35 },
                        4: { cellWidth: 45 }
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

            // ===== LAST PAGE - ABOUT CYFINOID =====
            doc.addPage();
            currentY = 15;
            
            doc.setFontSize(18);
            doc.setTextColor(102, 126, 234);
            doc.setFont(undefined, 'bold');
            doc.text('About Cyfinoid Research', 15, currentY);
            
            currentY += 15;
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'bold');
            doc.text('Cyfinoid Research', 15, currentY);
            
            currentY += 8;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text('Cutting-Edge Cloud Security Research', 15, currentY);
            
            currentY += 7;
            doc.setFontSize(9);
            doc.text('Pioneering advanced cloud technology research and developing innovative', 15, currentY, { maxWidth: 180 });
            currentY += 5;
            doc.text('cybersecurity tools for the community.', 15, currentY, { maxWidth: 180 });
            
            currentY += 10;
            doc.text('This tool is part of our free research toolkit - helping organizations', 15, currentY, { maxWidth: 180 });
            currentY += 5;
            doc.text('discover and analyze their cloud service dependencies.', 15, currentY, { maxWidth: 180 });
            
            currentY += 15;
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('Cloud Technology Focus', 15, currentY);
            
            currentY += 8;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            doc.text('Specializing in cloud infrastructure analysis, third-party service', 15, currentY, { maxWidth: 180 });
            currentY += 5;
            doc.text('discovery, and cloud security research.', 15, currentY, { maxWidth: 180 });
            
            currentY += 10;
            doc.text('Our research tools help organizations understand their digital', 15, currentY, { maxWidth: 180 });
            currentY += 5;
            doc.text('footprint and cloud service relationships.', 15, currentY, { maxWidth: 180 });
            
            currentY += 15;
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('Learn & Explore', 15, currentY);
            
            currentY += 8;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            doc.text('Explore our professional training programs, latest research insights,', 15, currentY, { maxWidth: 180 });
            currentY += 5;
            doc.text('and free open source tools developed from our cutting-edge', 15, currentY, { maxWidth: 180 });
            currentY += 5;
            doc.text('cybersecurity research.', 15, currentY, { maxWidth: 180 });
            
            currentY += 10;
            doc.text('• Upcoming Trainings: cyfinoid.com/trainings/', 15, currentY, { maxWidth: 180 });
            currentY += 6;
            doc.text('• Read Our Blog: cyfinoid.com/blog/', 15, currentY, { maxWidth: 180 });
            currentY += 6;
            doc.text('• Open Source By Cyfinoid: cyfinoid.com/opensource-by-cyfinoid/', 15, currentY, { maxWidth: 180 });
            
            currentY += 10;
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Hands-on training in cloud security, Android security, and software', 15, currentY, { maxWidth: 180 });
            currentY += 5;
            doc.text('supply chain protection', 15, currentY, { maxWidth: 180 });
            
            currentY += 15;
            doc.setFontSize(8);
            doc.setTextColor(102, 126, 234);
            doc.text('GitHub: github.com/cyfinoid/3ptracer', 15, currentY);
            currentY += 6;
            doc.text('Website: cyfinoid.com', 15, currentY);
            currentY += 6;
            doc.text('Tool: cyfinoid.github.io/3ptracer', 15, currentY);
            
            // Add footer to all pages (cover, content, and last page)
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                this.addPDFFooter(doc, i, pageCount, this.exportDomain);
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

    // Helper method to add footer to PDF pages
    addPDFFooter(doc, pageNum, totalPages, domain) {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        
        // Left: Page number
        doc.text(`Page ${pageNum}/${totalPages}`, 15, pageHeight - 10);
        
        // Center: Tool URL
        doc.text('3rd Party Tracer - cyfinoid.github.io/3ptracer', pageWidth / 2, pageHeight - 10, { align: 'center' });
        
        // Right: Domain name
        doc.text(`Domain: ${domain}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
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
                
                // Add PTR records
                let ptrRecords = 'N/A';
                if (subdomain.records && subdomain.records.PTR && subdomain.records.PTR.length > 0) {
                    ptrRecords = subdomain.records.PTR.map(ptr => ptr.hostname || ptr.data).join(', ');
                }
                
                subdomains.push([
                    subdomain.subdomain || subdomain.name || 'Unknown',
                    ipAddress,
                    provider,
                    ptrRecords
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
                } else if (record.type === 'PTR') {
                    parsedInfo = `IP: ${record.ip || 'Unknown'}, Hostname: ${record.hostname || record.data || 'Unknown'}`;
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