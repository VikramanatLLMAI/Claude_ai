# Phase 7: Theming, Branding, and Compliance - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Organizations get visual identity through theme selection and branding, Org Admins get compliance oversight via conversation visibility, Super Admins get IT support via user impersonation, and the system gets automated cleanup via scheduled tasks. Additionally, all admin surfaces (Super Admin dashboard, Org Admin dashboard, Settings modal, Org login pages, sidebars) receive production-grade UI/UX polish to SaaS-ready quality — the chat bot UI is NOT touched.

</domain>

<decisions>
## Implementation Decisions

### Theme Control Model
- **Super Admin assigns specific themes** to each org (e.g., 3 out of 5 available themes)
- **Org Admin picks the active theme** from only the assigned themes — cannot see or access unassigned themes
- **Users get NO theme picker** — they see only the org's active theme
- **Users only control light/dark/system mode** (independent from org theme, persists per user via User.preferences)
- Remove the existing color theme picker from the settings modal for regular users
- Available themes: claude, vercel, solar-dusk, twitter, violet-bloom (5 total, CSS already in globals.css)
- Fallback: if active theme is removed → org's default theme; if all removed → platform default
- Server-side validation: Org Admin cannot set active theme outside assigned themes (OTHM-07)

### Brand Colors — DROPPED
- **No brand color overrides** (OBRN-02, OBRN-03, OBRN-04 removed from scope)
- Org identity comes from theme selection + logo only
- OBRN-01 (logo upload) remains in scope

### Logo
- Logo appears on: **org login page + chat sidebar header**
- **logoDisplayMode set by Super Admin during org creation** (not Org Admin):
  - ORG_ONLY: Only the org logo shows
  - PLATFORM_AND_ORG: Org logo + LLMatscale.ai platform logo side-by-side
- Upload constraints: **max 500KB**, accept PNG/SVG/JPEG, convert to Base64 (stored in existing logoBase64 field)
- Client-side preview before saving, **no cropping tool** — user uploads pre-cropped
- Logo upload API endpoint already exists

### Login Page Customization
- **Both Super Admin and Org Admin can set login page content**:
  - Super Admin sets defaults during org creation (tagline, welcome message)
  - Org Admin can override/customize later from their Settings page
- Org login pages get **production-grade UI/UX polish** with org theme + logo applied
- Use shadcn components for the login page redesign

### Conversation Visibility & Compliance
- **New "Conversations" page** in Org Admin dashboard (Monitoring group, alongside Analytics and Audit Logs)
- Table/list view with filters: user, date range, model
- Click to open read-only conversation viewer
- Org Admin CANNOT modify or delete user conversations (OVIS-05)
- **JSON export** format (matches existing audit log export pattern)
- **Bulk export with selection** — select multiple conversations, export as zip of JSON files
- Visibility toggle change logged in audit logs (OVIS-07)

### Onboarding Agreement
- **Multi-step onboarding wizard** shown on first login to an org:
  - Step 1: Welcome + platform terms
  - Step 2: Org-specific terms/policies (org-customizable text set by Org Admin)
  - Step 3: Confirmation / "I Agree"
- Blocks access to chat until accepted
- OnboardingAgreement model tracks acceptance (schema already exists)
- No in-chat indicator (per Phase 3 decision)

### User Impersonation (SAUD-04)
- **Full session impersonation** — Super Admin acts as the user with all capabilities (send messages, change settings, fix configurations)
- **Purpose: IT support tool** — for resolving user-reported issues, fixing settings, troubleshooting
- **Entry point: Dedicated user search page** in Super Admin dashboard — search any user across all orgs, click "Impersonate"
- **Pre-impersonation dialog** with:
  - Duration picker: **15 / 30 / 60 minutes** (prefilled options)
  - Reason text field (required) — e.g., "User reported settings not saving"
  - Both duration and reason stored in audit log
- Session auto-expires when chosen duration runs out
- Clear visual banner during impersonation: "Impersonating [user] — [reason]" with exit button
- **Full audit trail**: log start, end, AND all actions taken during impersonation session

### Scheduled Tasks (CRON-01/02/03)
- **Automatic background job** — runs daily, no manual intervention needed
- Claude handles the technical mechanism (API route + cron trigger)
- Org purge (30 days after soft delete): **cascade delete everything** — conversations, messages, artifacts, members, roles, invitations, settings, theme assignments
- Orphaned users (only belonged to purged org) remain in system — can be re-invited elsewhere
- Expired invitation cleanup + expired session cleanup
- Each cleanup run creates **audit log entry** with what was cleaned and count of affected records

### Production-Grade UI/UX Polish
- **In scope for Phase 7** (not a separate phase) — since we're applying themes, also refine quality
- **DO NOT touch the chat bot UI** — it's already great
- **Polish these surfaces**: Settings modal, Super Admin dashboard, Org Admin dashboard, sidebars, org login pages
- Use existing components (shadcn/Radix) — upgrade quality, not rewrite
- **Use shadcn MCP tool** during research and implementation to look up components, get correct code and usage details
- Goal: SaaS-ready, production-grade product feel

### Claude's Discretion
- Cron job technical mechanism (API route auth, scheduling approach)
- Impersonation session token/mechanism implementation
- Exact UI layout and spacing decisions during polish
- Loading states and error handling across new surfaces
- Onboarding wizard step transitions and animations
- Conversation viewer layout within compliance page

</decisions>

<specifics>
## Specific Ideas

- 5 themes already fully defined in globals.css with `[data-theme="X"]` selectors, light and dark variants
- Onboarding agreement handles conversation visibility notice (Phase 3 decision — no in-chat indicator)
- Login page customization (tagline, custom content) — both Super Admin and Org Admin can configure
- Org login pages get full redesign with shadcn components + org theme applied
- Impersonation is an IT support feature — Super Admin needs to actually fix things, not just observe
- Impersonation dialog captures duration + reason before starting (stored in audit)
- shadcn MCP tool will be available — use it for component lookups during research and implementation

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- **globals.css**: All 5 theme CSS definitions exist with `[data-theme="X"]` selectors, light and dark variants
- **settings-modal.tsx**: Theme switching logic exists (applyTheme, applyColorTheme) — needs refactoring from localStorage to org-controlled
- **OrgThemeAssignment model**: Prisma model ready with org ↔ themeName unique constraint
- **OrgSettings model**: `conversationVisibility` boolean field exists, default false
- **OnboardingAgreement model**: Schema exists with userId, orgId, acceptedAt fields
- **Organization model**: `logoBase64`, `logoDisplayMode` fields already exist
- **User.preferences**: JSON field with `themeMode` default — stores light/dark/system preference
- **Audit logging**: Full infrastructure from Phases 2-6 (platform + org-scoped, immutable, CSV/JSON export)
- **Logo upload API**: `POST /api/admin/organizations/[id]/logo` exists
- **Session service**: `lib/services/session-service.ts` with `forceLogoutUser()` — foundation for impersonation
- **Org user service**: `lib/services/org-user-service.ts` with suspend/activate/delete functions

### Established Patterns
- **API routes**: RESTful with auth middleware (requireOrgAuth, requireSuperAdmin, requireOrgAdmin)
- **Storage layer**: All DB operations in lib/storage.ts as named exports
- **Service layer**: Mutations in `prisma.$transaction()` with audit logging
- **Org Admin console**: 10 pages in 5-group sidebar (Configuration, Monitoring, Security, People, Platform)
- **Super Admin dashboard**: Organizations, Super Admins, Models, Role Templates, Analytics, Audit Logs in 3-group sidebar
- **Lazy expiry**: Invitations batch-updated to EXPIRED on list query (existing pattern)
- **DataTable**: TanStack Table wrapper with sorting, filtering, pagination
- **Confirmation dialogs**: `components/ui/confirmation-dialog.tsx` for destructive actions
- **Toast notifications**: Sonner toast system

### Integration Points
- **Settings modal**: Remove color theme picker section, keep light/dark/system only
- **Theme application**: Move from localStorage → API-fetched org theme applied on login/page load
- **Chat sidebar header**: Add org logo display based on logoDisplayMode
- **Org login page**: Apply org theme + logo + tagline (redesign with shadcn)
- **Org Admin sidebar**: Add "Conversations" page in Monitoring group
- **Org Admin Settings tab**: Add login page customization (tagline, welcome message)
- **Super Admin dashboard**: Add "Users" search page for impersonation entry point
- **Super Admin org creation**: Add logoDisplayMode + login page defaults configuration

</code_context>

<deferred>
## Deferred Ideas

- Custom theme builder for Super Admin (creating new themes beyond the 5 presets) — potential future phase
- Brand color overrides (primary/accent) — intentionally dropped, could revisit later

</deferred>

---

*Phase: 07-theming-branding-and-compliance*
*Context gathered: 2026-03-05*
