# Phase 4: Role Configuration and Usage Limits - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Org Admins can create custom roles with granular permissions, enforce usage limits with threshold alerts, set password policies, and users can manage their sessions and profiles. This phase also refactors the existing Org Admin console UI to SaaS-grade quality with consistent shadcn/Radix UI patterns throughout.

Phase 4 does NOT include: full analytics dashboards (Phase 6), theming/branding (Phase 7), or Super Admin dashboard buildout (Phase 5 — though the org ceiling API is included here).

</domain>

<decisions>
## Implementation Decisions

### Custom Role Management UI
- **Create/Edit via tabbed modal form** — click "Create Role" button or "Edit" on any role card opens a modal
- **4 tabs in modal:** General (name, description) | Models & Tools (model access, MCP assignment) | Limits (daily requests, daily tokens) | Permissions (custom instructions toggle, personal MCP toggle)
- **Same modal for create and edit** — edit pre-fills with current settings. Consistent UX.
- **Role cards become read-only summaries** with Edit button — refactor existing inline-edit cards to read-only display
- **Role cards show member count badge** (e.g., "Technical - 5 users") for role distribution visibility
- **System roles fully editable except delete** — Org Admin can rename, change description, models, limits, instructions. Cannot delete system roles.
- **Custom role deletion blocked if users assigned** — Org Admin must manually reassign all users to a different role before deleting. No auto-reassignment.

### Usage Limits & Alerts
- **Rolling 24-hour window per user** — limit window starts from user's first message of the period, resets exactly 24 hours later. Not a fixed daily reset time.
- **80% warning: persistent top banner** — yellow/amber banner pinned at top of chat area showing usage count and reset time. Stays visible but dismissible until next threshold.
- **100% block: disable input + red banner** — chat input disabled/grayed out, red banner with clear message. User can read conversations but cannot send new messages.
- **Hierarchical limit structure:**
  - Super Admin sets monthly ceiling per org (max requests/month, max tokens/month) — configured on org detail page in Super Admin panel
  - Org Admin configures role-level daily limits AND org-level monthly limits **within the ceiling** set by Super Admin — cannot exceed Super Admin's allocation
- **Org Admin usage monitoring:**
  - Summary cards on admin home page ("X users approaching limits")
  - Full detail page at /admin/usage with per-user usage bars, per-role aggregation, alert badges for 80%/100% users
  - Include charts for usage trends (as much as possible now, refined further in Phase 6)
- **Toggle + input for limit configuration** — toggle switch for "Enable daily request limit" / "Enable daily token limit". Off = unlimited. On = number input appears.

### Password Policy Management
- **Dedicated /admin/security page** — new "Security" section in admin sidebar with password policy settings and force-reset controls
- **Forced password change page** — when password policy is tightened or password expires, user is redirected to a forced password change page on next login. Must comply before accessing the app. No grace period.
- **Force-reset: both individual and bulk** — Org Admin can force-reset individual users (from user management row action) or "Force Reset All Users" (from security page). Both logged to audit.
- **Password expiry uses same forced change flow** — expired passwords redirect to forced change page on next login. Same strict enforcement as policy tightening.

### Session & Profile Management
- **Extended settings modal** — add "Profile" tab (name, avatar upload) and "Sessions" tab (active sessions list, revoke buttons) to the existing chat settings modal
- **Session list shows:** device/browser name (parsed from userAgent), IP-based approximate location (city/country), last active timestamp, "Current session" badge, "Revoke" button
- **Avatar upload: auto-crop to square** — user picks image, auto-crop to centered square, resize to fit 200KB, convert to Base64. Preview shown before save.
- **Org Admin force-logout: user row action** — in user management list, dropdown with "Force Logout" option. Confirmation dialog, logged to audit.
- **User cannot change own email or role** — read-only display in profile

### Admin Console UI Overhaul
- **Refactor existing roles page** — rebuild from inline-card editing to read-only summary cards + modal-based editing. SaaS-grade quality.
- **Redesign admin sidebar with grouped navigation:**
  - Configuration (Roles, Instructions, Models, MCP)
  - Monitoring (Usage, Alerts)
  - Security (Password Policy, Sessions)
  - Users (Members, Invitations)
- **Consistent shadcn + Radix UI** throughout all admin pages — no mixed patterns
- **SaaS-grade UI/UX is the #1 priority** — Vercel's admin dashboard is the design reference. Match that level of polish, spacing, typography, and clean minimalism.

### Claude's Discretion
- Exact chart library/components for usage trends (Recharts likely since Phase 5/6 will use it)
- Session device/location parsing implementation details
- Loading states, skeleton patterns, and transitions
- Exact color scheme for warning/error banners
- Form validation UX details (inline errors vs summary)
- Mobile responsiveness approach for admin pages

</decisions>

<specifics>
## Specific Ideas

- Admin dashboard should look like Vercel's dashboard — that's the sole design reference. Clean, minimal, excellent spacing and typography.
- Settings modal pattern (with sidebar navigation inside) should be the design reference for in-modal navigation
- Charts and data visualization should be included from the start, not deferred
- The rolling 24-hour window is user-specific — each user's limit window is independent based on their activity
- Super Admin ceiling model: if Super Admin gives org 1000 requests/500K tokens monthly, Org Admin can only allocate within that range

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdminSidebar` component (`components/admin/admin-sidebar.tsx`): existing sidebar — will be redesigned with grouped navigation
- `AdminBreadcrumb` component (`components/admin/admin-breadcrumb.tsx`): breadcrumb navigation for admin pages
- `RoleModelAssignment` component (`components/admin/role-model-assignment.tsx`): model toggle assignment — reusable in role modal
- `ConfirmationDialog` component (`components/ui/confirmation-dialog.tsx`): reusable for delete/force-reset confirmations
- `toast` utility (`components/ui/toast.tsx`): notification system for success/error feedback
- Settings modal pattern (`components/settings-modal.tsx`): 42.7KB modal with tabs — reference pattern for profile/session tabs
- shadcn UI components: Button, Card, Input, Switch, Label, Badge, Dialog, Tabs — all available in `components/ui/`

### Established Patterns
- Org Admin layout (`app/org/[slug]/admin/layout.tsx`): SidebarProvider + AdminSidebar + AdminBreadcrumb pattern
- Role API routes: GET/POST at `/api/org/[slug]/admin/roles/`, per-role settings at `/api/org/[slug]/admin/roles/[roleId]/settings/`
- Auth pattern: `requireOrgAdmin()` middleware for admin-only routes
- Session model already has `userAgent`, `ipAddress`, `lastUsedAt` fields — ready for session management
- PasswordPolicy model exists with all needed fields (minLength, complexity booleans, expiryDays)
- Role model already has `dailyRequestLimit` and `dailyTokenLimit` fields — enforcement logic needs implementation
- UsageRecord model tracks per-request token usage with org/user/model indexes

### Integration Points
- Chat route (`app/api/chat/route.ts`): needs usage limit check before processing + usage recording after (recording already exists at line 491)
- Settings modal: needs new Profile and Sessions tabs added
- Admin sidebar: needs new sections (Usage, Security) and grouping redesign
- Roles page: complete refactor from inline editing to modal pattern
- Organization model: needs monthly limit ceiling fields (set by Super Admin)
- User model: needs `passwordChangedAt` or `forcePasswordChange` flag for expiry/policy enforcement
- Login flow: needs forced password change redirect check

</code_context>

<deferred>
## Deferred Ideas

- Full analytics dashboards with detailed breakdowns — enhanced in Phase 6 (Org Admin Dashboard)
- Super Admin dashboard UI for managing org ceilings — Phase 5 builds the full Super Admin panel, but Phase 4 includes the API/backend
- Email notifications for usage limit alerts (80%/100%) — v2 requirement NOTF-01

</deferred>

---

*Phase: 04-role-configuration-and-usage-limits*
*Context gathered: 2026-02-28*
