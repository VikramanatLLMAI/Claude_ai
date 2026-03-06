# App Directory - Next.js Pages & Routing

## Quick Reference

| Item | Value |
|------|-------|
| **Framework** | Next.js 16 App Router |
| **Entry Point** | `page.tsx` (Find My Organization) |
| **Public Routes** | `/`, `/org/[slug]/login`, `/org/[slug]/register`, `/super-admin/login` |
| **Protected Routes** | `/chat`, `/org/[slug]/chat`, `/org/[slug]/admin/*`, `/super-admin/*` |
| **Middleware** | None (auth checks are client-side via localStorage) |

## Directory Structure

```
app/
├── layout.tsx                              # Root layout (fonts, metadata, Providers, Toaster, ImpersonationBanner)
├── page.tsx                                # Entry point: "Find My Organization" flow
├── globals.css                             # Global styles & CSS variables (light/dark theme)
├── artifact-panel.css                      # Artifact panel styles
├── loading.tsx                             # Global loading skeleton (PageLoadingSkeleton)
├── not-found.tsx                           # Global 404 page ("Organization not found")
├── favicon.ico                             # Site favicon
│
├── chat/
│   └── page.tsx                            # Legacy chat page (backward compat, redirects if no session)
│
├── settings/
│   └── page.tsx                            # Redirects to /chat (settings now in modal)
│
├── org/[slug]/                             # Org-scoped routes (dynamic slug parameter)
│   ├── layout.tsx                          # Org layout: validates org exists, handles SUSPENDED, applies OrgThemeProvider
│   ├── login/page.tsx                      # Org branded login page (server component, fetches org branding)
│   ├── register/page.tsx                   # Invitation-based registration (server component, validates token)
│   ├── chat/page.tsx                       # Org chat page (onboarding check, then FullChatApp)
│   ├── force-password-change/page.tsx      # Forced password change (expired or admin-forced)
│   └── admin/                              # Org Admin panel
│       ├── layout.tsx                      # Admin layout: verifies admin role, renders AdminSidebar + AdminBreadcrumb
│       ├── page.tsx                        # Admin dashboard overview (quick links to admin sections)
│       ├── instructions/page.tsx           # Org-wide & role-specific AI system instructions
│       ├── roles/page.tsx                  # Role management (create, edit, delete roles)
│       ├── mcp/page.tsx                    # MCP server connections (add, test, assign to roles)
│       ├── users/page.tsx                  # Member management (DataTable, bulk actions, user details panel)
│       ├── invitations/page.tsx            # Invitation lifecycle (send, resend, revoke)
│       ├── security/page.tsx               # Password policy & force-reset controls
│       ├── settings/page.tsx               # Org settings (logo, login page, theme, onboarding, API keys)
│       ├── analytics/page.tsx              # Org analytics dashboard (KPIs, charts, CSV export)
│       ├── usage/page.tsx                  # Redirects to analytics (legacy)
│       ├── audit-logs/page.tsx             # Org audit logs (filter, export)
│       └── conversations/page.tsx          # Conversation compliance (visibility, view, export)
│
├── super-admin/                            # Platform Super Admin panel
│   ├── layout.tsx                          # Super Admin layout: verifies isSuperAdmin, renders AdminSidebar
│   ├── login/page.tsx                      # Super Admin login page (distinct branding)
│   ├── page.tsx                            # Redirects to /super-admin/models
│   ├── [...catchAll]/page.tsx              # Catch-all: redirects unknown paths to /super-admin/models
│   ├── models/page.tsx                     # Model registry management (CRUD)
│   ├── organizations/page.tsx              # Organization management (create, suspend, activate, restore)
│   ├── users/page.tsx                      # Cross-org user lookup & impersonation
│   ├── super-admins/page.tsx               # Super Admin account management
│   ├── api-keys/page.tsx                   # Platform API key management (add, test, assign to orgs)
│   ├── system-prompt/page.tsx              # Global system prompt editor
│   ├── settings/page.tsx                   # Platform settings (registration, defaults)
│   ├── analytics/page.tsx                  # Platform-wide analytics dashboard
│   └── audit-logs/page.tsx                 # Platform audit logs (filter, export)
│
├── api/                                    # Backend API routes (see api/CLAUDE.md for details)
│   ├── auth/                               # Authentication endpoints
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   ├── register/route.ts
│   │   ├── me/route.ts
│   │   ├── find-org/route.ts
│   │   ├── change-password/route.ts
│   │   ├── password-reset/route.ts
│   │   ├── password-reset/confirm/route.ts
│   │   ├── validate-invitation/route.ts
│   │   └── accept-invitation/route.ts
│   ├── chat/route.ts                       # AI chat streaming endpoint
│   ├── conversations/                      # Conversation CRUD
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       ├── title/route.ts
│   │       └── messages/route.ts
│   ├── artifacts/                           # Artifact management
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── files/[fileId]/                      # Anthropic Files API
│   │   ├── route.ts
│   │   └── download/route.ts
│   ├── mcp/connections/                     # User MCP connections
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       ├── discover/route.ts
│   │       └── test/route.ts
│   ├── messages/feedback/route.ts           # Message feedback
│   ├── user/                                # User settings
│   │   ├── settings/route.ts
│   │   ├── preferences/route.ts
│   │   └── anthropic/
│   │       ├── route.ts
│   │       └── test/route.ts
│   ├── org/[slug]/                          # Org-scoped API routes
│   │   ├── models/route.ts
│   │   ├── theme/route.ts
│   │   ├── profile/route.ts
│   │   ├── sessions/route.ts
│   │   ├── sessions/[sessionId]/route.ts
│   │   ├── usage-status/route.ts
│   │   ├── password-policy/route.ts
│   │   ├── onboarding/route.ts
│   │   ├── invitations/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── revoke/route.ts
│   │   │       └── resend/route.ts
│   │   ├── settings/default-role/route.ts
│   │   ├── user/custom-instructions/route.ts
│   │   └── admin/                           # Org admin API routes
│   │       ├── instructions/route.ts
│   │       ├── models/route.ts
│   │       ├── themes/route.ts
│   │       ├── logo/route.ts
│   │       ├── onboarding/route.ts
│   │       ├── analytics/route.ts
│   │       ├── usage/route.ts
│   │       ├── usage/users/route.ts
│   │       ├── audit-logs/route.ts
│   │       ├── audit-logs/export/route.ts
│   │       ├── conversations/route.ts
│   │       ├── conversations/[id]/route.ts
│   │       ├── conversations/export/route.ts
│   │       ├── users/route.ts
│   │       ├── users/[userId]/route.ts
│   │       ├── users/[userId]/force-reset/route.ts
│   │       ├── users/[userId]/force-logout/route.ts
│   │       ├── roles/route.ts
│   │       ├── roles/[roleId]/route.ts
│   │       ├── roles/[roleId]/models/route.ts
│   │       ├── roles/[roleId]/settings/route.ts
│   │       ├── roles/[roleId]/instructions/route.ts
│   │       ├── security/password-policy/route.ts
│   │       ├── security/force-reset/route.ts
│   │       ├── settings/api-keys/route.ts
│   │       ├── settings/api-keys/[id]/test/route.ts
│   │       ├── settings/visibility/route.ts
│   │       ├── settings/login-page/route.ts
│   │       └── mcp/connections/
│   │           ├── route.ts
│   │           └── [id]/
│   │               ├── route.ts
│   │               ├── discover/route.ts
│   │               └── test/route.ts
│   ├── super-admin/                         # Super Admin API routes
│   │   ├── models/route.ts
│   │   ├── models/[id]/route.ts
│   │   ├── organizations/route.ts
│   │   ├── organizations/[id]/route.ts
│   │   ├── organizations/[id]/suspend/route.ts
│   │   ├── organizations/[id]/activate/route.ts
│   │   ├── organizations/[id]/restore/route.ts
│   │   ├── organizations/[id]/logo/route.ts
│   │   ├── organizations/[id]/themes/route.ts
│   │   ├── users/route.ts
│   │   ├── users/[id]/impersonate/route.ts
│   │   ├── super-admins/route.ts
│   │   ├── super-admins/[id]/route.ts
│   │   ├── api-keys/route.ts
│   │   ├── api-keys/[id]/route.ts
│   │   ├── api-keys/[id]/reveal/route.ts
│   │   ├── api-keys/[id]/test/route.ts
│   │   ├── role-templates/route.ts
│   │   ├── role-templates/[id]/route.ts
│   │   ├── system-prompt/route.ts
│   │   ├── settings/route.ts
│   │   ├── analytics/route.ts
│   │   ├── audit-logs/route.ts
│   │   ├── audit-logs/export/route.ts
│   │   └── impersonation/route.ts
│   └── cron/cleanup/route.ts               # Scheduled cleanup job
│
└── CLAUDE.md                               # This file
```

## Pages

### Root Pages

#### Entry Point (`page.tsx`)
**Path:** `/`

Renders the `FindMyOrg` component. Users enter their email, the system finds their organization, and redirects to the org login page (`/org/{slug}/login`). If a valid session exists, auto-redirects to the user's org chat or admin panel.

#### Legacy Chat Page (`chat/page.tsx`)
**Path:** `/chat`

Backward-compatible chat page. Checks for `llmatscale_auth_session` and `llmatscale_auth_token` in localStorage; redirects to `/` if missing. Renders `FullChatApp`. The canonical path is now `/org/{slug}/chat`.

#### Settings Redirect (`settings/page.tsx`)
**Path:** `/settings`

Redirects to `/chat`. Settings functionality lives in the `SettingsModal` component within the chat UI.

### Org Pages (`/org/[slug]/*`)

#### Org Login (`org/[slug]/login/page.tsx`)
**Path:** `/org/{slug}/login`

Server component. Looks up the organization by slug (unscoped Prisma query), fetches branding (logo, tagline, welcome message), fetches active theme, and renders the `OrgLoginPage` client component. Returns 404 if org not found or soft-deleted.

#### Org Registration (`org/[slug]/register/page.tsx`)
**Path:** `/org/{slug}/register?token=xxx`

Server component. Validates the invitation token server-side via `validateInvitationToken`. If valid and slug matches, renders the `RegisterPage` component with invitation data and password requirements. Displays contextual error pages for invalid/expired/revoked tokens.

#### Org Chat (`org/[slug]/chat/page.tsx`)
**Path:** `/org/{slug}/chat`

Protected client page. Checks session, then checks onboarding status via `/api/org/{slug}/onboarding`. If onboarding is required, shows `OnboardingWizard` first. Otherwise renders `FullChatApp`.

#### Force Password Change (`org/[slug]/force-password-change/page.tsx`)
**Path:** `/org/{slug}/force-password-change?reason=expired|admin_forced`

Shown when a user's password has expired or an admin forced a reset. Fetches org password policy, validates new password in real-time against requirements, and calls `/api/auth/change-password`. Redirects to chat on success.

### Org Admin Pages (`/org/[slug]/admin/*`)

All pages are protected by the org admin layout which verifies admin role via API call.

| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/org/{slug}/admin` | Overview with quick links to admin sections |
| Instructions | `/org/{slug}/admin/instructions` | Org-wide and role-specific AI system instructions |
| Roles | `/org/{slug}/admin/roles` | Role CRUD (model access, permissions) |
| MCP | `/org/{slug}/admin/mcp` | MCP server connections (add, test, assign to roles) |
| Users | `/org/{slug}/admin/users` | Member management (DataTable, bulk actions, details panel) |
| Invitations | `/org/{slug}/admin/invitations` | Invitation lifecycle (send, resend, revoke) |
| Security | `/org/{slug}/admin/security` | Password policy configuration, force-reset controls |
| Settings | `/org/{slug}/admin/settings` | Org info, logo, login page, theme, onboarding, API keys |
| Analytics | `/org/{slug}/admin/analytics` | Analytics dashboard (KPIs, charts, CSV export) |
| Usage | `/org/{slug}/admin/usage` | Redirects to analytics (legacy) |
| Audit Logs | `/org/{slug}/admin/audit-logs` | Org-scoped audit logs with filter and export |
| Conversations | `/org/{slug}/admin/conversations` | Conversation compliance (visibility toggle, view, export) |

### Super Admin Pages (`/super-admin/*`)

All pages (except login) are protected by the super admin layout which verifies `isSuperAdmin` in session.

| Page | Path | Purpose |
|------|------|---------|
| Login | `/super-admin/login` | Super Admin login (distinct branding, bypasses layout auth) |
| Dashboard | `/super-admin` | Redirects to `/super-admin/models` |
| Catch-All | `/super-admin/*` | Unknown paths redirect to `/super-admin/models` |
| Models | `/super-admin/models` | Model registry management (CRUD) |
| Organizations | `/super-admin/organizations` | Org management (create, suspend, activate, restore) |
| Users | `/super-admin/users` | Cross-org user lookup and impersonation |
| Super Admins | `/super-admin/super-admins` | Super Admin account management |
| API Keys | `/super-admin/api-keys` | Platform API key management (add, test, assign to orgs) |
| System Prompt | `/super-admin/system-prompt` | Global system prompt editor |
| Settings | `/super-admin/settings` | Platform settings |
| Analytics | `/super-admin/analytics` | Platform-wide analytics dashboard |
| Audit Logs | `/super-admin/audit-logs` | Platform audit logs with filter and export |

## Layouts

### Root Layout (`layout.tsx`)
- Loads Geist and Geist Mono fonts
- Sets metadata (title, description, robots: noindex/nofollow)
- Sets viewport configuration with theme-color for light/dark
- Wraps children in `<Providers>` (context providers)
- Renders `<ImpersonationBanner />` (visible when super admin impersonates a user)
- Renders `<Toaster />` for toast notifications
- Imports `globals.css` and `artifact-panel.css`

### Org Layout (`org/[slug]/layout.tsx`)
- Server component
- Looks up organization by slug (unscoped Prisma query)
- Returns 404 if org not found or soft-deleted
- Shows suspension message if org status is SUSPENDED
- Fetches active theme server-side via `getActiveTheme`
- Wraps children in `<OrgThemeProvider>` (no FOUC)

### Org Admin Layout (`org/[slug]/admin/layout.tsx`)
- Client component
- Validates session and verifies admin role via API call to `/api/org/{slug}/admin/instructions`
- Redirects non-admins to `/org/{slug}/chat` with toast error
- Redirects unauthenticated users to `/org/{slug}/login`
- Renders `<AdminSidebar variant="org-admin">` + `<AdminBreadcrumb>` + content

### Super Admin Layout (`super-admin/layout.tsx`)
- Client component
- Validates session and checks `isSuperAdmin === true`
- Login page (`/super-admin/login`) renders without sidebar or auth check
- Redirects org users to their org chat
- Redirects unauthenticated users to `/super-admin/login`
- Renders `<AdminSidebar variant="super-admin">` + content

## Special Files

### `not-found.tsx`
Global 404 page displaying "Organization not found" with a link back to `/`. Intentionally does not reveal whether the organization ever existed (no info leakage).

### `loading.tsx`
Global loading state using `PageLoadingSkeleton` component, shown during page transitions.

### `globals.css`
Theme variables using TailwindCSS v4 `@theme` directive. Defines colors (background, foreground, primary, secondary, destructive, border, sidebar, etc.), font families, and border-radius tokens. Includes `.dark` class overrides for dark theme. Theme stored in localStorage (`llmatscale_theme`).

### `artifact-panel.css`
Styles for the artifact preview panel in the chat interface.

## Session Management

### Storage Keys
- `llmatscale_auth_token` - Bearer token for API authentication
- `llmatscale_auth_session` - JSON session data (user, organization, expiresAt, isSuperAdmin)

### Auth Flow
1. User visits `/` (Find My Org) or `/org/{slug}/login`
2. Submits credentials to `POST /api/auth/login`
3. On success: token + session stored in localStorage
4. Protected pages check localStorage on mount; redirect to login if missing/expired
5. Super Admin pages additionally verify `isSuperAdmin === true` in session data

### Route Protection Pattern
All protected pages use client-side auth checks:
- Read `llmatscale_auth_session` and `llmatscale_auth_token` from localStorage
- Check expiration from `session.expiresAt`
- Show `PageLoadingSkeleton` during check
- Redirect to appropriate login page if invalid

## Related Documentation

- **Components:** `components/CLAUDE.md`
- **Backend API:** `app/api/CLAUDE.md`
- **Project Overview:** `CLAUDE.md` (root)
