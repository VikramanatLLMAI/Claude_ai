---
phase: 07-theming-branding-and-compliance
verified: 2026-03-05T20:00:00Z
status: human_needed
score: 5/5
must_haves:
  truths:
    - "Super Admin can assign available themes to an org, Org Admin can choose the active theme from assigned themes, and if an assigned theme is removed the system falls back gracefully to the default"
    - "Org Admin can upload a logo, and branding applies across the org login page and chat sidebar"
    - "Users can toggle between light, dark, and system mode independently from the org theme, and their preference persists across sessions"
    - "Org Admin can enable conversation visibility, gaining read-only access to all org conversations with filtering and export, while users acknowledged conversation visibility during onboarding agreement"
    - "Scheduled tasks automatically purge soft-deleted orgs after 30 days, clean up expired invitations, and clean up expired sessions"
  artifacts:
    - path: "lib/services/theme-service.ts"
      provides: "Theme CRUD, assignment, fallback logic"
    - path: "lib/services/cleanup-service.ts"
      provides: "Scheduled cleanup logic"
    - path: "lib/services/conversation-visibility-service.ts"
      provides: "Conversation listing, detail, and export"
    - path: "lib/services/onboarding-service.ts"
      provides: "Onboarding check, accept, config"
    - path: "lib/services/impersonation-service.ts"
      provides: "Impersonation lifecycle management"
    - path: "components/admin/theme-assignment-panel.tsx"
      provides: "Super Admin theme assignment UI"
    - path: "components/admin/theme-selector.tsx"
      provides: "Org Admin theme picker"
    - path: "components/org-theme-provider.tsx"
      provides: "Client-side theme application"
    - path: "components/admin/conversation-viewer.tsx"
      provides: "Read-only conversation viewer"
    - path: "components/admin/impersonation-banner.tsx"
      provides: "Impersonation visual banner"
    - path: "components/onboarding-wizard.tsx"
      provides: "Multi-step onboarding wizard"
  key_links:
    - from: "app/org/[slug]/layout.tsx"
      to: "components/org-theme-provider.tsx"
      via: "OrgThemeProvider wrapping org children"
    - from: "app/super-admin/organizations/page.tsx"
      to: "components/admin/theme-assignment-panel.tsx"
      via: "ThemeAssignmentPanel in org edit dialog"
    - from: "app/org/[slug]/chat/page.tsx"
      to: "components/onboarding-wizard.tsx"
      via: "Onboarding gate before chat render"
    - from: "app/layout.tsx"
      to: "components/admin/impersonation-banner.tsx"
      via: "ImpersonationBanner in root layout"
human_verification:
  - test: "Theme management end-to-end flow"
    expected: "Super Admin assigns themes, Org Admin sees only assigned themes, selected theme applies across org, fallback works on removal"
    why_human: "Visual theme rendering, CSS data-theme application, FOUC absence cannot be verified programmatically"
  - test: "Login page branding"
    expected: "Org login page shows logo, tagline, welcome message, and org theme colors"
    why_human: "Visual layout, two-column design, responsive behavior require human eyes"
  - test: "Onboarding wizard flow"
    expected: "New user sees 3-step wizard, conversation visibility notice when enabled, chat blocked until accepted"
    why_human: "Step transitions, Framer Motion animations, conditional content require runtime verification"
  - test: "Impersonation session lifecycle"
    expected: "Banner appears, countdown works, session auto-expires, SA session restored on end"
    why_human: "Real-time countdown timer, session token swapping, redirect behavior need runtime testing"
  - test: "Cron cleanup execution"
    expected: "Endpoint returns cleanup counts, expired records actually deleted"
    why_human: "Requires database state with expired records to verify actual cleanup behavior"
---

# Phase 7: Theming, Branding, and Compliance Verification Report

**Phase Goal:** Organizations have visual identity through theme selection and branding, conversation visibility gives Org Admin compliance oversight, user impersonation enables support, and scheduled tasks keep the system clean
**Verified:** 2026-03-05T20:00:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Super Admin can assign themes to org, Org Admin can choose active theme, fallback works on removal | VERIFIED | ThemeAssignmentPanel integrated in org edit dialog, ThemeSelector shows only assigned themes, theme-service.ts has fallback chain (active -> default -> null), OrgThemeProvider applies data-theme in org layout |
| 2 | Org Admin can upload logo, branding applies across org login page and chat sidebar | VERIFIED | logo route.ts has POST/DELETE with multipart upload, login page.tsx fetches logoBase64/tagline/welcomeMessage server-side, full-chat-app.tsx displays orgLogo in sidebar based on logoDisplayMode |
| 3 | Users can toggle light/dark/system mode independently from org theme, preference persists | VERIFIED | settings-modal.tsx has light/dark/system toggle, COLOR_THEME references removed, PATCH /api/user/preferences persists themeMode, API sync on modal open |
| 4 | Org Admin can enable conversation visibility with read-only access, filtering, export; users acknowledge via onboarding | VERIFIED | Visibility toggle API with audit logging, conversations page with DataTable/filters/pagination, ConversationViewer is read-only (GET only), OnboardingWizard shows visibility notice, chat page gates on onboarding |
| 5 | Scheduled tasks purge soft-deleted orgs, clean expired invitations and sessions | VERIFIED | cleanup-service.ts exports purgeDeletedOrganizations (30-day check), cleanupExpiredInvitations, cleanupExpiredSessions, runScheduledCleanup; cron route uses CRON_SECRET bearer auth |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/services/theme-service.ts` | Theme CRUD with fallback | VERIFIED (250 lines) | Exports setOrgThemes, getAssignedThemes, setActiveTheme, getActiveTheme, isValidTheme; uses prisma.orgThemeAssignment |
| `lib/services/cleanup-service.ts` | Scheduled cleanup | VERIFIED (177 lines) | Exports purgeDeletedOrganizations, cleanupExpiredInvitations, cleanupExpiredSessions, runScheduledCleanup |
| `lib/services/conversation-visibility-service.ts` | Conversation compliance | VERIFIED (251 lines) | Exports listOrgConversations, getConversationDetail, exportConversations |
| `lib/services/onboarding-service.ts` | Onboarding lifecycle | VERIFIED (159 lines) | Exports checkOnboardingRequired, acceptOnboarding, getOnboardingConfig, updateOnboardingConfig |
| `lib/services/impersonation-service.ts` | Impersonation lifecycle | VERIFIED (269 lines) | Exports startImpersonation, endImpersonation, getImpersonationStatus |
| `components/admin/theme-assignment-panel.tsx` | Super Admin theme UI | VERIFIED (232 lines) | Checkbox grid with color swatches, default theme selector, save to API |
| `components/admin/theme-selector.tsx` | Org Admin theme picker | VERIFIED (188 lines) | Shows only assigned themes as cards, calls PUT to set active theme |
| `components/org-theme-provider.tsx` | Client-side theme application | VERIFIED (36 lines) | Sets data-theme on documentElement, removes on unmount |
| `components/admin/conversation-viewer.tsx` | Read-only conversation viewer | VERIFIED (261 lines) | Dialog with message rendering, no edit/delete actions |
| `components/admin/impersonation-banner.tsx` | Impersonation banner | VERIFIED (179 lines) | Fixed-position amber banner with countdown, end button |
| `components/onboarding-wizard.tsx` | Multi-step onboarding wizard | VERIFIED (306 lines) | 3-step wizard (Welcome, Terms, Confirmation), conversation visibility notice |
| `app/api/super-admin/organizations/[id]/themes/route.ts` | SA theme assignment API | VERIFIED (89 lines) | GET/PUT, calls setOrgThemes |
| `app/api/org/[slug]/admin/themes/route.ts` | OA theme selection API | VERIFIED (80 lines) | GET/PUT, calls setActiveTheme with server-side validation |
| `app/api/org/[slug]/theme/route.ts` | User theme fetch API | VERIFIED (34 lines) | GET with requireOrgAuth |
| `app/api/cron/cleanup/route.ts` | Cron cleanup route | VERIFIED (74 lines) | CRON_SECRET bearer auth, calls runScheduledCleanup |
| `app/api/user/preferences/route.ts` | User preferences API | VERIFIED (66 lines) | GET/PATCH with requireAuth, Zod validation |
| `app/api/super-admin/users/route.ts` | User search API | VERIFIED (123 lines) | Search across orgs with pagination |
| `app/api/super-admin/users/[id]/impersonate/route.ts` | Start impersonation API | VERIFIED (84 lines) | POST with duration/reason, calls startImpersonation |
| `app/api/super-admin/impersonation/route.ts` | Impersonation management API | VERIFIED (131 lines) | GET status, DELETE to end |
| `app/api/org/[slug]/admin/logo/route.ts` | Logo upload API | VERIFIED (125 lines) | POST multipart (max 500KB), DELETE; Base64 data URI storage |
| `app/api/org/[slug]/admin/settings/login-page/route.ts` | Login page customization API | VERIFIED (96 lines) | GET/PUT tagline and welcomeMessage |
| `app/api/org/[slug]/admin/settings/visibility/route.ts` | Visibility toggle API | VERIFIED (69 lines) | GET/PATCH with audit logging (OVIS-07) |
| `app/api/org/[slug]/admin/onboarding/route.ts` | Admin onboarding config API | VERIFIED (62 lines) | GET/PUT onboarding text |
| `app/api/org/[slug]/onboarding/route.ts` | User onboarding API | VERIFIED (57 lines) | GET check + POST acceptance |
| `app/org/[slug]/admin/conversations/page.tsx` | Conversations compliance page | VERIFIED (572 lines) | DataTable with filters, checkbox selection, bulk export |
| `app/super-admin/users/page.tsx` | User search + impersonation page | VERIFIED (405 lines) | Search, impersonation dialog with duration/reason |
| `app/api/org/[slug]/admin/conversations/[id]/route.ts` | Conversation detail API | VERIFIED (51 lines) | GET with visibility gate |
| `app/api/org/[slug]/admin/conversations/export/route.ts` | Conversation export API | VERIFIED (93 lines) | JSON single / ZIP multiple via JSZip |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/org/[slug]/layout.tsx` | `components/org-theme-provider.tsx` | OrgThemeProvider wrapping children | WIRED | Import + usage confirmed; server-side theme fetch passes activeTheme prop |
| `app/super-admin/organizations/page.tsx` | `components/admin/theme-assignment-panel.tsx` | ThemeAssignmentPanel in org edit | WIRED | Import + rendered in edit dialog with orgId prop |
| `app/org/[slug]/admin/settings/page.tsx` | `components/admin/theme-selector.tsx` | ThemeSelector in settings | WIRED | Import + rendered with orgSlug prop |
| `app/org/[slug]/chat/page.tsx` | `components/onboarding-wizard.tsx` | Onboarding gate | WIRED | Import + conditional render; fetches /api/org/{slug}/onboarding on mount |
| `app/layout.tsx` | `components/admin/impersonation-banner.tsx` | ImpersonationBanner global | WIRED | Import + rendered inside Providers |
| `lib/auth-middleware.ts` | Session impersonation fields | impersonationExpiresAt check | WIRED | Auto-expiry logic + impersonatorId in auth context |
| `components/settings-modal.tsx` | `app/api/user/preferences/route.ts` | PATCH fetch for theme mode | WIRED | Fire-and-forget PATCH on theme change, GET on modal open |
| `components/full-chat-app.tsx` | Login API org info | Logo display in sidebar | WIRED | Reads orgLogo/orgLogoDisplayMode from session, renders img |
| `app/org/[slug]/login/page.tsx` | Prisma OrgSettings | Server-side branding fetch | WIRED | Fetches logoBase64, tagline, welcomeMessage, active theme |
| `components/admin/admin-sidebar.tsx` | Conversations page | Sidebar nav item | WIRED | "Conversations" with MessageCircle icon in Monitoring group |
| `app/api/super-admin/organizations/[id]/themes/route.ts` | `lib/services/theme-service.ts` | setOrgThemes call | WIRED | Import + invocation confirmed |
| `app/api/org/[slug]/admin/themes/route.ts` | `lib/services/theme-service.ts` | setActiveTheme call | WIRED | Import + invocation confirmed |
| `app/api/org/[slug]/admin/settings/visibility/route.ts` | Audit service | auditLog.record | WIRED | Logs visibility toggle changes |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SORG-08 | 07-01 | Super Admin assigns available themes to each org | SATISFIED | setOrgThemes in theme-service.ts, PUT API, ThemeAssignmentPanel UI |
| SORG-09 | 07-01 | Super Admin sets default theme for each org | SATISFIED | isDefault field in OrgThemeAssignment, default selector in ThemeAssignmentPanel |
| OTHM-01 | 07-03 | Org Admin chooses active theme from assigned themes | SATISFIED | ThemeSelector shows only assigned themes, setActiveTheme API |
| OTHM-02 | 07-03 | Org Admin cannot see unassigned themes | SATISFIED | ThemeSelector fetches from admin/themes which returns only assigned |
| OTHM-03 | 07-03 | 5 available themes: Claude, Vercel, Solar Dusk, Twitter, Violet Bloom | SATISFIED | VALID_THEMES constant in theme-service.ts |
| OTHM-04 | 07-03 | Theme applies to entire org | SATISFIED | OrgThemeProvider in org layout sets data-theme on documentElement |
| OTHM-05 | 07-01 | Fallback to default when active theme removed | SATISFIED | setOrgThemes clears activeTheme if not in new set; getActiveTheme returns default |
| OTHM-06 | 07-01 | Fallback to platform default when all themes removed | SATISFIED | getActiveTheme returns null when no assignments; frontend uses platform default |
| OTHM-07 | 07-01 | Server-side validation: cannot set theme outside assigned | SATISFIED | setActiveTheme validates against assigned themes, returns error |
| OBRN-01 | 07-06 | Org Admin uploads org logo | SATISFIED | POST /api/org/{slug}/admin/logo with multipart, max 500KB, Base64 storage |
| OBRN-02 | N/A | ~~Org Admin sets primary brand color~~ | DROPPED | Dropped per CONTEXT.md decision -- org identity via theme + logo only |
| OBRN-03 | N/A | ~~Org Admin sets accent color~~ | DROPPED | Dropped per CONTEXT.md decision |
| OBRN-04 | N/A | ~~Branding changes apply across org~~ | DROPPED | Dropped per CONTEXT.md decision |
| UTHEM-01 | 07-02 | User toggles light/dark/system mode | SATISFIED | settings-modal.tsx has Theme type with 3 modes, applyTheme handles each |
| UTHEM-02 | 07-02 | Preference stored per user | SATISFIED | PATCH /api/user/preferences persists themeMode to User.preferences JSON |
| UTHEM-03 | 07-02 | Independent from org theme | SATISFIED | .dark class (user mode) separate from data-theme (org theme); color picker removed |
| OVIS-01 | 07-04 | Org Admin toggles conversation visibility | SATISFIED | GET/PATCH visibility API with boolean toggle |
| OVIS-02 | 07-04 | When enabled, read-only access to all conversations | SATISFIED | listOrgConversations uses tenantDb for org scoping, ConversationViewer is read-only |
| OVIS-03 | 07-04 | Filter by user, date, model | SATISFIED | Conversations page has user dropdown, date range, model filter |
| OVIS-04 | 07-04 | Export conversations for compliance | SATISFIED | Export API returns JSON (single) or ZIP (multiple), download button on page |
| OVIS-05 | 07-04 | Cannot modify or delete conversations | SATISFIED | Only GET endpoints exist for conversation data; no PUT/DELETE/POST |
| OVIS-06 | 07-06 | Users acknowledge visibility during onboarding | SATISFIED | OnboardingWizard step 2 shows visibility notice when enabled; chat page gates access |
| OVIS-07 | 07-04 | Visibility toggle logged in audit | SATISFIED | PATCH handler calls auditLog.record with visibility change action |
| SAUD-04 | 07-05 | User impersonation for support | SATISFIED | Full lifecycle: search, start (with duration/reason), banner, auto-expiry, end, audit trail |
| CRON-01 | 07-01 | Auto-purge orgs 30 days after soft delete | SATISFIED | purgeDeletedOrganizations checks deletedAt < now - 30 days, cascade deletes |
| CRON-02 | 07-01 | Cleanup expired invitations | SATISFIED | cleanupExpiredInvitations deletes PENDING where expiresAt < now |
| CRON-03 | 07-01 | Cleanup expired sessions | SATISFIED | cleanupExpiredSessions deletes where expiresAt < now |

**Note on OBRN-02, OBRN-03, OBRN-04:** These were included in the phase requirement list but explicitly dropped during the CONTEXT.md planning phase. The decision rationale: "No brand color overrides -- org identity comes from theme selection + logo only." This is documented in both 07-CONTEXT.md and 07-RESEARCH.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | -- | -- | -- | No anti-patterns detected in any Phase 7 files |

All `return null` instances in Phase 7 code are legitimate conditional returns (entity not found, not impersonating, no swatch match) -- not stubs. No TODO/FIXME/PLACEHOLDER/coming-soon patterns found.

### Human Verification Required

### 1. Theme Management End-to-End

**Test:** Log in as Super Admin, assign 3 themes to an org (e.g., claude, vercel, solar-dusk), set default. Log in as Org Admin, verify only 3 assigned themes visible. Select a theme, verify it applies. As Super Admin, remove active theme -- verify fallback to default. Remove all themes -- verify fallback to platform default (claude).
**Expected:** Full theme lifecycle works with graceful fallback at each level.
**Why human:** Visual theme rendering (CSS custom properties via data-theme), FOUC absence, and color swatch accuracy cannot be verified programmatically.

### 2. User Light/Dark/System Mode

**Test:** Log in as regular user, open Settings modal. Verify NO color theme picker visible. Toggle light/dark/system. Refresh -- verify persistence. Change org theme as admin -- verify user light/dark preference is independent.
**Expected:** Light/dark mode toggles correctly (.dark class), persists across sessions, does not interfere with org theme colors.
**Why human:** Visual dark mode rendering, system preference detection, and independence from org theme require visual confirmation.

### 3. Login Page Branding

**Test:** As Org Admin, upload a logo, set tagline and welcome message. Visit org login page. Verify two-column layout with branding (logo, tagline, welcome message) on left and form on right. Verify org theme colors applied.
**Expected:** Production-grade login page with org branding.
**Why human:** Visual layout, responsive design, logo rendering quality require human eyes.

### 4. Onboarding Wizard Flow

**Test:** As Org Admin, configure onboarding text and enable conversation visibility. Log in as new user (or clear onboarding). Verify 3-step wizard: Welcome -> Terms (with visibility notice) -> Confirmation. Accept and verify chat access.
**Expected:** Wizard blocks chat, shows correct content, conversation visibility notice appears when enabled.
**Why human:** Step transitions (Framer Motion), conditional content rendering, and blocking behavior need runtime testing.

### 5. Conversation Visibility Compliance

**Test:** As Org Admin, enable visibility. Go to Conversations page. Verify list of all org conversations. Filter by user, date, model. Open a conversation -- verify read-only (no edit/delete). Select multiple and export.
**Expected:** Full compliance view with filtering, read-only enforcement, and JSON/ZIP export.
**Why human:** DataTable rendering, filter behavior, export file contents, read-only enforcement require interactive testing.

### 6. User Impersonation

**Test:** As Super Admin, go to Users page. Search for an org user. Click Impersonate with 15 min duration and reason. Verify redirect to user's org chat with amber banner and countdown. Send a test message. Click End Impersonation. Verify return to Super Admin context. Check audit logs.
**Expected:** Full impersonation lifecycle with visual banner, countdown, session swap, and audit trail.
**Why human:** Session token management, real-time countdown, redirect behavior, and audit log entries require runtime verification.

### 7. Cron Cleanup

**Test:** Trigger `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cleanup`. Verify JSON response with cleanup counts. Check audit logs for system cleanup entries.
**Expected:** Endpoint returns counts for purged orgs, expired invitations, expired sessions.
**Why human:** Requires database state with expired records to verify actual cleanup. Without test data, counts will be zero.

### Gaps Summary

No gaps found. All 24 active requirements (27 listed minus 3 dropped OBRN-02/03/04) are satisfied at the code level. All 28 artifacts exist, are substantive (not stubs), and are properly wired into the application. No Phase 7 files have TypeScript errors (pre-existing tenantDb typing issues are from earlier phases).

The 3 dropped requirements (OBRN-02, OBRN-03, OBRN-04) were explicitly scoped out during planning with documented rationale in CONTEXT.md. This is a legitimate design decision, not a gap.

Human verification is needed to confirm visual rendering, real-time behavior, and end-to-end flows work correctly in the running application.

---

_Verified: 2026-03-05T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
