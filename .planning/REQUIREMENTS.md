# Requirements: LLMatscale.ai RBAC Multi-Tenant Platform

**Defined:** 2026-02-26
**Core Value:** Organizations can securely deploy AI chat to their teams with full control over who can access what — models, tools, settings, and conversations — while maintaining complete data isolation between organizations.

## v1 Requirements

Requirements for initial release. All features from the RBAC specification are v1.

### Schema & Foundation (SCHEMA)

- [x] **SCHEMA-01**: Fresh database schema with multi-tenant models (Organization, OrgMember, Role, Invitation, AuditLog, UsageRecord, PlatformApiKey, PasswordPolicy, OrgThemeAssignment, OrgSettings)
- [x] **SCHEMA-02**: All existing data tables (Conversation, Message, Artifact, McpConnection) gain mandatory organizationId column for tenant isolation
- [x] **SCHEMA-03**: Tenant-scoped Prisma Client Extension auto-injects organizationId into every query — single enforcement point for data isolation
- [x] **SCHEMA-04**: Soft delete support on Organization model (deletedAt timestamp, 30-day grace period)
- [x] **SCHEMA-05**: OrgMember junction model links User to Organization with role assignment and org-specific custom instructions
- [x] **SCHEMA-06**: Partial unique indexes to handle soft-deleted org name conflicts

### Authentication & Authorization (AUTH)

- [x] **AUTH-01**: Enriched auth context returns user + org membership + role + permissions in a single query on every request
- [x] **AUTH-02**: `requireOrgAuth()` middleware validates session, org membership, and role context for all org-scoped routes
- [x] **AUTH-03**: `requireSuperAdmin()` middleware for all platform-level routes
- [x] **AUTH-04**: Session model extended with organizationId and role context
- [x] **AUTH-05**: Super Admin seed script (CLI command) creates the first Super Admin — no UI registration path
- [x] **AUTH-06**: Super Admin has no org context and cannot use chat
- [x] **AUTH-07**: Authorization enforced at API route handler level (not Next.js middleware) per CVE-2025-29927 defense-in-depth

### Routing & Multi-Tenancy (ROUTE)

- [x] **ROUTE-01**: Subdomain-based routing — `admin.llmatscale.ai` for Super Admin panel
- [x] **ROUTE-02**: Subdomain-based routing — `{org-slug}.llmatscale.ai` for org user chat access
- [x] **ROUTE-03**: Org Admin panel at `{org-slug}.llmatscale.ai/admin` accessible only to Org Admins of that org
- [x] **ROUTE-04**: Org slug resolved from subdomain on every request to establish tenant context
- [x] **ROUTE-05**: Data isolation enforced — users from Org A cannot access anything from Org B, all data strictly filtered by org

### Super Admin — Organization Management (SORG)

- [x] **SORG-01**: Super Admin can create new organizations with name, slug, and initial settings
- [x] **SORG-02**: Super Admin can edit organization details
- [x] **SORG-03**: Super Admin can suspend an organization (disables all users in that org)
- [x] **SORG-04**: Super Admin can activate a suspended organization
- [x] **SORG-05**: Super Admin can delete an organization (30-day grace period before permanent deletion)
- [x] **SORG-06**: Super Admin can view all organizations with stats (user count, usage, status)
- [x] **SORG-07**: Super Admin can upload or update org logo (converted to Base64, stored in database)
- [ ] **SORG-08**: Super Admin can assign available themes to each org (from 5 platform themes)
- [ ] **SORG-09**: Super Admin can set the default theme for each org

### Super Admin — User Management (SUSR)

- [x] **SUSR-01**: Super Admin can create other Super Admins
- [x] **SUSR-02**: Super Admin can assign Org Admins to specific organizations
- [x] **SUSR-03**: Super Admin can edit Super Admin details
- [x] **SUSR-04**: Super Admin can delete Super Admins (cannot delete self, must have at least one remaining)

### Super Admin — Platform Settings (SSET)

- [ ] **SSET-01**: Super Admin can manage platform-wide settings
- [ ] **SSET-02**: Super Admin can enable/disable features across the entire platform (feature toggles)

### Super Admin — Platform API Keys (SKEY)

- [ ] **SKEY-01**: Super Admin can add API keys per AI provider (v1: Anthropic only)
- [ ] **SKEY-02**: Super Admin can remove API keys
- [ ] **SKEY-03**: Super Admin can test API key validity
- [ ] **SKEY-04**: Super Admin can assign API keys to specific organizations

### Super Admin — System Role Templates (STPL)

- [x] **STPL-01**: Super Admin can view default system role templates (Technical, Business, Basic)
- [x] **STPL-02**: Super Admin can edit default templates that apply platform-wide
- [x] **STPL-03**: Super Admin can reset any template back to default

### Super Admin — Platform Analytics (SANA)

- [ ] **SANA-01**: Total organizations (active, suspended, deleted) and growth over time
- [ ] **SANA-02**: Total users across all orgs with active vs suspended breakdown
- [ ] **SANA-03**: Total conversations and messages platform-wide
- [ ] **SANA-04**: Total token consumption broken down by org, provider, and model
- [ ] **SANA-05**: Daily / weekly / monthly usage trend charts (Recharts)
- [ ] **SANA-06**: Top organizations by message count, token consumption, and conversations
- [ ] **SANA-07**: Platform-wide AI response error rate broken down by error type
- [ ] **SANA-08**: Peak usage hours across the platform
- [ ] **SANA-09**: API key consumption per org and per provider
- [ ] **SANA-10**: MCP server and tool usage trends across all orgs
- [ ] **SANA-11**: New organizations and users registered over time
- [ ] **SANA-12**: Feature adoption trends across the platform

### Super Admin — Platform Audit Logs (SAUD)

- [ ] **SAUD-01**: Super Admin can view audit logs for all admin actions across all orgs
- [ ] **SAUD-02**: Filter audit logs by date, org, action type, user
- [ ] **SAUD-03**: Export audit logs as CSV or JSON
- [ ] **SAUD-04**: User impersonation for support purposes (read-only, logged in audit)

### Super Admin — Admin Panel UI (SUI)

- [ ] **SUI-01**: Super Admin panel at admin.llmatscale.ai using shadcn sidebar component as base layout
- [ ] **SUI-02**: All Super Admin tables use TanStack Table with sorting, filtering, pagination
- [ ] **SUI-03**: All Super Admin forms, modals, dialogs, dropdowns, tabs, switches use shadcn components
- [ ] **SUI-04**: All Super Admin analytics dashboards use Recharts

### Org Admin — System Instructions (OINST)

- [ ] **OINST-01**: Org Admin can set organization-wide system instructions
- [ ] **OINST-02**: Character limit enforced (default 2000 characters)
- [ ] **OINST-03**: Org instructions stack on top of platform-level system prompt
- [ ] **OINST-04**: Org instructions apply to all users in the org unless overridden at role level

### Org Admin — Logo & Branding (OBRN)

- [ ] **OBRN-01**: Org Admin can upload org logo (converted to Base64, stored in database)
- [ ] **OBRN-02**: Org Admin can set primary brand color
- [ ] **OBRN-03**: Org Admin can set accent color
- [ ] **OBRN-04**: Branding changes apply across the entire org UI instantly

### Org Admin — Theme Management (OTHM)

- [ ] **OTHM-01**: Org Admin can choose active theme from themes assigned by Super Admin
- [ ] **OTHM-02**: Org Admin cannot access or see themes outside of what Super Admin assigned
- [ ] **OTHM-03**: Available themes: Claude, Vercel, Solar Dusk, Twitter, Violet Bloom
- [ ] **OTHM-04**: Theme applies to entire org and all users within it
- [ ] **OTHM-05**: If Super Admin removes a currently active theme, system falls back to org's default theme
- [ ] **OTHM-06**: If all assigned themes are removed, org falls back to platform default styling
- [ ] **OTHM-07**: Org Admin cannot set active theme outside assigned themes — validated server-side

### Org Admin — Password Policy (OPWD)

- [ ] **OPWD-01**: Org Admin can set minimum password length for the org
- [ ] **OPWD-02**: Org Admin can set complexity requirements (uppercase, lowercase, numbers, special characters)
- [ ] **OPWD-03**: Org Admin can force password reset for a specific user or all users in the org at once
- [ ] **OPWD-04**: Org Admin can set password expiry period (e.g. every 90 days)
- [ ] **OPWD-05**: Existing passwords that do not meet a newly tightened policy are only enforced on next login — no immediate lockout
- [ ] **OPWD-06**: Org Admin cannot lock themselves out via password policy changes

### Org Admin — Default Role (ODEF)

- [x] **ODEF-01**: Org Admin can set a default role automatically assigned when a new user accepts an invitation without a specified role
- [ ] **ODEF-02**: If the default role is deleted, the field clears automatically and next invitation requires explicit role selection

### Org Admin — Conversation Visibility (OVIS)

- [ ] **OVIS-01**: Org Admin can toggle org-level conversation visibility (default: off — all conversations private)
- [ ] **OVIS-02**: When enabled, Org Admin gains read-only access to all conversations in the org
- [ ] **OVIS-03**: Org Admin can filter conversations by user, date, or model
- [ ] **OVIS-04**: Org Admin can export conversations for compliance purposes
- [ ] **OVIS-05**: Org Admin cannot modify or delete user conversations
- [ ] **OVIS-06**: When enabled, users see a clear notice in the chat UI that their conversations may be visible to their admin
- [ ] **OVIS-07**: Visibility setting change is logged in audit logs

### Org Admin — User Management (OUSR)

- [x] **OUSR-01**: Org Admin can invite users to the org via email (Resend API)
- [ ] **OUSR-02**: Org Admin can view all users in the org with their name, role, avatar, and last active date
- [ ] **OUSR-03**: Org Admin can edit user details (name only — email change not allowed)
- [ ] **OUSR-04**: Org Admin can change a user's role
- [ ] **OUSR-05**: Org Admin can promote a user to Org Admin (same org only)
- [ ] **OUSR-06**: Org Admin can suspend a user (blocks access without deleting)
- [ ] **OUSR-07**: Org Admin can activate a suspended user
- [ ] **OUSR-08**: Org Admin can delete a user
- [x] **OUSR-09**: Org Admin can resend or revoke pending invitations
- [ ] **OUSR-10**: Org Admin can view a user's custom instructions (read-only, for compliance)
- [ ] **OUSR-11**: Org Admin can force-logout a specific user from all active sessions
- [ ] **OUSR-12**: Org Admin can view inactive users (users who have not logged in for 30+ days)

### Org Admin — Role Management (OROL)

- [ ] **OROL-01**: Org Admin can view all roles (system roles + custom roles)
- [ ] **OROL-02**: Org Admin can create custom roles
- [ ] **OROL-03**: Org Admin can edit any role including system roles (name, description, system prompt, model access, permissions)
- [ ] **OROL-04**: Org Admin can delete custom roles only (system roles cannot be deleted)
- [ ] **OROL-05**: Org Admin can view which users are assigned to each role
- [ ] **OROL-06**: Org Admin can enable or disable custom instructions per role
- [ ] **OROL-07**: Org Admin can set character limit for user custom instructions per role (e.g. 500–1000 characters)

### Org Admin — Per Role LLM Access (OLLM)

- [ ] **OLLM-01**: Org Admin can select which Anthropic models the role can access (v1: Anthropic only)
- [ ] **OLLM-02**: Users in that role can only use the permitted models

### Org Admin — Per Role System Instructions (ORSI)

- [ ] **ORSI-01**: Org Admin can set role-specific system instructions
- [ ] **ORSI-02**: Character limit enforced (default 2000 characters)
- [ ] **ORSI-03**: Role instructions stack on top of platform + org level instructions
- [ ] **ORSI-04**: Role instructions fine-tune AI response behavior for that specific role

### Org Admin — Per Role MCP Access (OMCP)

- [ ] **OMCP-01**: Org Admin can connect MCP servers (only Org Admin can do this, users cannot)
- [ ] **OMCP-02**: Org Admin can assign an MCP server to the entire org — all users across all roles get access automatically
- [ ] **OMCP-03**: Org Admin can assign an MCP server to a specific role only — only users in that role get access
- [ ] **OMCP-04**: Both assignment types coexist — user's accessible MCP servers = org-wide servers + their role's servers
- [ ] **OMCP-05**: Org Admin can remove or disconnect MCP servers independently per assignment type

### Org Admin — API Key Management (OAKEY)

- [ ] **OAKEY-01**: Org Admin can view platform API keys assigned to the org (read-only)
- [ ] **OAKEY-02**: Org Admin can test assigned API key validity

### Org Admin — Usage & Limits (OUSE)

- [ ] **OUSE-01**: Org Admin can configure usage limits per role (daily requests, daily tokens)
- [ ] **OUSE-02**: Org Admin can view org-wide usage statistics
- [ ] **OUSE-03**: Org Admin can view per-user usage
- [ ] **OUSE-04**: Org Admin can monitor users approaching or exceeding limits
- [ ] **OUSE-05**: Org Admin can view inactive users (not logged in for 30+ days) for seat cleanup

### Org Admin — Usage Limit Alerts (OALT)

- [ ] **OALT-01**: Dashboard alert when a user reaches 80% of their limit
- [ ] **OALT-02**: Dashboard alert when a user is hard blocked at 100%
- [ ] **OALT-03**: Alerts persist until the usage period resets or limit is increased

### Org Admin — Org Analytics (OANA)

- [ ] **OANA-01**: Total users (active, suspended, pending invite)
- [ ] **OANA-02**: Total conversations and messages within the org
- [ ] **OANA-03**: Token usage broken down by user, role, and model
- [ ] **OANA-04**: Which Anthropic models are used most within the org
- [ ] **OANA-05**: Top users by message count and token consumption
- [ ] **OANA-06**: Per role usage breakdown
- [ ] **OANA-07**: Daily / weekly / monthly usage trend charts (Recharts)
- [ ] **OANA-08**: MCP server and tool usage frequency within the org
- [ ] **OANA-09**: Average response time per model
- [ ] **OANA-10**: AI response error rate within the org
- [ ] **OANA-11**: Peak usage hours within the org
- [ ] **OANA-12**: Invitation status overview (accepted, pending, expired)
- [ ] **OANA-13**: API key usage breakdown per assigned key
- [ ] **OANA-14**: Users approaching or exceeding their limits
- [ ] **OANA-15**: Inactive users report (not logged in for 30+ days)

### Org Admin — Org Audit Logs (OAUD)

- [ ] **OAUD-01**: Org Admin can view all admin actions within the org
- [ ] **OAUD-02**: Filter by date, action type, user
- [ ] **OAUD-03**: Export org audit logs as CSV or JSON

### Org Admin — Admin Panel UI (OUI)

- [ ] **OUI-01**: Org Admin panel at {org-slug}.llmatscale.ai/admin using shadcn sidebar component as base layout
- [ ] **OUI-02**: All Org Admin tables use TanStack Table with sorting, filtering, pagination
- [ ] **OUI-03**: All Org Admin forms, modals, dialogs, dropdowns, tabs, switches use shadcn components
- [ ] **OUI-04**: All Org Admin analytics dashboards use Recharts

### Regular User — Authentication & Registration (UATH)

- [x] **UATH-01**: User can register with email and password via invitation acceptance flow
- [x] **UATH-02**: Name is required at registration (used in UI and injected into AI system prompt)
- [x] **UATH-03**: Initial-based avatar auto-generated from name at registration (e.g. "JD" for John Doe)
- [x] **UATH-04**: User subject to org password policy on registration and password changes

### Regular User — Profile (UPRF)

- [ ] **UPRF-01**: User can update display name
- [ ] **UPRF-02**: User can upload profile avatar (converted to Base64, stored in database, max 200KB, PNG/JPG only)
- [ ] **UPRF-03**: User cannot change own email (Org Admin action required)
- [ ] **UPRF-04**: User cannot change own role

### Regular User — Session Management (USES)

- [ ] **USES-01**: User can view all active sessions (device, last active)
- [ ] **USES-02**: User can manually revoke any specific session (logout from a specific device)

### Regular User — Theme Preference (UTHEM)

- [ ] **UTHEM-01**: User can toggle between light, dark, or system mode
- [ ] **UTHEM-02**: Personal preference stored per user
- [ ] **UTHEM-03**: Completely independent from org theme — applies light/dark on top of whatever org theme is active

### Regular User — Custom Instructions (UCUST)

- [ ] **UCUST-01**: User can write personal AI behavior preferences in Settings (if enabled by Org Admin for their role)
- [ ] **UCUST-02**: Character limit shown with live counter (limit set by Org Admin per role)
- [ ] **UCUST-03**: Instructions are org-specific — do not carry over if user moves to a different org
- [ ] **UCUST-04**: If Org Admin disables this for the role, the option is completely hidden

### Regular User — Chat (UCHAT)

- [ ] **UCHAT-01**: User can chat with AI using role-permitted Anthropic models only
- [ ] **UCHAT-02**: User subject to daily request and token limits set by Org Admin
- [ ] **UCHAT-03**: User sees warning banner at 80% of their limit
- [ ] **UCHAT-04**: User is blocked with a clear message at 100% of their limit
- [ ] **UCHAT-05**: User cannot configure MCP servers — access determined entirely by Org Admin
- [ ] **UCHAT-06**: If conversation visibility is enabled in their org, a notice is shown in the chat UI

### System Prompt Stack (PRMT)

- [ ] **PRMT-01**: Platform prompt hardcoded at code level — no one can edit via UI
- [ ] **PRMT-02**: Org system instructions stack on top of platform prompt (2000 char limit)
- [ ] **PRMT-03**: Role system instructions stack on top of org instructions (2000 char limit)
- [ ] **PRMT-04**: User layer auto-injected: user's full name, role name, custom instructions (if enabled)
- [ ] **PRMT-05**: All 4 layers combined enforced against system prompt token budget (2000 tokens) at server level on every chat request
- [ ] **PRMT-06**: XML-delimited sections for injection prevention, sanitization of untrusted inputs

### Safety & Protection Rules (SAFE)

- [x] **SAFE-01**: No user can demote, suspend, or delete themselves — enforced at service layer
- [x] **SAFE-02**: Must always have at least 1 Org Admin per org
- [x] **SAFE-03**: Only Super Admin can delete an organization
- [x] **SAFE-04**: Org Admin cannot delete their own org
- [x] **SAFE-05**: 30-day grace period after org deletion — data recoverable during this window
- [x] **SAFE-06**: Must always have at least 1 Super Admin
- [ ] **SAFE-07**: Audit logs are immutable — cannot be edited or deleted by anyone
- [ ] **SAFE-08**: Custom instructions preserved but not injected when Org Admin disables them for a role — re-enabled without data loss
- [ ] **SAFE-09**: Character limits enforced server-side, not just client-side
- [ ] **SAFE-10**: Role-level daily limits and org-level monthly limits enforced — requests hard rejected when exceeded
- [ ] **SAFE-11**: Org Admin conversation access is read-only — no edit or delete

### Scheduled Tasks (CRON)

- [ ] **CRON-01**: Auto-purge organizations 30 days after soft delete (Super Admin can restore before then)
- [ ] **CRON-02**: Cleanup expired invitation tokens
- [ ] **CRON-03**: Cleanup expired sessions

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: Email notifications for usage limit alerts (80% and 100%)
- **NOTF-02**: Email notifications for new user invitation acceptance

### Authentication

- **FAUTH-01**: OAuth/SSO login (SAML, OIDC)
- **FAUTH-02**: SCIM provisioning

### AI Providers

- **PROV-01**: Support for additional AI providers (OpenAI, Google)
- **PROV-02**: Provider abstraction layer

### External

- **EXT-01**: Public API for external integrations
- **EXT-02**: Billing/payment integration (Stripe)
- **EXT-03**: Mobile native app

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth/SSO login | Massive complexity; email/password with strong password policies sufficient at 5-20 org scale |
| Multiple AI providers | v1 is Anthropic only; don't build abstraction until second provider exists |
| Real-time cross-user chat | AI chat platform, not messaging; orthogonal to core value |
| Billing/payment integration | Manual invoicing sufficient until org count grows significantly |
| Email notifications for alerts | In-app dashboard alerts and chat UI banners sufficient for v1 |
| Public API | No external API contract until internal patterns stabilize |
| Mobile native app | Web-only; responsive design covers mobile browsers |
| User-configurable MCP servers | Security risk; Org Admin controls tool surface area |
| Per-user API keys | Complicates tracking/billing; platform keys assigned to orgs |
| ABAC (attribute-based access) | Overkill for fixed 3-level hierarchy at this scale |
| Chat UI rebuild | Existing promptkit-based chat UI is fully working; RBAC layers on top |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | Phase 1 | Complete |
| SCHEMA-02 | Phase 1 | Complete |
| SCHEMA-03 | Phase 1 | Complete |
| SCHEMA-04 | Phase 1 | Complete |
| SCHEMA-05 | Phase 1 | Complete |
| SCHEMA-06 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| AUTH-07 | Phase 1 | Complete |
| ROUTE-01 | Phase 1 | Complete |
| ROUTE-02 | Phase 1 | Complete |
| ROUTE-03 | Phase 1 | Complete |
| ROUTE-04 | Phase 1 | Complete |
| ROUTE-05 | Phase 1 | Complete |
| SAFE-03 | Phase 1 | Complete |
| SAFE-06 | Phase 1 | Complete |
| SORG-01 | Phase 2 | Complete |
| SORG-02 | Phase 2 | Complete |
| SORG-03 | Phase 2 | Complete |
| SORG-04 | Phase 2 | Complete |
| SORG-05 | Phase 2 | Complete |
| SORG-06 | Phase 2 | Complete |
| SORG-07 | Phase 2 | Complete |
| SUSR-01 | Phase 2 | Complete |
| SUSR-02 | Phase 2 | Complete |
| SUSR-03 | Phase 2 | Complete |
| SUSR-04 | Phase 2 | Complete |
| STPL-01 | Phase 2 | Complete |
| STPL-02 | Phase 2 | Complete |
| STPL-03 | Phase 2 | Complete |
| OUSR-01 | Phase 2 | Complete |
| OUSR-09 | Phase 2 | Complete |
| ODEF-01 | Phase 2 | Complete |
| ODEF-02 | Phase 2 | Pending |
| UATH-01 | Phase 2 | Complete |
| UATH-02 | Phase 2 | Complete |
| UATH-03 | Phase 2 | Complete |
| UATH-04 | Phase 2 | Complete |
| SAFE-01 | Phase 2 | Complete |
| SAFE-02 | Phase 2 | Complete |
| SAFE-04 | Phase 2 | Complete |
| SAFE-05 | Phase 2 | Complete |
| UCHAT-01 | Phase 3 | Pending |
| UCHAT-02 | Phase 3 | Pending |
| UCHAT-05 | Phase 3 | Pending |
| UCHAT-06 | Phase 3 | Pending |
| PRMT-01 | Phase 3 | Pending |
| PRMT-02 | Phase 3 | Pending |
| PRMT-03 | Phase 3 | Pending |
| PRMT-04 | Phase 3 | Pending |
| PRMT-05 | Phase 3 | Pending |
| PRMT-06 | Phase 3 | Pending |
| OLLM-01 | Phase 3 | Pending |
| OLLM-02 | Phase 3 | Pending |
| OMCP-01 | Phase 3 | Pending |
| OMCP-02 | Phase 3 | Pending |
| OMCP-03 | Phase 3 | Pending |
| OMCP-04 | Phase 3 | Pending |
| OMCP-05 | Phase 3 | Pending |
| OINST-01 | Phase 3 | Pending |
| OINST-02 | Phase 3 | Pending |
| OINST-03 | Phase 3 | Pending |
| OINST-04 | Phase 3 | Pending |
| ORSI-01 | Phase 3 | Pending |
| ORSI-02 | Phase 3 | Pending |
| ORSI-03 | Phase 3 | Pending |
| ORSI-04 | Phase 3 | Pending |
| UCUST-01 | Phase 3 | Pending |
| UCUST-02 | Phase 3 | Pending |
| UCUST-03 | Phase 3 | Pending |
| UCUST-04 | Phase 3 | Pending |
| SAFE-07 | Phase 3 | Pending |
| SAFE-08 | Phase 3 | Pending |
| SAFE-09 | Phase 3 | Pending |
| OROL-01 | Phase 4 | Pending |
| OROL-02 | Phase 4 | Pending |
| OROL-03 | Phase 4 | Pending |
| OROL-04 | Phase 4 | Pending |
| OROL-05 | Phase 4 | Pending |
| OROL-06 | Phase 4 | Pending |
| OROL-07 | Phase 4 | Pending |
| OUSE-01 | Phase 4 | Pending |
| OUSE-02 | Phase 4 | Pending |
| OUSE-03 | Phase 4 | Pending |
| OUSE-04 | Phase 4 | Pending |
| OUSE-05 | Phase 4 | Pending |
| OALT-01 | Phase 4 | Pending |
| OALT-02 | Phase 4 | Pending |
| OALT-03 | Phase 4 | Pending |
| UCHAT-03 | Phase 4 | Pending |
| UCHAT-04 | Phase 4 | Pending |
| SAFE-10 | Phase 4 | Pending |
| SAFE-11 | Phase 4 | Pending |
| OPWD-01 | Phase 4 | Pending |
| OPWD-02 | Phase 4 | Pending |
| OPWD-03 | Phase 4 | Pending |
| OPWD-04 | Phase 4 | Pending |
| OPWD-05 | Phase 4 | Pending |
| OPWD-06 | Phase 4 | Pending |
| USES-01 | Phase 4 | Pending |
| USES-02 | Phase 4 | Pending |
| UPRF-01 | Phase 4 | Pending |
| UPRF-02 | Phase 4 | Pending |
| UPRF-03 | Phase 4 | Pending |
| UPRF-04 | Phase 4 | Pending |
| SUI-01 | Phase 5 | Pending |
| SUI-02 | Phase 5 | Pending |
| SUI-03 | Phase 5 | Pending |
| SUI-04 | Phase 5 | Pending |
| SKEY-01 | Phase 5 | Pending |
| SKEY-02 | Phase 5 | Pending |
| SKEY-03 | Phase 5 | Pending |
| SKEY-04 | Phase 5 | Pending |
| SSET-01 | Phase 5 | Pending |
| SSET-02 | Phase 5 | Pending |
| SANA-01 | Phase 5 | Pending |
| SANA-02 | Phase 5 | Pending |
| SANA-03 | Phase 5 | Pending |
| SANA-04 | Phase 5 | Pending |
| SANA-05 | Phase 5 | Pending |
| SANA-06 | Phase 5 | Pending |
| SANA-07 | Phase 5 | Pending |
| SANA-08 | Phase 5 | Pending |
| SANA-09 | Phase 5 | Pending |
| SANA-10 | Phase 5 | Pending |
| SANA-11 | Phase 5 | Pending |
| SANA-12 | Phase 5 | Pending |
| SAUD-01 | Phase 5 | Pending |
| SAUD-02 | Phase 5 | Pending |
| SAUD-03 | Phase 5 | Pending |
| OUI-01 | Phase 6 | Pending |
| OUI-02 | Phase 6 | Pending |
| OUI-03 | Phase 6 | Pending |
| OUI-04 | Phase 6 | Pending |
| OUSR-02 | Phase 6 | Pending |
| OUSR-03 | Phase 6 | Pending |
| OUSR-04 | Phase 6 | Pending |
| OUSR-05 | Phase 6 | Pending |
| OUSR-06 | Phase 6 | Pending |
| OUSR-07 | Phase 6 | Pending |
| OUSR-08 | Phase 6 | Pending |
| OUSR-10 | Phase 6 | Pending |
| OUSR-11 | Phase 6 | Pending |
| OUSR-12 | Phase 6 | Pending |
| OAKEY-01 | Phase 6 | Pending |
| OAKEY-02 | Phase 6 | Pending |
| OANA-01 | Phase 6 | Pending |
| OANA-02 | Phase 6 | Pending |
| OANA-03 | Phase 6 | Pending |
| OANA-04 | Phase 6 | Pending |
| OANA-05 | Phase 6 | Pending |
| OANA-06 | Phase 6 | Pending |
| OANA-07 | Phase 6 | Pending |
| OANA-08 | Phase 6 | Pending |
| OANA-09 | Phase 6 | Pending |
| OANA-10 | Phase 6 | Pending |
| OANA-11 | Phase 6 | Pending |
| OANA-12 | Phase 6 | Pending |
| OANA-13 | Phase 6 | Pending |
| OANA-14 | Phase 6 | Pending |
| OANA-15 | Phase 6 | Pending |
| OAUD-01 | Phase 6 | Pending |
| OAUD-02 | Phase 6 | Pending |
| OAUD-03 | Phase 6 | Pending |
| SORG-08 | Phase 7 | Pending |
| SORG-09 | Phase 7 | Pending |
| OTHM-01 | Phase 7 | Pending |
| OTHM-02 | Phase 7 | Pending |
| OTHM-03 | Phase 7 | Pending |
| OTHM-04 | Phase 7 | Pending |
| OTHM-05 | Phase 7 | Pending |
| OTHM-06 | Phase 7 | Pending |
| OTHM-07 | Phase 7 | Pending |
| OBRN-01 | Phase 7 | Pending |
| OBRN-02 | Phase 7 | Pending |
| OBRN-03 | Phase 7 | Pending |
| OBRN-04 | Phase 7 | Pending |
| UTHEM-01 | Phase 7 | Pending |
| UTHEM-02 | Phase 7 | Pending |
| UTHEM-03 | Phase 7 | Pending |
| OVIS-01 | Phase 7 | Pending |
| OVIS-02 | Phase 7 | Pending |
| OVIS-03 | Phase 7 | Pending |
| OVIS-04 | Phase 7 | Pending |
| OVIS-05 | Phase 7 | Pending |
| OVIS-06 | Phase 7 | Pending |
| OVIS-07 | Phase 7 | Pending |
| SAUD-04 | Phase 7 | Pending |
| CRON-01 | Phase 7 | Pending |
| CRON-02 | Phase 7 | Pending |
| CRON-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 195 total
- Mapped to phases: 195
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation*
