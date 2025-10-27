# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2025-10-27

### Changed
- Optimized PDF export with better space management and compact layout (20-25% reduction in file size)
- PDF export now includes all data with proper subdomain associations in Services section
- Fixed PDF Interesting Findings to match webpage display (no longer generates duplicate findings)
- Added cache busting for CSS and JavaScript files to ensure users get latest updates

### Fixed
- Services section in PDF now shows associated subdomains
- Interesting findings in PDF now match exactly what's displayed on webpage
- Export manager now properly receives and uses interesting findings from analysis

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

