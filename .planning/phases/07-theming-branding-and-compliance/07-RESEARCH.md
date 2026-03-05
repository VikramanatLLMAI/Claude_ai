# Phase 7: Theming, Branding, and Compliance - Research

**Researched:** 2026-03-05
**Domain:** Theming, branding, compliance oversight, impersonation, scheduled tasks, UI polish
**Confidence:** HIGH

## Summary

Phase 7 covers six distinct feature domains: (1) theme assignment and application, (2) logo/branding, (3) conversation visibility/compliance, (4) onboarding wizard, (5) user impersonation for IT support, and (6) scheduled cleanup tasks. Additionally, all admin surfaces receive production-grade UI polish.

The existing codebase provides strong foundations: 5 themes already defined in CSS with `[data-theme="X"]` selectors, `OrgThemeAssignment` and `OrgSettings` Prisma models exist, `OnboardingAgreement` model is ready, logo fields exist on Organization, and the full audit logging infrastructure is in place. The primary work is building API routes, service functions, and UI surfaces on top of these foundations.

**Primary recommendation:** Build each domain as a vertical slice (API + service + UI), starting with theme infrastructure (most cross-cutting), then logo/branding, then compliance surfaces, then impersonation, then cron jobs, and finally UI polish.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Super Admin assigns specific themes to each org (from 5 available); Org Admin picks active theme from assigned only; Users get NO theme picker
- Users only control light/dark/system mode (independent from org theme, stored in User.preferences)
- Remove existing color theme picker from settings modal for regular users
- 5 themes: claude, vercel, solar-dusk, twitter, violet-bloom (CSS already in globals.css)
- Fallback chain: removed active theme -> org default; all removed -> platform default
- Server-side validation: Org Admin cannot set active theme outside assigned themes (OTHM-07)
- Brand colors DROPPED (OBRN-02, OBRN-03, OBRN-04 removed from scope) -- org identity via theme + logo only
- OBRN-01 (logo upload) remains in scope
- Logo appears on: org login page + chat sidebar header
- logoDisplayMode set by Super Admin during org creation (not Org Admin): ORG_ONLY or PLATFORM_AND_ORG
- Upload constraints: max 500KB, PNG/SVG/JPEG, convert to Base64, no cropping tool
- Logo upload API endpoint already exists
- Both Super Admin and Org Admin can set login page content (tagline, welcome message)
- Org login pages get production-grade UI/UX polish with org theme + logo
- Use shadcn components for login page redesign
- New "Conversations" page in Org Admin dashboard (Monitoring group)
- Table/list view with filters: user, date range, model
- Click to open read-only conversation viewer
- Org Admin CANNOT modify or delete user conversations
- JSON export format, bulk export with selection as zip of JSON files
- Visibility toggle change logged in audit logs
- Multi-step onboarding wizard (3 steps: welcome+terms, org-specific terms, confirmation)
- Blocks access to chat until accepted; OnboardingAgreement model exists
- No in-chat indicator
- Full session impersonation -- Super Admin acts as user with all capabilities
- Entry point: Dedicated user search page in Super Admin dashboard
- Pre-impersonation dialog: duration picker (15/30/60 min), required reason text
- Session auto-expires; clear visual banner with exit button
- Full audit trail: start, end, and all actions during impersonation
- Automatic daily background job for scheduled tasks
- Org purge 30 days after soft delete: cascade delete everything
- Orphaned users remain in system
- Expired invitation cleanup + expired session cleanup
- Each cleanup run creates audit log entry
- DO NOT touch the chat bot UI; polish: Settings modal, Super Admin dashboard, Org Admin dashboard, sidebars, org login pages
- Use existing components (shadcn/Radix) -- upgrade quality, not rewrite
- Use shadcn MCP tool during research and implementation

### Claude's Discretion
- Cron job technical mechanism (API route auth, scheduling approach)
- Impersonation session token/mechanism implementation
- Exact UI layout and spacing decisions during polish
- Loading states and error handling across new surfaces
- Onboarding wizard step transitions and animations
- Conversation viewer layout within compliance page

### Deferred Ideas (OUT OF SCOPE)
- Custom theme builder for Super Admin (creating new themes beyond the 5 presets)
- Brand color overrides (primary/accent) -- intentionally dropped
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SORG-08 | Super Admin assigns available themes to each org | Theme assignment API + Super Admin org edit UI section |
| SORG-09 | Super Admin sets default theme for each org | Default theme flag on OrgThemeAssignment (isDefault field exists) |
| OTHM-01 | Org Admin chooses active theme from assigned themes | Theme selection API + Org Admin settings section |
| OTHM-02 | Org Admin cannot access unassigned themes | API filters to only return assigned themes |
| OTHM-03 | Available themes: Claude, Vercel, Solar Dusk, Twitter, Violet Bloom | CSS already defined in globals.css with [data-theme] selectors |
| OTHM-04 | Theme applies to entire org and all users | Theme fetched on app load, applied via data-theme attribute |
| OTHM-05 | Fallback if active theme removed -> org default | Service layer fallback logic |
| OTHM-06 | Fallback if all themes removed -> platform default | Service layer: no assignments = no data-theme attribute = claude theme |
| OTHM-07 | Server-side validation: active theme must be in assigned set | API route validation before DB update |
| OBRN-01 | Org Admin can upload org logo | Logo upload API exists; need Org Admin access path |
| OBRN-02 | ~~Org Admin sets primary brand color~~ | DROPPED per CONTEXT.md |
| OBRN-03 | ~~Org Admin sets accent color~~ | DROPPED per CONTEXT.md |
| OBRN-04 | ~~Branding changes apply across org~~ | DROPPED per CONTEXT.md |
| UTHEM-01 | User toggles light/dark/system mode | Keep existing applyTheme logic in settings modal |
| UTHEM-02 | Personal preference stored per user | User.preferences JSON already has themeMode |
| UTHEM-03 | Independent from org theme | Light/dark toggles .dark class; org theme is data-theme attribute |
| OVIS-01 | Org Admin toggles conversation visibility | OrgSettings.conversationVisibility field exists; need toggle API |
| OVIS-02 | When enabled, Org Admin reads all org conversations | New API endpoint with tenantDb scoping |
| OVIS-03 | Filter by user, date, model | DataTable with filter columns |
| OVIS-04 | Export conversations for compliance | JSON export API endpoint |
| OVIS-05 | Cannot modify/delete user conversations | Read-only API (GET only, no PATCH/DELETE) |
| OVIS-06 | Users acknowledge visibility during onboarding | Onboarding wizard step 2 content |
| OVIS-07 | Visibility toggle change logged in audit | Audit log on settings update |
| SAUD-04 | User impersonation for support | Impersonation session + audit trail |
| CRON-01 | Auto-purge orgs 30 days after soft delete | Scheduled cleanup API route |
| CRON-02 | Cleanup expired invitation tokens | Batch delete expired invitations |
| CRON-03 | Cleanup expired sessions | Batch delete expired sessions |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.4 | App Router, API routes | Project framework |
| Prisma | 7.3.0 | Database ORM | Existing DB layer |
| TailwindCSS | v4 | Styling | Existing styling system |
| Radix UI | latest | Accessible components | Existing component library |
| TanStack Table | v8 | Data tables | Existing table pattern |
| Sonner | latest | Toast notifications | Existing notification system |
| Framer Motion | latest | Animations | Existing animation library |
| Lucide React | 0.473.0 | Icons | Existing icon library |
| Recharts | v3 | Charts | Existing chart library |

### Supporting (May Need)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| JSZip | latest | ZIP file creation | Bulk conversation export (OVIS-04) |
| date-fns | latest | Date formatting | Date range filters if not already installed |

### No New Dependencies Needed
The project already has everything required. JSZip is the only potential addition for bulk ZIP export. Check if it is already installed before adding.

**Installation (if needed):**
```bash
npm install jszip
```

## Architecture Patterns

### Recommended Implementation Structure

```
lib/services/
  theme-service.ts              # Theme assignment CRUD + fallback logic
  conversation-visibility-service.ts  # Compliance conversation queries + export
  onboarding-service.ts         # Onboarding agreement management
  impersonation-service.ts      # Impersonation session management
  cleanup-service.ts            # Scheduled task logic (purge, cleanup)

app/api/
  super-admin/
    organizations/[id]/themes/route.ts   # GET/PUT theme assignments
    users/route.ts                        # User search for impersonation
    users/[id]/impersonate/route.ts       # Start impersonation session
    impersonation/route.ts                # End impersonation, get status
    cron/cleanup/route.ts                 # Scheduled cleanup endpoint
  org/[slug]/admin/
    themes/route.ts              # GET assigned themes, PUT active theme
    conversations/route.ts       # List conversations (compliance)
    conversations/[id]/route.ts  # Get conversation detail (read-only)
    conversations/export/route.ts # Export conversations
    settings/visibility/route.ts  # Toggle conversation visibility
    settings/login-page/route.ts  # Login page customization
    logo/route.ts                 # Org Admin logo upload
    onboarding/route.ts          # Onboarding config (Org Admin)
  onboarding/route.ts            # User-facing onboarding agreement

app/org/[slug]/admin/
  conversations/page.tsx         # New Conversations page
  themes/page.tsx                # Theme management page (or section in settings)

app/super-admin/
  users/page.tsx                 # User search + impersonation entry
```

### Pattern 1: Theme Application Flow

**What:** Org theme fetched from API on app load, applied via CSS attribute
**When to use:** Every page load in org context

```typescript
// Theme application on page load
async function applyOrgTheme(orgSlug: string) {
  const res = await fetch(`/api/org/${orgSlug}/admin/themes`);
  const { activeTheme } = await res.json();
  const root = document.documentElement;
  if (activeTheme && activeTheme !== 'claude') {
    root.setAttribute('data-theme', activeTheme);
  } else {
    root.removeAttribute('data-theme');
  }
}

// Light/dark mode remains independent (existing applyTheme logic)
// .dark class on <html> is orthogonal to data-theme attribute
```

**Key insight:** The `[data-theme="X"]` CSS selectors override `:root` variables. The `.dark` class flips to dark variants. These are independent axes -- org theme controls color palette, user preference controls light/dark mode.

### Pattern 2: Impersonation Session Mechanism

**What:** Super Admin creates a time-limited session as another user
**When to use:** SAUD-04 impersonation feature

```typescript
// Approach: Create a real session for the target user with impersonation metadata
// Store impersonation context in session metadata or a separate table

interface ImpersonationSession {
  originalSessionId: string;    // Super Admin's real session
  impersonatedUserId: string;   // Target user
  impersonatedOrgId: string;    // Target user's org
  reason: string;               // Required reason
  expiresAt: Date;              // 15/30/60 min
  startedAt: Date;
}

// Option A: Add impersonation fields to Session model
// Option B: Separate ImpersonationSession table

// Recommendation: Add fields to Session model:
//   impersonatorId: String? (the Super Admin's userId)
//   impersonationReason: String?
//   impersonationExpiresAt: DateTime?
// When impersonatorId is non-null, the session is an impersonation session.
// Auth middleware checks impersonationExpiresAt and auto-expires.
```

### Pattern 3: Scheduled Cleanup via API Route

**What:** Cron-triggered API route for automated cleanup
**When to use:** CRON-01/02/03 daily tasks

```typescript
// Approach: Protected API route triggered by external cron (Vercel Cron, system cron, etc.)
// Auth: Secret-based (CRON_SECRET env var) not session-based

// app/api/cron/cleanup/route.ts
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    purgedOrgs: await purgeDeletedOrganizations(),
    cleanedInvitations: await cleanupExpiredInvitations(),
    cleanedSessions: await cleanupExpiredSessions(),
  };

  // Audit log each cleanup action
  return NextResponse.json(results);
}
```

For Vercel deployment, add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/cleanup",
    "schedule": "0 2 * * *"
  }]
}
```

### Pattern 4: Conversation Visibility Service

**What:** Read-only access to all org conversations for compliance
**When to use:** OVIS-01 through OVIS-07

```typescript
// Use tenantDb for org-scoped queries (existing pattern)
// Conversations + Messages + User info for compliance view

async function listOrgConversations(
  tenantDb: TenantPrismaClient,
  filters: { userId?: string; dateFrom?: Date; dateTo?: Date; model?: string },
  page: number,
  pageSize: number
) {
  // tenantDb auto-scopes to org via Prisma extension
  return tenantDb.conversation.findMany({
    where: { /* filters */ },
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}
```

### Pattern 5: Schema Additions Needed

**What:** New fields needed on existing models + possible new model

```prisma
// OrgSettings -- add login page customization fields
model OrgSettings {
  // ... existing fields ...
  activeTheme       String?  @map("active_theme")       // Currently active theme name
  loginTagline      String?  @map("login_tagline")      // Org login page tagline
  loginWelcomeMessage String? @map("login_welcome_message") @db.Text // Welcome message
  onboardingText    String?  @map("onboarding_text") @db.Text   // Org-specific onboarding terms
  onboardingVersion Int      @default(1) @map("onboarding_version") // Bump to re-trigger acceptance
}

// Session -- add impersonation fields
model Session {
  // ... existing fields ...
  impersonatorId          String?   @map("impersonator_id")
  impersonationReason     String?   @map("impersonation_reason")
  impersonationExpiresAt  DateTime? @map("impersonation_expires_at")
}
```

### Anti-Patterns to Avoid
- **Don't store theme in localStorage for org users** -- theme must come from the org, not user preference. Only light/dark mode is user-controlled.
- **Don't build conversation editing for Org Admin** -- OVIS-05 explicitly forbids it. Read-only API only.
- **Don't make impersonation a "view as" mode** -- it's full session impersonation for IT support, meaning the Super Admin must be able to actually fix things.
- **Don't build custom theme creation** -- deferred, only 5 preset themes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP file creation | Custom ZIP encoder | JSZip library | Binary format complexity, cross-browser support |
| Date range filtering | Custom date picker | Existing date inputs or Radix date picker | Accessibility, timezone handling |
| Data tables | Custom table component | Existing DataTable (TanStack Table wrapper) | Sorting, filtering, pagination already built |
| Confirmation dialogs | Custom modal logic | `components/ui/confirmation-dialog.tsx` | Established pattern |
| Toast notifications | Custom notification | Sonner toast system | Already integrated |
| CSV/JSON export | Custom serialization | Existing audit log export pattern | Same pattern used in Phases 5/6 |

**Key insight:** Nearly everything needed already exists as patterns in the codebase. The work is assembly, not invention.

## Common Pitfalls

### Pitfall 1: Theme Application Timing
**What goes wrong:** Flash of unstyled content (FOUC) when org theme loads async after page render
**Why it happens:** Theme fetched via API after React hydration, causing brief flash of default theme
**How to avoid:** Fetch theme in the server component (org layout) and pass via data attribute on initial HTML. The org login page already does this pattern -- `app/org/[slug]/login/page.tsx` is a server component that fetches org data.
**Warning signs:** Brief color flash on page load

### Pitfall 2: Impersonation Session Leaks
**What goes wrong:** Impersonation session doesn't expire, or Super Admin forgets to end session
**Why it happens:** Missing auto-expiry check in auth middleware
**How to avoid:** Check `impersonationExpiresAt` in `validateSession()` or `requireOrgAuth()`. If expired, automatically end the impersonation and return 401.
**Warning signs:** Impersonation sessions lasting beyond selected duration

### Pitfall 3: Theme Fallback Chain Incomplete
**What goes wrong:** Org has no assigned themes and UI breaks or shows wrong colors
**Why it happens:** Missing fallback logic when `OrgThemeAssignment` table is empty for an org
**How to avoid:** Service layer returns `null` for activeTheme when no assignments exist. Frontend interprets `null` as "use default" (no data-theme attribute = claude theme). Test with: zero assignments, active theme removed, all themes removed.
**Warning signs:** Blank or broken UI colors for orgs with no theme assignments

### Pitfall 4: Conversation Export Memory Blow-up
**What goes wrong:** Bulk export of large conversations causes server OOM
**Why it happens:** Loading all messages for all selected conversations into memory at once
**How to avoid:** Stream conversations one at a time into the ZIP. Use pagination/cursors for message fetching. Set reasonable limits (e.g., max 100 conversations per export).
**Warning signs:** Server crashes during bulk export of large orgs

### Pitfall 5: Onboarding Version Mismatch
**What goes wrong:** Users who already agreed don't see updated terms
**Why it happens:** `agreementVersion` not bumped when Org Admin updates onboarding text
**How to avoid:** Increment `onboardingVersion` on OrgSettings when onboarding text changes. Check user's latest `OnboardingAgreement.agreementVersion` against current org version on every login/page load.
**Warning signs:** Users not prompted after terms change

### Pitfall 6: Impersonation Audit Trail Gaps
**What goes wrong:** Actions during impersonation not attributed to the Super Admin
**Why it happens:** Auth middleware returns the impersonated user, and audit logs record that user as the actor
**How to avoid:** When session has `impersonatorId`, audit log should record both the impersonated user AND the impersonator. Add `impersonatorId` to AuditLog metadata for impersonation sessions.
**Warning signs:** Audit logs show user actions that the user didn't actually perform

## Code Examples

### Theme Assignment API (Super Admin)
```typescript
// PUT /api/super-admin/organizations/[id]/themes
// Body: { assignedThemes: ["claude", "vercel"], defaultTheme: "claude" }

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSuperAdmin(req);
  const { id } = await params;
  const body = await req.json();

  // Validate theme names against known list
  const VALID_THEMES = ['claude', 'vercel', 'solar-dusk', 'twitter', 'violet-bloom'];
  const invalid = body.assignedThemes.filter((t: string) => !VALID_THEMES.includes(t));
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Invalid themes: ${invalid.join(', ')}` }, { status: 400 });
  }

  // Default must be in assigned set
  if (body.defaultTheme && !body.assignedThemes.includes(body.defaultTheme)) {
    return NextResponse.json({ error: 'Default theme must be in assigned themes' }, { status: 400 });
  }

  await themeService.setOrgThemes(id, body.assignedThemes, body.defaultTheme, user.id, ipAddress);
  return NextResponse.json({ success: true });
}
```

### Theme Fetch for Users (Non-Admin Endpoint)
```typescript
// GET /api/org/[slug]/theme (public-ish, no admin required -- just org auth)
// Returns the active theme for the org

export async function GET(req: NextRequest) {
  const { organization } = await requireOrgAuth(req);
  const activeTheme = await themeService.getActiveTheme(organization.id);
  return NextResponse.json({ activeTheme }); // null means platform default
}
```

### Chat Sidebar Logo Display
```typescript
// In ChatSidebar component -- add logo display based on org context
<SidebarHeader>
  <div className="flex items-center gap-2">
    {orgLogo && (
      <img src={orgLogo} alt={orgName} className="h-6 w-auto" />
    )}
    {logoDisplayMode === 'PLATFORM_AND_ORG' && (
      <span className="text-sm font-medium">LLMatscale.ai</span>
    )}
    {logoDisplayMode === 'ORG_ONLY' && !orgLogo && (
      <span className="text-sm font-medium">{orgName}</span>
    )}
  </div>
</SidebarHeader>
```

### Onboarding Check Pattern
```typescript
// In org layout or chat page load -- check onboarding before allowing access
async function checkOnboarding(userId: string, orgMemberId: string, orgId: string): Promise<boolean> {
  const orgSettings = await prisma.orgSettings.findUnique({
    where: { organizationId: orgId },
    select: { onboardingVersion: true },
  });
  if (!orgSettings) return true; // No settings = no onboarding required

  const agreement = await prisma.onboardingAgreement.findUnique({
    where: { orgMemberId_agreementVersion: { orgMemberId, agreementVersion: orgSettings.onboardingVersion } },
  });
  return !!agreement; // true = already accepted, false = needs onboarding
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage theme | Server-controlled org theme | Phase 7 | Theme comes from DB, not user preference |
| Color theme picker for all users | Only Super Admin/Org Admin control themes | Phase 7 | Remove color picker from settings modal |
| No conversation oversight | Org Admin compliance view | Phase 7 | New admin page with read-only access |
| Manual cleanup | Automated cron jobs | Phase 7 | Scheduled purge, invitation/session cleanup |

## Open Questions

1. **Login page customization storage**
   - What we know: Both Super Admin and Org Admin can set tagline and welcome message
   - What's unclear: Whether to add fields to OrgSettings or create a separate LoginPageConfig model
   - Recommendation: Add `loginTagline`, `loginWelcomeMessage` fields to `OrgSettings` model. Simpler, already one-to-one with org.

2. **Impersonation banner placement**
   - What we know: Clear visual banner needed during impersonation with exit button
   - What's unclear: Whether banner goes in root layout, chat layout, or both
   - Recommendation: Root layout level so it appears on ALL pages (chat, admin, settings). Fixed position top bar.

3. **Cron trigger mechanism in development**
   - What we know: Vercel Cron for production, but dev needs a way to test
   - What's unclear: How to trigger in local development
   - Recommendation: API route with CRON_SECRET env var. In dev, trigger manually via curl or add a dev button in Super Admin dashboard.

4. **Onboarding text format**
   - What we know: Org Admin sets org-specific terms/policies
   - What's unclear: Plain text vs markdown vs HTML
   - Recommendation: Plain text with line breaks. Keeps it simple, avoids XSS concerns with HTML, and the onboarding wizard is a one-time UI.

## Sources

### Primary (HIGH confidence)
- **Prisma schema** (`prisma/schema.prisma`) - All models examined: OrgThemeAssignment, OrgSettings, OnboardingAgreement, Session, Organization
- **globals.css** - All 5 theme CSS definitions verified at lines 270-693 with [data-theme] selectors
- **settings-modal.tsx** - Theme application logic at lines 517-544 (applyTheme, handleColorThemeChange)
- **org-login-page.tsx** - Server component pattern for org data fetching
- **auth-middleware.ts** - Session validation and org auth patterns
- **org-service.ts** - Organization creation pattern with transaction + audit logging
- **admin-sidebar.tsx** - Org Admin nav groups structure (lines 79-117)

### Secondary (MEDIUM confidence)
- **full-chat-app.tsx** - Chat sidebar header structure (lines 438-447), confirmed no theme references
- **session-service.ts** - Session management with forceLogoutUser() foundation
- **audit-log-service.ts** - Export pattern for CSV/JSON

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and patterns established
- Architecture: HIGH - follows existing service/API/UI patterns exactly
- Schema changes: HIGH - models exist, only field additions needed
- Theme system: HIGH - CSS and JS infrastructure already in place
- Impersonation: MEDIUM - novel feature but clear implementation path via Session model extension
- Cron jobs: MEDIUM - standard pattern but deployment-specific details need runtime validation
- Pitfalls: HIGH - identified from codebase analysis of existing patterns

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable domain, 30 days)
