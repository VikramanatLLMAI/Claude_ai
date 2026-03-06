# Architecture Patterns: v1.1 Harden & Polish

**Domain:** Admin UI overhaul, prompt stack enhancement, login customization, testing & security hardening
**Researched:** 2026-03-06
**Overall Confidence:** HIGH (all recommendations based on direct codebase analysis of existing patterns)

---

## 1. Sidebar Component Refactor (Icons-Only Collapse)

### Current State

- `components/admin/admin-sidebar.tsx` (9KB) renders both Super Admin and Org Admin variants via a `variant` prop
- Uses `components/ui/sidebar.tsx` (24KB) which already has full collapse infrastructure:
  - `SidebarContext` with `state: "expanded" | "collapsed"`, `open`, `toggleSidebar()`
  - `SIDEBAR_WIDTH_ICON = "3rem"` constant for collapsed state
  - `SidebarMenuButton` already accepts `tooltip` prop (shows tooltip when collapsed)
  - Cookie-based persistence (`sidebar_state`)
  - Keyboard shortcut support (`Ctrl+B`)
- Both layouts (`app/super-admin/layout.tsx`, `app/org/[slug]/admin/layout.tsx`) use `<SidebarProvider>` + `<AdminSidebar>` + `<SidebarInset>`

### Recommended Architecture

**Do NOT create separate sidebar components.** The existing `AdminSidebar` already handles both variants. Refactor in-place.

#### Changes to `components/admin/admin-sidebar.tsx`:

1. **Add `SidebarTrigger` inside the sidebar** -- the UI component already exports this. Place it in the `SidebarHeader` as a collapse/expand button.

2. **Ensure icon-only mode works** -- the `SidebarMenuButton` already passes `tooltip={item.label}` which shows on collapsed state. The existing `<Icon>` + `<span>` pattern inside `SidebarMenuButton` auto-hides the span when collapsed (CSS-driven via `group-data-[collapsible=icon]`).

3. **Header collapse** -- in collapsed state, replace org name / "LLMatscale.ai" text with just the icon. Use `useSidebar()` hook to read `state`.

4. **Footer collapse** -- hide user name/email text, show avatar/icon only. The "Back to Chat" and "Sign Out" buttons become icon-only with tooltips.

```
Component hierarchy (unchanged):
  SidebarProvider (layout)
    AdminSidebar (existing, refactored)
      Sidebar
        SidebarHeader  <- Add SidebarTrigger here
        SidebarContent <- Already works with collapse (CSS)
        SidebarFooter  <- Conditional text visibility
    SidebarInset
      AdminBreadcrumb (Org Admin only)
      {children}
```

#### No layout changes needed:
- `app/super-admin/layout.tsx` -- no changes
- `app/org/[slug]/admin/layout.tsx` -- no changes
- Both already use `SidebarProvider` which manages collapse state

#### Org Admin Navigation Updates (from PROJECT.md):
- **Add**: Profile expander in footer (Logout / Settings / Admin Console links)
- **Move**: "Back to Chat" to top-left of sidebar header
- **Remove**: Sign Out button from footer (moved into profile expander)
- **Admin Console view**: Remove "Sign Out", keep "Back to Chat" top-left

### Files Modified

| File | Change |
|------|--------|
| `components/admin/admin-sidebar.tsx` | Add SidebarTrigger, conditional text for collapsed state, profile expander |

### Files NOT Modified

| File | Why |
|------|-----|
| `components/ui/sidebar.tsx` | Already has full collapse infrastructure |
| `app/super-admin/layout.tsx` | Already uses SidebarProvider |
| `app/org/[slug]/admin/layout.tsx` | Already uses SidebarProvider |

---

## 2. Schema Changes: Org/Role Restrictions & Prompt Suggestions

### 2A. Org Restrictions (New Field on OrgSettings)

The 6-layer prompt stack adds two new layers between existing layers:

```
Current 4-layer:                    New 6-layer:
1. Platform instructions            1. Platform instructions
2. Org instructions                  2. Org instructions
                                     3. Org restrictions (NEW)
3. Role instructions                 4. Role instructions
                                     5. Role restrictions (NEW)
4. User context                      6. User context
```

**Where restrictions live in schema:**

Add to `OrgSettings` model:
```prisma
orgRestrictions        String?  @map("org_restrictions") @db.Text
orgRestrictionsMaxLength Int    @default(2000) @map("org_restrictions_max_length")
```

**Rationale:** `OrgSettings` already holds `systemInstructions` (org instructions layer). Restrictions are a separate semantic concept ("what NOT to do") vs instructions ("what TO do"), so a separate field is appropriate. Same model, different field.

### 2B. Role Restrictions (New Field on Role)

Add to `Role` model:
```prisma
restrictions           String?  @map("restrictions") @db.Text
restrictionsMaxLength  Int      @default(1000) @map("restrictions_max_length")
```

**Rationale:** `Role` already holds `systemInstructions` (role instructions layer). Same pattern -- separate field for restrictions.

### 2C. Prompt Suggestions (New Field on OrgSettings)

Prompt suggestions are org-level configuration displayed on the chat welcome screen. They do NOT need a separate model.

Add to `OrgSettings` model:
```prisma
promptSuggestions      Json     @default("[]") @map("prompt_suggestions")
```

**Rationale against a separate model:**
- Prompt suggestions are a simple list of strings (or objects with `title` + `prompt`)
- They are org-level, not role-scoped or user-scoped
- A separate `PromptSuggestion` model would add a join, migration complexity, and CRUD overhead for what is fundamentally a JSON array
- Pattern matches `activeMcpIds` on Conversation (Json array) and `permissions` on Role (Json array)

**Data shape:**
```typescript
interface PromptSuggestion {
  title: string;     // Short display text (e.g., "Summarize a document")
  prompt: string;    // Full prompt text sent to chat
}
// Stored as Json: [{ title: "...", prompt: "..." }, ...]
```

### 2D. Login Page Customization (Existing Fields Sufficient)

`OrgSettings` already has:
- `loginTagline` (String?, max 100 chars)
- `loginWelcomeMessage` (String?, max 500 chars, @db.Text)

The existing login page customization API (`/api/org/[slug]/admin/settings/login-page`) already handles GET and PUT for these fields.

**No new schema fields needed for login customization.** The v1.1 work is purely UI/UX -- making the existing data render with more polish and consistency.

### Complete Schema Diff

```prisma
// OrgSettings additions:
model OrgSettings {
  // ... existing fields ...
+ orgRestrictions          String?  @map("org_restrictions") @db.Text
+ orgRestrictionsMaxLength Int      @default(2000) @map("org_restrictions_max_length")
+ promptSuggestions        Json     @default("[]") @map("prompt_suggestions")
}

// Role additions:
model Role {
  // ... existing fields ...
+ restrictions             String?  @map("restrictions") @db.Text
+ restrictionsMaxLength    Int      @default(1000) @map("restrictions_max_length")
}
```

**Migration approach:** `db:push` (consistent with v1.0 pattern, all new fields are nullable or have defaults -- no data loss).

---

## 3. XML Prompt Assembly Changes

### Current State

`lib/services/system-prompt-service.ts` has `composeSystemPrompt()` that builds a 4-layer XML-tagged string:

```xml
<platform-instructions>...</platform-instructions>
<org-instructions>...</org-instructions>
<role-instructions>...</role-instructions>
<user-context>...</user-context>
```

### Recommended Changes

#### Update `PromptLayers` interface:

```typescript
export interface PromptLayers {
  orgInstructions: string | null;
  orgRestrictions: string | null;        // NEW
  roleInstructions: string | null;
  roleRestrictions: string | null;       // NEW
  userName: string;
  roleName: string;
  userCustomInstructions: string | null;
  customInstructionsEnabled: boolean;
}
```

#### Update `composeSystemPrompt()`:

Insert two new XML blocks between existing layers. Each uses `sanitizePromptLayer()` (already exists):

```xml
<platform-instructions>...</platform-instructions>
<org-instructions>...</org-instructions>
<org-restrictions>...</org-restrictions>       <!-- NEW Layer 3 -->
<role-instructions>...</role-instructions>
<role-restrictions>...</role-restrictions>     <!-- NEW Layer 5 -->
<user-context>...</user-context>
```

#### Update chat route (`app/api/chat/route.ts`):

The chat route already fetches `orgSettings` and `role`. Add the two new fields to the `composeSystemPrompt()` call:

```typescript
// Line ~198 - already fetches orgSettings
const systemPrompt = composeSystemPrompt(
  toolNames,
  mcpToolDescriptions,
  {
    orgInstructions: orgSettings?.systemInstructions || null,
    orgRestrictions: orgSettings?.orgRestrictions || null,    // NEW
    roleInstructions: role.systemInstructions || null,
    roleRestrictions: role.restrictions || null,               // NEW
    userName: user.name,
    roleName: role.name,
    userCustomInstructions: orgMember.customInstructions || null,
    customInstructionsEnabled: role.customInstructionsEnabled,
  }
);
```

#### Admin UI for editing restrictions:

Reuse `instruction-editor.tsx` component -- it is a generic textarea with token counter. The restrictions editor is semantically different (label, placeholder text) but functionally identical.

| Where | What to add |
|-------|-------------|
| `app/org/[slug]/admin/instructions/page.tsx` | Org Restrictions textarea below Org Instructions |
| `components/admin/role-form-modal.tsx` | Role Restrictions tab/section alongside existing Role Instructions |
| `app/api/org/[slug]/admin/instructions/route.ts` | Accept `orgRestrictions` in PATCH |
| `app/api/org/[slug]/admin/roles/[roleId]/instructions/route.ts` | Accept `restrictions` in PATCH |

### Files Modified

| File | Change |
|------|--------|
| `lib/services/system-prompt-service.ts` | Add layers 3 and 5 to `composeSystemPrompt()`, update `PromptLayers` |
| `app/api/chat/route.ts` | Pass restriction layers, add rate limiting |
| `app/api/org/[slug]/admin/instructions/route.ts` | Accept/return `orgRestrictions` |
| `app/api/org/[slug]/admin/roles/[roleId]/instructions/route.ts` | Accept/return `restrictions` |
| `app/org/[slug]/admin/instructions/page.tsx` | Add Org Restrictions editor |
| `components/admin/role-form-modal.tsx` | Add Role Restrictions input |

---

## 4. Prompt Suggestions Data Flow

### Architecture

```
Org Admin UI
  |
  | PUT /api/org/[slug]/admin/settings/prompt-suggestions
  |   (saves JSON array to OrgSettings.promptSuggestions)
  |
  v
OrgSettings.promptSuggestions (Json)
  |
  | GET /api/org/[slug]/models (existing endpoint, add field)
  |
  v
Chat Welcome Screen (full-chat-app.tsx)
  |
  | User clicks suggestion -> injects into chat input
  v
```

### Recommended Approach: Bundle with Models API

Instead of a separate API endpoint for reading, add `promptSuggestions` to the existing `GET /api/org/[slug]/models` response. This endpoint is already called on chat page load and returns org-scoped data. One fewer network request.

```typescript
// In GET /api/org/[slug]/models/route.ts
const orgSettings = await prisma.orgSettings.findUnique({
  where: { organizationId: auth.organization.id },
  select: { /* existing fields */ promptSuggestions: true },
});

return NextResponse.json({
  models: [...],
  defaultModel: ...,
  isOrgAdmin: ...,
  promptSuggestions: orgSettings?.promptSuggestions ?? [],  // NEW
});
```

### Admin UI

New section in `app/org/[slug]/admin/settings/page.tsx` -- the Org Settings page already handles logo, login page, theme, onboarding, and API keys. Add a "Chat Welcome Screen" or "Prompt Suggestions" section.

### New API Route for Admin CRUD

```
GET  /api/org/[slug]/admin/settings/prompt-suggestions  -> return current suggestions
PUT  /api/org/[slug]/admin/settings/prompt-suggestions  -> update suggestions array
```

Uses `requireOrgAdmin`. Validates JSON array structure with Zod. Audit-logs changes.

### Files Modified/Created

| File | Change |
|------|--------|
| `app/api/org/[slug]/models/route.ts` | Include `promptSuggestions` in response |
| `app/api/org/[slug]/admin/settings/prompt-suggestions/route.ts` | **NEW** -- CRUD for suggestions |
| `app/org/[slug]/admin/settings/page.tsx` | Add Prompt Suggestions editor section |
| `components/full-chat-app.tsx` | Render suggestions on welcome screen |

---

## 5. Login Page Customization Data Model

### Current State (Already Sufficient)

Schema fields exist:
- `OrgSettings.loginTagline` (String?, max 100)
- `OrgSettings.loginWelcomeMessage` (String?, max 500)

API exists:
- `GET/PUT /api/org/[slug]/admin/settings/login-page`

Server component exists:
- `app/org/[slug]/login/page.tsx` fetches tagline and welcomeMessage from DB

Client component exists:
- `components/org-login-page.tsx` receives and renders org branding

### What v1.1 Needs (UI Only)

No schema or API changes. The work is:

1. **Login page visual consistency** -- port the port 3000 style (the bare-domain login) as reference design
2. **Org Admin settings UI** -- the Settings page (`app/org/[slug]/admin/settings/page.tsx`) already has a login page customization section; enhance its UX
3. **OrgLoginPage component** -- improve layout, typography, spacing for the tagline and welcome message display

### Potential Future Fields (NOT for v1.1)

If more login customization is needed later:
- `loginBackgroundColor` (brand color) -- currently deferred per PROJECT.md ("Brand colors dropped for theme + logo")
- `loginCustomCss` -- avoid; security risk
- `loginFooterText` -- could be added to OrgSettings if needed

### Files Modified

| File | Change |
|------|--------|
| `components/org-login-page.tsx` | Visual polish, layout consistency |
| `app/org/[slug]/admin/settings/page.tsx` | Enhanced login preview/editor UI |

---

## 6. Testing Architecture

### Test File Organization

```
__tests__/                           # Top-level test directory
  unit/                              # Unit tests (no DB, no network)
    lib/
      prompt-sanitizer.test.ts       # Pure function tests
      system-prompt-service.test.ts  # composeSystemPrompt() composition
      encryption.test.ts             # encrypt/decrypt roundtrip
      validation.test.ts             # Zod schema tests
      context-window.test.ts         # Context fitting logic
      token-counter.test.ts          # Token counting
    services/
      usage-service.test.ts          # Limit calculation logic
      password-validation.test.ts    # Password policy checks
  integration/                       # Integration tests (DB required)
    api/
      auth/
        login.test.ts                # Login flow
        register.test.ts             # Invitation acceptance
      chat/
        route.test.ts                # Chat endpoint (mocked Anthropic)
      org/
        models.test.ts               # Model access filtering
        admin/
          users.test.ts              # User management
          roles.test.ts              # Role CRUD
    middleware/
      auth-middleware.test.ts        # requireAuth, requireOrgAuth, requireSuperAdmin
      tenant-isolation.test.ts       # Cross-org data isolation
  e2e/                               # End-to-end (browser, full stack)
    login.spec.ts                    # Login flow
    chat.spec.ts                     # Send message, receive response
    admin.spec.ts                    # Admin navigation, user management
```

### Test Boundaries

| Layer | Tests | Mocks | Runner |
|-------|-------|-------|--------|
| **Unit** | Pure functions, transformations, calculations | Everything external | Vitest |
| **Integration** | API routes, middleware, DB operations | Anthropic API only | Vitest + test DB |
| **E2E** | Full user flows through browser | Nothing (real stack) | Playwright |

### Recommended Test Framework

**Vitest** for unit + integration because:
- Native ESM support (Next.js 16 is ESM)
- Same config format as Vite (team familiarity)
- Built-in mocking, coverage, watch mode
- Compatible with Next.js App Router via `@vitejs/plugin-react`

**Playwright** for E2E because:
- Multi-browser support
- Built-in auto-waiting
- Supports streaming responses (important for chat testing)
- Good CI integration

### Integration Test Database Strategy

Use a separate PostgreSQL database (`llmatscale_test`) with:
1. `prisma db push` before test suite
2. Transaction rollback per test (fast cleanup)
3. Seed minimal fixtures per test file

### CI Pipeline

```yaml
# .github/workflows/ci.yml
jobs:
  lint:
    - npm run lint
  unit-test:
    - npx vitest run --coverage __tests__/unit/
  integration-test:
    services:
      postgres: { image: postgres:16 }
    - DATABASE_URL=... npx vitest run __tests__/integration/
  e2e-test:
    services:
      postgres: { image: postgres:16 }
    - npm run build && npm start &
    - npx playwright test
```

### Config Files Created

| File | Purpose |
|------|---------|
| `vitest.config.ts` | **NEW** -- Vitest configuration with path aliases |
| `playwright.config.ts` | **NEW** -- Playwright configuration |
| `.github/workflows/ci.yml` | **NEW** -- CI pipeline |

### Priority Order for Tests

1. **Auth middleware** (security-critical, highest ROI)
2. **Tenant isolation** (data leak prevention)
3. **Prompt sanitizer** (injection prevention)
4. **Usage limit enforcement** (business logic)
5. **Chat route** (core feature, integration test with mocked Anthropic)

---

## 7. Security Middleware Placement

### Current State

Auth is enforced at the **route handler level** (not Next.js middleware). This is intentional per CVE-2025-29927 defense-in-depth (noted in PROJECT.md decisions).

```
Request -> Next.js Route Handler -> requireAuth/requireOrgAuth/requireSuperAdmin -> Business Logic
```

### What Needs Hardening (NOT Restructuring)

The auth placement is correct. v1.1 security hardening adds layers **around** it, not replacing it.

#### A. Rate Limiting

**Where:** New utility in `lib/rate-limiter.ts`, called at the top of rate-limited route handlers.

**Implementation:** In-memory sliding window (Map-based) for self-hosted deployment. No Redis dependency needed at current scale (5-20 orgs).

```typescript
// lib/rate-limiter.ts
export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; retryAfter?: number }
```

**Applied to routes:**
| Route | Limit | Window | Key |
|-------|-------|--------|-----|
| `POST /api/auth/login` | 10 | 15 min | IP |
| `POST /api/auth/find-org` | 20 | 15 min | IP |
| `POST /api/auth/password-reset` | 5 | 15 min | IP |
| `POST /api/chat` | 60 | 1 min | userId |

**Pattern:**
```typescript
export async function POST(req: NextRequest) {
  const ip = getIpAddress(req);
  const limit = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }
  // ... existing handler
}
```

#### B. Security Headers

**Where:** `next.config.ts` (or `next.config.js`) via `headers()` config. NOT middleware.

```typescript
// next.config.ts
headers: async () => [{
  source: '/(.*)',
  headers: [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
  ],
}],
```

#### C. Input Validation Hardening

**Where:** Existing pattern -- Zod schemas in `lib/validation.ts` + per-route validation. Add missing schemas.

**Routes needing Zod validation audit:**
- All `PATCH` routes that accept body JSON
- File upload routes (size limits already enforced, add content-type validation)
- MCP connection URLs (validate URL format, block internal IPs)

#### D. CSRF Protection

**Where:** Not needed for bearer-token API. Bearer token in `Authorization` header is inherently CSRF-resistant -- browsers do not auto-attach custom headers in cross-origin requests.

The login form uses `POST` with JSON body + no cookies for auth = no CSRF vector.

### Files Created/Modified

| File | Change |
|------|--------|
| `lib/rate-limiter.ts` | **NEW** -- In-memory sliding window rate limiter |
| `next.config.ts` | Add security headers |
| `app/api/auth/login/route.ts` | Add rate limiting |
| `app/api/auth/find-org/route.ts` | Add rate limiting |
| `app/api/auth/password-reset/route.ts` | Add rate limiting |
| `app/api/chat/route.ts` | Add rate limiting |
| `lib/validation.ts` | Add missing Zod schemas |

---

## 8. Suggested Build Order

Based on dependency analysis of the changes above:

### Phase 1: Schema + Prompt Stack (Foundation)

**Why first:** All other features depend on schema being in place.

1. Add schema fields (OrgSettings: `orgRestrictions`, `promptSuggestions`; Role: `restrictions`)
2. Run `db:push`
3. Update `composeSystemPrompt()` to 6-layer
4. Update chat route to pass new fields
5. Add restriction editor UI (reuse `instruction-editor.tsx`)
6. Add restriction CRUD API endpoints

**Dependencies downstream:** Prompt suggestions UI, admin page layouts

### Phase 2: Admin UI Overhaul (Sidebar + Layouts)

**Why second:** Structural UI changes that affect all admin pages. Do before adding new content to pages.

1. Refactor `AdminSidebar` with collapse trigger, profile expander, nav changes
2. Visual cleanup across all admin pages (scrollbars, borders, spacing)
3. Relayout admin pages as needed
4. User settings page UI improvements

**Dependencies downstream:** None blocked, but better to have layout stable before adding prompt suggestion editor

### Phase 3: Prompt Suggestions + Login + Chat Welcome

**Why third:** Builds on stable schema (Phase 1) and stable admin layout (Phase 2).

1. Prompt suggestions admin CRUD API
2. Prompt suggestions editor in Org Admin settings
3. Chat welcome screen: render suggestions, model icons, side-by-side logos
4. Login page visual consistency and polish

### Phase 4: Security Hardening

**Why fourth:** Non-breaking additions that wrap existing handlers.

1. Rate limiter utility
2. Apply rate limits to auth routes and chat
3. Security headers in next.config.ts
4. Input validation audit (missing Zod schemas)
5. Debug log cleanup (remove `console.log` statements in chat route)
6. Fix remaining TypeScript `as any` casts where possible

### Phase 5: Testing & CI

**Why last:** Tests validate the completed features. Writing tests before features are stable wastes effort on test maintenance.

1. Vitest config + path aliases
2. Unit tests (prompt sanitizer, system prompt composition, encryption, validation)
3. Integration tests (auth middleware, tenant isolation, usage limits)
4. Playwright config
5. E2E tests (login, chat, admin navigation)
6. CI pipeline (.github/workflows)

### Phase 6: Functionality Audit

**Why last:** Cross-cutting verification after all features are built.

1. Walk every admin UI control, verify backend responds correctly
2. Document any broken or unconnected controls
3. Fix discovered issues
4. Manual browser testing checklist completion (12 pending from v1.0)

---

## 9. Component Hierarchy Summary

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| (none needed) | -- | All v1.1 features use existing components or modify them |

### Modified Components

| Component | Change |
|-----------|--------|
| `components/admin/admin-sidebar.tsx` | Collapse trigger, profile expander, nav restructure |
| `components/full-chat-app.tsx` | Prompt suggestions rendering, model icons on welcome, logo layout |
| `components/org-login-page.tsx` | Visual polish |
| `components/admin/role-form-modal.tsx` | Role restrictions tab |

### New API Routes

| Route | Purpose |
|-------|---------|
| `app/api/org/[slug]/admin/settings/prompt-suggestions/route.ts` | Prompt suggestions CRUD |

### Modified API Routes

| Route | Change |
|-------|--------|
| `app/api/chat/route.ts` | Pass restriction layers, add rate limiting |
| `app/api/org/[slug]/models/route.ts` | Include promptSuggestions in response |
| `app/api/org/[slug]/admin/instructions/route.ts` | Accept/return `orgRestrictions` |
| `app/api/org/[slug]/admin/roles/[roleId]/instructions/route.ts` | Accept/return `restrictions` |
| `app/api/auth/login/route.ts` | Add rate limiting |
| `app/api/auth/find-org/route.ts` | Add rate limiting |

### New Library Files

| File | Purpose |
|------|---------|
| `lib/rate-limiter.ts` | In-memory sliding window rate limiter |
| `vitest.config.ts` | Test configuration |
| `playwright.config.ts` | E2E test configuration |

---

## 10. Anti-Patterns to Avoid

### Anti-Pattern 1: Next.js Middleware for Auth
**What:** Moving auth checks from route handlers to `middleware.ts`
**Why bad:** CVE-2025-29927 demonstrated middleware bypass. The codebase explicitly chose route-handler-level auth.
**Instead:** Keep `requireAuth/requireOrgAuth/requireSuperAdmin` at handler level. Use `next.config.ts` headers for security headers only.

### Anti-Pattern 2: Separate Sidebar Components per Admin Type
**What:** Creating `SuperAdminSidebar` and `OrgAdminSidebar` as distinct components
**Why bad:** Duplicated collapse logic, tooltip logic, footer logic. The existing `variant` prop pattern works.
**Instead:** Keep single `AdminSidebar` with `variant` prop. Shared collapse behavior.

### Anti-Pattern 3: Prompt Suggestions as a Separate DB Model
**What:** Creating a `PromptSuggestion` model with id, orgId, title, prompt, sortOrder, etc.
**Why bad:** Over-engineering for a JSON array. Adds migration, relation, CRUD complexity for 3-8 items per org.
**Instead:** Json field on OrgSettings. Validate with Zod on save.

### Anti-Pattern 4: Redis for Rate Limiting
**What:** Adding Redis dependency for rate limiting
**Why bad:** Over-engineering for 5-20 orgs self-hosted. Adds infrastructure complexity.
**Instead:** In-memory Map with periodic cleanup. If scaling past ~1000 concurrent users, revisit.

### Anti-Pattern 5: Testing the Chat Route with Real Anthropic API
**What:** Integration tests that hit the real Anthropic API
**Why bad:** Slow, costly, flaky, non-deterministic. Streaming makes assertions difficult.
**Instead:** Mock `streamText` at the Vercel AI SDK level. Test prompt composition and usage tracking separately as unit tests.

---

## Sources

- Direct codebase analysis (HIGH confidence -- all recommendations based on reading actual source files)
- `components/ui/sidebar.tsx` -- verified collapse infrastructure exists (cookie persistence, icon mode, tooltips)
- `lib/services/system-prompt-service.ts` -- verified 4-layer composition pattern
- `prisma/schema.prisma` -- verified OrgSettings and Role models
- `app/api/chat/route.ts` -- verified prompt assembly integration point
- `app/api/org/[slug]/admin/settings/login-page/route.ts` -- verified existing login customization API
- `lib/auth-middleware.ts` -- verified route-handler-level auth pattern
- `lib/prompt-sanitizer.ts` -- verified sanitization for untrusted layers
