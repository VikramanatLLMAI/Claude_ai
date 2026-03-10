---
phase: 12
slug: testing-ci
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + Playwright 1.58.2 |
| **Config file** | vitest.config.mts + playwright.config.ts (Wave 0) |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run && npx playwright test` |
| **Estimated runtime** | ~30 seconds (unit ~5s, E2E ~25s) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run && npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | TEST-01 | setup | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | TEST-02 | unit | `npx vitest run __tests__/unit/auth-middleware.test.ts` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | TEST-03 | unit | `npx vitest run __tests__/unit/tenant-isolation.test.ts` | ❌ W0 | ⬜ pending |
| 12-02-03 | 02 | 1 | TEST-04 | unit | `npx vitest run __tests__/unit/prompt-sanitizer.test.ts __tests__/unit/system-prompt-composition.test.ts` | ❌ W0 | ⬜ pending |
| 12-02-04 | 02 | 1 | TEST-05 | unit | `npx vitest run __tests__/unit/usage-limits.test.ts` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 2 | TEST-06 | setup | `npx playwright test --list` | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 2 | TEST-07 | e2e | `npx playwright test __tests__/e2e/login-flow.spec.ts` | ❌ W0 | ⬜ pending |
| 12-03-03 | 03 | 2 | TEST-08 | e2e | `npx playwright test __tests__/e2e/admin-navigation.spec.ts` | ❌ W0 | ⬜ pending |
| 12-03-04 | 03 | 2 | TEST-09 | ci | `gh workflow view ci.yml` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.mts` — Vitest configuration with happy-dom + path aliases
- [ ] `playwright.config.ts` — Playwright configuration with Chromium + webServer
- [ ] `__tests__/helpers/mock-db.ts` — Prisma mock singleton
- [ ] `__tests__/helpers/mock-auth.ts` — NextRequest factory
- [ ] `__tests__/helpers/factories.ts` — Entity factory functions
- [ ] `.github/workflows/ci.yml` — GitHub Actions workflow
- [ ] `package.json` — Add test/test:e2e scripts
- [ ] Install: `npm install -D vitest @playwright/test vite-tsconfig-paths happy-dom vitest-mock-extended`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI pipeline triggers on push | TEST-09 | GitHub Actions requires actual push | Push a commit to a branch, verify workflow triggers |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
