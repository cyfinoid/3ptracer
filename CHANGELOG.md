# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Raw DNS Records (Zone File Format)** - New collapsible section displaying all DNS records exactly as received from DNS server in zone file table format
  - **Positioned after Export section** - Appears immediately after the Export Analysis Results section for convenient access at the top of the analysis
  - Shows main domain and subdomain DNS records with Host Label, TTL, Record Type, and Record Data columns
  - Records formatted with proper FQDN notation (trailing dots)
  - Supports all record types (A, AAAA, CNAME, MX, TXT, NS, CAA, etc.)
  - Displays raw TXT records without reclassification (SPF, DMARC, DKIM all shown as TXT)
  - NS and MX records properly included from main domain
  - **CNAME chains consolidated into single entries** - Shows full resolution path (e.g., `subdomain → cname1 → cname2 → IP`)
  - **DKIM CNAME chains consolidated** - When DKIM records are CNAMEs pointing to TXT records (e.g., iCloud Mail), shows as single CNAME entry with format: `target.domain. → TXT: "v=DKIM1..."`
  - MX records include priority values
  - TXT records properly quoted
  - Records sorted by host label and type
  - Collapsed by default to reduce initial display clutter
  - Monospace font for better readability
  - Only appears in final analysis (not during progressive updates)
- **iCloud Mail detection** - Added comprehensive detection for Apple iCloud Mail service via MX records, SPF records, and DKIM selectors

### Fixed
- **Google Workspace false positive detection** - Removed `google-site-verification` from Google Workspace TXT patterns as it only indicates Google Search Console verification, not actual Workspace usage. Google Workspace now only detected by MX records, SPF records, or `googleapps-domain-verification` TXT record
- **Raw DNS Records section styling** - Fixed incorrect HTML structure to match all other sections (toggle icon placement, h2 usage, proper CSS classes)
- **iCloud Mail misclassified as Microsoft Office 365** - Fixed overly broad Microsoft DKIM selector pattern that matched iCloud's `sig1`, `sig2` selectors
  - Added specific iCloud/Apple Mail pattern detection for `sig1`, `sig2`, `sig3` DKIM selectors
  - Made Microsoft Office 365 DKIM pattern more specific (now only matches `selector1`, `selector2` exactly)
  - Added iCloud Mail to service detection engine with proper MX patterns (`icloud`), SPF patterns (`include:icloud.com`), and domain patterns
  - Corrected DKIM selector attribution in common selectors list (moved `sig1`, `sig2` from Microsoft to iCloud section)

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

