# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Spamhaus DBL Query Type** - Fixed critical bug where DBL was querying TXT records instead of A records. DBL uses A records in the 127.0.1.x range to indicate listings. Also added support for additional codes (127.0.1.102-106 for abused legit domains) and proper error handling for 127.255.255.x error responses.
- **URIBL Bitmask Logic** - Fixed incorrect bitmask values that caused false positives. Query blocked responses (127.0.0.1, bit 1) were incorrectly treated as "listed in black". Corrected bitmask: 1=blocked, 2=black, 4=grey, 8=red. Changed endpoint to multi.uribl.com for proper bitmask support.
- **SURBL Bitmask Logic** - Fixed completely incorrect bitmask values. Corrected to match SURBL documentation: 4=DM, 8=PH (Phishing), 16=MW (Malware), 32=CT, 64=ABUSE, 128=CR (Cracked sites). Previous implementation had wrong list names and bit positions.

### Changed
- **Simplified Scan Modes** - Reduced from 5 scan modes to 3: Standard Scan (full analysis with subdomain discovery from all 4 sources), Quick Scan (domain-only checks, no subdomain discovery), and Email Scan (email records only: MX, SPF, DKIM, DMARC, MTA-STS, BIMI, TLSRPT).
- **Streamlined Export Options** - Removed CSV, Save Analysis, History, and Compare exports. Kept JSON, PDF, Excel (XLSX), Markdown, and Copy Link for essential export needs.
- **Collapse/Expand All Controls** - Added "Collapse All" and "Expand All" buttons at the top of results to quickly manage all collapsible sections.
- **DNS Record Counts in Headers** - Section headers now show the count of DNS records that contributed to findings (e.g., "Third-Party Services (15) from 42 DNS records").

### Removed
- **Deep Scan Mode** - Merged functionality into Standard Scan which now performs full analysis including subdomain discovery from all sources.
- **CSV Export** - Removed in favor of more comprehensive export options (JSON, XLSX, Markdown).
- **Analysis Snapshots** - Removed Save Analysis and History features to simplify the UI.
- **Comparison View** - Removed analysis comparison feature.

### Added
- **SPF Include Chain Analysis (H1)** - Comprehensive SPF record analysis that recursively resolves all `include:` and `redirect=` mechanisms, counts DNS lookups against RFC 7208 limit (max 10), detects void lookups, and provides visual tree representation of the include chain. Warns when approaching or exceeding lookup limits, and suggests flattened SPF records when over limit.
- **MTA-STS Detection (H2)** - Checks for Mail Transfer Agent Strict Transport Security (RFC 8461) by querying `_mta-sts.{domain}` TXT record. Displays status, version, and policy ID. Adds informational security finding when not configured.
- **BIMI Detection (H3)** - Checks for Brand Indicators for Message Identification by querying `default._bimi.{domain}` TXT record. Displays logo URL and VMC (Verified Mark Certificate) status when configured.
- **SMTP TLS Reporting Detection (H7)** - Checks for TLS Reporting (RFC 8460) by querying `_smtp._tls.{domain}` TXT record. Displays reporting addresses when configured.
- **Email Security Standards Dashboard** - New visual dashboard in Security Analysis section showing status of MTA-STS, BIMI, and TLS-RPT with color-coded indicators and explanations.
- **Additional Service Detection Patterns (H4)** - Added detection for Splunk, PagerDuty, Grafana Cloud, Opsgenie monitoring services. Enhanced CNAME detection for Datadog, New Relic, Shopify, DocuSign, OneTrust, and Cookiebot.
- **JSON Export (H5)** - Machine-readable JSON export for automation pipelines. Includes complete analysis data with metadata, services, security results, and interesting findings.
- **Additional Service Detection Patterns Batch 2 (H6)** - Added CI/CD platforms: CircleCI, GitLab, Travis CI, Jenkins, Bitbucket Pipelines. Workflow automation: Make/Integromat, Tray.io, n8n, Workato. Payment services: Adyen, Braintree, Klarna, Mollie.
- **DNSSEC Validation (M1)** - Checks DNSSEC configuration by querying DNSKEY and DS records. Reports status as Secure (fully validated), Insecure (keys present but not validated), or Unsigned (not configured). Shows key types (KSK/ZSK), algorithms, and DS key tags.
- **Shareable URL Links (M3)** - Share domain analysis with URL parameters. Use `?d=domain.com` to pre-fill domain or `?d=domain.com&auto=1` to auto-start analysis. "Copy Link" button generates shareable URLs for quick sharing.
- **Keyboard Shortcuts (M4)** - Power user keyboard shortcuts: Ctrl+Enter (analyze), Ctrl+E (export PDF), Ctrl+J (export JSON), Ctrl+D (toggle theme), / (focus input), ? (show help).
- **SURBL and URIBL Blocklist Integration (M5)** - Added SURBL (multi.surbl.org) and URIBL (black.uribl.com) blocklist checking alongside existing Spamhaus DBL. Checks domains and subdomains against all three blocklists in parallel for comprehensive threat detection.
- **Dangling NS Record Detection (M6)** - Detects nameservers that point to unregistered or non-responsive domains. Identifies potential NS takeover vulnerabilities where attackers could register the nameserver domain to hijack DNS.
- **Markdown Export (M7)** - Export analysis as GitHub/GitLab-ready Markdown report. Includes summary statistics, services, security issues, and subdomains in a clean, readable format.
- **Quick Scan Mode (M10)** - Fast analysis mode that skips subdomain discovery. Analyzes only the main domain DNS records for quick security checks. Select from scan mode dropdown.
- **DANE/TLSA Record Checking (L10)** - Checks for DANE (DNS-based Authentication of Named Entities) by querying TLSA records for SMTP (port 25, 587) and HTTPS (port 443). Shows which services are protected by DANE and parses TLSA record parameters.
- **Interactive Network Graph (L1)** - Visual network graph showing subdomain relationships and CNAME chains using vis.js. Nodes are color-coded by provider (AWS, Google, Cloudflare, etc.) with interactive zoom, pan, and hover tooltips.
- **Geographic Distribution Map (L2)** - Interactive Leaflet.js map showing geographic distribution of infrastructure. Markers sized by subdomain count per country with popup details.
- **Certificate Timeline (L5)** - Timeline visualization of certificate observations from CT logs. Shows when subdomains were first seen in certificate transparency data.
- **PWA Support (L3)** - Progressive Web App support with manifest.json and service worker for offline functionality. Install to home screen on mobile devices. Caches static assets for faster loading.
- **Batch Analysis Mode (L4)** - Analyze up to 10 domains at once. Enter multiple domains (comma-separated in main input). Uses Quick Scan for each domain. Export all results as combined JSON.
- **Email Scan Mode (L6)** - Specialized mode for email security analysis. Checks common DKIM selectors (google, selector1, selector2, k1, default, mail, etc.). Only queries email records: MX, SPF, DKIM, DMARC, MTA-STS, BIMI, and TLSRPT - skips A/AAAA/NS/CNAME records.
- **Mobile UX Improvements (L8)** - Touch-friendly targets (44px minimum), responsive layout, collapsible sections on mobile, swipe-friendly tables, improved modal sizing, and better form layout on small screens.
- **Accessibility Enhancements (L9)** - Skip to main content link, ARIA roles and labels, keyboard focus indicators, high contrast mode support, reduced motion preference support, screen reader friendly content, and accessible tooltips.
- **Visual Analytics Dashboard** - New tabbed visualization section with Network Graph, Geographic Map, and Certificate Timeline views. Switch between visualizations with tab buttons.
- **THC ip.thc.org API integration** - Added 4th subdomain discovery source using THC's reverse DNS database. Complements existing CT log sources (crt.sh, SSLMate) and HackerTarget by providing subdomains discovered through reverse DNS data. CORS compliant, no authentication required. Documentation: https://ip.thc.org/docs/API/subdomain-lookup
- **Excessive CAA entries detection** - Security finding when more than 3 CAA (Certificate Authority Authorization) entries are found. Having too many authorized CAs weakens security controls and increases attack surface, effectively leaving the security gate wide open.
- **IP Geolocation API failure notifications** - User-visible notifications when IP-to-location mapping APIs fail or are rate-limited. Notifications appear in the API Issues section with clear error messages.
- **429 Rate limit detection** - Proper detection and handling of HTTP 429 (Too Many Requests) errors from IP geolocation APIs. When rate-limited, the tool stops making requests to that provider and switches to fallback providers.
- **Abuse IP and Domain Blocklist Checking** - Automatic checking of IP addresses and domains against Spamhaus blocklists (ZEN for IPs, DBL for domains) via DNS over HTTPS. Detects malicious IPs and domains flagged in abuse blocklists and reports them as security findings with appropriate risk levels.

### Fixed
- **Security analysis NaN issue** - Fixed bug where security analysis reported "NaN issues found" instead of the actual count. The issue occurred because `securityResults` object contains both issue arrays and analysis result objects (like `dnsRecords`, `spfChainAnalysis`, `mtaSts`, etc.), and the calculation was trying to sum `.length` on non-array properties. Now explicitly sums only the issue array properties: `takeovers`, `dnsIssues`, `emailIssues`, `cloudIssues`, and `wildcardCertificates`.
- **Rate limit handling** - Fixed issue where 429 errors were ignored and requests continued to be sent to rate-limited APIs. Now properly detects 429 status codes and stops retrying rate-limited providers.
- **API failure visibility** - IP geolocation API failures are now visible to users through the API Issues notification system, instead of silently failing in the background.

### Optimizations
- **Consolidated API notifications** - API notifications are now consolidated to show only one notification per service/API, prioritizing errors over warnings. This saves space in the UI and prevents duplicate messages for services like crt.sh, SSLMate CT Search, and HackerTarget.

## [1.0.3] - 2025-11-04

### Added
- **Raw DNS Records (Zone File Format)** - New collapsible section displaying DNS records in zone file table format
  - Positioned immediately after Export section for convenient access
  - Shows main domain and subdomain records with Host Label, TTL, Record Type, and Record Data
  - All record types supported (A, AAAA, CNAME, MX, TXT, NS, CAA, etc.) with FQDN notation
  - TXT records displayed as-is without reclassification (SPF, DMARC, DKIM shown as TXT type)
  - CNAME chains consolidated into single entries showing full resolution path
  - DKIM CNAME chains consolidated (e.g., `target.domain. → TXT: "v=DKIM1..."`)
  - Collapsed by default with monospace font for readability
- **iCloud Mail detection** - Added comprehensive Apple iCloud Mail detection via MX, SPF, and DKIM selectors

### Fixed
- **Google Workspace false positive** - Removed `google-site-verification` from Workspace detection patterns (only indicates Search Console verification). Now detects via MX, SPF, or `googleapps-domain-verification` TXT only
- **iCloud Mail misclassified as Microsoft 365** - Fixed overly broad Microsoft DKIM pattern that matched iCloud's `sig1`, `sig2`, `sig3` selectors. Microsoft pattern now specific to `selector1`, `selector2` only
- **Raw DNS Records section styling** - Fixed HTML structure for consistent toggle icon placement and CSS classes
- **GitHub Actions deployment** - Added missing `theme-toggle.js` to deployment workflow and updated file count to 9 JS files

### Optimizations
- **Code size reduction** - Removed 110 lines of unused code (~1.2% reduction from 8900 to 8790 lines)
  - Removed unused methods from `analysis-controller.js`: `getAnalysisStats()`, `printFinalStats()`, `discoverSubdomains()` (-23 lines)
  - Removed unused Logger methods: `info()`, `warn()`, `error()`, `success()`, `isDebugEnabled()` (-25 lines)
  - Removed unused DNS analyzer methods: `printStats()`, `onSubdomainDiscovered()` (-62 lines)
  - Removed dead callback code (subdomain callback infrastructure with no registered callbacks)

### Removed
- **deploy.sh** - Removed legacy bash deployment script; GitHub Actions workflow now handles all deployments

## [1.0.2] - 2025-10-27

### Added
- Proper link styling for subdomain links using `--accent-blue` for all states (visited and unvisited)
- Removed duplicate `createSubdomainLink()` method in ui-renderer.js
- New global logging utility (`logger.js`) with debug mode support for conditional console output

### Optimizations
- **Removed unused files:** `service-registry.js` and `subdomain-registry.js` (functionality already implemented elsewhere)
- **Removed duplicate functions:** Duplicate `getAllServices()` in `DataProcessor`
- **Removed unused functions:** `startCTQueries()`, `analyzeSubdomains()`, and `loadResults()`
- **Improved logging:** All debug logging now respects debug mode toggle, reducing console overhead
- **Reduced HTTP requests:** 2 fewer JavaScript files to load on initial page load (~300 lines of dead code removed)

### Security
- **Fixed domain confusion vulnerability:** Replaced unsafe `includes()` domain checks with proper subdomain validation
  - Added `isDomainOrSubdomain()` helper to `ServiceDetectionEngine` and `DNSAnalyzer` classes
  - Fixed S3 bucket detection to validate actual domain hierarchy (prevents `s3.amazonaws.com.attacker.com` from matching)
  - Fixed subdomain takeover detection to prevent false positives from domain confusion attacks
  - Fixed infrastructure detection in DNS analyzer (AWS, Azure, DigitalOcean, Cloudflare)
  - Fixed DNS server detection in `queryDNSServer()` - extracts hostname from URL and validates with proper domain checking
  - Addresses all CodeQL security warnings about arbitrary host matching in domain checks

### Fixed
- Fixed dark mode styling for disclaimer recommendation boxes (was too bright with white background)
- Updated disclaimer text colors to use proper theme-aware colors (#ffc107 for dark mode)
- Historical records now correctly display discovery source (e.g., "crt.sh", "HackerTarget") instead of "undefined" in UI, PDF, and XLSX exports
- Source information is now properly preserved throughout the subdomain analysis pipeline
- Both immediate and batch processing flows now include source tracking
- PDF and XLSX exports now correctly handle both `source` (string) and `sources` (array) formats
- Fixed dark mode styling for Historical Records table, Geographic Distribution table, and all Data Sovereignty sections
- All sovereignty cards, alerts, and tables now properly respect dark mode theme
- Replaced all hardcoded gray colors (#495057, #6c757d) with CSS variables for proper dark mode support

## [1.0.1] - 2025-10-27

### Changed
- Optimized PDF export with better space management and compact layout (20-25% reduction in file size)
- PDF export now includes all data with proper subdomain associations in Services section
- Fixed PDF Interesting Findings to match webpage display (no longer generates duplicate findings)
- Added cache busting for CSS and JavaScript files to ensure users get latest updates
- Migrated from deprecated Cert Spotter API v0 to SSLMate CT Search API v1

### Removed
- Removed OTX AlienVault API integration (requires authentication, not suitable for client-side use)

### Fixed
- Services section in PDF now shows associated subdomains
- Interesting findings in PDF now match exactly what's displayed on webpage
- Export manager now properly receives and uses interesting findings from analysis
- Updated Certificate Transparency subdomain discovery to use new SSLMate CT Search API (fixes CORS errors)

## [1.0.0] - 2025-10-24

### Added
- Comprehensive DNS analysis using DoH (DNS over HTTPS)
- Multiple DNS record type support: A, CNAME, TXT, MX, NS, SPF, DMARC
- Certificate Transparency log integration via crt.sh and Cert Spotter
- Threat intelligence integration with OTX AlienVault and HackerTarget
- Service detection for cloud providers (AWS, Azure, GCP, DigitalOcean, etc.)
- Email service detection (ProofPoint, Mimecast, Barracuda, Sophos)
- CDN and hosting service identification
- Subdomain takeover detection via CNAME resolution checks
- Internal IP exposure detection for RFC 1918 and reserved IP ranges
- Private IP detection covering all RFC 1918 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Loopback, link-local, and reserved address detection
- DMARC policy analysis with detailed tag parsing
- Security issue categorization by severity (High, Medium, Low)
- Rich data visualization with service categorization
- Historical subdomain record tracking
- CNAME mapping visualization
- Statistics dashboard with comprehensive metrics
- Export functionality for analysis results
- Dark/light theme toggle
- Debug mode for troubleshooting

### Changed
- Improved service detection accuracy with vendor consolidation
- Enhanced security analysis with detailed IP range context
- Optimized DNS query rate limiting
- Better error handling and user feedback

### Security
- Client-side only architecture - no data sent to external servers
- DNS over HTTPS for encrypted DNS queries
- No analytics or user tracking
- Open source code for security review

