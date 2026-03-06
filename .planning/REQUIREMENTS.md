# Requirements: LLMatscale.ai v1.1

**Defined:** 2026-03-06
**Core Value:** Organizations can securely deploy AI chat to their teams with full control over who can access what — models, tools, settings, and conversations — while maintaining complete data isolation between organizations.

## v1.1 Requirements

Requirements for Harden & Polish milestone. Each maps to roadmap phases.

### Admin Sidebar

- [x] **SIDE-01**: Admin sidebar collapses to icons-only mode with smooth animation
- [x] **SIDE-02**: Collapse trigger button is inside the sidebar (right side, near branding)
- [x] **SIDE-03**: Sidebar collapse state persists across page navigations (cookie-based)
- [x] **SIDE-04**: Collapsed sidebar shows tooltips on hover for each icon
- [x] **SIDE-05**: Sidebar collapse works consistently in both Super Admin and Org Admin dashboards

### Admin Navigation

- [x] **NAV-01**: Org Admin sidebar has profile expander section with Logout, Settings, Admin Console links
- [x] **NAV-02**: Admin Console has "Back to Chat" button in top-left header area
- [x] **NAV-03**: Sign Out is removed from Org Admin console (available via chat interface profile)
- [ ] **NAV-04**: Chat interface profile expander includes "Admin Console" link for org admins

### Admin Visual Polish

- [ ] **POLISH-01**: All admin pages have proper scrollbars when content overflows
- [ ] **POLISH-02**: Unwanted borders, lines, and boxes are removed across all admin pages
- [ ] **POLISH-03**: Consistent spacing, typography, and visual hierarchy across Super Admin and Org Admin
- [ ] **POLISH-04**: Admin pages match Vercel-level clean, minimal design aesthetic
- [ ] **POLISH-05**: Instructions, MCP connections, and Settings pages have improved layouts
- [ ] **POLISH-06**: All admin data tables, forms, and modals have consistent styling
- [ ] **POLISH-07**: User settings page has improved UI/UX design

### Prompt Stack

- [x] **PROMPT-01**: System prompt uses 6-layer XML-tagged structure (platform, org instructions, org restrictions, role instructions, role restrictions, user instructions)
- [x] **PROMPT-02**: Org Admin can set org-wide restriction instructions via admin UI
- [x] **PROMPT-03**: Org Admin can set role-specific restriction instructions per role
- [x] **PROMPT-04**: Restriction layers use override-prevention framing ("ABSOLUTE constraints")
- [x] **PROMPT-05**: Existing 4-layer behavior is unchanged when restriction fields are empty
- [x] **PROMPT-06**: Prompt sanitizer supports XML tag structure (does not strip XML tags used for layer separation)

### Prompt Suggestions

- [ ] **SUGG-01**: Org Admin can configure starter prompt suggestions (4-6 items) for chat welcome screen
- [ ] **SUGG-02**: Chat welcome screen displays clickable prompt suggestion cards
- [ ] **SUGG-03**: Clicking a suggestion populates the chat input (does not auto-send)
- [ ] **SUGG-04**: Default suggestions shown when org has not configured custom ones

### Chat Welcome Screen

- [ ] **WELCOME-01**: Welcome screen is extracted into a separate component from full-chat-app.tsx
- [ ] **WELCOME-02**: Model icons moved from chat sidebar to welcome screen (above greeting)
- [ ] **WELCOME-03**: Welcome screen shows org + platform logos side-by-side based on logoDisplayMode

### Login & Branding

- [ ] **LOGIN-01**: All login pages (bare domain, org login) use consistent visual design (port 3000 reference style)
- [ ] **LOGIN-02**: Org Admin can customize login page tagline via admin settings
- [ ] **LOGIN-03**: Org Admin can customize login page welcome/description text via admin settings
- [ ] **LOGIN-04**: Login page customization has live preview in admin UI

### Security Hardening

- [ ] **SEC-01**: Rate limiting on auth routes (login, register, password reset) with sliding window
- [ ] **SEC-02**: Rate limiting on API routes with configurable per-route limits
- [ ] **SEC-03**: Security headers configured (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [ ] **SEC-04**: HSTS header enabled for production
- [ ] **SEC-05**: Content-Security-Policy in report-only mode (does not break Sandpack/Mermaid/KaTeX)
- [ ] **SEC-06**: Origin header validation on mutation requests

### Tech Debt

- [ ] **DEBT-01**: Rate limiting TODO on find-org route resolved
- [ ] **DEBT-02**: console.log debug statements removed from chat route and API routes
- [ ] **DEBT-03**: TypeScript `as any` casts on tenantDb aggregates reviewed and minimized
- [ ] **DEBT-04**: Input validation audit across all API routes (Zod schemas)

### Testing & CI

- [ ] **TEST-01**: Vitest configured with path aliases, happy-dom, and TypeScript support
- [ ] **TEST-02**: Unit tests for auth middleware (session validation, org auth, super admin check)
- [ ] **TEST-03**: Unit tests for tenant isolation (org-scoped queries, cross-org prevention)
- [ ] **TEST-04**: Unit tests for prompt sanitizer and system prompt composition
- [ ] **TEST-05**: Unit tests for usage limit enforcement
- [ ] **TEST-06**: Playwright configured for E2E testing
- [ ] **TEST-07**: E2E tests for login flow (bare domain, org login)
- [ ] **TEST-08**: E2E tests for admin navigation (sidebar, profile, back-to-chat)
- [ ] **TEST-09**: GitHub Actions CI pipeline with PostgreSQL service container

### Functionality Audit

- [ ] **AUDIT-01**: Every admin UI control verified to have working backend implementation
- [ ] **AUDIT-02**: User settings controls (font size, appearance, etc.) verified functional or removed
- [ ] **AUDIT-03**: All 12 pending browser verification tests from v1.0 completed
- [ ] **AUDIT-04**: Backend-frontend mismatches documented and fixed

## v1.2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Branding

- **BRAND-01**: Background images on login pages
- **BRAND-02**: Custom email template branding with org logos
- **BRAND-03**: Per-role prompt suggestions (v1.1 is org-wide only)

### Advanced Security

- **ASEC-01**: Nonce-based CSP (requires dynamic rendering)
- **ASEC-02**: ML-based prompt injection detection
- **ASEC-03**: Visual regression testing with screenshot comparison

### UI Enhancements

- **UIE-01**: Resizable sidebar (drag to resize)
- **UIE-02**: Keyboard-driven admin navigation (Linear-style)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| OAuth/SSO login providers | v1.1 is email/password only (same as v1.0) |
| Multiple AI providers | v1.1 is Anthropic only |
| Mobile native app | Web only |
| Real-time chat between users | AI chat only |
| Billing/payment integration | Manual org management |
| Public API | Not needed for v1.1 |
| Brand colors per org | Org identity via theme + logo only (v1.0 decision) |
| Storybook | Adds complexity without proportional value at current scale |
| Redis-backed rate limiting | In-memory sufficient for single-server Docker deployment |
| CSRF tokens | Bearer token auth is inherently CSRF-immune |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROMPT-01 | Phase 8 | Complete |
| PROMPT-02 | Phase 8 | Complete |
| PROMPT-03 | Phase 8 | Complete |
| PROMPT-04 | Phase 8 | Complete |
| PROMPT-05 | Phase 8 | Complete |
| PROMPT-06 | Phase 8 | Complete |
| SIDE-01 | Phase 9 | Complete |
| SIDE-02 | Phase 9 | Complete |
| SIDE-03 | Phase 9 | Complete |
| SIDE-04 | Phase 9 | Complete |
| SIDE-05 | Phase 9 | Complete |
| NAV-01 | Phase 9 | Complete |
| NAV-02 | Phase 9 | Complete |
| NAV-03 | Phase 9 | Complete |
| NAV-04 | Phase 9 | Pending |
| POLISH-01 | Phase 9 | Pending |
| POLISH-02 | Phase 9 | Pending |
| POLISH-03 | Phase 9 | Pending |
| POLISH-04 | Phase 9 | Pending |
| POLISH-05 | Phase 9 | Pending |
| POLISH-06 | Phase 9 | Pending |
| POLISH-07 | Phase 9 | Pending |
| SUGG-01 | Phase 10 | Pending |
| SUGG-02 | Phase 10 | Pending |
| SUGG-03 | Phase 10 | Pending |
| SUGG-04 | Phase 10 | Pending |
| WELCOME-01 | Phase 10 | Pending |
| WELCOME-02 | Phase 10 | Pending |
| WELCOME-03 | Phase 10 | Pending |
| LOGIN-01 | Phase 10 | Pending |
| LOGIN-02 | Phase 10 | Pending |
| LOGIN-03 | Phase 10 | Pending |
| LOGIN-04 | Phase 10 | Pending |
| SEC-01 | Phase 11 | Pending |
| SEC-02 | Phase 11 | Pending |
| SEC-03 | Phase 11 | Pending |
| SEC-04 | Phase 11 | Pending |
| SEC-05 | Phase 11 | Pending |
| SEC-06 | Phase 11 | Pending |
| DEBT-01 | Phase 11 | Pending |
| DEBT-02 | Phase 11 | Pending |
| DEBT-03 | Phase 11 | Pending |
| DEBT-04 | Phase 11 | Pending |
| TEST-01 | Phase 12 | Pending |
| TEST-02 | Phase 12 | Pending |
| TEST-03 | Phase 12 | Pending |
| TEST-04 | Phase 12 | Pending |
| TEST-05 | Phase 12 | Pending |
| TEST-06 | Phase 12 | Pending |
| TEST-07 | Phase 12 | Pending |
| TEST-08 | Phase 12 | Pending |
| TEST-09 | Phase 12 | Pending |
| AUDIT-01 | Phase 13 | Pending |
| AUDIT-02 | Phase 13 | Pending |
| AUDIT-03 | Phase 13 | Pending |
| AUDIT-04 | Phase 13 | Pending |

**Coverage:**
- v1.1 requirements: 56 total
- Mapped to phases: 56
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation*
