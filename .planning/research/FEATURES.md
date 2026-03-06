# Feature Landscape: v1.1 Harden & Polish

**Domain:** Multi-tenant AI chat platform -- admin UI overhaul, prompt enhancements, security hardening
**Researched:** 2026-03-06
**Confidence:** MEDIUM-HIGH (based on existing codebase analysis + industry patterns)

## Table Stakes

Features users expect. Missing = product feels incomplete or unprofessional.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Collapsible sidebar with icons-only mode | Every modern SaaS admin dashboard (Vercel, Supabase, Asana) has this | Low | Existing `sidebar.tsx` already supports `collapsible="icon"` -- just needs wiring |
| Sidebar collapse persistence | Users expect their preference remembered across sessions | Low | Already built: cookie-based via `sidebar_state` cookie in `sidebar.tsx` |
| Sidebar keyboard shortcut (Cmd+B) | Power user expectation for toggling sidebar | Low | Already built in `sidebar.tsx` -- `SIDEBAR_KEYBOARD_SHORTCUT = "b"` |
| Tooltips on collapsed sidebar items | Icons-only mode is unusable without tooltips | Low | Already built: `SidebarMenuButton` shows tooltip when `state === "collapsed"` |
| "Back to Chat" navigation in Admin Console | Admin users need to return to main app without signing out | Low | Already exists in footer -- needs relocation to header/top-left per v1.1 spec |
| Profile section in admin sidebar | Users expect to see who they are and access account actions | Low | Already exists in footer -- needs UX improvement (expander pattern) |
| Login page tagline and welcome text | Multi-tenant SaaS standard for branded login | Low | Already implemented: `OrgLoginPage` accepts `tagline` and `welcomeMessage`, API exists at `admin/settings/login-page` |
| Security headers (X-Frame-Options, HSTS, etc.) | Production web app standard, not optional | Med | Not yet implemented -- marked as TODO in API CLAUDE.md |
| Input validation on all API routes | Production requirement, prevents malformed data | Med | Partially done with Zod -- needs audit for completeness |
| CSP headers | Prevents XSS attacks, expected for any production SaaS | Med | Not yet implemented -- needs careful configuration for inline styles (Tailwind) |

## Differentiators

Features that set the product apart. Not expected by default, but valued by enterprise users.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 6-layer XML-tagged prompt stack (org/role restrictions) | Enterprise AI governance: prevent prompt overrides at org/role level | Med | Extends existing 4-layer system; adds `<org-restrictions>` and `<role-restrictions>` layers |
| Prompt suggestions/starters management | Org admins customize the chat welcome experience per-org | Med | New feature -- needs DB schema addition (likely on OrgSettings), new API, and chat UI integration |
| Sidebar collapse button inside the sidebar | Better UX than external trigger -- users see it where they expect | Low | Use `SidebarRail` or add collapse button to `SidebarHeader` |
| Smooth sidebar collapse animation | Polish detail that signals quality | Low | Already built: 300ms cubic-bezier transition in `sidebar.tsx` |
| Admin sidebar profile expander | Compact footer that expands to show Logout/Settings/Admin links | Med | Pattern used by Vercel, Linear, Notion -- dropdown or collapsible section |
| Rate limiting on API routes | Security hardening beyond table stakes -- prevents abuse | Med | TODO exists on find-org route; needs systematic implementation |
| CSRF protection | Defense-in-depth for state-changing requests | Med | Next.js Server Actions have built-in protection, but API routes need validation |
| Login page customization UI in Admin Console | Org admins edit tagline/welcome without developer help | Low | API already exists (`admin/settings/login-page`), needs Org Admin UI in Settings page |

## Anti-Features

Features to explicitly NOT build in v1.1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Resizable sidebar (drag to resize) | Over-engineering for admin dashboard; adds complexity without proportional value | Fixed widths: 16rem expanded, 3rem collapsed (already defined) |
| Custom brand colors per org | Decided out of scope in v1.0 -- themes + logos cover visual identity | Continue with theme assignment + logo |
| Per-page sidebar state (different collapsed state per page) | Confusing UX -- users expect consistent sidebar state | Single global sidebar state (cookie-based, already implemented) |
| Full custom login page HTML/CSS editor | Security nightmare (XSS vector), excessive complexity | Structured fields: tagline, welcome message, logo, theme |
| Prompt injection detection via ML model | Expensive, unreliable, scope creep for v1.1 | Static sanitization (existing `sanitizePromptLayer`) + XML boundary enforcement |
| User-facing prompt restriction editor | Restrictions should be set by admins, not users | Org Admin and role config only for restriction layers |
| Nonce-based CSP | Requires dynamic rendering for ALL pages, disables static optimization and ISR | Hash-based CSP or directive-based CSP without nonces |

---

## Feature Deep Dives

### 1. Collapsible Sidebar with Icons-Only Mode

**Current state:** The `sidebar.tsx` component already supports three collapsible modes: `"offcanvas"` (default, slides off-screen), `"icon"` (shrinks to icon-only width), and `"none"` (always visible). The admin sidebar currently uses the default `"offcanvas"` mode via `<Sidebar>` without specifying a `collapsible` prop.

**Expected behavior (industry standard):**
- Expanded state: 240-300px wide (currently 16rem = 256px), shows icon + label for each nav item
- Collapsed state: 48-64px wide (currently 3rem = 48px), shows icon only with tooltip on hover
- Toggle via: (a) collapse button inside the sidebar, (b) keyboard shortcut Cmd/Ctrl+B, (c) optional rail/edge hover
- Animation: smooth 200-300ms transition (already at 300ms cubic-bezier)
- Persistence: state saved in cookie across page loads (already implemented via `sidebar_state` cookie with 7-day max-age)
- Mobile: collapses to sheet/overlay (already implemented via `Sheet` component)
- Group labels: fade out and collapse vertically when sidebar collapses (already implemented via `group-data-[collapsible=icon]:opacity-0` and negative margin classes)
- Menu buttons: shrink to 32x32px squares showing only the icon (already implemented via `group-data-[collapsible=icon]:size-8!` class)

**Implementation approach:**
1. Change `<Sidebar>` in `admin-sidebar.tsx` to `<Sidebar collapsible="icon">`
2. Add a collapse toggle button in `SidebarHeader` or use `SidebarRail` for edge-hover toggling
3. Ensure the sidebar header (org name/icon) gracefully collapses to just the icon in a 48px square
4. Footer user info should collapse to avatar/initials circle only
5. "Back to Chat" should collapse to just an arrow icon

**Complexity:** LOW -- infrastructure exists in `sidebar.tsx`, just needs prop change and header/footer adaptation.

**Dependencies:** None -- `sidebar.tsx` primitives are ready.

### 2. Admin Navigation Patterns

**Profile expander (sidebar footer):**
The standard pattern (Vercel, Linear, Notion, Slack) is a compact user section at the bottom of the sidebar that either:
- (a) Opens a `DropdownMenu` with account actions when clicked
- (b) Shows a Radix `Collapsible` section that expands inline

The dropdown approach is preferred because it works identically in both expanded and collapsed sidebar states.

**Expected items in the profile expander dropdown:**
- User name + email (header, not clickable)
- "Settings" -- opens user settings modal
- Separator
- "Sign Out" button (destructive style)

For Org Admin sidebar specifically:
- "Back to Chat" as the first menu item (or in the sidebar header)

**"Back to Chat" relocation:**
- Move from current footer location to `SidebarHeader` area
- In expanded state: left arrow icon + "Back to Chat" text
- In collapsed state: just the left arrow icon with tooltip
- Position: top-left of sidebar, above navigation groups
- Visual treatment: subtle, not competing with main nav items

**Current state:** `admin-sidebar.tsx` has "Back to Chat" as a ghost Button in the footer and "Sign Out" as a separate destructive Button below it. User info is a plain div showing name + email.

**Implementation approach:**
1. Move "Back to Chat" to `SidebarHeader` -- add as a `SidebarMenuButton` with `ArrowLeft` icon and link to `/org/{slug}/chat`
2. Replace footer user info + buttons with a single `DropdownMenu`:
   - Trigger: user avatar/initials + name (or just avatar in collapsed mode)
   - Items: Settings, Separator, Sign Out
3. Remove standalone Sign Out button from footer
4. For Super Admin: same pattern but without "Back to Chat" (Super Admins have no chat context)

**Complexity:** MEDIUM -- requires restructuring the sidebar footer, adding DropdownMenu integration.

**Dependencies:** Sidebar collapse (Feature 1) should be done first so the profile expander handles both expanded and collapsed states correctly.

### 3. Login Page Customization

**Current state:** The `OrgLoginPage` component already renders:
- Two-column layout (branding left, form right) on desktop, single column on mobile
- Org logo with `logoDisplayMode` (PLATFORM_AND_ORG or ORG_ONLY)
- Tagline and welcome message from `OrgSettings`
- Org theme application via `data-theme` attribute
- Initials placeholder when no logo uploaded
- "Powered by LLMatscale.ai" footer attribution
- Animated error display with Framer Motion

The backend API already exists:
- `GET /api/org/[slug]/admin/settings/login-page` -- returns tagline + welcome message
- `PUT /api/org/[slug]/admin/settings/login-page` -- updates tagline + welcome message

**What multi-tenant SaaS platforms typically offer:**
1. **Logo** -- upload org logo (already implemented via `admin/logo` endpoint)
2. **Tagline/subtitle** -- short text below the org name (already stored in OrgSettings, max ~100 chars recommended)
3. **Welcome message** -- longer descriptive text (already stored in OrgSettings, max ~300 chars recommended)
4. **Theme selection** -- color scheme for the login page (already implemented via theme assignment)
5. **Custom domain** -- subdomain routing (already implemented)
6. **"Powered by" attribution** -- platform branding in footer (already implemented)

**What's needed for v1.1:**
1. **Admin UI for login customization**: Add a section in the Org Admin Settings page with:
   - Tagline text input (single line, character count)
   - Welcome message textarea (multi-line, character count)
   - Live preview panel showing how the login page will look
2. **Login page visual consistency**: The bare-domain login (port 3000) uses `FindMyOrg` which has a different visual style than `OrgLoginPage`. Ensure both feel like the same product.
3. **Visual polish**: Verify the two-column layout looks clean on tablet breakpoints (768px-1024px).

**Complexity:** LOW -- API exists, org-login-page component exists, just needs admin UI form and visual polish.

**Dependencies:** None -- fully independent feature.

### 4. Prompt Suggestions / Starters Management

**Industry pattern (ChatGPT Custom GPTs, Claude Projects):**
- ChatGPT Custom GPTs allow exactly 4 "conversation starters" that appear when users open the GPT
- Each starter is a short prompt text that users can click to begin
- Best practice: make the first starter explain what the GPT does (since titles alone are often unclear)
- Starters ending in ellipsis ("...") are a clever pattern for open-ended conversation openers
- Starters are configured by the admin/creator, not the end user

**Expected behavior for LLMatscale.ai:**
- Org Admin can configure 1-6 prompt suggestions per organization
- Suggestions appear on the chat welcome screen (empty conversation state) as clickable cards or pill buttons
- Clicking a suggestion populates the chat input (user can edit before sending)
- Default to no suggestions (backward compatible with current empty state)
- Each suggestion is a short text string (recommended max ~200 characters)
- Suggestions are org-wide (not per-role) for simplicity in v1.1

**Implementation approach:**
1. **Schema**: Add `promptSuggestions` JSON field to `OrgSettings` model (array of strings, e.g. `["Help me write a report about...", "Summarize the key points of...", "Create a presentation on..."]`)
2. **API**: Extend existing settings endpoints or add dedicated:
   - `GET /api/org/[slug]/admin/settings/prompt-suggestions` -- returns array
   - `PUT /api/org/[slug]/admin/settings/prompt-suggestions` -- saves array (validate max 6 items, max 200 chars each)
3. **Admin UI**: Add a section in Org Admin Settings page with:
   - List of current suggestions with delete buttons
   - "Add suggestion" input with character counter
   - Drag-to-reorder or up/down arrows
   - Preview of how suggestions will appear in chat
4. **Chat UI**: Modify welcome screen in `full-chat-app.tsx`:
   - Fetch suggestions via a user-facing endpoint (e.g., extend `/api/org/[slug]/settings` or new endpoint)
   - Render as clickable cards/pills below the greeting
   - On click: set the suggestion text as the input value (do NOT auto-send -- let user review/edit)
5. **User endpoint**: Add `GET /api/org/[slug]/prompt-suggestions` (org auth, non-admin) to serve suggestions to chat users

**Complexity:** MEDIUM -- new data model, 2-3 new API endpoints, admin UI, and chat UI changes.

**Dependencies:** Needs existing OrgSettings infrastructure. Requires Prisma schema update (add JSON field). Chat welcome screen modifications in `full-chat-app.tsx`.

### 5. 6-Layer XML-Structured Prompt Stack with Restrictions

**Current state:** The system uses a 4-layer XML-tagged prompt composition in `lib/services/system-prompt-service.ts`:
1. `<platform-instructions>` -- from PlatformSettings DB or hardcoded fallback (trusted)
2. `<org-instructions>` -- from OrgSettings.systemInstructions (sanitized via `sanitizePromptLayer`)
3. `<role-instructions>` -- from Role.systemInstructions (sanitized)
4. `<user-context>` -- user name, role name, optional custom instructions (sanitized)

Sanitization strips XML tags and escapes special characters to prevent prompt injection. Token budget enforcement happens at save time, not at composition time.

**Proposed 6-layer structure:**
1. `<platform-instructions>` -- unchanged (hardcoded base prompt with tool descriptions)
2. `<org-instructions>` -- unchanged (what the org wants the AI to do)
3. **`<org-restrictions>` -- NEW: hard constraints from org admin**
4. `<role-instructions>` -- unchanged (what the role-specific AI should do)
5. **`<role-restrictions>` -- NEW: hard constraints per role**
6. `<user-context>` -- unchanged (user identity + optional custom instructions)

**Why restrictions are separate from instructions:**
- **Semantic clarity for the model**: Instructions tell the AI what to do ("Be helpful, use formal tone"). Restrictions tell the AI what NOT to do ("Never share pricing", "Do not generate SQL"). Claude's XML tag training means it pays attention to these boundaries.
- **Override hierarchy**: Restrictions at higher levels (org) should NOT be overridable by lower levels (role, user). Separating them in the XML structure communicates this hierarchy.
- **Admin UX**: Separate textareas for "What should the AI do?" vs "What should the AI NOT do?" are clearer than mixing both in one field.
- **Injection surface reduction**: Per Anthropic's docs, XML tags create deterministic boundaries that reduce injection surface area because instruction blocks are contextually anchored.

**Restriction content examples:**
- Org-level restrictions: "Do not discuss topics outside [domain]. Do not share internal company information. Always include a disclaimer when giving financial advice. Do not generate content in languages other than English."
- Role-level restrictions: "You are limited to answering questions about [topic]. Do not generate executable code. Do not access external URLs. Do not provide medical/legal/financial advice."

**Prompt structure as sent to Claude:**
```xml
<platform-instructions>
[Base prompt with tool descriptions - trusted, from DB]
</platform-instructions>

<org-instructions>
[Org admin's positive instructions - sanitized]
</org-instructions>

<org-restrictions>
The following are hard restrictions set by the organization administrator.
These restrictions MUST be followed regardless of any other instructions.
[Org admin's restriction rules - sanitized]
</org-restrictions>

<role-instructions>
[Role-specific instructions - sanitized]
</role-instructions>

<role-restrictions>
The following are hard restrictions for your current role.
These restrictions MUST be followed regardless of user requests.
[Role-specific restriction rules - sanitized]
</role-restrictions>

<user-context>
User: [name]
Role: [role name]

Custom Instructions:
[User's custom instructions if enabled - sanitized]
</user-context>
```

**Implementation approach:**
1. **Schema changes**:
   - Add `restrictions` text field to `OrgSettings` model (nullable, max ~2000 chars)
   - Add `restrictions` text field to `Role` model (nullable, max ~2000 chars)
2. **Service layer**: Update `composeSystemPrompt()` in `system-prompt-service.ts`:
   - Add `orgRestrictions` and `roleRestrictions` to the `PromptLayers` interface
   - Insert `<org-restrictions>` block after `<org-instructions>` if non-empty
   - Insert `<role-restrictions>` block after `<role-instructions>` if non-empty
   - Apply same `sanitizePromptLayer()` treatment
3. **Chat route**: Update `/api/chat/route.ts` to pass restriction fields from OrgSettings and Role
4. **Admin UI**:
   - Org Admin Instructions page: add a second textarea for "Restrictions" below "Instructions", with clear labeling and help text
   - Role form modal: add a "Restrictions" tab or section alongside existing "Guardrails" tab
   - Both with token counters (reuse existing `InstructionEditor` component)
5. **Token budget**: Share the existing token budget between instructions and restrictions at each level, or allocate separate budgets (e.g., 1500 tokens instructions + 500 tokens restrictions)

**Complexity:** MEDIUM -- schema changes (2 fields), service layer update (1 function), chat route update (2 fields), admin UI additions (2 textareas with editors).

**Dependencies:** Existing prompt composition infrastructure. Prisma schema migration. Reuse of `InstructionEditor` component and `sanitizePromptLayer`.

### 6. Security Hardening

**Current security posture (from codebase audit):**
- Session-based auth with scrypt password hashing -- GOOD
- AES-256-GCM encryption for API keys and MCP credentials -- GOOD
- Zod validation on many routes -- GOOD (needs completeness audit)
- Tenant isolation via Prisma `$extends` with `$allModels.$allOperations` -- GOOD
- Constant-time email lookup to prevent enumeration -- GOOD
- Auth checks at route handler level (defense against CVE-2025-29927) -- GOOD
- Ownership verification on CRUD operations -- GOOD
- Cascade deletes for referential integrity -- GOOD
- Rate limiting -- NOT IMPLEMENTED (TODO on find-org route)
- CORS configuration -- NOT IMPLEMENTED
- CSP headers -- NOT IMPLEMENTED
- Security headers -- NOT IMPLEMENTED

**What needs to be implemented:**

#### A. Security Headers (via `next.config.js` headers or middleware)
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains (production only)
```
These can be set in `next.config.js` under the `headers()` async function, applied to all routes via `source: "/(.*)"`.

**Complexity:** LOW -- straightforward header configuration, no code logic.

#### B. Content Security Policy
Must accommodate:
- Inline styles (TailwindCSS generates many of these via `style` attribute)
- Sandpack iframe (code preview sandbox -- uses blob: URLs)
- Mermaid diagram rendering (may use inline scripts)
- Anthropic API calls (connect-src)
- CDN resources (if any, like fonts)

Recommendation: Use directive-based CSP in `next.config.js` headers, NOT nonce-based. Nonce-based CSP in Next.js 15+ requires `await headers()` in every page component, disables static optimization, and has known production issues. Start with `Content-Security-Policy-Report-Only` to identify violations before switching to enforcement.

**Complexity:** MEDIUM -- requires careful testing of all features (Sandpack, Mermaid, file viewers) against the policy. Expect iterative tuning.

#### C. Rate Limiting
Priority routes and recommended limits:
- `POST /api/auth/login` -- 5 attempts per minute per IP (brute force prevention)
- `POST /api/auth/find-org` -- 10 per minute per IP (email enumeration prevention)
- `POST /api/auth/password-reset` -- 3 per hour per email (abuse prevention)
- `POST /api/chat` -- per-user limits already exist via usage tracking; add IP-level burst protection (30 per minute)
- `POST /api/auth/accept-invitation` -- 5 per minute per IP

Implementation: Use an in-memory `Map` with TTL-based cleanup for self-hosted deployment (no Redis dependency needed at 5-20 org scale). Create a reusable `rateLimit()` utility that wraps route handlers. Pattern:
```typescript
function rateLimit(key: string, limit: number, windowMs: number): boolean
```

**Complexity:** MEDIUM -- needs per-route configuration, IP extraction from headers (`X-Forwarded-For` for reverse proxy), and TTL cleanup interval.

#### D. CSRF Protection
Current API routes use Bearer token auth from `Authorization` header (token stored in localStorage), NOT cookies. This means traditional CSRF via cookie auto-attachment does NOT apply because:
- Attackers on a different origin cannot read the token from localStorage
- The `Authorization` header is not automatically sent with cross-origin requests

Defense-in-depth measures:
- Validate `Origin` header on state-changing requests (POST/PUT/PATCH/DELETE) -- reject if Origin does not match the application host
- This is a lightweight check that can go in a shared utility or middleware

**Complexity:** LOW -- Origin header validation only, no token infrastructure needed.

#### E. Input Validation Audit
Systematic verification needed:
- Every API route has Zod schema validation for request body
- All user-provided strings have length limits (prevent memory exhaustion)
- File upload size limits enforced (already 500KB for logos)
- Query parameters validated (pagination, filters)
- Path parameters validated (UUIDs, slugs)
- No routes accept arbitrary JSON without schema validation

**Complexity:** MEDIUM -- audit effort across 60+ route handler files. Create a checklist, work through each.

**Dependencies:** Security hardening is independent of all other features and can be parallelized.

---

## Feature Dependencies

```
Feature 1 (Sidebar Collapse) --> Feature 2 (Profile Expander)
  Profile expander must handle both expanded and collapsed sidebar states.
  Do Feature 1 first.

Feature 5 (6-Layer Prompt Stack) --> Prisma schema migration
  Adds restrictions field to OrgSettings and Role models.

Feature 4 (Prompt Suggestions) --> Prisma schema migration
  Adds promptSuggestions JSON field to OrgSettings.

Features 4 + 5 share a schema migration -- batch them.

Feature 3 (Login Customization) --> Independent (API already exists)
Feature 6 (Security Hardening) --> Independent (no feature deps)
```

## MVP Recommendation (Phase Ordering)

**Phase 1 -- Admin UI Overhaul (Features 1 + 2):**
1. Sidebar collapse with icons-only mode (`collapsible="icon"`)
2. Profile expander dropdown and "Back to Chat" relocation
3. Remove standalone Sign Out from footer
4. Visual cleanup across all admin pages (scrollbar fixes, border cleanup)
5. Relayout admin pages for Vercel-quality minimal design

Rationale: Highest visual impact, foundational for all admin UX. Low-medium complexity. Sets quality bar for rest of milestone.

**Phase 2 -- Prompt & Chat Enhancements (Features 4 + 5):**
1. Schema migration: add restrictions fields + promptSuggestions field
2. 6-layer prompt stack with `<org-restrictions>` and `<role-restrictions>`
3. Prompt suggestions CRUD and admin UI
4. Chat welcome screen: display prompt suggestions, model icons, logos per logoDisplayMode

Rationale: Schema changes should be batched. Prompt stack and suggestions share admin UI patterns (instruction editor component reuse).

**Phase 3 -- Login & Branding Polish (Feature 3):**
1. Login page customization admin UI (tagline/welcome message editor with preview)
2. Login page visual consistency between FindMyOrg and OrgLoginPage
3. User settings page UI/UX improvements

Rationale: Lower priority, API already exists, minimal backend work.

**Phase 4 -- Security & Quality (Feature 6):**
1. Security headers in `next.config.js`
2. Rate limiting utility + per-route configuration
3. CSP configuration (report-only first, then enforce)
4. Origin header validation for CSRF defense
5. Input validation completeness audit
6. Functionality audit (every UI control has working backend)
7. Tech debt cleanup (debug logs, TS casts)
8. Testing & CI setup

Rationale: Security hardening benefits from all other features being stable. Functionality audit should happen after all feature work is complete.

**Defer to v1.2+:**
- Background images on login pages
- Custom email template branding
- Advanced prompt injection detection (ML-based)
- Per-role prompt suggestions (v1.1 is org-wide only)
- Salted XML tags for enhanced injection resistance

## Sources

- [Anthropic -- Use XML Tags to Structure Prompts](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)
- [Cloud Security Alliance -- AI Prompt Guardrails Guide](https://cloudsecurityalliance.org/blog/2025/12/10/how-to-build-ai-prompt-guardrails-an-in-depth-guide-for-securing-enterprise-genai)
- [Datadog -- LLM Guardrails Best Practices](https://www.datadoghq.com/blog/llm-guardrails-best-practices/)
- [TurboStarter -- Complete Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)
- [Next.js Official -- Content Security Policy Guide](https://nextjs.org/docs/pages/guides/content-security-policy)
- [Vercel -- New Dashboard Navigation Redesign](https://vercel.com/changelog/new-dashboard-navigation-available)
- [Vercel -- Dashboard Redesign Rollout (Feb 2026)](https://vercel.com/changelog/dashboard-navigation-redesign-rollout)
- [OpenAI -- Creating a Custom GPT (Conversation Starters)](https://help.openai.com/en/articles/8554397-creating-a-gpt)
- [OpenAI Community -- Best Practices for Custom GPT Starter Questions](https://community.openai.com/t/best-practices-for-custom-gpt-starter-questions/578610)
- [Best Sidebar Menu Design Examples 2025](https://www.navbar.gallery/blog/best-side-bar-navigation-menu-design-examples)
- [Best UX Practices for Sidebar Menu Design 2025](https://uiuxdesigntrends.com/best-ux-practices-for-sidebar-menu-in-2025/)
- [Logto -- Build Multi-Tenant SaaS Application Guide](https://blog.logto.io/build-multi-tenant-saas-application)
- [Fenilsonani -- Defensive Security: CSRF, CSP, Rate Limiting](https://fenilsonani.com/articles/security/defensive-security-csrf-csp-rate-limiting-cors/)
- [AWS -- Prompt Injection Prevention Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/llm-prompt-engineering-best-practices/best-practices.html)
- [Next.js 15 CSP Production Issue (GitHub Discussion)](https://github.com/vercel/next.js/discussions/80997)
- Codebase analysis: `components/ui/sidebar.tsx`, `components/admin/admin-sidebar.tsx`, `components/org-login-page.tsx`, `lib/services/system-prompt-service.ts`, `lib/prompt-sanitizer.ts`
