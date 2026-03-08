---
phase: 11
slug: security-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (Phase 12 scope) |
| **Config file** | none -- Wave 0 not needed |
| **Quick run command** | `grep -r "console.log" app/api/ \| wc -l` |
| **Full suite command** | Manual verification suite (see Per-Task map) |
| **Estimated runtime** | ~30 seconds (manual checks) |

---

## Sampling Rate

- **After every task commit:** Run quick grep checks + curl header verification
- **After every plan wave:** Full manual verification suite
- **Before `/gsd:verify-work`:** All security headers verified via curl, CSP report-only confirmed in browser
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | SEC-01 | manual | `curl -s -w '%{http_code}' -X POST localhost:3000/api/auth/login` x rapid | N/A | ⬜ pending |
| 11-01-02 | 01 | 1 | SEC-02 | manual | `curl -s -w '%{http_code}' -X POST localhost:3000/api/chat` x rapid | N/A | ⬜ pending |
| 11-01-03 | 01 | 1 | DEBT-01 | manual | Covered by SEC-01 verification | N/A | ⬜ pending |
| 11-02-01 | 02 | 1 | SEC-03 | manual | `curl -I http://localhost:3000` | N/A | ⬜ pending |
| 11-02-02 | 02 | 1 | SEC-04 | manual | Check response headers for HSTS | N/A | ⬜ pending |
| 11-02-03 | 02 | 1 | SEC-05 | manual | Browser console check for CSP violations | N/A | ⬜ pending |
| 11-02-04 | 02 | 1 | SEC-06 | manual | `curl -X POST -H "Origin: http://evil.com" localhost:3000/api/chat` | N/A | ⬜ pending |
| 11-03-01 | 03 | 2 | DEBT-02 | semi-auto | `grep -r "console.log" app/api/ \| wc -l` | N/A | ⬜ pending |
| 11-03-02 | 03 | 2 | DEBT-03 | semi-auto | `grep -r "as any" app/api/ \| wc -l` | N/A | ⬜ pending |
| 11-03-03 | 03 | 2 | DEBT-04 | manual | Review each POST/PUT/PATCH/DELETE handler for Zod | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework needed — this phase uses manual curl/browser verification and grep audits. Phase 12 will add automated test infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rate limiting returns 429 | SEC-01, SEC-02 | Requires rapid sequential requests | Send 20+ rapid POST requests to auth/API endpoints, verify 429 after threshold |
| Security headers present | SEC-03, SEC-04 | One-time header check | `curl -I localhost:3000` and verify X-Frame-Options, X-Content-Type-Options, etc. |
| CSP report-only works | SEC-05 | Browser-only verification | Open app in browser, check console for CSP violations, verify Sandpack/Mermaid/KaTeX still work |
| Origin validation blocks | SEC-06 | Requires spoofed origin | `curl -X POST -H "Origin: http://evil.com" -H "Authorization: Bearer ..." localhost:3000/api/chat` |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: manual checks after each task commit
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
