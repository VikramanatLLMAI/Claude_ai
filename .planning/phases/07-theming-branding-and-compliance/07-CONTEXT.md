# Phase 7: Theming, Branding, and Compliance - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Organizations get visual identity through theme selection and branding, Org Admins get compliance oversight via conversation visibility, Super Admins get support tools via user impersonation, and the system gets automated cleanup via scheduled tasks. Login page customization, full logo upload, and org branding colors applied across all org UI surfaces.

</domain>

<decisions>
## Implementation Decisions

### Theme Control
- Org theme is **locked** for all users — no color theme picker in user settings
- Users only control light/dark/system mode (independent from org theme, persists per user)
- Super Admin assigns available themes to an org, Org Admin picks the active theme from assigned ones
- If active theme is removed → fall back to org's default theme; if all removed → platform default
- Remove existing localStorage-based color theme picker from settings modal (replace with light/dark/system only)

### Brand Colors
- Primary and accent brand colors **override the theme's accent/primary tokens**
- The org theme provides the base palette (backgrounds, text, borders)
- Brand colors replace the theme's accent/primary CSS custom properties
- Result: branding feels custom without needing a full custom theme

### Logo
- Logo appears on: **login page, sidebar header, and Org Admin console header**
- `logoDisplayMode` controls display: PLATFORM_AND_ORG (side-by-side) or ORG_ONLY
- Upload constraints: max 500KB, accept PNG/SVG/JPEG, convert to Base64 (logoBase64 field exists)
- Client-side preview before saving, no cropping tool — user uploads pre-cropped

### Conversation Visibility & Compliance
- **Dedicated compliance page** in Org Admin console (separate from own chat)
- Table/list view with filters: user, date range, model
- Click to open read-only conversation viewer
- Org Admin CANNOT modify or delete user conversations
- **Bulk export with selection** — select multiple conversations, export as zip of JSON files
- Visibility toggle change logged in audit logs

### Onboarding Agreement
- **Simple single-step acknowledgment page** shown on first login to an org
- Org-customizable text (set by Org Admin) + platform terms
- Single "I agree" button — OnboardingAgreement model tracks acceptance
- No in-chat indicator (per Phase 3 decision)

### User Impersonation (SAUD-04)
- **Read-only view-as mode** — Super Admin sees user's chat interface, can browse conversations
- Cannot send messages, delete anything, or modify settings
- Clear visual banner: "Viewing as [user] — Read Only" with exit button
- Entry point: Super Admin user management page → "View as" action per user row
- **Auto-expire after 30 minutes** with warning at 25 minutes
- Audit log entry on start + end (who, when, which user, duration)

### Scheduled Tasks (CRON-01/02/03)
- **API routes + external cron trigger** (e.g., /api/cron/cleanup with secret token)
- All tasks run **daily at midnight**
- Org purge (30 days after soft delete): **cascade delete everything** — conversations, messages, artifacts, members, roles, invitations, settings, theme assignments
- Orphaned users (only belonged to purged org) remain in system — can be re-invited elsewhere
- Expired invitation cleanup + expired session cleanup
- Each cleanup run creates **audit log entry** with what was cleaned and count of affected records

### Claude's Discretion
- Theme CSS variable mapping strategy for brand color overrides
- Compliance page table layout and pagination approach
- Impersonation session token/mechanism implementation
- Cron route authentication method (bearer token vs API key)
- Loading states and error handling across all new surfaces

</decisions>

<specifics>
## Specific Ideas

- 5 themes already fully defined in globals.css with light/dark variants: claude, vercel, solar-dusk, twitter, violet-bloom
- Onboarding agreement handles conversation visibility notice (Phase 3 decision — no in-chat indicator)
- Login page customization (tagline, custom content) is part of this phase per roadmap handoff notes
- Org branding colors should apply to login page as well as chat UI and admin console

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- **globals.css**: All 5 theme CSS definitions exist with `[data-theme="X"]` selectors, light and dark variants
- **settings-modal.tsx**: Theme switching logic exists (applyTheme, applyColorTheme functions) — needs refactoring from localStorage to org-controlled
- **OrgThemeAssignment model**: Prisma model ready with org ↔ themeName unique constraint
- **OrgSettings model**: `conversationVisibility` boolean field exists, default false
- **OnboardingAgreement model**: Schema exists with userId, orgId, acceptedAt fields
- **Organization model**: `logoBase64`, `logoDisplayMode` fields already exist
- **User.preferences**: JSON field with `themeMode` default — can store light/dark/system preference
- **Audit logging**: Infrastructure from prior phases (Phase 2+) for tracking admin actions

### Established Patterns
- **API routes**: RESTful pattern with auth middleware (requireOrgAuth, requireSuperAdmin)
- **Storage layer**: All DB operations in lib/storage.ts as named exports
- **Org Admin console**: Phase 6 built the Org Admin dashboard — new compliance page fits alongside existing tabs
- **Super Admin dashboard**: Phase 5 built platform admin — impersonation fits in user management section

### Integration Points
- **Settings modal**: Remove color theme picker, keep light/dark/system only
- **Theme application**: Move from localStorage → API-fetched org theme applied on login
- **Sidebar header**: Add org logo display alongside/replacing platform text
- **Login page**: Apply org branding (logo, colors, tagline)
- **Org Admin console navigation**: Add "Conversations" / compliance tab
- **Super Admin user list**: Add "View as" action button per user row

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-theming-branding-and-compliance*
*Context gathered: 2026-03-05*
