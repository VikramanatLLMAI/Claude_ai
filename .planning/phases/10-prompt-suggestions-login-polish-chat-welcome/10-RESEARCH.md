# Phase 10: Prompt Suggestions, Login Polish & Chat Welcome - Research

**Researched:** 2026-03-07
**Domain:** Frontend UI components, Prisma schema extension, admin CRUD
**Confidence:** HIGH

## Summary

Phase 10 covers three interconnected areas: (1) role-based prompt suggestion chips on the chat welcome screen, (2) extracting the welcome screen into a standalone component with org branding, and (3) redesigning login pages with a consistent two-column layout and admin-customizable branding via a new Branding page.

The existing codebase provides strong foundations: the welcome screen code is localized at lines 1579-1657 of `full-chat-app.tsx`, login pages already use two-column layouts, and the role-form-modal already has a multi-tab pattern that easily extends with a "Suggestions" tab. The primary schema change is adding a `LoginBranding` model (one-to-one with Organization) and a `promptSuggestions` JSON field on the `Role` model.

**Primary recommendation:** Implement in three waves: (1) schema + API layer, (2) welcome screen extraction + suggestion chips, (3) login page redesign + branding admin page.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep current chip design (icon + label) -- no visual overhaul, just make them admin-configurable
- 4 chips per role, configured by Org Admin
- Configuration lives in a new "Suggestions" tab in the role create/edit modal (role-form-modal.tsx)
- Clicking a chip populates the chat input with the suggestion text (does NOT auto-send)
- When no custom suggestions configured for a role, fall back to hardcoded defaults (Write, Learn, Code, Life stuff)
- Each chip has: icon (emoji or Lucide icon name) + label text + prompt text (what fills the input)
- Extract welcome state into a dedicated WelcomeScreen component (out of full-chat-app.tsx which is 101KB)
- Show org + platform logos above the greeting, based on logoDisplayMode
- NO model icons on the welcome screen (model selection stays in the input bar dropdown only)
- Keep time-based greeting ("Good morning/afternoon/evening, {name}") -- no change
- Suggestion chips render below the input (current position), fed by role-specific config
- All login pages use the same two-column layout (branding left, form right)
- Org login left panel: fully customizable by Org Admin (headline, tagline badge, description text, all 4 feature cards with icon + title + subtitle)
- Org login logo: top of left branding panel, follows logoDisplayMode
- Bare domain login left panel: constant/hardcoded text (platform branding -- not editable for now)
- Right side form: Bare domain = "Login to LLMatscale.ai" + email-first flow; Org login = "Login to {OrgName}" + direct email/password
- No Google SSO or free trial links -- keep clean
- Create a new separate LoginBranding model (not expand OrgSettings)
- Fields: loginHeadline, loginBadge, loginDescription, loginFeatureCards (JSON array of 4 items)
- One-to-one relation with Organization
- New "Branding" page in Org Admin sidebar for login page customization
- Side-by-side live preview: left = edit form, right = real-time preview
- New tab in role-form-modal.tsx alongside existing tabs: "Suggestions"
- Admin configures 4 suggestion chips: each with icon selector + label + prompt text

### Claude's Discretion
- Exact animation for welcome screen component extraction (preserve existing Framer Motion transitions)
- LoginBranding model field types and defaults
- How to handle icon selection UI in the Suggestions tab (emoji picker vs Lucide icon dropdown)
- Responsive behavior of two-column login on mobile (likely stack to single column)
- Hardcoded platform branding text for bare domain login left panel

### Deferred Ideas (OUT OF SCOPE)
- Auto-suggestions based on user chat history -- future AI-driven feature
- Super Admin editing of bare domain login branding -- future phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUGG-01 | Org Admin can configure starter prompt suggestions (4-6 items) for chat welcome screen | `promptSuggestions` JSON field on Role model; new Suggestions tab in role-form-modal; role CRUD API extended |
| SUGG-02 | Chat welcome screen displays clickable prompt suggestion cards | WelcomeScreen component reads role suggestions from models endpoint response |
| SUGG-03 | Clicking a suggestion populates the chat input (does not auto-send) | Existing `chatInputRef.current?.setMessage()` pattern already works -- pass prompt text |
| SUGG-04 | Default suggestions shown when org has not configured custom ones | Hardcoded fallback array in WelcomeScreen component when role.promptSuggestions is empty/null |
| WELCOME-01 | Welcome screen is extracted into a separate component from full-chat-app.tsx | Extract lines 1579-1657 into `components/chat/welcome-screen.tsx` |
| WELCOME-02 | Model icons moved from chat sidebar to welcome screen (above greeting) | CONTEXT.md overrides: NO model icons on welcome screen -- requirement satisfied by explicit exclusion |
| WELCOME-03 | Welcome screen shows org + platform logos side-by-side based on logoDisplayMode | Org data (logoBase64, logoDisplayMode) passed to WelcomeScreen; same dual-logo pattern as org-login-page.tsx |
| LOGIN-01 | All login pages use consistent visual design | Both login-page.tsx and org-login-page.tsx redesigned to same two-column layout |
| LOGIN-02 | Org Admin can customize login page tagline via admin settings | LoginBranding model with loginBadge field; branding admin page with live preview |
| LOGIN-03 | Org Admin can customize login page welcome/description text via admin settings | LoginBranding model with loginHeadline + loginDescription fields; branding admin page |
| LOGIN-04 | Login page customization has live preview in admin UI | New branding admin page with side-by-side edit form + preview panel |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.4 | App Router, server components | Project framework |
| React | 19.2.3 | UI rendering | Project framework |
| Prisma | 7.4.1 | Database ORM | Project database layer |
| Framer Motion | (motion/react) | Animations | Already used in welcome screen and login pages |
| Lucide React | 0.473.0 | Icons | Already used throughout the project |
| Zod | latest | Validation | Already used for all API input validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Radix UI Tabs | latest | Tab navigation | Already used in role-form-modal |
| TailwindCSS v4 | latest | Styling | Already used throughout |
| next/image | built-in | Logo rendering | Already used in login pages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Lucide icon name string | Emoji-only | Lucide gives consistent visual quality; emoji is simpler but less professional |
| Separate LoginBranding model | Expand OrgSettings | User decided: separate model for SaaS separation |

## Architecture Patterns

### Recommended Project Structure
```
components/
  chat/
    welcome-screen.tsx           # NEW: Extracted welcome screen component
  admin/
    branding-editor.tsx          # NEW: Branding admin page component with live preview
    role-form-modal.tsx          # MODIFIED: Add Suggestions tab (5th tab)
  login-page.tsx                 # MODIFIED: Redesign to two-column with branding panel
  org-login-page.tsx             # MODIFIED: Redesign to match login-page layout
  find-my-org.tsx                # MODIFIED: Redesign to two-column layout (find-org is bare domain entry)
app/
  org/[slug]/admin/
    branding/page.tsx            # NEW: Branding admin page
  api/org/[slug]/admin/
    branding/route.ts            # NEW: LoginBranding CRUD API
lib/
  services/
    login-branding-service.ts    # NEW: LoginBranding service
prisma/
  schema.prisma                  # MODIFIED: Add LoginBranding model + Role.promptSuggestions
```

### Pattern 1: Schema -- LoginBranding Model
**What:** New one-to-one model for login page branding per org
**When to use:** When org admin customizes login page appearance

```prisma
model LoginBranding {
  id               String   @id @default(uuid())
  organizationId   String   @unique @map("organization_id")
  loginHeadline    String?  @map("login_headline")         // Main headline text
  loginBadge       String?  @map("login_badge")            // Tagline badge text
  loginDescription String?  @map("login_description") @db.Text  // Description paragraph
  loginFeatureCards Json    @default("[]") @map("login_feature_cards")  // JSON array of 4 cards
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@map("login_brandings")
}
```

Feature card JSON structure:
```typescript
interface FeatureCard {
  icon: string    // Lucide icon name (e.g., "Shield", "Zap", "Globe")
  title: string   // Card title (e.g., "Enterprise Security")
  subtitle: string // Card subtitle/description
}
// Default: [] (empty array = use generic fallback cards)
```

### Pattern 2: Schema -- Role.promptSuggestions Field
**What:** JSON field on Role model for per-role suggestion chips
**When to use:** Stores admin-configured prompt suggestions

```prisma
// Add to existing Role model:
promptSuggestions Json @default("[]") @map("prompt_suggestions")
```

Suggestion JSON structure:
```typescript
interface PromptSuggestion {
  icon: string   // Lucide icon name (e.g., "Pencil", "BookOpen") or emoji
  label: string  // Display label (e.g., "Write", "Analyze Data")
  prompt: string // Full prompt text that fills the input
}
// Default: [] (empty = use hardcoded fallbacks)
```

### Pattern 3: WelcomeScreen Component Extraction
**What:** Extract welcome state UI from full-chat-app.tsx into its own component
**When to use:** When conversation list is empty (isWelcomeVisible = true)

```typescript
// components/chat/welcome-screen.tsx
interface WelcomeScreenProps {
  userName: string
  orgLogoBase64: string | null
  orgLogoDisplayMode: string
  orgName: string
  suggestions: PromptSuggestion[]
  chatInputRef: React.RefObject<ChatInputHandle>
  // All ClaudeChatInput props forwarded
  onSendMessage: (message: string, files?: File[]) => void
  models: ModelInfo[]
  defaultModel: string
  isLoading: boolean
  // ... other input props
}
```

### Pattern 4: Live Preview Admin Pattern
**What:** Side-by-side editor + preview for branding customization
**When to use:** Branding admin page

```typescript
// Left panel: form with controlled inputs
// Right panel: preview component receiving same state
// No debounce needed -- React state updates are instant
// Preview renders a scaled-down version of the login page
```

### Pattern 5: Serving Suggestions to Frontend
**What:** Include role's promptSuggestions in the models API response
**When to use:** When chat page loads

The existing `GET /api/org/[slug]/models` endpoint already returns role info. Extend it to include `promptSuggestions`:

```typescript
// In the models endpoint response, add:
return NextResponse.json({
  models: [...],
  defaultModel: ...,
  isOrgAdmin: ...,
  promptSuggestions: role.promptSuggestions || [],  // NEW
});
```

### Pattern 6: Icon Selection UI (Claude's Discretion)
**Recommendation:** Use a simple dropdown of curated Lucide icon names (20-30 popular icons). This is simpler than a full icon picker or emoji picker, and ensures visual consistency with the rest of the app.

Curated list: Pencil, BookOpen, Code2, Home, Lightbulb, MessageSquare, BarChart3, FileText, Globe, Search, Sparkles, Zap, Shield, Users, Calculator, Palette, Music, Camera, Heart, Star, Rocket, Database, Mail, Phone, MapPin, Clock, Calendar, Gift, Coffee, Briefcase.

Render each option as: `<Icon className="size-4" /> {name}` in the dropdown.

### Anti-Patterns to Avoid
- **Storing suggestions on OrgSettings:** User decided per-role suggestions, not per-org. Use Role model.
- **Auto-sending on chip click:** Explicitly prohibited. Only populate input.
- **Fetching branding client-side on login page:** Login pages are server-rendered. Fetch branding data server-side in the page.tsx, pass to client component.
- **Expanding full-chat-app.tsx further:** The file is 101KB. Extract, don't add.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon rendering from string name | Custom icon resolver | Dynamic Lucide import map | Lucide exports all icons; create a map of allowed icon names to components |
| Form validation | Custom validators | Zod schemas | Consistent with entire codebase |
| Two-column responsive layout | Custom CSS grid | TailwindCSS `grid grid-cols-1 lg:grid-cols-2` | Already used in org-login-page.tsx |
| Live preview | WebSocket/polling | React controlled state | Editor and preview share same React state -- instant updates |

**Key insight:** The live preview pattern is trivial in React -- both the editor form and the preview component read from the same state. No special libraries or patterns needed.

## Common Pitfalls

### Pitfall 1: Icon String to Component Resolution
**What goes wrong:** Storing icon names as strings but failing to render them as React components
**Why it happens:** Lucide exports hundreds of icons; importing all is wasteful, dynamic import is async
**How to avoid:** Create a curated map of ~30 allowed icon names to their Lucide components. Import them statically. Fall back to a default icon if the stored name isn't in the map.
**Warning signs:** `undefined` rendered instead of icon, or massive bundle size

```typescript
// lib/icon-map.ts
import { Pencil, BookOpen, Code2, Home, Lightbulb, ... } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export const SUGGESTION_ICONS: Record<string, LucideIcon> = {
  Pencil, BookOpen, Code2, Home, Lightbulb, MessageSquare,
  BarChart3, FileText, Globe, Search, Sparkles, Zap,
  // ... 20-30 curated icons
}

export function getIcon(name: string): LucideIcon {
  return SUGGESTION_ICONS[name] || Sparkles // fallback
}
```

### Pitfall 2: LoginBranding Relation in Organization Model
**What goes wrong:** Forgetting to add the reverse relation on Organization model
**Why it happens:** Prisma requires both sides of a relation to be declared
**How to avoid:** Add `loginBranding LoginBranding?` to the Organization model alongside `settings OrgSettings?`
**Warning signs:** Prisma validation error on `db:push`

### Pitfall 3: Migration of Existing loginTagline/loginWelcomeMessage
**What goes wrong:** Breaking existing org login pages that use OrgSettings fields
**Why it happens:** LoginBranding replaces loginTagline and loginWelcomeMessage from OrgSettings
**How to avoid:** Keep OrgSettings fields temporarily; have the org login page.tsx check LoginBranding first, fall back to OrgSettings. Migrate data in a later cleanup step. Or since this is dev-mode with `db:push`, simply update the code to use LoginBranding exclusively.
**Warning signs:** Org login pages showing no tagline/welcome after schema change

### Pitfall 4: Full-chat-app.tsx Prop Drilling
**What goes wrong:** Extracting WelcomeScreen but needing too many props from parent
**Why it happens:** The welcome screen uses chatInputRef, models, handlers, MCP state, etc.
**How to avoid:** Pass all ClaudeChatInput props as a spread object. Keep the extracted component focused: greeting + logos + input + chips. The input component (ClaudeChatInput) is already self-contained.
**Warning signs:** More than 15 individual props on WelcomeScreen

### Pitfall 5: Bare Domain Entry Point
**What goes wrong:** Modifying the wrong component for bare domain login
**Why it happens:** `app/page.tsx` renders `FindMyOrg`, not `LoginPage`. The `LoginPage` component exists but is used for legacy `/chat` flow.
**How to avoid:** The bare domain two-column redesign applies to `FindMyOrg` component (or replace it with a redesigned `LoginPage` that includes find-org flow). Check `app/page.tsx` to confirm which component is rendered.
**Warning signs:** Redesigning `LoginPage` but it's not used on the bare domain

### Pitfall 6: Server vs Client Data Fetching for Login Branding
**What goes wrong:** Fetching login branding data client-side, causing flash of unstyled content
**Why it happens:** Login pages are server components that pass data to client components
**How to avoid:** Fetch LoginBranding server-side in `app/org/[slug]/login/page.tsx`, pass to `OrgLoginPage` as props. Same pattern already used for org settings (tagline, welcomeMessage, activeTheme).
**Warning signs:** Blank left panel on initial load, then content appearing

## Code Examples

### Existing Welcome Screen Code (lines 1579-1657 of full-chat-app.tsx)
The welcome screen currently renders:
1. Time-based greeting (h1)
2. ClaudeChatInput (centered, full-width)
3. 4 hardcoded suggestion chips (Write, Learn, Code, Life stuff)

Each chip calls `chatInputRef.current?.setMessage(chip.label + ": ")`.

### Existing Org Login Page Server Component
`app/org/[slug]/login/page.tsx` fetches org data including `settings.loginTagline` and `settings.loginWelcomeMessage` server-side and passes to `OrgLoginPage` client component. The LoginBranding fetch will follow the same pattern.

### Existing Role Form Modal Tab Structure
`role-form-modal.tsx` has 4 tabs in a `grid-cols-4` TabsList:
1. General (Settings icon)
2. Models (Cpu icon)
3. Limits (Gauge icon)
4. Permissions (ShieldCheck icon)

Change to `grid-cols-5` and add a 5th "Suggestions" tab with a Sparkles or MessageSquare icon.

### Role API CRUD Payload
The `handleSave` in role-form-modal.tsx builds a payload object and sends to `POST/PUT /api/org/[slug]/admin/roles`. Add `promptSuggestions` to the payload:

```typescript
const payload = {
  name: name.trim(),
  description: description.trim() || undefined,
  allowedModels,
  customInstructionsEnabled,
  personalMcpEnabled,
  personalMcpMaxCount: personalMcpEnabled ? personalMcpMaxCount : 0,
  dailyRequestLimit: requestLimitEnabled ? dailyRequestLimit : null,
  dailyTokenLimit: tokenLimitEnabled ? dailyTokenLimit : null,
  promptSuggestions,  // NEW: array of {icon, label, prompt}
}
```

### Admin Sidebar Navigation Addition
Add "Branding" to the Configuration group in `getOrgAdminNavGroups()`:

```typescript
{
  label: "Configuration",
  items: [
    { label: "Roles", icon: Users, href: `${base}/roles`, enabled: true },
    { label: "Instructions", icon: MessageSquare, href: `${base}/instructions`, enabled: true },
    { label: "MCP Servers", icon: Plug, href: `${base}/mcp`, enabled: true },
    { label: "Branding", icon: Paintbrush, href: `${base}/branding`, enabled: true }, // NEW
  ],
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Login customization in OrgSettings (tagline + welcomeMessage) | Separate LoginBranding model with richer fields | Phase 10 | Better SaaS separation, more customization options |
| Hardcoded suggestion chips | Role-based configurable chips | Phase 10 | Admin control over user experience |
| Welcome screen inline in 101KB file | Extracted WelcomeScreen component | Phase 10 | Better maintainability, smaller main file |

**Deprecated/outdated after Phase 10:**
- `OrgSettings.loginTagline` and `OrgSettings.loginWelcomeMessage` -- replaced by LoginBranding model fields. Consider removing in a future cleanup phase.

## Open Questions

1. **What happens to existing OrgSettings.loginTagline data?**
   - What we know: Some orgs may have set tagline/welcomeMessage via admin settings
   - What's unclear: Whether to migrate data to LoginBranding or keep dual-read
   - Recommendation: Since this is development/staging (db:push, not migrations), simply switch to LoginBranding exclusively. Any existing data in OrgSettings login fields becomes unused. No migration script needed.

2. **Should find-my-org (bare domain) get the full two-column redesign?**
   - What we know: `app/page.tsx` renders `FindMyOrg`, which is the email-first flow. The CONTEXT.md says "bare domain login left panel: constant/hardcoded text"
   - What's unclear: Whether FindMyOrg replaces LoginPage entirely or both get updated
   - Recommendation: Redesign FindMyOrg with the two-column layout (hardcoded branding left, email-first form right). The existing LoginPage component for `/chat` backward compat can be left as-is or deprecated.

3. **WELCOME-02 conflict with CONTEXT.md**
   - What we know: REQUIREMENTS.md says "Model icons moved from chat sidebar to welcome screen (above greeting)". CONTEXT.md says "NO model icons on the welcome screen"
   - Recommendation: Follow CONTEXT.md (user's explicit decision). WELCOME-02 is satisfied by the user's override decision. Document this in the plan.

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` -- current schema reviewed, Role model structure understood
- `components/full-chat-app.tsx` lines 1579-1657 -- welcome screen code examined
- `components/login-page.tsx` -- full two-column login already exists
- `components/org-login-page.tsx` -- org login with branding props examined
- `components/admin/role-form-modal.tsx` -- 4-tab modal structure examined
- `components/admin/admin-sidebar.tsx` -- nav group structure examined
- `app/org/[slug]/login/page.tsx` -- server-side data fetching pattern examined
- `app/api/org/[slug]/models/route.ts` -- models endpoint response structure examined
- `app/api/org/[slug]/admin/settings/login-page/route.ts` -- existing login page API examined
- `10-CONTEXT.md` -- all user decisions and deferred items

### Secondary (MEDIUM confidence)
- Lucide React icon exports -- verified via project usage patterns throughout codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, no new dependencies needed
- Architecture: HIGH - follows established patterns (Prisma models, API routes, component extraction)
- Pitfalls: HIGH - based on direct code examination of affected files

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- all patterns are well-established in the codebase)
