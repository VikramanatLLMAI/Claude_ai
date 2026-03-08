# Phase 13: Functionality Audit - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify every UI control in the application has a working backend implementation. Fix all backend-frontend mismatches. Complete the 12 pending browser verification tests from v1.0 milestone audit. Clean up known tech debt. The phase ends with zero known non-functional controls and a formal audit report.

</domain>

<decisions>
## Implementation Decisions

### Non-functional controls
- Remove non-functional UI controls (buttons, toggles, forms that have no backend) — except user settings
- User settings controls must ALL work — if a settings control lacks backend persistence, implement the backend rather than removing the control
- Track all removed controls in the audit report's "removed controls" section for potential future implementation

### Browser test approach
- Use Playwright MCP tool (`browser_navigate`, `browser_snapshot`, `browser_click`, etc.) via subagents for live browser verification
- No Playwright spec files — verify live and document results in the audit report
- Use existing dev seed data for all tests (no custom test fixtures)
- Plan must include starting the dev server (`npm run dev`) before browser verification steps

### Audit methodology
- Two-pass approach: (1) code-first scan to build control inventory, (2) browser verification via Playwright MCP
- Code scan: grep all admin pages and settings for interactive elements (buttons, forms, toggles, modals, dropdowns), cross-reference each with its API endpoint
- Browser verify: use Playwright MCP to navigate every page, confirm controls trigger correct backend actions
- All dashboards get equal audit depth: Super Admin, Org Admin, and user settings
- Produce a formal audit report documenting every control checked, its status (pass/fail/fixed/removed), and what was done

### Fix scope and timing
- Fix mismatches immediately when found — atomic commits per fix
- Fix ALL issues regardless of size — no deferral threshold
- Include all 5 known v1.0 tech debt items:
  1. Console.log debug statements in chat route
  2. TypeScript `as any` cast on `tenantDb.usageRecord.aggregate()`
  3. Pre-existing TypeScript error: `tenantDb.artifact` type unknown
  4. Rate limiting TODO in find-org route (now implemented in Phase 11 — verify/remove TODO)
  5. 3 stale REQUIREMENTS.md entries (SUI-01, OUI-01, OTHM-01-04 marked pending but complete; OBRN-02/03/04 marked pending but dropped)
- Goal: zero known issues when phase completes

### Claude's Discretion
- Exact order of pages to audit (as long as all get covered)
- How to structure the audit report format
- Whether to group fixes by page or by type
- Subagent parallelization strategy for browser tests

</decisions>

<specifics>
## Specific Ideas

- The 12 pending browser tests are explicitly defined in the v1.0 Milestone Audit:
  - **Phase 5 (7 tests):** Super Admin login render, sidebar groups, org CRUD + dialog state, API key reveal/assign/delete, analytics chart time ranges, audit log CSV export, old path /admin/* 404
  - **Phase 7 (5 tests):** Theme E2E flow, login page branding, onboarding wizard flow, impersonation session lifecycle, cron cleanup execution
- User wants Playwright MCP subagents to handle browser verification — not manual testing and not Playwright spec files

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `__tests__/e2e/`: Existing Playwright E2E test directory (login-flow.spec.ts, admin-navigation.spec.ts)
- `__tests__/unit/`: Existing unit tests (auth-middleware, encryption, prompt-sanitizer, system-prompt, tenant-isolation, usage-limits)
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md`: Complete list of all 12 pending browser tests with expected outcomes
- `.planning/codebase/CONCERNS.md`: Documents known tech debt and bugs

### Established Patterns
- Admin pages: `app/org/[slug]/admin/` (Org Admin) and `app/super-admin/` (Super Admin)
- Admin API routes: `app/api/org/[slug]/admin/` and `app/api/super-admin/`
- Admin components: `components/admin/` (24 components)
- User settings: `components/settings-modal.tsx` (65KB)
- Auth middleware: `requireAuth()`, `requireOrgAuth()`, `requireSuperAdmin()`

### Integration Points
- Settings modal connects to: `/api/user/preferences`, `/api/user/anthropic-key`, `/api/org/[slug]/user/`
- Admin pages connect to: `/api/org/[slug]/admin/*` and `/api/super-admin/*`
- Chat controls connect to: `/api/chat`, `/api/conversations/*`, `/api/messages/*`, `/api/artifacts/*`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-functionality-audit*
*Context gathered: 2026-03-08*
