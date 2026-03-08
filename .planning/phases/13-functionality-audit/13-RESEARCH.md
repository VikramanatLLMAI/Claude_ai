# Phase 13: Functionality Audit - Research

**Researched:** 2026-03-08
**Domain:** Full-stack UI control verification, browser testing, tech debt resolution
**Confidence:** HIGH

## Summary

Phase 13 is an audit and verification phase, not a feature-building phase. The work involves systematically inventorying every interactive UI control across three dashboard surfaces (Super Admin, Org Admin, User Settings), verifying each has a working backend implementation, fixing any mismatches found, completing 12 pending browser verification tests from the v1.0 milestone audit, and cleaning up 5 known tech debt items.

The application has a well-structured separation between admin pages, admin components, and API routes that makes systematic auditing feasible. The Super Admin dashboard has 10 page directories, the Org Admin dashboard has 13 page directories, and the Settings Modal has 8 tabs with approximately 20+ distinct fetch calls to various API endpoints.

**Primary recommendation:** Execute a two-pass audit (code scan then browser verification) organized by dashboard surface. Fix issues atomically as discovered. Use Playwright MCP for live browser verification rather than spec files.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Remove non-functional UI controls (buttons, toggles, forms that have no backend) -- except user settings
- User settings controls must ALL work -- if a settings control lacks backend persistence, implement the backend rather than removing the control
- Track all removed controls in the audit report's "removed controls" section for potential future implementation
- Use Playwright MCP tool (browser_navigate, browser_snapshot, browser_click, etc.) via subagents for live browser verification
- No Playwright spec files -- verify live and document results in the audit report
- Use existing dev seed data for all tests (no custom test fixtures)
- Plan must include starting the dev server (npm run dev) before browser verification steps
- Two-pass approach: (1) code-first scan to build control inventory, (2) browser verification via Playwright MCP
- Code scan: grep all admin pages and settings for interactive elements (buttons, forms, toggles, modals, dropdowns), cross-reference each with its API endpoint
- Browser verify: use Playwright MCP to navigate every page, confirm controls trigger correct backend actions
- All dashboards get equal audit depth: Super Admin, Org Admin, and user settings
- Produce a formal audit report documenting every control checked, its status (pass/fail/fixed/removed), and what was done
- Fix mismatches immediately when found -- atomic commits per fix
- Fix ALL issues regardless of size -- no deferral threshold
- Include all 5 known v1.0 tech debt items (console.log, TypeScript casts, rate limiting TODO, stale REQUIREMENTS.md entries)
- Goal: zero known issues when phase completes

### Claude's Discretion
- Exact order of pages to audit (as long as all get covered)
- How to structure the audit report format
- Whether to group fixes by page or by type
- Subagent parallelization strategy for browser tests

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUDIT-01 | Every admin UI control verified to have working backend implementation | Control inventory methodology, admin page/API route mapping, code scan patterns for interactive elements |
| AUDIT-02 | User settings controls (font size, appearance, etc.) verified functional or removed | Settings modal tab analysis (8 tabs, 20+ fetch calls), localStorage vs API persistence mapping |
| AUDIT-03 | All 12 pending browser verification tests from v1.0 completed | Explicit test list from milestone audit, Playwright MCP tool usage, dev seed data availability |
| AUDIT-04 | Backend-frontend mismatches documented and fixed | Audit report format, atomic fix workflow, tech debt item inventory |
</phase_requirements>

## Standard Stack

### Core (Existing -- No New Dependencies)
| Library | Version | Purpose | Role in Audit |
|---------|---------|---------|---------------|
| Next.js | 16.1.4 | App framework | Dev server for browser testing |
| React | 19.2.3 | UI framework | Component analysis target |
| TypeScript | 5 | Type checking | TypeScript error fixes |
| Prisma | 7.4.1 | ORM | Backend verification |

### Tools
| Tool | Purpose | When to Use |
|------|---------|-------------|
| Playwright MCP | Browser verification | Pass 2: live testing of all UI controls |
| grep/ripgrep | Code scanning | Pass 1: find interactive elements in components |
| Dev server (npm run dev) | Live application | Required before any browser testing |

### No New Dependencies
This phase adds zero new packages. All work uses existing codebase and tooling.

## Architecture Patterns

### Application Control Surface Map

The audit must cover three distinct dashboard surfaces:

```
Super Admin Dashboard (app/super-admin/)
├── page.tsx                    # Dashboard overview (KPI cards)
├── organizations/page.tsx      # Org CRUD (create, suspend, activate, restore, delete, logo, themes)
├── api-keys/page.tsx           # API key management (create, reveal, assign, delete)
├── models/page.tsx             # Model registry (add, edit, delete, toggle status)
├── users/page.tsx              # User management (view, impersonate)
├── super-admins/page.tsx       # Super Admin user management
├── analytics/page.tsx          # Analytics charts (time range filters)
├── audit-logs/page.tsx         # Audit log viewer (filter, export CSV)
├── settings/page.tsx           # Platform settings
├── system-prompt/page.tsx      # System prompt editor
└── login/page.tsx              # Super Admin login

Org Admin Dashboard (app/org/[slug]/admin/)
├── page.tsx                    # Admin overview
├── users/page.tsx              # User management (invite, suspend, force logout, force password reset, delete)
├── roles/page.tsx              # Role management (create, edit, delete, model/MCP assignment)
├── invitations/page.tsx        # Invitation management (create, resend, revoke)
├── analytics/page.tsx          # Analytics charts (time range filters)
├── audit-logs/page.tsx         # Audit log viewer (filter, export CSV)
├── conversations/page.tsx      # Conversation management (view, delete)
├── instructions/page.tsx       # System instructions editor (org-level, role-level, restrictions)
├── mcp/page.tsx                # MCP connection management
├── settings/page.tsx           # Org settings
├── security/page.tsx           # Security/password policy settings
├── branding/page.tsx           # Login page branding editor
└── usage/page.tsx              # Usage tracking

User Settings Modal (components/settings-modal.tsx - 8 tabs)
├── Profile                     # Name edit, password change
├── General                     # Default model selection
├── Appearance                  # Theme (light/dark/system), font size, code theme
├── API Keys                    # Anthropic API key (save, test, remove)
├── MCP                         # Personal MCP connections (add, edit, delete, test, discover)
├── Instructions                # Custom instructions
├── Sessions                    # Active sessions (view, revoke, revoke all others)
└── Advanced                    # Data export, delete account (if applicable)
```

### API Route Mapping

Each UI surface maps to specific API route groups:

| Dashboard | API Route Prefix | Route Count |
|-----------|-----------------|-------------|
| Super Admin | `/api/super-admin/*` | 11 subdirectories |
| Org Admin | `/api/org/[slug]/admin/*` | 15 subdirectories |
| User Settings | `/api/user/*`, `/api/org/[slug]/user/*`, `/api/org/[slug]/profile`, `/api/org/[slug]/sessions`, `/api/mcp/*`, `/api/auth/change-password` | ~10 endpoints |

### Settings Modal Persistence Patterns

The settings modal uses TWO persistence mechanisms that must both be verified:

1. **localStorage** (client-only, no API call):
   - `llmatscale_theme` - light/dark/system
   - `llmatscale_font_size` - numeric font size
   - `llmatscale_code_theme` - code block theme
   - `llmatscale_custom_instructions` - local cache of instructions

2. **API-backed** (persisted to database):
   - `/api/user/preferences` - theme mode sync (GET + PUT)
   - `/api/user/settings` - general settings
   - `/api/user/anthropic` - API key management (GET + POST)
   - `/api/user/anthropic/test` - API key validation
   - `/api/org/[slug]/profile` - user profile (GET + PUT)
   - `/api/org/[slug]/sessions` - session management (GET + DELETE)
   - `/api/org/[slug]/user/custom-instructions` - instructions (GET + PUT)
   - `/api/auth/change-password` - password change
   - `/api/mcp/connections` - MCP CRUD

**Key audit question:** Are localStorage-only settings (font size, code theme) also synced to the server? If not, they are lost on device switch. Per CONTEXT.md decision, user settings must ALL work -- implement backend persistence if missing.

### Code Scan Pattern for Interactive Elements

To build the control inventory, scan for these patterns in component files:

```
Interactive elements to find:
- <Button ... onClick={...}> or <button ...>
- <Switch ... onCheckedChange={...}>
- <form ... onSubmit={...}>
- <Select ... onValueChange={...}>
- <DropdownMenu...> with <DropdownMenuItem onClick={...}>
- <AlertDialog...> (confirmation dialogs before destructive actions)
- <Dialog...> (modal forms)
- fetch( calls within handler functions
- handleSubmit, handleSave, handleDelete, handleUpdate patterns
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser testing | Playwright spec files | Playwright MCP (browser_navigate, browser_snapshot, browser_click) | User decision: live verification, results in audit report |
| Test data | Custom fixtures | Dev seed data (npm run db:seed -- --dev) | User decision: use existing seed data |
| Control inventory | Manual list | grep/ripgrep scan of component source | Systematic, complete, repeatable |

## Common Pitfalls

### Pitfall 1: Missing API Routes That Appear Wired
**What goes wrong:** Component has a fetch() call but the API route returns 404 or 405 (wrong HTTP method).
**Why it happens:** Route file exists but handler for specific method (GET/POST/PUT/DELETE) is missing, or route path is wrong.
**How to avoid:** For each fetch() found in code scan, verify: (1) route file exists, (2) correct HTTP method exported, (3) handler returns expected shape.
**Warning signs:** Button click shows network error in browser console.

### Pitfall 2: localStorage-Only Settings Appearing Functional
**What goes wrong:** Setting appears to work (UI updates immediately) but is not persisted to server. Lost on new device or browser clear.
**Why it happens:** Developer added localStorage for instant UI response but never added API persistence.
**How to avoid:** For each settings control, verify BOTH localStorage write AND API call exist. Flag any localStorage-only settings.
**Warning signs:** Setting resets after clearing browser data.

### Pitfall 3: Admin Controls That Exist in Component But Are Hidden
**What goes wrong:** Component renders a button conditionally (e.g., based on role or feature flag) so it is never visible in browser.
**Why it happens:** Conditional rendering makes code-only scan insufficient -- must also browser-verify.
**How to avoid:** Two-pass approach catches this. Code scan finds the control; browser verify confirms visibility.

### Pitfall 4: Stale TODO Comments After Fixes
**What goes wrong:** Tech debt item was fixed but the TODO comment was not removed.
**Why it happens:** Fix was made in a different file or the TODO was in a comment block that was not part of the fix diff.
**How to avoid:** After fixing each tech debt item, grep for related TODO/FIXME/HACK comments across the codebase.

### Pitfall 5: Dev Server Not Running During Browser Tests
**What goes wrong:** Playwright MCP commands fail because no server is listening on localhost:3000.
**Why it happens:** Plan does not include explicit "start dev server" step.
**How to avoid:** First task in browser verification wave must start and verify dev server is running.

## Code Examples

### Control Inventory Scan Commands

```bash
# Find all onClick handlers in admin pages
rg "onClick=\{" app/super-admin/ app/org/\[slug\]/admin/ --type tsx -n

# Find all form submissions
rg "onSubmit=\{|handleSubmit" app/super-admin/ app/org/\[slug\]/admin/ components/settings-modal.tsx --type tsx -n

# Find all fetch calls in components
rg "fetch\(" components/admin/ components/settings-modal.tsx --type tsx -n

# Find all Switch toggles
rg "<Switch" app/super-admin/ app/org/\[slug\]/admin/ components/settings-modal.tsx --type tsx -n

# Find all API route handlers
rg "export async function (GET|POST|PUT|PATCH|DELETE)" app/api/ --type ts -n
```

### Known Tech Debt Items (5 items from CONTEXT.md)

1. **Console.log debug statements in chat route** -- verify removed (Phase 11 DEBT-02 says complete)
2. **TypeScript `as any` cast on tenantDb.usageRecord.aggregate()** -- verify minimized (Phase 11 DEBT-03 says complete)
3. **Pre-existing TypeScript error: tenantDb.artifact type unknown** -- verify fixed or documented
4. **Rate limiting TODO in find-org route** -- verify TODO removed (Phase 11 DEBT-01 says complete)
5. **3 stale REQUIREMENTS.md entries** -- update traceability table (SUI-01, OUI-01, OTHM-01-04 to complete; OBRN-02/03/04 to dropped)

### 12 Pending Browser Tests (from v1.0 Milestone Audit)

**Phase 5 tests (7):**
1. Super Admin login page renders correctly
2. Super Admin sidebar groups display with correct items
3. Organization CRUD: create dialog opens, form submits, dialog closes, table updates
4. API key management: reveal shows key, assign to org works, delete removes key
5. Analytics charts: time range filters update chart data
6. Audit log export: CSV download works
7. Old path /admin/* returns 404 (renamed to /super-admin/*)

**Phase 7 tests (5):**
8. Theme E2E: assign theme to org -> select in org admin -> verify applied in chat
9. Login page branding: tagline and welcome text appear on org login page
10. Onboarding wizard: new user sees wizard, completes steps, gains chat access
11. Impersonation session: start impersonation -> banner shows -> end impersonation
12. Cron cleanup: trigger cleanup endpoint -> verify expired data removed

## State of the Art

This phase does not introduce new technology. All patterns are established in the existing codebase.

| Aspect | Current State | Phase 13 Action |
|--------|---------------|-----------------|
| Admin UI controls | Built across Phases 2-7, 9-10 | Verify all work end-to-end |
| Settings modal | 8 tabs, 20+ API calls | Verify each control persists correctly |
| Browser tests | 12 pending from v1.0 audit | Complete all using Playwright MCP |
| Tech debt | 5 known items, most marked fixed | Verify fixes, clean up remainder |
| REQUIREMENTS.md | 9 stale entries | Update to reflect actual state |

## Open Questions

1. **Settings modal "Advanced" tab contents**
   - What we know: Tab exists in SETTINGS_TABS array
   - What's unclear: What controls are in this tab and what API endpoints they use
   - Recommendation: Code scan will reveal; fix or remove as needed per audit rules

2. **Completeness of Phase 11 tech debt fixes**
   - What we know: REQUIREMENTS.md marks DEBT-01 through DEBT-04 as complete
   - What's unclear: Whether the TODO comments and debug statements were actually removed from source
   - Recommendation: Grep for residual TODOs, console.logs, and `as any` casts during code scan

3. **Dev seed data sufficiency**
   - What we know: Seed creates 1 Super Admin + 1 sample org + 2 users
   - What's unclear: Whether all browser test scenarios can be performed with this data
   - Recommendation: Verify seed data covers all test scenarios; if not, create additional data via API during test setup (not via fixtures)

## Sources

### Primary (HIGH confidence)
- `CONTEXT.md` - Phase 13 user decisions and methodology
- `v1.0-MILESTONE-AUDIT.md` - Complete list of 12 pending browser tests and 5 tech debt items
- `REQUIREMENTS.md` - AUDIT-01 through AUDIT-04 requirement definitions
- `components/settings-modal.tsx` - Settings modal source (1590 lines, 8 tabs, 20+ fetch calls)
- `components/CLAUDE.md` - Frontend component documentation
- `CLAUDE.md` - Project architecture and structure

### Secondary (MEDIUM confidence)
- `CONCERNS.md` - Codebase concerns analysis (dated 2026-02-26, some items may be resolved)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing code
- Architecture: HIGH - well-documented codebase with clear structure
- Pitfalls: HIGH - based on direct code analysis
- Control surface map: HIGH - derived from directory listing and source code

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- audit of existing code, not evolving APIs)
