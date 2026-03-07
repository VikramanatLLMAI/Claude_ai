# Roadmap: LLMatscale.ai RBAC Multi-Tenant Platform

## Milestones

- SHIPPED **v1.0 MVP** — Phases 1-7 (shipped 2026-03-06) — [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Harden & Polish** — Phases 8-13 (in progress)

## Phases

<details>
<summary>SHIPPED v1.0 MVP (Phases 1-7) — SHIPPED 2026-03-06</summary>

- [x] Phase 1: Schema and Auth Foundation (3/3 plans) — completed 2026-02-26
- [x] Phase 2: Organization Management and Invitations (4/4 plans) — completed 2026-02-27
- [x] Phase 3: Chat Integration and Core RBAC (15/15 plans) — completed 2026-02-28
- [x] Phase 4: Role Configuration and Usage Limits (14/14 plans) — completed 2026-03-03
- [x] Phase 5: Super Admin Dashboard (11/11 plans) — completed 2026-03-04
- [x] Phase 6: Org Admin Dashboard (8/8 plans) — completed 2026-03-05
- [x] Phase 7: Theming, Branding, and Compliance (7/7 plans) — completed 2026-03-05

**Total: 7 phases, 62 plans, 192/192 requirements complete**
**Archives:** [Roadmap](milestones/v1.0-ROADMAP.md) | [Requirements](milestones/v1.0-REQUIREMENTS.md) | [Audit](milestones/v1.0-MILESTONE-AUDIT.md)

</details>

### v1.1 Harden & Polish (In Progress)

**Milestone Goal:** Elevate both admin dashboards and user settings to production-grade SaaS quality with Vercel-level polish, add 6-layer prompt stack with restrictions, prompt suggestions, login customization, and harden with security, testing, and a full functionality audit.

- [x] **Phase 8: Schema & Prompt Stack** - Add restriction layers to the prompt system and schema fields for suggestions (2/2 plans complete)
- [x] **Phase 9: Admin UI Overhaul** - Collapsible sidebar, navigation rework, and visual polish across all admin pages (6/6 plans complete)
- [ ] **Phase 10: Prompt Suggestions, Login Polish & Chat Welcome** - Starter prompts, login customization UI, and welcome screen improvements
- [ ] **Phase 11: Security Hardening** - Rate limiting, security headers, input validation, and tech debt cleanup
- [ ] **Phase 12: Testing & CI** - Vitest unit tests, Playwright E2E tests, and GitHub Actions pipeline
- [ ] **Phase 13: Functionality Audit** - Verify every UI control works end-to-end, fix mismatches, complete pending tests

## Phase Details

### Phase 8: Schema & Prompt Stack
**Goal**: The system prompt composes 6 XML-tagged layers with org and role restriction enforcement, and the database supports prompt suggestions and restriction fields
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: PROMPT-01, PROMPT-02, PROMPT-03, PROMPT-04, PROMPT-05, PROMPT-06
**Success Criteria** (what must be TRUE):
  1. System prompt sent to Anthropic API contains 6 distinct XML-tagged sections (platform, org instructions, org restrictions, role instructions, role restrictions, user instructions)
  2. Org Admin can edit org-wide restriction instructions from the admin UI and they appear in the composed prompt
  3. Org Admin can edit role-specific restriction instructions per role and they appear in the composed prompt
  4. When restriction fields are left empty, the prompt behaves identically to the existing 4-layer system
  5. Prompt sanitizer does not strip the XML tags used for layer separation
**Plans:** 2 plans

Plans:
- [x] 08-01-PLAN.md — Schema fields, 6-layer prompt composition, restriction CRUD service, API endpoints, chat route wiring
- [x] 08-02-PLAN.md — Restriction textareas in admin UI (collapsible), Enhance button on all prompt surfaces

### Phase 9: Admin UI Overhaul
**Goal**: Both admin dashboards have a collapsible sidebar, improved navigation, and Vercel-level visual polish across every page
**Depends on**: Phase 8
**Requirements**: SIDE-01, SIDE-02, SIDE-03, SIDE-04, SIDE-05, NAV-01, NAV-02, NAV-03, NAV-04, POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05, POLISH-06, POLISH-07
**Success Criteria** (what must be TRUE):
  1. Admin sidebar collapses to icons-only mode with smooth animation, persists state across navigations, and shows tooltips on hover -- in both Super Admin and Org Admin dashboards
  2. Org Admin sidebar has a profile expander with Logout, Settings, and Admin Console links; Admin Console has a "Back to Chat" button in the top-left header
  3. All admin pages scroll properly when content overflows, with no unwanted borders or visual artifacts
  4. Admin pages have consistent spacing, typography, and visual hierarchy matching a clean minimal design aesthetic
  5. User settings page has improved UI/UX design with consistent styling
**Plans:** 6 plans

Plans:
- [x] 09-01-PLAN.md — Sidebar collapse with icon mode, profile expanders, AdminPageHeader component, layout cleanup
- [x] 09-02-PLAN.md — Visual polish across all 20 admin pages (headers, layouts, scroll), Admin Console link in chat dropdown
- [x] 09-03-PLAN.md — Settings modal UI/UX polish across all 8 tabs
- [x] 09-04-PLAN.md — Fix collapsed sidebar profile menu (popover), footer layout, session lastUsedAt timestamps
- [x] 09-05-PLAN.md — Settings modal UX improvements (default tab, labels, bulk revoke, unknown device display)
- [x] 09-06-PLAN.md — Gap closure: session timestamp backfill and null-safe UI fallback

### Phase 10: Prompt Suggestions, Login Polish & Chat Welcome
**Goal**: Chat welcome screen shows clickable starter prompts and org branding, and login pages have consistent design with admin-customizable text
**Depends on**: Phase 8 (schema for suggestions), Phase 9 (stable admin layout for new settings sections)
**Requirements**: SUGG-01, SUGG-02, SUGG-03, SUGG-04, WELCOME-01, WELCOME-02, WELCOME-03, LOGIN-01, LOGIN-02, LOGIN-03, LOGIN-04
**Success Criteria** (what must be TRUE):
  1. Org Admin can configure 4-6 starter prompt suggestions from the admin UI, and they appear as clickable cards on the chat welcome screen
  2. Clicking a suggestion card populates the chat input without auto-sending; default suggestions appear when no custom ones are configured
  3. Welcome screen is a separate component showing model icons above the greeting and org + platform logos side-by-side based on logoDisplayMode
  4. All login pages (bare domain and org login) share a consistent visual design, and Org Admin can customize tagline and welcome text with live preview in admin settings
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD
- [ ] 10-03: TBD

### Phase 11: Security Hardening
**Goal**: All API routes have rate limiting and input validation, security headers are configured, and tech debt is cleaned up
**Depends on**: Phase 10 (all features complete before locking down with security)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, DEBT-01, DEBT-02, DEBT-03, DEBT-04
**Success Criteria** (what must be TRUE):
  1. Auth routes (login, register, password reset) and API routes enforce rate limits with sliding window, returning 429 when exceeded
  2. Production responses include X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and HSTS headers
  3. Content-Security-Policy is active in report-only mode without breaking Sandpack live preview, Mermaid diagrams, or KaTeX rendering
  4. Mutation requests validate Origin header; all API routes have Zod input validation
  5. Debug console.log statements are removed from API routes, and tenantDb aggregate casts are reviewed and minimized
**Plans**: TBD

Plans:
- [ ] 11-01: TBD
- [ ] 11-02: TBD

### Phase 12: Testing & CI
**Goal**: The project has automated unit tests for critical paths, E2E tests for key flows, and a CI pipeline that runs on every push
**Depends on**: Phase 11 (all features and security complete before writing tests)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09
**Success Criteria** (what must be TRUE):
  1. Vitest runs with path aliases, happy-dom, and TypeScript support; unit tests pass for auth middleware, tenant isolation, prompt sanitizer/composition, and usage limit enforcement
  2. Playwright is configured and E2E tests pass for login flow (bare domain + org login) and admin navigation (sidebar collapse, profile expander, back-to-chat)
  3. GitHub Actions CI pipeline runs unit tests with a PostgreSQL service container on every push, and Playwright tests on pull requests
**Plans**: TBD

Plans:
- [ ] 12-01: TBD
- [ ] 12-02: TBD
- [ ] 12-03: TBD

### Phase 13: Functionality Audit
**Goal**: Every UI control in the application has verified working backend implementation, and all pending v1.0 browser tests are complete
**Depends on**: Phase 12 (all features, security, and tests in place)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04
**Success Criteria** (what must be TRUE):
  1. Every admin UI control (buttons, toggles, forms, modals) has been verified to trigger the correct backend action and display the result
  2. User settings controls (font size, appearance, etc.) are verified functional or removed if non-functional
  3. All 12 pending browser verification tests from v1.0 are completed and passing
  4. All discovered backend-frontend mismatches are documented and fixed
**Plans**: TBD

Plans:
- [ ] 13-01: TBD
- [ ] 13-02: TBD

## Progress

**Execution Order:** Phases 8 -> 9 -> 10 -> 11 -> 12 -> 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Schema and Auth Foundation | v1.0 | 3/3 | Complete | 2026-02-26 |
| 2. Organization Management and Invitations | v1.0 | 4/4 | Complete | 2026-02-27 |
| 3. Chat Integration and Core RBAC | v1.0 | 15/15 | Complete | 2026-02-28 |
| 4. Role Configuration and Usage Limits | v1.0 | 14/14 | Complete | 2026-03-03 |
| 5. Super Admin Dashboard | v1.0 | 11/11 | Complete | 2026-03-04 |
| 6. Org Admin Dashboard | v1.0 | 8/8 | Complete | 2026-03-05 |
| 7. Theming, Branding, and Compliance | v1.0 | 7/7 | Complete | 2026-03-05 |
| 8. Schema & Prompt Stack | v1.1 | 2/2 | Complete | 2026-03-06 |
| 9. Admin UI Overhaul | v1.1 | 3/5 | Gap closure | - |
| 10. Prompt Suggestions, Login Polish & Chat Welcome | v1.1 | 0/3 | Not started | - |
| 11. Security Hardening | v1.1 | 0/2 | Not started | - |
| 12. Testing & CI | v1.1 | 0/3 | Not started | - |
| 13. Functionality Audit | v1.1 | 0/2 | Not started | - |
