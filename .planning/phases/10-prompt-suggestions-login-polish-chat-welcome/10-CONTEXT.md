# Phase 10: Prompt Suggestions, Login Polish & Chat Welcome - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Chat welcome screen shows clickable starter prompts (role-based, admin-configurable) and org branding (logos based on logoDisplayMode). Login pages (bare domain + org) adopt a consistent two-column design with admin-customizable branding text and feature cards. A new Branding admin page provides live preview editing.

</domain>

<decisions>
## Implementation Decisions

### Suggestion Chips (SUGG-01 through SUGG-04)
- Keep current chip design (icon + label) — no visual overhaul, just make them admin-configurable
- 4 chips per role, configured by Org Admin
- Configuration lives in a new "Suggestions" tab in the role create/edit modal (role-form-modal.tsx)
- Clicking a chip populates the chat input with the suggestion text (does NOT auto-send)
- When no custom suggestions configured for a role, fall back to hardcoded defaults (Write, Learn, Code, Life stuff)
- Each chip has: icon (emoji or Lucide icon name) + label text + prompt text (what fills the input)

### Welcome Screen (WELCOME-01 through WELCOME-03)
- Extract welcome state into a dedicated WelcomeScreen component (out of full-chat-app.tsx which is 101KB)
- Show org + platform logos above the greeting, based on logoDisplayMode:
  - PLATFORM_AND_ORG: both logos side-by-side (like chat UI header)
  - ORG_ONLY: only org logo
- NO model icons on the welcome screen (model selection stays in the input bar dropdown only)
- Keep time-based greeting ("Good morning/afternoon/evening, {name}") — no change
- Suggestion chips render below the input (current position), fed by role-specific config

### Login Page Design (LOGIN-01 through LOGIN-04)
- All login pages use the same two-column layout (reference: SaaS workspace login design provided by user)
  - Left column: branding panel (logo, headline, tagline badge, description, 4 feature cards)
  - Right column: login form (email, password, sign in)
- Org login left panel: fully customizable by Org Admin (headline, tagline badge, description text, all 4 feature cards with icon + title + subtitle)
- Org login logo: top of left branding panel, follows logoDisplayMode (dual = side-by-side, org-only = just org logo)
- Bare domain login left panel: constant/hardcoded text (platform branding — not editable for now)
- Right side form:
  - Bare domain: "Login to LLMatscale.ai" + email-first flow (find org)
  - Org login: "Login to {OrgName}" + direct email/password
  - Same visual form design on both
- No Google SSO or free trial links — keep clean (email/password + forgot password only)
- "Find My Organization" link already exists on bare domain

### Schema — LoginBranding Model
- Create a new separate LoginBranding model (not expand OrgSettings) for production SaaS separation
- Fields: loginHeadline, loginBadge (tagline badge text), loginDescription, loginFeatureCards (JSON array of 4 items, each with icon + title + subtitle)
- One-to-one relation with Organization
- Existing OrgSettings.loginTagline and loginWelcomeMessage will be migrated/deprecated in favor of LoginBranding fields

### Admin UI — Branding Page
- New "Branding" page in Org Admin sidebar for login page customization
- Side-by-side live preview: left = edit form, right = real-time preview of login page as admin types
- Covers: headline, tagline badge, description, 4 feature cards (icon + title + subtitle each)

### Role Suggestions Tab
- New tab in role-form-modal.tsx alongside existing tabs (General, Models, Limits, Guardrails)
- Tab name: "Suggestions"
- Admin configures 4 suggestion chips: each with icon selector + label + prompt text
- Clear "Reset to defaults" option

### Claude's Discretion
- Exact animation for welcome screen component extraction (preserve existing Framer Motion transitions)
- LoginBranding model field types and defaults
- How to handle icon selection UI in the Suggestions tab (emoji picker vs Lucide icon dropdown)
- Responsive behavior of two-column login on mobile (likely stack to single column)
- Hardcoded platform branding text for bare domain login left panel

</decisions>

<specifics>
## Specific Ideas

- Reference design provided: SaaS workspace login with two-column layout (branding left, form right), blue accent headline word, 4 feature highlight cards with icons
- Current welcome screen (screenshot): time-based greeting + centered ClaudeChatInput + 4 hardcoded chips (Write/Learn/Code/Life stuff) — keep this visual style, just make chips admin-configurable per role
- "We are building a production SaaS-ready product, maintain that level of development quality"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/full-chat-app.tsx` (line ~1579-1650): Current welcome state with greeting + input + chips — extract into WelcomeScreen component
- `components/org-login-page.tsx`: Already has two-column layout, org branding, tagline/welcomeMessage props — needs redesign to match reference
- `components/login-page.tsx`: Bare domain login — needs redesign to match two-column reference layout
- `components/admin/role-form-modal.tsx`: Multi-tab role modal (General, Models, Limits, Guardrails) — add Suggestions tab
- `components/ui/card.tsx`: Card component for feature highlight cards on login
- `components/admin/admin-sidebar.tsx`: Sidebar navigation — add Branding link

### Established Patterns
- OrgSettings model for org-level config (but LoginBranding will be a separate model)
- Role model has JSON fields (permissions, allowedModels) — PromptSuggestions can follow similar JSON pattern on Role
- Framer Motion for welcome screen animations
- Two-column layout pattern already in org-login-page.tsx

### Integration Points
- `prisma/schema.prisma`: Add LoginBranding model + promptSuggestions JSON field on Role
- `lib/services/`: New login-branding-service.ts for CRUD
- `app/api/org/[slug]/admin/`: New branding API route
- `app/org/[slug]/admin/`: New branding admin page
- `app/org/[slug]/login/page.tsx`: Pass LoginBranding data to redesigned OrgLoginPage
- `app/page.tsx`: Pass hardcoded branding to redesigned LoginPage
- Role API endpoints: Include promptSuggestions in role CRUD
- Chat welcome: Fetch role's promptSuggestions via models/permissions endpoint

</code_context>

<deferred>
## Deferred Ideas

- **Auto-suggestions based on user chat history** — User requested personalized suggestions derived from individual chat patterns. This is a new AI-driven capability requiring chat analysis, not static admin config. Belongs in a future phase.
- **Super Admin editing of bare domain login branding** — Currently hardcoded platform text. Future phase could add Super Admin UI to customize platform login page text.

</deferred>

---

*Phase: 10-prompt-suggestions-login-polish-chat-welcome*
*Context gathered: 2026-03-07*
