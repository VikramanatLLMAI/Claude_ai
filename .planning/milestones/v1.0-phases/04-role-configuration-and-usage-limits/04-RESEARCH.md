# Phase 4: Role Configuration and Usage Limits - Research

**Researched:** 2026-02-28
**Domain:** RBAC role management, usage limit enforcement, password policy, session management, profile management, admin console UI overhaul
**Confidence:** HIGH

## Summary

Phase 4 is primarily a full-stack CRUD and enforcement phase that builds on top of the existing Phase 3 foundation. It requires no new external libraries for its core functionality -- the existing stack (Next.js 16, Prisma 7.3, Radix UI/shadcn, Zod, sonner) provides all needed primitives. The only new dependencies are **Recharts** for usage trend charts and **@radix-ui/react-tabs** for the role creation modal tabs and Tabs UI component.

The phase has six distinct domains: (1) custom role CRUD with tabbed modal form, (2) usage limit enforcement with rolling 24-hour window and hierarchical ceiling model, (3) usage monitoring dashboard for Org Admin, (4) password policy management with forced change flow, (5) session and profile management for users, and (6) admin console UI overhaul with grouped sidebar navigation.

The most complex technical challenge is the rolling 24-hour usage window enforcement in the chat route -- it must be performant (single aggregate query), correct (per-user window based on first message), and fail-safe (never silently exceed limits). The forced password change flow requires a redirect interception at login time and a new dedicated page. The admin console overhaul touches the sidebar, dashboard, and roles page, requiring careful refactoring without breaking existing functionality.

**Primary recommendation:** Start with schema changes (Organization monthly limits, User passwordChangedAt/forcePasswordChange fields), then build backend services and API routes, then build the admin UI components (sidebar redesign, role modal, usage dashboard, security page), and finally integrate the chat-side enforcement (usage banners, input blocking) and login-side enforcement (forced password change).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Create/Edit via tabbed modal form** -- click "Create Role" button or "Edit" on any role card opens a modal
- **4 tabs in modal:** General (name, description) | Models & Tools (model access, MCP assignment) | Limits (daily requests, daily tokens) | Permissions (custom instructions toggle, personal MCP toggle)
- **Same modal for create and edit** -- edit pre-fills with current settings. Consistent UX.
- **Role cards become read-only summaries** with Edit button -- refactor existing inline-edit cards to read-only display
- **Role cards show member count badge** (e.g., "Technical - 5 users") for role distribution visibility
- **System roles fully editable except delete** -- Org Admin can rename, change description, models, limits, instructions. Cannot delete system roles.
- **Custom role deletion blocked if users assigned** -- Org Admin must manually reassign all users to a different role before deleting. No auto-reassignment.
- **Rolling 24-hour window per user** -- limit window starts from user's first message of the period, resets exactly 24 hours later. Not a fixed daily reset time.
- **80% warning: persistent top banner** -- yellow/amber banner pinned at top of chat area showing usage count and reset time. Stays visible but dismissible until next threshold.
- **100% block: disable input + red banner** -- chat input disabled/grayed out, red banner with clear message. User can read conversations but cannot send new messages.
- **Hierarchical limit structure:**
  - Super Admin sets monthly ceiling per org (max requests/month, max tokens/month) -- configured on org detail page in Super Admin panel
  - Org Admin configures role-level daily limits AND org-level monthly limits **within the ceiling** set by Super Admin -- cannot exceed Super Admin's allocation
- **Org Admin usage monitoring:**
  - Summary cards on admin home page ("X users approaching limits")
  - Full detail page at /admin/usage with per-user usage bars, per-role aggregation, alert badges for 80%/100% users
  - Include charts for usage trends (as much as possible now, refined further in Phase 6)
- **Toggle + input for limit configuration** -- toggle switch for "Enable daily request limit" / "Enable daily token limit". Off = unlimited. On = number input appears.
- **Dedicated /admin/security page** -- new "Security" section in admin sidebar with password policy settings and force-reset controls
- **Forced password change page** -- when password policy is tightened or password expires, user is redirected to a forced password change page on next login. Must comply before accessing the app. No grace period.
- **Force-reset: both individual and bulk** -- Org Admin can force-reset individual users (from user management row action) or "Force Reset All Users" (from security page). Both logged to audit.
- **Password expiry uses same forced change flow** -- expired passwords redirect to forced change page on next login. Same strict enforcement as policy tightening.
- **Extended settings modal** -- add "Profile" tab (name, avatar upload) and "Sessions" tab (active sessions list, revoke buttons) to the existing chat settings modal
- **Session list shows:** device/browser name (parsed from userAgent), IP-based approximate location (city/country), last active timestamp, "Current session" badge, "Revoke" button
- **Avatar upload: auto-crop to square** -- user picks image, auto-crop to centered square, resize to fit 200KB, convert to Base64. Preview shown before save.
- **Org Admin force-logout: user row action** -- in user management list, dropdown with "Force Logout" option. Confirmation dialog, logged to audit.
- **User cannot change own email or role** -- read-only display in profile
- **Refactor existing roles page** -- rebuild from inline-card editing to read-only summary cards + modal-based editing. SaaS-grade quality.
- **Redesign admin sidebar with grouped navigation:**
  - Configuration (Roles, Instructions, Models, MCP)
  - Monitoring (Usage, Alerts)
  - Security (Password Policy, Sessions)
  - Users (Members, Invitations)
- **Consistent shadcn + Radix UI** throughout all admin pages -- no mixed patterns
- **SaaS-grade UI/UX is the #1 priority** -- Vercel's admin dashboard is the design reference. Match that level of polish, spacing, typography, and clean minimalism.

### Claude's Discretion
- Exact chart library/components for usage trends (Recharts likely since Phase 5/6 will use it)
- Session device/location parsing implementation details
- Loading states, skeleton patterns, and transitions
- Exact color scheme for warning/error banners
- Form validation UX details (inline errors vs summary)
- Mobile responsiveness approach for admin pages

### Deferred Ideas (OUT OF SCOPE)
- Full analytics dashboards with detailed breakdowns -- enhanced in Phase 6 (Org Admin Dashboard)
- Super Admin dashboard UI for managing org ceilings -- Phase 5 builds the full Super Admin panel, but Phase 4 includes the API/backend
- Email notifications for usage limit alerts (80%/100%) -- v2 requirement NOTF-01
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OROL-01 | Org Admin can view all roles (system + custom) | Existing GET /api/org/[slug]/admin/roles returns all roles with _count.members. Refactor frontend to read-only cards. |
| OROL-02 | Org Admin can create custom roles | New POST /api/org/[slug]/admin/roles endpoint + CreateRoleModal component with 4 tabs |
| OROL-03 | Org Admin can edit any role including system roles (name, description, system prompt, model access, permissions) | New PUT/PATCH endpoint for full role update + same modal in edit mode. System roles: editable except delete. |
| OROL-04 | Org Admin can delete custom roles only (system roles cannot be deleted) | New DELETE endpoint with isSystemRole guard + assigned users check (block if _count.members > 0) |
| OROL-05 | Org Admin can view which users are assigned to each role | Already available via _count.members. Full member list via role card expansion or modal detail. |
| OROL-06 | Org Admin can enable or disable custom instructions per role | Already exists in role settings (customInstructionsEnabled toggle). Move into modal Permissions tab. |
| OROL-07 | User custom instructions limited to 200 tokens per role (token budget enforced at save time with live counter) | InstructionEditor component already has maxTokens prop. Enforce via role.customInstructionsMaxLength = 200 default. |
| OUSE-01 | Org Admin can configure usage limits per role (daily requests, daily tokens) | Role model already has dailyRequestLimit/dailyTokenLimit fields. Add toggle+input in Limits tab. |
| OUSE-02 | Org Admin can view org-wide usage statistics | New /admin/usage page with aggregate queries on UsageRecord. Recharts for trends. |
| OUSE-03 | Org Admin can view per-user usage | Per-user breakdown on usage page with progress bars against limits. |
| OUSE-04 | Org Admin can monitor users approaching or exceeding limits | Alert badges on usage page for 80%/100% users. Summary cards on admin home. |
| OUSE-05 | Org Admin can view inactive users (not logged in for 30+ days) | Query OrgMember.lastActiveAt < 30 days ago. Display on usage page or users section. |
| OALT-01 | Dashboard alert when user reaches 80% of limit | Admin usage page shows amber badges for 80%+ users. |
| OALT-02 | Dashboard alert when user is hard blocked at 100% | Admin usage page shows red badges for 100% users. |
| OALT-03 | Alerts persist until usage period resets or limit increased | Rolling window naturally resets; badge state derived from live query. |
| UCHAT-03 | User sees warning banner at 80% of limit | Yellow/amber banner in chat UI above messages. Usage status API endpoint for frontend polling. |
| UCHAT-04 | User is blocked with clear message at 100% | Red banner + disabled chat input. Pre-send check in chat route returns 429. |
| SAFE-10 | Role-level daily limits and org-level monthly limits enforced -- requests hard rejected when exceeded | Chat route pre-check: query UsageRecord aggregate for rolling 24h window. Return 429 with reset time. Monthly org ceiling check against Organization limits. |
| SAFE-11 | Org Admin conversation access is read-only -- no edit or delete | Conversation API routes check role permissions; Org Admin gets read-only access flag. |
| OPWD-01 | Org Admin can set minimum password length | PasswordPolicy model exists with minLength field. New /admin/security page with form. |
| OPWD-02 | Org Admin can set complexity requirements | PasswordPolicy already has requireUppercase/requireLowercase/requireNumbers/requireSpecialChars fields. |
| OPWD-03 | Org Admin can force password reset for specific user or all users | New API endpoints: POST /admin/security/force-reset (bulk) and POST /admin/users/[userId]/force-reset. Set forcePasswordChange flag on User/OrgMember. |
| OPWD-04 | Org Admin can set password expiry period | PasswordPolicy has expiryDays field. Login route checks User.passwordChangedAt against policy. |
| OPWD-05 | Existing passwords not meeting new policy enforced on next login only | Login route validates current password against policy; if fails, set forcePasswordChange and redirect. No immediate lockout. |
| OPWD-06 | Org Admin cannot lock themselves out via password policy changes | Backend validates: if saving policy would violate admin's own password, warn but allow save (enforcement on next login only). Admin can change their own password first. |
| USES-01 | User can view all active sessions (device, last active) | New Sessions tab in settings modal. API: GET /api/org/[slug]/sessions. Parse userAgent for device info. |
| USES-02 | User can manually revoke any specific session | DELETE /api/org/[slug]/sessions/[sessionId]. Cannot revoke current session (would log self out). |
| UPRF-01 | User can update display name | New Profile tab in settings modal. PATCH /api/org/[slug]/profile with name field. |
| UPRF-02 | User can upload profile avatar (Base64, max 200KB, PNG/JPG) | Canvas-based client-side crop/resize. PATCH /api/org/[slug]/profile with avatarBase64 field. |
| UPRF-03 | User cannot change own email | Profile tab shows email as read-only field with explanation text. |
| UPRF-04 | User cannot change own role | Profile tab shows role name as read-only badge. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.4 | App Router, API routes, SSR | Project framework |
| Prisma | 7.3.0 | ORM, database queries, migrations | Project ORM |
| Zod | latest | Request validation schemas | Project validation |
| @radix-ui/* | latest | Dialog, Switch, Label, Badge, etc. | Project UI primitives |
| sonner | latest | Toast notifications | Already integrated as toast utility |
| lucide-react | 0.473.0 | Icons | Project icon library |
| motion | latest | Animations (framer-motion) | Already used in chat UI |

### New Dependencies Required
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| recharts | 2.x (latest) | Usage trend charts on admin usage page | Usage monitoring dashboard, bar/line charts |
| @radix-ui/react-tabs | latest | Tab component for role modal and any tabbed UI | Role create/edit modal 4-tab layout |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | chart.js / @nivo | Recharts is React-native, composable, works well with shadcn. Phase 5/6 will also use it. No reason to use alternatives. |
| ua-parser-js (user agent) | bowser | ua-parser-js is more comprehensive but heavy. Simple regex parsing is sufficient for device/browser display. Avoid adding dependency. |
| MaxMind GeoIP | ip-api.com / geoip-lite | Full GeoIP requires database download (300MB+). For v1, approximate location from IP is not critical -- show "Unknown" or use a lightweight free API. Defer to Claude's discretion. |

**Installation:**
```bash
npm install recharts @radix-ui/react-tabs
```

**Note on Recharts + React 19:** Recharts 2.x may need `--legacy-peer-deps` flag due to React 19 peer dependency (per STATE.md blocker note). Verify at install time.

## Architecture Patterns

### Recommended Project Structure (New Files)
```
app/
├── org/[slug]/admin/
│   ├── usage/page.tsx              # Usage monitoring dashboard
│   ├── security/page.tsx           # Password policy management
│   └── roles/page.tsx              # Refactored roles page (read-only cards + modal)
├── org/[slug]/force-password-change/
│   └── page.tsx                    # Forced password change page
├── api/org/[slug]/admin/
│   ├── roles/route.ts              # Extended: POST for create role
│   ├── roles/[roleId]/route.ts     # NEW: PUT/PATCH/DELETE for role CRUD
│   ├── usage/route.ts              # NEW: Org usage aggregates
│   ├── usage/users/route.ts        # NEW: Per-user usage breakdown
│   ├── security/
│   │   ├── password-policy/route.ts # GET/PATCH password policy
│   │   └── force-reset/route.ts    # POST force password reset (bulk)
│   └── users/[userId]/
│       ├── force-reset/route.ts    # POST force password reset (individual)
│       └── force-logout/route.ts   # POST force logout all sessions
├── api/org/[slug]/
│   ├── profile/route.ts            # GET/PATCH user profile
│   ├── sessions/route.ts           # GET active sessions
│   ├── sessions/[sessionId]/route.ts # DELETE revoke session
│   └── usage-status/route.ts       # GET current user's usage status (for chat UI)

components/
├── admin/
│   ├── role-form-modal.tsx         # Create/Edit role modal with 4 tabs
│   ├── role-card.tsx               # Read-only role summary card
│   ├── usage-dashboard.tsx         # Usage monitoring components
│   ├── password-policy-form.tsx    # Password policy settings form
│   └── admin-sidebar.tsx           # Refactored: grouped navigation
├── chat/
│   └── usage-banner.tsx            # 80%/100% usage warning banners
└── ui/
    └── tabs.tsx                    # New: Radix Tabs wrapper (shadcn pattern)

lib/services/
├── role-service.ts                 # Role CRUD business logic
├── usage-service.ts                # Usage limit checks, aggregation
├── session-service.ts              # Session management (list, revoke, force-logout)
└── password-policy-service.ts      # Password policy CRUD, force reset logic
```

### Pattern 1: Service Layer for Business Logic
**What:** Extract complex business logic into `lib/services/*.ts` files, keeping API routes thin.
**When to use:** Any multi-step mutation, validation with cross-entity checks, or reusable business rules.
**Example:**
```typescript
// lib/services/usage-service.ts
export async function checkUserUsageLimits(
  tenantDb: TenantPrismaClient,
  userId: string,
  role: Role
): Promise<UsageLimitStatus> {
  // If no limits set, user is unlimited
  if (role.dailyRequestLimit === null && role.dailyTokenLimit === null) {
    return { allowed: true, requestUsage: null, tokenUsage: null };
  }

  // Find the user's rolling 24-hour window start
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const usage = await tenantDb.usageRecord.aggregate({
    where: {
      userId,
      createdAt: { gte: windowStart },
    },
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      thinkingTokens: true,
    },
  });

  const requestCount = usage._count.id;
  const totalTokens = (usage._sum.inputTokens || 0)
    + (usage._sum.outputTokens || 0)
    + (usage._sum.thinkingTokens || 0);

  // Check limits
  const requestStatus = role.dailyRequestLimit
    ? { current: requestCount, limit: role.dailyRequestLimit, percentage: (requestCount / role.dailyRequestLimit) * 100 }
    : null;
  const tokenStatus = role.dailyTokenLimit
    ? { current: totalTokens, limit: role.dailyTokenLimit, percentage: (totalTokens / role.dailyTokenLimit) * 100 }
    : null;

  const blocked = (requestStatus && requestStatus.percentage >= 100)
    || (tokenStatus && tokenStatus.percentage >= 100);
  const warning = !blocked && ((requestStatus && requestStatus.percentage >= 80)
    || (tokenStatus && tokenStatus.percentage >= 80));

  return { allowed: !blocked, warning, blocked, requestStatus, tokenStatus };
}
```

### Pattern 2: Chat Route Pre-Check for Usage Limits
**What:** Add a usage limit check at the beginning of the POST /api/chat handler, before any AI processing.
**When to use:** Every chat request must be validated against usage limits.
**Example:**
```typescript
// In app/api/chat/route.ts, after auth and model access validation:

// C. Usage limit enforcement (SAFE-10, UCHAT-04)
const usageStatus = await checkUserUsageLimits(tenantDb, user.id, role);
if (!usageStatus.allowed) {
  return NextResponse.json({
    error: 'Usage limit exceeded',
    code: 'USAGE_LIMIT_EXCEEDED',
    resetAt: usageStatus.resetAt, // ISO timestamp when window resets
    requestStatus: usageStatus.requestStatus,
    tokenStatus: usageStatus.tokenStatus,
  }, { status: 429 });
}
```

### Pattern 3: Tabbed Modal Form (Role Create/Edit)
**What:** Full-page modal with sidebar tab navigation for complex forms, matching settings modal pattern.
**When to use:** Role creation/editing with 4 distinct configuration sections.
**Example:**
```typescript
// components/admin/role-form-modal.tsx
const ROLE_TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "models", label: "Models & Tools", icon: Cpu },
  { id: "limits", label: "Limits", icon: Gauge },
  { id: "permissions", label: "Permissions", icon: Shield },
] as const;

// Use Dialog (not Sheet) for modal, with internal tab navigation
// Pre-fill all fields when editing, empty for create
// Save entire role in one API call (not per-section)
```

### Pattern 4: Admin Sidebar Grouped Navigation
**What:** Restructure sidebar nav items into logical groups with group labels.
**When to use:** Admin sidebar redesign.
**Example:**
```typescript
const ORG_ADMIN_NAV_GROUPS = [
  {
    label: "Configuration",
    items: [
      { label: "Roles", icon: Users, href: `${base}/roles`, enabled: true },
      { label: "Instructions", icon: MessageSquare, href: `${base}/instructions`, enabled: true },
      { label: "MCP Servers", icon: Plug, href: `${base}/mcp`, enabled: true },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { label: "Usage", icon: BarChart3, href: `${base}/usage`, enabled: true },
    ],
  },
  {
    label: "Security",
    items: [
      { label: "Password Policy", icon: Lock, href: `${base}/security`, enabled: true },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Members", icon: Users2, href: `${base}/users`, enabled: false },
    ],
  },
];
```

### Pattern 5: Forced Password Change Redirect
**What:** Login route checks password policy compliance and redirects to forced change page.
**When to use:** When password policy is tightened, passwords expire, or admin forces reset.
**Example:**
```typescript
// In POST /api/auth/login, after successful password verification:

// Check if user needs to change password
const needsChange = await checkPasswordChangeRequired(user, orgMember, passwordPolicy);
if (needsChange) {
  // Create session with limited scope (can only access force-password-change page)
  // Return special response flag
  return Response.json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
    expiresAt: expiresAt.toISOString(),
    forcePasswordChange: true,
    reason: needsChange.reason, // 'expired' | 'policy_changed' | 'admin_forced'
  });
}
```

### Anti-Patterns to Avoid
- **Inline editing on role cards:** Locked decision says read-only cards with modal editing. Do NOT keep the current inline switch/input pattern on the roles page.
- **Fixed daily reset (midnight UTC):** The rolling 24-hour window is per-user, starting from their first message. Do NOT use a fixed midnight reset.
- **Client-side-only limit enforcement:** Limits MUST be enforced server-side in the chat route. Client-side banners are informational only.
- **Blocking password change at save time:** OPWD-05 says existing passwords that don't meet new policy are only enforced on next login. Do NOT immediately lock out users.
- **Single aggregate for both request count and token sum:** Prisma aggregate can return both _count and _sum in a single query. Use ONE query, not two.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom SVG charts | Recharts | Composable React components, handles axes/tooltips/responsive, consistent with Phase 5/6 |
| Tab navigation in modal | Custom div-based tabs | @radix-ui/react-tabs (wrapped as shadcn component) | Keyboard navigation, ARIA attributes, focus management |
| Toast notifications | Custom notification system | sonner (already integrated) | Already works via `toast.success()`, `toast.error()` |
| User agent parsing | Full ua-parser-js library | Simple regex extraction | Only need browser name + OS for display, not full parser. ~10 lines of code. |
| Image cropping | Complex canvas manipulation | HTML5 Canvas drawImage with aspect ratio math | Auto-crop to centered square is ~20 lines. No need for heavy crop library. |
| Date formatting for "last active" | Custom relative time formatter | Intl.RelativeTimeFormat or simple helper | Native browser API, handles "5 minutes ago" etc. |
| Confirmation dialogs | Custom dialog system | Existing ConfirmationDialog component | Already built, supports destructive and warning variants |

**Key insight:** Phase 4 is CRUD-heavy with enforcement logic. The complexity is in the business rules (rolling windows, hierarchical limits, forced password change flow), not in UI primitives. Use existing components and patterns; don't over-engineer the UI layer.

## Common Pitfalls

### Pitfall 1: Rolling Window Off-by-One
**What goes wrong:** The 24-hour rolling window query uses `>` instead of `>=`, or calculates the window boundary incorrectly, allowing an extra request or missing the window edge.
**Why it happens:** Timestamp precision and comparison semantics differ between JavaScript Date and PostgreSQL timestamp.
**How to avoid:** Use `createdAt: { gte: windowStart }` (greater-than-or-equal) where `windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000)`. Test with edge cases.
**Warning signs:** Users report getting blocked earlier or later than expected; off-by-one request counts.

### Pitfall 2: Race Condition on Limit Check
**What goes wrong:** Two concurrent chat requests both pass the limit check, then both proceed, causing the user to exceed their limit.
**Why it happens:** The check-then-act pattern is not atomic. Between checking usage and recording the new request, another request can slip through.
**How to avoid:** This is acceptable for v1 -- a user might occasionally get 1-2 extra requests beyond their limit. The enforcement is "best effort" with eventual consistency. The alternative (database-level locking) adds significant complexity and latency. Document this as a known limitation.
**Warning signs:** Usage count occasionally exceeds the configured limit by 1-2 requests.

### Pitfall 3: Forced Password Change Bypass
**What goes wrong:** User with forcePasswordChange flag can navigate to chat directly without going through the forced change page.
**Why it happens:** Client-side redirect can be bypassed; API routes don't check the flag.
**How to avoid:** Check `forcePasswordChange` flag in `requireOrgAuth()` middleware. If flag is set and the request is NOT to the force-password-change endpoint, return 403 with redirect instruction. This makes it server-enforced.
**Warning signs:** Users with expired passwords still able to use chat.

### Pitfall 4: Avatar Upload Memory Bloat
**What goes wrong:** Large image uploads cause browser memory spikes or server-side payload rejection.
**Why it happens:** Base64 encoding increases size by ~33%. A 5MB image becomes ~6.7MB Base64 string.
**How to avoid:** Client-side: resize to max 200x200px, compress to JPEG 80% quality, reject if Base64 exceeds 200KB. Server-side: validate Base64 length before database write. Use `<input accept="image/png,image/jpeg">` to restrict file types.
**Warning signs:** Slow profile saves, 413 Payload Too Large errors.

### Pitfall 5: Monthly Org Ceiling Calculation Drift
**What goes wrong:** Monthly usage sum becomes expensive as UsageRecord table grows.
**Why it happens:** Aggregate query over entire month's records for every chat request.
**How to avoid:** Cache the monthly aggregate with a short TTL (5 minutes). Monthly ceiling checks are less time-sensitive than per-request daily checks. Alternatively, maintain a running counter in OrgSettings that gets incremented with each request. For v1, the aggregate query is acceptable -- optimize in Phase 6 if needed.
**Warning signs:** Increasing latency on chat requests as the month progresses.

### Pitfall 6: Tabs Component Missing
**What goes wrong:** @radix-ui/react-tabs is not installed, and the project has no `components/ui/tabs.tsx` wrapper.
**Why it happens:** Phase 3 didn't need tabs. The settings modal uses a custom tab implementation (not Radix Tabs).
**How to avoid:** Install `@radix-ui/react-tabs` and create `components/ui/tabs.tsx` following the shadcn pattern early in the phase. Reference `ref_docs/prompt-kit-docs/components/ui/tabs.tsx` which already exists in the project reference docs.
**Warning signs:** Import errors for Tabs component.

### Pitfall 7: Sidebar Redesign Breaks Existing Pages
**What goes wrong:** Changing the AdminSidebar navigation structure breaks routing or styling for existing pages (instructions, roles, MCP).
**Why it happens:** Sidebar items have `href` and `enabled` properties that existing pages depend on.
**How to avoid:** Keep existing `href` values unchanged when restructuring into groups. Only ADD new items and change the visual grouping. Test all existing admin pages after sidebar changes.
**Warning signs:** 404s on existing admin pages, broken breadcrumb navigation.

## Code Examples

### Usage Limit Check in Chat Route
```typescript
// Source: Pattern derived from existing chat route structure (app/api/chat/route.ts)
// Insert AFTER model access validation (line ~51), BEFORE message saving

import { checkUserUsageLimits } from '@/lib/services/usage-service';

// Usage limit enforcement (SAFE-10)
const usageStatus = await checkUserUsageLimits(tenantDb, user.id, role);
if (!usageStatus.allowed) {
  return NextResponse.json({
    error: 'You have reached your usage limit. Please wait for the limit to reset.',
    code: 'USAGE_LIMIT_EXCEEDED',
    resetAt: usageStatus.resetAt,
  }, { status: 429 });
}
```

### Role Create/Update API Route
```typescript
// Source: Follows existing pattern from roles/[roleId]/settings/route.ts
export async function POST(req: NextRequest) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json();
  const parsed = CreateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatValidationErrors(parsed.error.issues) },
      { status: 400 }
    );
  }

  const ipAddress = getIpAddress(req);

  const role = await prisma.$transaction(async (tx) => {
    const created = await tx.role.create({
      data: {
        organizationId: authResult.organization.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        isSystemRole: false,
        allowedModels: parsed.data.allowedModels || [],
        systemInstructions: parsed.data.systemInstructions || null,
        customInstructionsEnabled: parsed.data.customInstructionsEnabled ?? true,
        personalMcpEnabled: parsed.data.personalMcpEnabled ?? false,
        personalMcpMaxCount: parsed.data.personalMcpMaxCount ?? 3,
        dailyRequestLimit: parsed.data.dailyRequestLimit ?? null,
        dailyTokenLimit: parsed.data.dailyTokenLimit ?? null,
      },
    });

    await auditLog.record(tx, {
      userId: authResult.user.id,
      action: 'role.created',
      targetType: 'Role',
      targetId: created.id,
      organizationId: authResult.organization.id,
      ipAddress,
      metadata: { roleName: created.name },
    });

    return created;
  });

  return NextResponse.json(role, { status: 201 });
}
```

### Password Change Check at Login
```typescript
// Source: Extension of existing login route (app/api/auth/login/route.ts)
async function checkPasswordChangeRequired(
  user: User,
  orgMember: OrgMember | null,
  policy: PasswordPolicy | null
): Promise<{ required: boolean; reason: string } | null> {
  if (!orgMember) return null;

  // 1. Admin forced password reset
  if (orgMember.forcePasswordChange) {
    return { required: true, reason: 'admin_forced' };
  }

  // 2. Password expiry
  if (policy?.expiryDays && user.passwordChangedAt) {
    const expiryDate = new Date(user.passwordChangedAt);
    expiryDate.setDate(expiryDate.getDate() + policy.expiryDays);
    if (new Date() > expiryDate) {
      return { required: true, reason: 'expired' };
    }
  }

  // 3. Password doesn't meet current policy
  // (This is checked at login but NOT enforced immediately -- OPWD-05)
  // We set forcePasswordChange flag for next login
  // The actual validation happens on the password itself, which we don't have here
  // So this check is deferred to the force-password-change page validation

  return null;
}
```

### User Agent Parsing (Lightweight)
```typescript
// Source: Custom utility -- no library needed for basic browser/OS detection
export function parseUserAgent(ua: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };

  // Browser detection
  let browser = 'Unknown';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Opera/') || ua.includes('OPR/')) browser = 'Opera';

  // OS detection
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Device type
  let device = 'Desktop';
  if (ua.includes('Mobile') || ua.includes('Android')) device = 'Mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

  return { browser, os, device };
}
```

### Avatar Upload Client-Side Processing
```typescript
// Source: Standard HTML5 Canvas pattern for image resize + Base64
async function processAvatarUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200; // 200x200 square
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Auto-crop to centered square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        // Convert to Base64 JPEG at 80% quality
        const base64 = canvas.toDataURL('image/jpeg', 0.8);

        // Check size (200KB limit)
        const sizeBytes = Math.ceil((base64.length - 'data:image/jpeg;base64,'.length) * 0.75);
        if (sizeBytes > 200 * 1024) {
          reject(new Error('Image too large after processing. Try a smaller image.'));
          return;
        }

        resolve(base64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
```

### Recharts Usage Trend Chart
```typescript
// Source: Recharts documentation pattern
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function UsageTrendChart({ data }: { data: { date: string; requests: number; tokens: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" className="text-xs text-muted-foreground" />
        <YAxis className="text-xs text-muted-foreground" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

## Schema Changes Required

### New Fields on Existing Models

```prisma
// Organization -- add monthly ceiling fields (set by Super Admin)
model Organization {
  // ... existing fields ...
  monthlyRequestCeiling  Int?    @map("monthly_request_ceiling")  // null = unlimited
  monthlyTokenCeiling    Int?    @map("monthly_token_ceiling")    // null = unlimited
}

// OrgSettings -- add org-level monthly limits (set by Org Admin, within ceiling)
model OrgSettings {
  // ... existing fields ...
  monthlyRequestLimit    Int?    @map("monthly_request_limit")    // null = unlimited
  monthlyTokenLimit      Int?    @map("monthly_token_limit")      // null = unlimited
}

// User -- add password tracking fields
model User {
  // ... existing fields ...
  passwordChangedAt      DateTime? @map("password_changed_at")
}

// OrgMember -- add force password change flag
model OrgMember {
  // ... existing fields ...
  forcePasswordChange    Boolean  @default(false) @map("force_password_change")
}
```

### New Indexes for Usage Queries
```prisma
// UsageRecord -- add index for rolling window queries
model UsageRecord {
  // ... existing fields ...
  @@index([userId, createdAt])  // For per-user rolling window aggregates
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed daily reset (midnight) | Rolling 24-hour window | User decision | More fair per-user, slightly more complex query |
| Hardcoded model lists | Platform Model Registry | Phase 3 | Role model access configures against registry |
| Inline card editing | Modal-based CRUD | User decision for Phase 4 | Cleaner UX, more room for settings |
| Flat sidebar nav | Grouped sidebar nav | User decision for Phase 4 | Better information architecture |

**Deprecated/outdated:**
- The current roles page inline editing pattern will be completely replaced by read-only cards + modal
- The flat sidebar navigation will be replaced by grouped navigation

## Open Questions

1. **IP-based location for sessions**
   - What we know: Session model stores `ipAddress` field. User wants city/country display.
   - What's unclear: No GeoIP library is installed, and MaxMind requires a license key and 300MB database. Free IP geolocation APIs have rate limits.
   - Recommendation: For v1, show IP address directly with a "Location: Unknown" default. Defer GeoIP integration to a future enhancement. The session list is still useful without location data. Alternatively, use a free API like `ip-api.com` for on-the-fly lookups, but cache aggressively and handle failures gracefully.

2. **Recharts + React 19 compatibility**
   - What we know: STATE.md notes potential `--legacy-peer-deps` issue.
   - What's unclear: Whether Recharts 2.x has resolved React 19 peer dependency.
   - Recommendation: Try `npm install recharts` first. If peer dependency conflict, use `--legacy-peer-deps`. Recharts works functionally with React 19 -- the peer dependency warning is a metadata issue, not a runtime issue.

3. **Monthly ceiling API for Super Admin**
   - What we know: Phase 4 includes the backend API for org monthly ceilings. Phase 5 builds the Super Admin UI.
   - What's unclear: How much Super Admin API to build now vs Phase 5.
   - Recommendation: Build the full CRUD API for org ceiling fields in Phase 4 (PATCH /api/admin/organizations/[orgId] with monthly limits). This is a simple field update on the Organization model. The Super Admin UI that calls this API will be built in Phase 5.

4. **ODEF-02: Default role deletion clearing**
   - What we know: If the default role is deleted, the defaultRoleId field in OrgSettings should clear automatically.
   - What's unclear: This is listed in Phase 4 requirements but the main ODEF-01 was Phase 2.
   - Recommendation: Include this as part of the role deletion logic. When a custom role is deleted, check if it was the defaultRoleId and null it out.

## Sources

### Primary (HIGH confidence)
- Project codebase analysis: prisma/schema.prisma, app/api/chat/route.ts, lib/auth-middleware.ts, components/admin/admin-sidebar.tsx, app/org/[slug]/admin/roles/page.tsx
- CONTEXT.md user decisions (locked)
- REQUIREMENTS.md requirement definitions
- STATE.md project history and decisions

### Secondary (MEDIUM confidence)
- Recharts documentation patterns (standard React chart library)
- Radix UI Tabs documentation (established pattern in project via other Radix components)
- HTML5 Canvas API for image processing (well-documented web standard)

### Tertiary (LOW confidence)
- IP geolocation approach (multiple options, none verified for this project)
- Recharts + React 19 peer dependency status (may have been resolved since STATE.md note)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all core libraries already installed, only 2 new dependencies
- Architecture: HIGH - follows existing patterns from Phase 3 (service layer, API routes, admin components)
- Pitfalls: HIGH - based on direct codebase analysis and well-known patterns
- Schema changes: HIGH - minimal additions to existing models
- Usage enforcement: HIGH for correctness, MEDIUM for race condition edge case (documented as acceptable)

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable domain, no fast-moving dependencies)
