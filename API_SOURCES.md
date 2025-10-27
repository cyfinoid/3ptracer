# Domain/Subdomain Intelligence API Sources

**Last Updated:** October 27, 2025
**Test Domain:** cyfinoid.com

## Requirements for Integration

1. **No API Key Required** - Must work without authentication
2. **CORS Compliant** - Must have proper CORS headers or work from browser
3. **JSON Response** - Must return structured JSON data
4. **Reliable** - Must provide consistent, useful domain/subdomain intelligence

---

## Currently Integrated Sources ✅

### 1. crt.sh (Certificate Transparency)
- **Endpoint:** `https://crt.sh/?q=%25.{domain}&output=json`
- **Category:** SSL/TLS Certificate Intelligence
- **Method:** GET
- **Response Format:** JSON array
- **Authentication:** None required
- **CORS:** Works with explicit CORS mode
- **Test Command:**
```bash
curl -s "https://crt.sh/?q=%25.cyfinoid.com&output=json" | head -50
```
- **Status:** ✅ **INTEGRATED** - Working well, provides comprehensive subdomain discovery from CT logs
- **Notes:** Sometimes slow to respond (10-30s), has fallback handling for CORS issues

### 2. SSLMate CT Search API (formerly Cert Spotter)
- **Endpoint:** `https://api.certspotter.com/v1/issuances?domain={domain}&include_subdomains=true&expand=dns_names`
- **Category:** SSL/TLS Certificate Intelligence
- **Method:** GET
- **Response Format:** JSON array
- **Authentication:** None required
- **CORS:** Yes
- **Test Command:**
```bash
curl -s "https://api.certspotter.com/v1/issuances?domain=cyfinoid.com&include_subdomains=true&expand=dns_names" | head -50
```
- **Response Example:**
```json
[
  {
    "id": "8741020538",
    "dns_names": ["*.cyfinoid.com", "cyfinoid.com"],
    "not_before": "2024-11-24T00:00:00Z",
    "not_after": "2025-11-24T23:59:59Z"
  }
]
```
- **Status:** ✅ **INTEGRATED** - Excellent source, replaced deprecated v0 API
- **Documentation:** https://sslmate.com/help/reference/ct_search_api_v1

### 3. HackerTarget
- **Endpoint:** `https://api.hackertarget.com/hostsearch/?q={domain}`
- **Category:** Subdomain Enumeration
- **Method:** GET
- **Response Format:** Text (comma-separated: subdomain,ip)
- **Authentication:** None required (rate limited for anonymous)
- **CORS:** Yes
- **Test Command:**
```bash
curl -s "https://api.hackertarget.com/hostsearch/?q=cyfinoid.com" | head -20
```
- **Response Example:**
```
deployment.cyfinoid.com,76.76.21.21
github.cyfinoid.com,76.76.21.98
```
- **Status:** ✅ **INTEGRATED** - Good complement to CT logs
- **Rate Limit:** Anonymous users limited to 100 requests/day

---

## Working APIs (Tested & Approved for Potential Integration) 🟢

### 1. Wayback Machine CDX API
- **Endpoint:** `https://web.archive.org/cdx/search/cdx?url=*.{domain}&output=json&fl=original&collapse=urlkey`
- **Category:** Historical Domain/URL Data
- **Method:** GET
- **Response Format:** JSON array
- **Authentication:** None required
- **CORS:** No CORS headers detected
- **Test Command:**
```bash
curl -s "https://web.archive.org/cdx/search/cdx?url=*.cyfinoid.com&output=json&fl=original&collapse=urlkey" | head -30
```
- **Response Example:**
```json
[
  ["original"],
  ["http://cyfinoid.com/"],
  ["http://cyfinoid.com/app/"],
  ["http://blog.cyfinoid.com/"]
]
```
- **Integration Potential:** 🟡 **MEDIUM** - Historical subdomain discovery, CORS may be an issue
- **Notes:** Excellent for finding old/defunct subdomains, large datasets available

### 2. CommonCrawl Index API
- **Endpoint:** `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.{domain}&output=json`
- **Category:** Web Crawl Data / Subdomain Discovery
- **Method:** GET
- **Response Format:** JSON (newline-delimited)
- **Authentication:** None required
- **CORS:** Unknown
- **Test Command:**
```bash
curl -s "https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.cyfinoid.com&output=json" | head -20
```
- **Response Example:**
```json
{"urlkey": "com,carbonconsole,blog)/robots.txt", "url": "http://blog.cyfinoid.com/robots.txt"}
```
- **Integration Potential:** 🟡 **MEDIUM** - Good for subdomain discovery, needs index selection logic
- **Notes:** Requires specifying crawl index (CC-MAIN-YYYY-WW), data is comprehensive but complex

---

## Rejected APIs (Tested & Not Suitable) ❌

### Authentication Required

#### 1. OTX AlienVault
- **Endpoint:** `https://otx.alienvault.com/api/v1/indicators/domain/{domain}/passive_dns`
- **Category:** Threat Intelligence / Passive DNS
- **Reason for Rejection:** ❌ Requires authentication
- **Test Date:** 2025-10-27
- **Response:** `{"detail": "Anonymous access to this endpoint is limited. Please authenticate."}`
- **Notes:** Previously integrated, removed due to auth requirement

#### 2. SecurityTrails
- **Endpoint:** `https://api.securitytrails.com/v1/domain/{domain}/subdomains`
- **Category:** Subdomain Enumeration
- **Reason for Rejection:** ❌ Requires API credentials
- **Test Date:** 2025-10-27
- **Response:** `Please check user credentials`

#### 3. Censys
- **Endpoint:** `https://search.censys.io/api/v2/hosts/search?q={domain}`
- **Category:** Internet-wide Scanning / Certificate Data
- **Reason for Rejection:** ❌ Requires API ID and secret
- **Test Date:** 2025-10-27
- **Response:** `{"code": 401, "status": "Unauthorized", "error": "You must authenticate with a valid API ID and secret."}`

#### 4. VirusTotal
- **Endpoint:** `https://www.virustotal.com/api/v3/domains/{domain}`
- **Category:** Security / Threat Intelligence
- **Reason for Rejection:** ❌ Requires X-Apikey header
- **Test Date:** 2025-10-27
- **Response:** `{"error": {"code": "AuthenticationRequiredError", "message": "X-Apikey header is missing"}}`

#### 5. Shodan
- **Endpoint:** `https://api.shodan.io/dns/domain/{domain}`
- **Category:** Internet-wide Scanning / DNS
- **Reason for Rejection:** ❌ 401 Unauthorized
- **Test Date:** 2025-10-27
- **Response:** HTML 401 error page

#### 6. FullHunt.io
- **Endpoint:** `https://fullhunt.io/api/v1/domain/{domain}/subdomains`
- **Category:** Attack Surface Management
- **Reason for Rejection:** ❌ Requires X-API-KEY header
- **Test Date:** 2025-10-27
- **Response:** `{"message":"Missing X-API-KEY header","status":400}`

#### 7. WhoisXMLAPI
- **Endpoint:** `https://www.whoisxmlapi.com/whoisserver/WhoisService`
- **Category:** WHOIS Data
- **Reason for Rejection:** ❌ Requires valid API key
- **Test Date:** 2025-10-27
- **Response:** `{"ErrorMessage": {"errorCode": "API_KEY_05", "msg": "ApiKey authenticate failed"}}`

#### 8. c99.nl Subdomainfinder
- **Endpoint:** `https://subdomainfinder.c99.nl/`
- **Category:** Subdomain Enumeration
- **Reason for Rejection:** ❌ Requires paid API key purchase
- **Test Date:** 2025-10-27
- **Response:** ASCII art with "Purchase an API key at https://api.c99.nl/"

#### 9. DNSExit
- **Endpoint:** `https://dnsexit.com/dns/dns-api/`
- **Category:** DNS Management API
- **Reason for Rejection:** ❌ Requires API key + Not a query API
- **Test Date:** 2025-10-27
- **CORS:** No CORS headers
- **Response:** Returns HTML documentation page
- **Notes:** This is a DNS management API (for creating/updating DNS records), not a query API for domain intelligence. Requires account and API key. Not suitable for subdomain discovery.
- **Reference:** [DNSExit DNS API Documentation](https://dnsexit.com/dns/dns-api/?action=QUERY&pattern=example.com&type=A)

### Service Not Available / Endpoint Issues

#### 10. DNSDumpster API
- **Endpoint:** `https://api.dnsdumpster.com/`
- **Category:** Subdomain Enumeration
- **Reason for Rejection:** ❌ API endpoint returns 404
- **Test Date:** 2025-10-27
- **Response:** `HTTP/1.1 404 NOT FOUND`
- **Notes:** Web interface exists but no public API

#### 11. Google Transparency Report
- **Endpoint:** `https://transparencyreport.google.com/transparencyreport/api/v3/httpsreport/ct/certsearch`
- **Category:** Certificate Transparency
- **Reason for Rejection:** ❌ 404 Not Found
- **Test Date:** 2025-10-27
- **Response:** Google 404 error page
- **Notes:** API endpoint may have changed or doesn't exist publicly

#### 12. DNS.coffee
- **Endpoint (Incorrect):** `https://dns.coffee/api/lookup/{domain}` - 404
- **Endpoint (Correct):** `https://dns.coffee/api/domains/{domain}` - Works!
- **Category:** Historical DNS / Nameserver Intelligence
- **Reason for Rejection:** ❌ No CORS headers - blocks cross-origin requests
- **Test Date:** 2025-10-27
- **Response:** Returns JSON with current and historical nameservers, zone info
- **Rate Limit:** 11 requests per minute (x-ratelimit-limit header)
- **Test Command:**
```bash
curl -s "https://dns.coffee/api/domains/cyfinoid.com"
```
- **Response Example:**
```json
{
  "data": {
    "type": "domain",
    "name": "cyfinoid.com",
    "nameservers": [
      {"name": "chuck.ns.cloudflare.com", "firstseen": "2021-08-04T00:00:00Z"}
    ],
    "archive_nameservers": [
      {"name": "ns51.domaincontrol.com", "firstseen": "2018-12-18T00:00:00Z", "lastseen": "2021-08-03T00:00:00Z"}
    ]
  }
}
```
- **Notes:** API works from server-side but has no CORS headers. Provides excellent historical nameserver data. Not suitable for client-side browser integration due to CORS restriction.
- **Reference:** [DNS.coffee API example](https://dns.coffee/api/domains/anantshri.info)

#### 13. BGPView.io
- **Endpoint (For DNS):** `https://api.bgpview.io/dns/{domain}` - ❌ 404 Not Found
- **Endpoint (For ASN/IP):** `https://api.bgpview.io/ip/{ip}` and `https://api.bgpview.io/asn/{asn}` - ✅ Works from curl
- **Category:** BGP Routing / ASN / IP Intelligence
- **Reason for Rejection:** ❌ **CORS Blocked** - No 'Access-Control-Allow-Origin' header
- **Test Date:** 2025-10-27
- **Browser Test:** CORS blocked - `Access to fetch has been blocked by CORS policy`
- **curl Test:** Works perfectly (returns excellent structured ASN data)
- **Authentication:** Not required
- **Response Format:** JSON
- **Test Commands:**
```bash
curl -s "https://api.bgpview.io/ip/8.8.8.8"
curl -s "https://api.bgpview.io/asn/15169"
```
- **Response Example:**
```json
{
  "status": "ok",
  "data": {
    "ip": "8.8.8.8",
    "ptr_record": "dns.google",
    "prefixes": [{
      "prefix": "8.8.8.0/24",
      "asn": {
        "asn": 15169,
        "name": "GOOGLE",
        "description": "Google LLC",
        "country_code": "US"
      }
    }]
  }
}
```
- **Notes:** BGPView provides the best structured ASN data (clean numeric ASN, standardized names, full legal descriptions) but is blocked by CORS for browser use. Kept in codebase as last fallback provider for potential server-side use or if CORS headers are added in future. Would be excellent for server-side deployments.
- **Documentation:** [BGPView API Docs](https://bgpview.docs.apiary.io/)

#### 14. RiskIQ (Microsoft Defender)
- **Endpoint:** `https://api.riskiq.net/pt/v2/pdns/keyword`
- **Category:** Passive DNS
- **Reason for Rejection:** ❌ Connection timeout
- **Test Date:** 2025-10-27
- **Notes:** Service likely requires authentication or is unavailable

#### 15. AnubisDB
- **Endpoint:** `https://jldc.me/anubis/subdomains/{domain}`
- **Category:** Subdomain Enumeration
- **Reason for Rejection:** ❌ No response / empty result
- **Test Date:** 2025-10-27
- **Notes:** Service may be offline or endpoint changed

#### 16. MerkleMap
- **Endpoint:** `https://api.merklemap.com/search?domain={domain}`
- **Category:** Certificate Transparency / Subdomain Discovery
- **Reason for Rejection:** ❌ 404 Not Found
- **Test Date:** 2025-10-27
- **CORS:** Has CORS headers (access-control-allow-origin: *)
- **Notes:** Endpoint returns 404, may have been deprecated or changed

#### 17. Pentest-Tools.com
- **Endpoint:** `https://pentest-tools.com/api/subdomain-finder?domain={domain}`
- **Category:** Subdomain Enumeration
- **Reason for Rejection:** ❌ 404 - Page not found
- **Test Date:** 2025-10-27
- **CORS:** Has CORS headers (access-control-allow-origin: *)
- **Response:** `{"error": true, "statusCode": 404, "statusMessage": "Page not found"}`
- **Notes:** API endpoint doesn't exist, service requires authentication via web interface

#### 18. RapidDNS.io
- **Endpoint:** `https://rapiddns.io/subdomain/{domain}?full=1`
- **Category:** Subdomain Enumeration
- **Reason for Rejection:** ❌ Returns HTML page, not JSON API
- **Test Date:** 2025-10-27
- **CORS:** No CORS headers
- **Response:** HTML webpage
- **Notes:** This is a web scraping target, not an API. Returns full HTML page requiring parsing. Not suitable for client-side integration.

#### 19. Google Search
- **Endpoint:** `https://www.google.com/search?q=site:{domain}`
- **Category:** Search Engine / Site Enumeration
- **Reason for Rejection:** ❌ Returns HTML + JavaScript challenge, not API
- **Test Date:** 2025-10-27
- **Response:** HTML page with bot detection
- **Notes:** Google Search is not an API and returns HTML pages with anti-bot protection. Would require scraping and violates TOS.

#### 20. Bing Search
- **Endpoint:** `https://www.bing.com/search?q=site:{domain}`
- **Category:** Search Engine / Site Enumeration
- **Reason for Rejection:** ❌ Returns HTML + CAPTCHA challenge, not API
- **Test Date:** 2025-10-27
- **Response:** HTML page with Cloudflare Turnstile CAPTCHA
- **Notes:** Bing Search is not an API and returns HTML pages with CAPTCHA protection. Would require scraping and violates TOS.

### CORS Blocked

#### 21. BGPView.io
- **Endpoint:** `https://api.bgpview.io/ip/{ip}`
- **Category:** BGP / ASN Intelligence
- **Reason for Rejection:** ❌ No CORS headers - blocks cross-origin requests
- **Test Date:** 2025-10-27
- **Browser Test:** Confirmed CORS blocked from origin 'null'
- **Error:** `Access to fetch has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present`
- **curl Test:** Works excellently (best structured ASN data available)
- **Notes:** Despite being CORS-blocked, BGPView is kept in the code as a fallback provider (last in chain) for potential server-side use. Provides superior ASN data structure compared to working alternatives. If BGPView adds CORS headers in the future, it would become the best ASN source.
- **Server-Side Use:** Highly recommended for Node.js/server deployments
- **Reference:** [BGPView API Docs](https://bgpview.docs.apiary.io/)

#### 22. DNS.coffee
- **Endpoint:** `https://dns.coffee/api/domains/{domain}`
- **Category:** Historical DNS / Nameserver Intelligence
- **Reason for Rejection:** ❌ No CORS headers - blocks cross-origin requests
- **Test Date:** 2025-10-27
- **curl Test:** Works perfectly (returns JSON with nameserver data)
- **CORS Test:** No access-control-allow-origin headers
- **Notes:** Provides valuable historical nameserver data and zone information with rate limiting (11 req/min). Works from server-side but blocks browser requests. Would be excellent for server-side integration but not suitable for client-side app.
- **Reference:** [DNS.coffee API documentation example](https://dns.coffee/api/domains/anantshri.info)

#### 23. URLScan.io (Browser Test Confirmed)
- **Endpoint:** `https://urlscan.io/api/v1/search/?q=domain:{domain}`
- **Category:** Security/Threat Intelligence & Subdomain Discovery
- **Reason for Rejection:** ❌ No CORS headers - blocks cross-origin requests
- **Test Date:** 2025-10-27
- **Browser Test:** Confirmed CORS blocked from origin 'null'
- **Error:** `Access to fetch has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present`
- **curl Test:** Works fine (returns JSON with subdomain data)
- **Notes:** API works from server-side (curl) but blocks browser requests. Returns HTTP 200 but browser blocks response. Good data available (scan results with subdomains) but not suitable for client-side integration.

### Cloudflare Protected / JavaScript Required

#### 24. ViewDNS.info
- **Endpoint:** `https://viewdns.info/reverseip/?host={domain}&t=1`
- **Category:** Reverse IP Lookup
- **Reason for Rejection:** ❌ Cloudflare JavaScript challenge required
- **Test Date:** 2025-10-27
- **Notes:** Requires browser with JavaScript enabled, not suitable for API integration

#### 25. DNS History
- **Endpoint:** `https://dnshistory.org/api/domain/{domain}`
- **Category:** Historical DNS Records
- **Reason for Rejection:** ❌ Cloudflare managed challenge
- **Test Date:** 2025-10-27
- **Notes:** Protected by Cloudflare, requires JavaScript challenge completion

### Protocol Limitations

#### 26. RDAP (IANA)
- **Endpoint:** `https://rdap.iana.org/domain/{domain}`
- **Category:** WHOIS / Domain Registration
- **Reason for Rejection:** ❌ Inconsistent results, RDAP bootstrap issues
- **Test Date:** 2025-10-27
- **Response:** `{"errorCode":404,"title":"Not Found","description":["Domain not found"]}`
- **Notes:** RDAP requires correct server selection per TLD, complex implementation

---

## API Testing Methodology

### Test Criteria
1. **Authentication Test:** Verify no API key/auth header required
2. **CORS Test:** Check for `Access-Control-Allow-Origin` headers
3. **Response Format:** Confirm JSON output with useful data
4. **Rate Limiting:** Check for rate limit information
5. **Reliability:** Test response time and consistency

### Standard Test Commands

**Basic Connectivity:**
```bash
curl -s "API_ENDPOINT" | head -50
```

**Check CORS Headers:**
```bash
curl -s -I "API_ENDPOINT" | grep -i "access-control"
```

**Full Headers:**
```bash
curl -s -I "API_ENDPOINT"
```

---

## Recommendations for Future Integration

### High Priority 🟢
None currently - existing sources provide comprehensive coverage

### Medium Priority 🟡
1. **Wayback Machine CDX** - Excellent for historical subdomains, needs CORS proxy or workaround
2. **CommonCrawl** - Comprehensive but complex, requires crawl index management

### Low Priority 🔴
All other tested APIs either require authentication, are CORS-blocked, or have technical limitations

### Tested but Rejected 🚫
- **URLScan.io** - CORS blocked (browser test confirmed)
- All authentication-required APIs
- Cloudflare-protected services

---

## Current Integration Strategy

### Three-Source Approach
Our current implementation uses three complementary sources:

**Subdomain Discovery:**
1. **crt.sh** - Broad CT log coverage, historical data
2. **SSLMate CT Search** - Recent certificate issuances, clean API
3. **HackerTarget** - Active subdomain enumeration, DNS-based

**ASN/Geolocation (with fallbacks):**
- **ipinfo.io** - Primary ASN/geolocation provider
- **ip-api.com** - Fallback ASN provider
- **ipapi.co** - Secondary fallback

This combination provides:
- ✅ Certificate Transparency coverage (past and present)
- ✅ Active DNS resolution data
- ✅ ASN and geolocation data with fallback redundancy
- ✅ No authentication required (all sources)
- ✅ CORS compliant for browser use

### Why These Three?
- **Complementary Data:** Each provides unique subdomain discovery intelligence
- **No Auth Barrier:** All work without API keys
- **Client-Side Friendly:** All CORS compliant for browser use
- **Proven Reliability:** Tested extensively in production

---

## Notes

- APIs without CORS headers may work if the service doesn't explicitly block cross-origin requests
- Some APIs (like HackerTarget) have rate limits for anonymous users but are generous enough for typical use
- Historical/archived data sources (Wayback, CommonCrawl) could be valuable but require CORS workarounds
- Most comprehensive security platforms (Shodan, VirusTotal, SecurityTrails) require paid API access
- Certificate Transparency remains the most reliable source for subdomain discovery without authentication

---

## Contributing

When testing new API sources, please document:
1. Full API endpoint with example
2. Test commands used
3. Response format and example
4. CORS status (check headers)
5. Authentication requirements
6. Rate limiting information
7. Decision rationale (accept/reject)

Test against multiple domains to ensure consistency before recommending integration.

