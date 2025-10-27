# AI Agent Instructions for 3rd Party Tracer

This document contains recurring instructions, patterns, and best practices for maintaining the 3rd Party Tracer project.

## Core Principles

### 1. Client-Side Only Architecture
- **NEVER** add server-side code or dependencies
- All functionality must run entirely in the browser
- Use DNS over HTTPS (DoH) for DNS queries
- No backend APIs, no data collection, no external service dependencies
- Keep the tool privacy-focused and standalone

### 2. Excluded Directories
- Always work in the root project files only

### 3. File Organization
```
Root Project Files (MODIFY THESE):
├── index.html
├── about.html
├── css/style.css
├── js/
│   ├── logger.js
│   ├── app.js
│   ├── dns-analyzer.js
│   ├── service-detection-engine.js
│   ├── data-processor.js
│   ├── ui-renderer.js
│   ├── analysis-controller.js
│   ├── export-manager.js
│   └── theme-toggle.js
├── CHANGELOG.md
└── .github/workflows/deploy.yml

Do NOT Modify:
└── logs/ (historical data)
```

## Release Process

### When Creating a New Release

**Follow these steps in order:**

#### Step 1: Update CHANGELOG.md
1. Move all `[Unreleased]` changes to a new version section
2. Format: `## [X.Y.Z] - YYYY-MM-DD`
3. Use semantic versioning:
   - MAJOR: Breaking changes
   - MINOR: New features, backward compatible
   - PATCH: Bug fixes, optimizations
4. Keep an empty `[Unreleased]` section at the top

Example:
```markdown
## [Unreleased]

## [1.0.2] - 2025-10-27

### Added
- New feature here

### Fixed
- Bug fix here
```

#### Step 2: Update Cache Busting Versions

**Update version parameter in all these locations:**

**File: `index.html`**
- `<link rel="stylesheet" href="css/style.css?v=X.Y.Z">`
- `<script src="js/logger.js?v=X.Y.Z">`
- `<script src="js/export-manager.js?v=X.Y.Z">`
- `<script src="js/dns-analyzer.js?v=X.Y.Z">`
- `<script src="js/service-detection-engine.js?v=X.Y.Z">`
- `<script src="js/data-processor.js?v=X.Y.Z">`
- `<script src="js/ui-renderer.js?v=X.Y.Z">`
- `<script src="js/analysis-controller.js?v=X.Y.Z">`
- `<script src="js/app.js?v=X.Y.Z">`
- `<script src="js/theme-toggle.js?v=X.Y.Z">`

**File: `about.html`**
- `<link rel="stylesheet" href="css/style.css?v=X.Y.Z">`
- `<script src="js/theme-toggle.js?v=X.Y.Z">`

#### Step 3: Verify All Versions Updated
Run this check:
```bash
grep -r "?v=1\.0\." --include="*.html" .
```
All results should show the NEW version number.

#### Step 4: Update GitHub Actions (if JS files changed)
**File: `.github/workflows/deploy.yml`**

If you added or removed JavaScript files, update:
1. The file copy section (around line 75-85)
2. The verification section (around line 108-122)
3. The deployment summary file count (around line 182)

Example from v1.0.2:
```yaml
# JavaScript files
cp js/logger.js _site/js/
cp js/app.js _site/js/
# ... (8 JS files total, removed service-registry.js and subdomain-registry.js)
echo "✅ Copied 8 JavaScript files"
```

## Recurring Instructions & Patterns

### Code Optimization
When asked to optimize or clean up code:
1. Read through all relevant files systematically
2. Use `grep` to find function definitions and usage
3. Cross-reference to identify unused code
4. Check for duplicate functions
5. Look for dead code (functions that are never called)
6. Remove unused files and their references in HTML
7. Update deployment workflow if files are removed
8. Document all changes in CHANGELOG.md

**Common optimization targets:**
- Unused JavaScript classes/functions
- Duplicate function definitions
- Unused CSS selectors
- Redundant logic
- Console logging (implement conditional logging with debug mode)

### Security Reviews
When reviewing for security issues:
1. **Domain Confusion Vulnerabilities**: Use `isDomainOrSubdomain()` helper instead of `.includes()` for domain checks
2. **Input Validation**: Always validate and sanitize user inputs
3. **XSS Prevention**: Use proper DOM manipulation (avoid innerHTML with user data)
4. **CORS**: Ensure all external API calls respect CORS policies
5. **Client-Side Security**: No sensitive data storage, no API keys in code

**Pattern to fix domain confusion:**
```javascript
// ❌ VULNERABLE
if (target.includes('amazonaws.com')) { ... }

// ✅ SECURE
if (this.isDomainOrSubdomain(target, 'amazonaws.com')) { ... }
```

### Dark Mode Styling
When fixing dark mode issues:
1. Check for hardcoded colors (hex values instead of CSS variables)
2. Ensure both light and dark mode overrides exist
3. **Always test visual elements in both themes**
4. Common issues: white backgrounds in dark mode, poor contrast, dull text colors

**Standard color replacement patterns:**
```css
/* Replace hardcoded colors with CSS variables */
color: #495057;  →  color: var(--text-color);
color: #6c757d;  →  color: var(--text-secondary);
background: #f8f9fa;  →  background: var(--bg-tertiary);
border: 1px solid #e9ecef;  →  border: 1px solid var(--border-color);
background: white;  →  background: var(--card-bg);
```

**Dark mode pattern with light mode override:**
```css
.element {
    color: var(--text-color);  /* Uses theme variable (dark mode default) */
    background: rgba(255, 193, 7, 0.1);  /* Dark mode background */
}

[data-theme="light"] .element {
    background: rgba(255, 255, 255, 0.7);  /* Light mode override */
}
```

**Common elements that need dark mode fixes:**
- Tables (background, borders, text colors)
- Cards and containers
- Disclaimer/warning boxes
- Distribution and sovereignty sections
- Any element with white or light gray backgrounds

### PDF Export Optimization
When optimizing PDF exports:
1. **NEVER remove data** - Keep all information, just optimize layout
2. **Focus on space management**, not data reduction:
   - Reduce margins and padding
   - Optimize column widths
   - Use compact table layouts
   - Adjust spacing between sections
3. **Font size guidelines**:
   - Don't reduce fonts too much
   - Minimum 7.5pt for dense data tables
   - 8pt for standard tables
   - Keep headings readable (10-12pt)
4. **Data consistency**:
   - Ensure PDF shows same data as UI
   - Verify XLSX export matches PDF and UI
   - Test "Subdomains," "Services," and "Interesting Findings" sections
5. **Common issues**:
   - Missing sections (check all sections are exported)
   - Mismatched data between UI and exports
   - Services missing subdomain associations
   - Interesting findings using wrong data source

### API Integration & CORS Testing
When evaluating new APIs:
1. **Selection Criteria** (ALL must be met):
   - ✅ No API keys required (client-side compatible)
   - ✅ CORS compliant (proper headers)
   - ✅ Focus on domain/subdomain intelligence
   - ✅ Reliable and available

2. **CORS Testing Process**:
   - Never assume an API is CORS-compliant
   - Create test HTML file in `mdfiles/` (e.g., `test_apiname.html`)
   - Test actual fetch requests in browser (not just documentation)
   - Check for `Access-Control-Allow-Origin` errors in console
   
3. **Documentation**:
   - Document ALL attempted APIs in `API_SOURCES.md`
   - Include APIs that were rejected
   - Document rejection reasons (CORS blocked, requires auth, etc.)
   - Keep current integration strategy updated

**Example test pattern:**
```javascript
// In mdfiles/test_apiname.html
async function testAPI() {
    try {
        const response = await fetch('https://api.example.com/endpoint');
        const data = await response.json();
        console.log('✅ CORS compliant:', data);
    } catch (error) {
        console.log('❌ CORS blocked:', error);
    }
}
```

### Data Consistency & Source Tracking
When working with data flow:
1. **Source Attribution**:
   - Always track where subdomains were discovered (crt.sh, HackerTarget, etc.)
   - Ensure source info flows through entire pipeline
   - Check both immediate processing and batch processing flows
   - Verify source appears in UI, PDF, and XLSX

2. **Data Flow Verification**:
   - Trace data from discovery → processing → display → export
   - Check for "undefined" or "Unknown" values
   - Verify data structures match between modules
   - Test both `source` (string) and `sources` (array) formats

3. **Common Issues**:
   - Source information lost in processing queue
   - Data mismatch between UI and exports
   - Missing fields in historical records
   - Incorrect data passed between AnalysisController and ExportManager

### Link Styling Patterns
For subdomain and external links:
1. **No distinction between visited/unvisited**:
   - Use same color for both states
   - Prefer `var(--accent-blue)` for consistency
   
2. **Hover effects**:
   - Use opacity changes instead of color changes
   - Standard: `opacity: 0.8` on hover, `0.6` on active

**Standard link pattern:**
```css
.subdomain-link {
    color: var(--accent-blue);
    text-decoration: underline;
    transition: opacity 0.2s ease;
}

.subdomain-link:visited {
    color: var(--accent-blue);  /* Same as unvisited */
}

.subdomain-link:hover {
    opacity: 0.8;
}

.subdomain-link:active {
    opacity: 0.6;
}
```

### Linter Checks
After making changes:
```bash
# Always run linter checks on modified files
read_lints(["/path/to/modified/file.js"])
```

Fix all linter errors before considering the task complete.

### CHANGELOG Guidelines
Every change should be documented in CHANGELOG.md under appropriate category:
- **Added**: New features, new files
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features, deleted files
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes
- **Optimizations**: Performance improvements, code cleanup

Use clear, user-friendly language. Include specifics.

## Common Command Patterns

### Finding Unused Code
```bash
# Find function definition
grep -r "function functionName" js/

# Find function usage
grep -r "functionName(" js/

# Find class instantiation
grep -r "new ClassName" js/
```

### Checking for Domain Issues
```bash
# Find potential domain confusion vulnerabilities
grep -r "\.includes\(['\"].*\.com" js/

# Find domain checks that need fixing
grep -r "\.includes\(['\"][a-z0-9\-]+\.[a-z]+" js/
```

### Finding Dark Mode Color Issues
```bash
# Find hardcoded colors that might need CSS variables
grep -r "#495057" css/
grep -r "#6c757d" css/
grep -r "#f8f9fa" css/
grep -r "#e9ecef" css/
grep -r "background: white" css/
grep -r "background: #fff" css/

# Find elements without light mode overrides
grep -r "\.element {" css/ | grep -v "\[data-theme=\"light\"\]"
```

### Checking Data Flow and Source Tracking
```bash
# Find where source information is set/used
grep -r "\.source\s*=" js/
grep -r "\.sources\s*=" js/
grep -r "discoveredSubdomains\.get" js/

# Check for undefined values in UI
grep -r "undefined" js/ui-renderer.js
grep -r "Unknown" js/ui-renderer.js
```

### Version Verification
```bash
# Check all version strings
grep -r "?v=1\.0\." --include="*.html" .

# Should return consistent version across all files
```

## Code Style & Conventions

### JavaScript
- Use ES6+ features (classes, arrow functions, async/await)
- Descriptive variable and function names
- Always handle errors with try-catch
- Use `window.logger` for debug logging
- Add JSDoc comments for complex functions

### CSS
- Use CSS variables for theme-aware colors
- Mobile-first responsive design
- Group related styles together
- Comment major sections

### HTML
- Semantic HTML5 elements
- Accessible (ARIA labels where needed)
- Include cache-busting versions on all assets

## Testing Checklist

Before considering a task complete:
- [ ] All linter errors resolved
- [ ] Both light and dark modes tested (if UI changes)
  - [ ] Check tables, cards, and containers
  - [ ] Verify text colors are readable in both themes
  - [ ] Check disclaimer boxes and alerts
  - [ ] Test sovereignty and distribution sections
- [ ] Data consistency verified (if data changes):
  - [ ] UI displays correct data
  - [ ] PDF export matches UI
  - [ ] XLSX export matches UI and PDF
  - [ ] No "undefined" or "Unknown" values (unless truly unknown)
  - [ ] Source attribution present in historical records
- [ ] Cache-busting versions updated (if release)
- [ ] CHANGELOG.md updated with all changes
- [ ] GitHub Actions workflow updated (if file structure changed)
- [ ] No hardcoded sensitive data
- [ ] Client-side only (no server dependencies, no API keys)
- [ ] **logs/ folder completely untouched**
- [ ] API integration tested in browser (if new APIs):
  - [ ] CORS compliance verified with test HTML
  - [ ] Results documented in API_SOURCES.md

## Workflow Integration

### GitHub Actions Deploy Workflow
The deployment happens via `.github/workflows/deploy.yml` and triggers on:
1. Manual dispatch
2. Release published

The workflow:
1. Checks out the repository
2. Copies files to `_site/` directory
3. Verifies all required files exist
4. Deploys to GitHub Pages

If you modify the file structure, update:
- File copy commands
- File verification list
- File count in deployment summary

## Quick Reference: Recent Optimizations

### v1.0.2 Changes
- Removed unused files: `service-registry.js`, `subdomain-registry.js`
- Added new utility: `logger.js`
- Fixed 13 domain confusion vulnerabilities
- Fixed dark mode styling issues across multiple sections:
  - Historical Records table (white background → `var(--card-bg)`)
  - Geographic Distribution table
  - Data Sovereignty sections (sovereignty-summary, location cards, risk cards, alerts)
  - Disclaimer recommendation boxes
  - Replaced all hardcoded `#495057`, `#6c757d`, `#f8f9fa`, `#e9ecef` with CSS variables
- Added subdomain link styling with no distinction between visited/unvisited (both use `var(--accent-blue)`)
- Fixed "undefined" source in historical records table
- Fixed source tracking through subdomain discovery pipeline
- Optimized PDF exports for better space management (without losing data)
- Added subdomain associations to Services section in PDF
- Migrated from Cert Spotter API v0 to SSLMate CT Search API v1
- Removed OTX AlienVault API (requires authentication)
- Removed duplicate `createSubdomainLink()` method in ui-renderer.js
- Removed ~300 lines of dead code

### Files Currently in Use (as of v1.0.2)
**JavaScript (8 files):**
1. logger.js (NEW in v1.0.2)
2. app.js
3. dns-analyzer.js
4. service-detection-engine.js
5. data-processor.js
6. ui-renderer.js
7. analysis-controller.js
8. export-manager.js
9. theme-toggle.js

**CSS (1 file):**
- style.css

**HTML (2 files):**
- index.html
- about.html

## Notes for AI Agents

- Always confirm understanding before making destructive changes
- When optimizing, explain reasoning for each change
- Provide before/after comparisons for clarity
- Ask for clarification if instructions conflict with these guidelines
- Prioritize security and maintainability over clever code
- When in doubt, follow the principle of least surprise

