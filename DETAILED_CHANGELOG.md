# Detailed Changelog

The long-form companion to `CHANGELOG.md`. Where `CHANGELOG.md` says *what*
changed in one line, this file records *why* and *how* — enough for a future
reader to audit, reproduce, or roll back any change without re-deriving it.

Add a new entry (newest first) for every meaningful change. Use the template
below; drop sections that genuinely don't apply.

---

## 2026-10-15 — Case-insensitive subdomain discovery

**Summary:** Normalize the requested domain and provider-returned names before filtering subdomain candidates across crt.sh, SSLMate, HackerTarget, and THC.

**Why:** The reported `Synottic.com` scan received 31 crt.sh entries but detected no subdomains. Matching used case-sensitive suffix comparisons before the discovery queue's existing lowercase normalization. The live crt.sh response contained nine distinct subdomains plus repeated certificates and apex-domain entries, not 31 unique hosts.

**What changed:**
- `js/dns-analyzer.js`: Trim and lowercase inputs and candidate names before existing boundary-aware suffix comparisons, wildcard collection, and queue insertion. Keep source attribution and deduplication intact.
- `dns-discovery.test.cjs`: Dependency-free Node tests with mocked network responses, including a representative 31-entry fixture using the nine names seen in the live response. Cover mixed-case inputs and results, duplicates, apex exclusion, unrelated-domain rejection, wildcard handling, HTTP failures, CORS retry, and queue processing with source preservation.
- `CHANGELOG.md`: Add the public-facing fix under Unreleased. No release/version bump or deployment file changes.

**How / commands run:**
```sh
# No Node executable was available, so use an isolated temporary runtime (no project dependency).
curl -fsSLo /tmp/opencode/node.tar.xz https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-arm64.tar.xz && tar -xJf /tmp/opencode/node.tar.xz -C /tmp/opencode
git show HEAD:js/dns-analyzer.js > /tmp/opencode/dns-analyzer-before.js
DNS_ANALYZER_PATH=/tmp/opencode/dns-analyzer-before.js /tmp/opencode/node-v22.14.0-linux-arm64/bin/node --test dns-discovery.test.cjs
# Baseline: 8 failed, 4 passed; mixed-case scan returned zero hosts.
/tmp/opencode/node-v22.14.0-linux-arm64/bin/node --test --experimental-test-coverage dns-discovery.test.cjs
# Fixed: 12 passed. All modified production lines exercised; whole analyzer line coverage 20.53%.
/tmp/opencode/node-v22.14.0-linux-arm64/bin/node --check js/dns-analyzer.js
/tmp/opencode/node-v22.14.0-linux-arm64/bin/node --check dns-discovery.test.cjs
git diff --check
aidc-scan
```

**Errors encountered & resolution:** Initial `node --version` failed because Node was not installed. Downloaded a temporary runtime outside the repository. Baseline test failures are intentional regression proof, not failures of the fix. The first whitespace check flagged existing trailing whitespace on the analyzer's final line after adding its missing newline; removed that whitespace and reran the check.

**Verification:** Twelve hermetic tests pass; changed lines are covered. Syntax and whitespace checks and security scan pass. Network inspection used `https://crt.sh/?q=%25.synottic.com&output=json`; tests do not depend on that service being available. No browser end-to-end scan or live DNS validation was performed; certificate discovery alone does not establish that a host currently resolves.

**Notes / follow-ups:** Browser-only runtime architecture is unchanged. Existing user changes were preserved. No session log was added because the repository explicitly prohibits touching `logs/`; this entry provides the session audit instead. No lint configuration or lint tool is present; Node syntax checks and the security scanner were used. Run tests on other machines with `node --test --experimental-test-coverage dns-discovery.test.cjs` (Node 22+).

---

## YYYY-MM-DD — <short title>

**Summary:** One or two sentences on what changed and the user-facing effect.

**Why:** The problem, request, or constraint that prompted this. Link the issue
/ ticket / discussion if there is one.

**What changed:**
- File-by-file or component-by-component list of the edits.

**How / commands run:**
```
# exact commands executed, with the relevant output
```

**Errors encountered & resolution:** Anything that went wrong and how it was
fixed (or why it was left as-is).

**Verification:** How the change was proven to work — tests run, scanners,
manual checks, screenshots.

**Notes / follow-ups:** Design choices, trade-offs, and anything deferred.
