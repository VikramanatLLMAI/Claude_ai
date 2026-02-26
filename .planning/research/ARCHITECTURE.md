# Architecture Research

**Domain:** RBAC Multi-Tenant AI Chat SaaS Platform
**Researched:** 2026-02-26
**Confidence:** HIGH

## System Overview

```
+=====================================================================+
|                      PRESENTATION LAYER                             |
+---------------------------------------------------------------------+
|  +-------------+  +-------------+  +-------------+  +------------+ |
|  | Super Admin |  | Org Admin   |  | User Chat   |  | Login /    | |
|  | Dashboard   |  | Dashboard   |  | Interface   |  | Invitation | |
|  | (new)       |  | (new)       |  | (existing+) |  | (modified) | |
|  +------+------+  +------+------+  +------+------+  +-----+------+ |
|         |                |                |                |        |
+=========|================|================|================|========+
|                      AUTHORIZATION LAYER (new)                      |
+---------------------------------------------------------------------+
|  +------------------+  +------------------+  +-------------------+  |
|  | Auth Middleware   |  | Permission       |  | Tenant Context    |  |
|  | (enhanced)       |  | Checker          |  | Resolver          |  |
|  | requireAuth()    |  | requireRole()    |  | withTenantScope() |  |
|  +--------+---------+  +--------+---------+  +---------+---------+  |
|           |                     |                      |            |
+===========|=====================|======================|============+
|                       API ROUTE LAYER                               |
+---------------------------------------------------------------------+
|  +-----------+  +-----------+  +----------+  +-----------+          |
|  | /api/     |  | /api/     |  | /api/    |  | /api/     |          |
|  | admin/    |  | org/      |  | chat     |  | auth/     |          |
|  | (new)     |  | (new)     |  | (mod)    |  | (mod)     |          |
|  +-----+-----+  +-----+-----+  +----+-----+  +-----+-----+        |
|        |              |              |               |              |
+========|==============|==============|===============|==============+
|                   BUSINESS LOGIC LAYER                              |
+---------------------------------------------------------------------+
|  +-------------+  +-------------+  +-----------+  +--------------+  |
|  | Org Manager |  | Role/Perm   |  | Prompt    |  | Usage        |  |
|  | (new)       |  | Manager     |  | Stack     |  | Tracker      |  |
|  |             |  | (new)       |  | (new)     |  | (new)        |  |
|  +------+------+  +------+------+  +-----+-----+  +------+-------+  |
|         |                |               |                |         |
|  +-------------+  +-------------+  +-----------+  +--------------+  |
|  | Audit       |  | Invitation  |  | Analytics |  | Anthropic    |  |
|  | Logger      |  | Service     |  | Engine    |  | (existing)   |  |
|  | (new)       |  | (new)       |  | (new)     |  |              |  |
|  +------+------+  +------+------+  +-----+-----+  +------+-------+  |
|         |                |               |                |         |
+=========|================|===============|================|=========+
|                    DATA ACCESS LAYER                                |
+---------------------------------------------------------------------+
|  +----------------------------------------------------------+      |
|  |              Tenant-Scoped Prisma Client                  |      |
|  |     (Prisma Client Extension with orgId filtering)        |      |
|  +-----+--------+--------+---------+--------+-------+-------+      |
|        |        |        |         |        |       |               |
|  +-----+--+ +---+---+ +-+----+ +--+---+ +--+--+ +--+---+          |
|  | Org    | | User  | | Role | | Conv | | Msg | | Audit|          |
|  | Store  | | Store | | Store| | Store| | Store| | Store|          |
|  | (new)  | | (mod) | | (new)| | (mod)| | (mod)| | (new)|          |
|  +--------+ +-------+ +------+ +------+ +-----+ +------+          |
|                                                                     |
+====================+================================================+
|                    |   DATABASE LAYER                                |
|                    v                                                 |
|  +----------------------------------------------------------+      |
|  |                PostgreSQL + Prisma 7.3                     |     |
|  |  +------+  +--------+  +------+  +--------+  +--------+  |     |
|  |  | Org  |  | OrgMem |  | Role |  | Invite |  | Audit  |  |     |
|  |  +------+  +--------+  +------+  +--------+  +--------+  |     |
|  |  +------+  +--------+  +------+  +--------+  +--------+  |     |
|  |  | User |  | Session|  | Conv |  | Message|  | Usage  |  |     |
|  |  +------+  +--------+  +------+  +--------+  +--------+  |     |
|  +----------------------------------------------------------+      |
+=====================================================================+
|                    EXTERNAL SERVICES                                |
|  +---------------+  +-------------+  +------------------+          |
|  | Anthropic API |  | Resend API  |  | MCP Servers      |          |
|  | (existing)    |  | (new)       |  | (existing)       |          |
|  +---------------+  +-------------+  +------------------+          |
+=====================================================================+
```

## Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Auth Middleware (enhanced)** | Validates session, resolves user + org membership + role in a single query; returns enriched auth context | Session store, OrgMember store |
| **Permission Checker (new)** | Evaluates whether authenticated user has required role/permission for the requested action | Auth Middleware, Role store |
| **Tenant Context Resolver (new)** | Resolves orgId from authenticated user and injects it into all downstream queries | Auth Middleware, Prisma Client Extension |
| **Tenant-Scoped Prisma Client (new)** | Wraps standard Prisma client with `$extends` to auto-filter all queries by orgId | Prisma Client, all data stores |
| **Org Manager (new)** | CRUD for organizations, soft delete with 30-day grace, org branding/theme assignment | Organization store, Audit Logger |
| **Role/Permission Manager (new)** | System role templates, custom role creation, model access, MCP assignment, usage limits per role | Role store, Audit Logger |
| **Prompt Stack Builder (new)** | Assembles 4-layer system prompt (platform + org + role + user) with token budget enforcement | Org store, Role store, OrgMember store |
| **Usage Tracker (new)** | Records per-request token consumption from Anthropic API responses, enforces daily/monthly limits | Usage store, Anthropic response metadata |
| **Audit Logger (new)** | Append-only log of all admin actions with actor, target, action type, timestamp, org context | AuditLog store |
| **Invitation Service (new)** | Generates invitation tokens, sends emails via Resend, handles acceptance flow | Invitation store, Resend API, User store |
| **Analytics Engine (new)** | Aggregates usage data for dashboards (Super Admin: cross-org, Org Admin: org-scoped) | Usage store, Message store, Conversation store |
| **Super Admin Dashboard (new)** | Platform-wide management UI: orgs, API keys, platform analytics, audit logs | All admin API routes |
| **Org Admin Dashboard (new)** | Org-scoped management UI: users, roles, invitations, org analytics, org audit logs | Org-scoped admin API routes |
| **User Chat Interface (existing, modified)** | Existing chat UI enhanced with org branding, role-constrained model selection, usage limit banners | Chat API, Conversation API |
| **Login / Invitation (modified)** | Login page enhanced for multi-tenant; new invitation acceptance flow | Auth API, Invitation API |

## Recommended Project Structure

```
app/
├── page.tsx                          # Login page (modified: no registration link)
├── layout.tsx                        # Root layout (modified: org branding context)
├── globals.css                       # Theme variables (existing + org branding injection)
├── invite/
│   └── [token]/
│       └── page.tsx                  # Invitation acceptance + registration
├── chat/
│   └── page.tsx                      # Chat page (modified: org/role context)
├── admin/                            # Super Admin pages
│   ├── layout.tsx                    # Admin shell layout with nav
│   ├── page.tsx                      # Dashboard overview
│   ├── organizations/
│   │   └── page.tsx                  # Org management
│   ├── api-keys/
│   │   └── page.tsx                  # Platform API key management
│   ├── analytics/
│   │   └── page.tsx                  # Platform analytics
│   └── audit-logs/
│       └── page.tsx                  # Platform audit logs
├── org/                              # Org Admin pages
│   ├── layout.tsx                    # Org admin shell layout
│   ├── page.tsx                      # Org dashboard overview
│   ├── members/
│   │   └── page.tsx                  # User/member management
│   ├── roles/
│   │   └── page.tsx                  # Role management
│   ├── invitations/
│   │   └── page.tsx                  # Invitation management
│   ├── settings/
│   │   └── page.tsx                  # Org settings (branding, themes, password policy)
│   ├── analytics/
│   │   └── page.tsx                  # Org analytics
│   └── audit-logs/
│       └── page.tsx                  # Org audit logs
├── api/
│   ├── auth/                         # (existing, modified)
│   │   ├── login/route.ts            # Modified: resolve org context
│   │   ├── register/route.ts         # Modified: disabled for public, used by invite flow
│   │   └── ...                       # Existing auth routes
│   ├── chat/route.ts                 # Modified: org-scoped, role-filtered models
│   ├── conversations/                # Modified: org-scoped queries
│   ├── admin/                        # Super Admin API (new)
│   │   ├── organizations/route.ts
│   │   ├── api-keys/route.ts
│   │   ├── analytics/route.ts
│   │   └── audit-logs/route.ts
│   ├── org/                          # Org Admin API (new)
│   │   ├── members/route.ts
│   │   ├── roles/route.ts
│   │   ├── invitations/route.ts
│   │   ├── settings/route.ts
│   │   ├── analytics/route.ts
│   │   └── audit-logs/route.ts
│   ├── invite/                       # Invitation API (new)
│   │   └── accept/route.ts
│   ├── mcp/                          # Modified: org-scoped
│   └── user/                         # Modified: org-scoped settings
│
lib/
├── db.ts                             # Existing Prisma singleton
├── storage.ts                        # Modified: all operations become org-aware
├── auth-middleware.ts                 # Enhanced: returns AuthContext with orgId, role
├── tenant.ts                         # NEW: Tenant-scoped Prisma client extension
├── permissions.ts                    # NEW: Permission checker, role hierarchy
├── prompt-stack.ts                   # NEW: 4-layer prompt assembly with token budget
├── usage-tracker.ts                  # NEW: Token/request tracking and limit enforcement
├── audit.ts                          # NEW: Immutable audit log operations
├── invitation.ts                     # NEW: Invitation token generation and email
├── email.ts                          # NEW: Resend API client wrapper
├── analytics.ts                      # NEW: Analytics aggregation queries
├── org-manager.ts                    # NEW: Organization lifecycle management
├── role-manager.ts                   # NEW: Role CRUD and template management
├── validation.ts                     # Modified: new schemas for RBAC entities
├── encryption.ts                     # Existing (unchanged)
├── anthropic.ts                      # Existing (unchanged)
├── system-prompts.ts                 # Modified: wraps prompt-stack.ts
├── mcp-client.ts                     # Existing (unchanged at lib level)
├── artifacts.ts                      # Existing (unchanged)
├── api-utils.ts                      # Existing (unchanged)
└── ...                               # Other existing lib files unchanged

components/
├── full-chat-app.tsx                 # Modified: org branding, role-filtered models, usage banners
├── login-page.tsx                    # Modified: no registration, org-aware login
├── settings-modal.tsx                # Modified: remove API key management, add org/role info
├── admin/                            # NEW: Super Admin components
│   ├── admin-layout.tsx
│   ├── org-table.tsx
│   ├── api-key-manager.tsx
│   ├── platform-analytics.tsx
│   └── audit-log-viewer.tsx
├── org/                              # NEW: Org Admin components
│   ├── org-layout.tsx
│   ├── member-table.tsx
│   ├── role-editor.tsx
│   ├── invitation-manager.tsx
│   ├── org-settings.tsx
│   ├── org-analytics.tsx
│   └── audit-log-viewer.tsx
├── shared/                           # NEW: Shared admin components
│   ├── data-table.tsx
│   ├── stats-card.tsx
│   ├── chart-wrapper.tsx             # Recharts wrapper
│   └── usage-banner.tsx              # 80%/100% limit warning
├── invite/                           # NEW: Invitation flow
│   └── accept-invite.tsx
└── ...                               # Existing components (prompt-kit, viewers, ui)

prisma/
├── schema.prisma                     # Complete redesign with RBAC models
├── seed.ts                           # NEW: Super Admin seed script
└── migrations/                       # Fresh migrations (clean start)
```

### Structure Rationale

- **`app/admin/` and `app/org/`:** Separate page trees for each admin role. Super Admin and Org Admin have fundamentally different scopes and should not share UI shells. This prevents accidental permission leaks at the routing level.
- **`lib/tenant.ts`:** Single source of truth for tenant scoping. Every org-aware query flows through this module, making it impossible to forget the orgId filter.
- **`lib/permissions.ts`:** Centralized permission logic prevents inconsistent role checks scattered across API routes.
- **`lib/audit.ts`:** Isolated audit module ensures audit operations are never mixed with business logic and remain append-only.
- **`components/admin/` and `components/org/`:** Admin components separate from chat components because they follow different UI patterns (data tables, forms vs. chat interface).
- **`components/shared/`:** Reusable admin primitives (data tables, stat cards, chart wrappers) shared between Super Admin and Org Admin dashboards.

## Architectural Patterns

### Pattern 1: Enriched Auth Context

**What:** Enhance `requireAuth()` to return full RBAC context (user + org membership + role + permissions) in a single database query, replacing the current pattern that only returns a User.

**When to use:** Every protected API route. This is the foundation of the entire RBAC system.

**Trade-offs:** Slightly heavier auth query (1 query with joins instead of 1 simple query), but eliminates N+1 auth lookups later in the request lifecycle. The extra cost is negligible compared to the Anthropic API call latency.

**Example:**

```typescript
// lib/auth-middleware.ts (enhanced)

export interface AuthContext {
  user: User;
  orgMember: OrgMember | null;   // null for Super Admin
  org: Organization | null;       // null for Super Admin
  role: Role | null;              // null for Super Admin
  isSuperAdmin: boolean;
  permissions: {
    allowedModels: string[];
    maxDailyRequests: number | null;
    maxDailyTokens: number | null;
    canViewConversations: boolean;
    customInstructionsEnabled: boolean;
    customInstructionsMaxChars: number;
  } | null;
}

export async function requireAuth(
  req: NextRequest
): Promise<{ auth: AuthContext } | NextResponse> {
  // 1. Validate bearer token (existing logic)
  // 2. Load session with user
  // 3. If user.role === 'SUPER_ADMIN', return SuperAdmin context
  // 4. Otherwise, load OrgMember + Role with org in single query
  // 5. Return enriched AuthContext
}

export function requireRole(
  auth: AuthContext,
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'USER'
): NextResponse | null {
  // Returns 403 Response if role insufficient, null if authorized
}
```

### Pattern 2: Tenant-Scoped Prisma Extension

**What:** Use Prisma Client Extensions to create a tenant-scoped client that automatically filters all queries by `orgId`. Prevents accidental cross-tenant data leakage at the database query level.

**When to use:** All org-scoped data operations (conversations, messages, artifacts, MCP connections, audit logs). NOT used for Super Admin cross-org operations or user-level operations that span orgs.

**Trade-offs:** Adds a thin abstraction layer over Prisma. Extensions are lightweight (they share the underlying client connection), so no performance penalty. Requires discipline: Super Admin operations must bypass the extension explicitly.

**Example:**

```typescript
// lib/tenant.ts

import prisma from './db';

export function tenantPrisma(orgId: string) {
  return prisma.$extends({
    query: {
      conversation: {
        async findMany({ args, query }) {
          args.where = { ...args.where, orgId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, orgId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, orgId };
          return query(args);
        },
        // ... similar for update, delete
      },
      message: {
        // Filter via conversation's orgId relationship
      },
      mcpConnection: {
        // Filter by orgId
      },
      // ... all tenant-scoped models
    },
  });
}

// Usage in API routes:
const auth = await requireAuth(req);
const db = tenantPrisma(auth.orgMember!.orgId);
const conversations = await db.conversation.findMany({
  where: { userId: auth.user.id },
  // orgId filter automatically injected
});
```

### Pattern 3: 4-Layer Prompt Stack with Token Budget

**What:** Build the system prompt by concatenating 4 layers (platform, org, role, user), each with size constraints, enforcing a combined token budget. This is specific to the AI chat domain and prevents prompt bloat while allowing customization at every organizational level.

**When to use:** Every chat request in `/api/chat`.

**Trade-offs:** Adds complexity to prompt assembly, but the alternative (single-layer prompt) cannot support per-org/per-role customization. The 2000-token budget is conservative but prevents the system prompt from consuming meaningful context window space.

**Example:**

```typescript
// lib/prompt-stack.ts

interface PromptLayer {
  source: string;  // 'platform' | 'org' | 'role' | 'user'
  content: string;
  maxChars: number;
}

export function buildPromptStack(config: {
  orgInstructions: string | null;      // from Organization.systemInstructions
  roleInstructions: string | null;     // from Role.systemInstructions
  userName: string;
  roleName: string;
  customInstructions: string | null;   // from OrgMember.customInstructions
}): string {
  const layers: PromptLayer[] = [
    { source: 'platform', content: PLATFORM_PROMPT, maxChars: Infinity },
    { source: 'org', content: config.orgInstructions || '', maxChars: 2000 },
    { source: 'role', content: config.roleInstructions || '', maxChars: 2000 },
    {
      source: 'user',
      content: buildUserLayer(config.userName, config.roleName, config.customInstructions),
      maxChars: 2000,
    },
  ];

  // Truncate each layer to its maxChars
  // Estimate combined token count (chars / 4 heuristic)
  // If over 2000 token budget, trim org and role layers proportionally
  // Platform layer is never trimmed
  return assembleLayers(layers);
}
```

### Pattern 4: Append-Only Audit Log

**What:** Record every admin action (org CRUD, role changes, user management, config changes) in an immutable, append-only audit log table. No update or delete operations are exposed through the application.

**When to use:** All admin actions performed by Super Admin or Org Admin. NOT used for regular chat operations (those are tracked via usage records).

**Trade-offs:** Table grows unbounded. For the target scale (5-20 orgs, hundreds of users), this is manageable. At much larger scale, partitioning by date or org would be needed. Simplicity wins here.

**Example:**

```typescript
// lib/audit.ts

export interface AuditEntry {
  actorId: string;      // who performed the action
  actorRole: string;    // SUPER_ADMIN or ORG_ADMIN
  orgId: string | null; // null for platform-level actions
  action: string;       // e.g., 'org.create', 'member.suspend', 'role.update'
  targetType: string;   // e.g., 'organization', 'user', 'role'
  targetId: string;     // ID of the affected entity
  details: object;      // JSON with before/after or additional context
}

export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      ...entry,
      details: entry.details as object,
      // timestamp auto-set by database
    },
  });
  // NO try/catch here - audit failures should propagate
  // If we can't log, the admin action should fail
}
```

### Pattern 5: Usage Tracking from API Response Metadata

**What:** Extract `input_tokens` and `output_tokens` from every Anthropic API response and record them with orgId, userId, roleId, and model context. Enforce daily per-role limits and monthly per-org limits.

**When to use:** In the chat route's `onFinish` callback, after the stream completes.

**Trade-offs:** Relies on Anthropic API response metadata accuracy. Token counts are available in the streaming response's usage object. Recording per-request is slightly more storage than daily aggregates, but enables fine-grained analytics without data loss.

**Example:**

```typescript
// lib/usage-tracker.ts

export async function recordUsage(data: {
  orgId: string;
  userId: string;
  roleId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  conversationId: string;
}): Promise<void> {
  await prisma.usageRecord.create({ data });
}

export async function checkLimits(
  orgId: string,
  userId: string,
  roleId: string
): Promise<{
  allowed: boolean;
  reason?: string;
  percentUsed?: number;
}> {
  // 1. Get role's daily limits
  // 2. Sum today's usage for this user+role
  // 3. Get org's monthly limits
  // 4. Sum this month's usage for this org
  // 5. Return allowed/denied with percentage
}
```

## Data Flow

### Enhanced Authentication Flow (Modified)

```
User submits login
    |
    v
POST /api/auth/login { email, password }
    |
    v
Backend:
    1. getUserByEmail(email)
    2. verifyPassword(password, user.passwordHash)
    3. Lookup OrgMember for user (get orgId, roleId)
    4. Check org status (not suspended/deleted)
    5. Check user status in org (not suspended)
    6. Enforce password policy (check expiry)
    7. createSession(userId, token, expiresAt)
    8. Return { user, org, role, token }
    |
    v
Frontend:
    1. Store token in localStorage
    2. Store user context (orgId, role, permissions)
    3. Route based on role:
       - SUPER_ADMIN -> /admin
       - ORG_ADMIN -> /org (or /chat with admin nav)
       - USER -> /chat
```

### Chat Request Flow (Modified)

```
User submits message
    |
    v
POST /api/chat { messages, model, conversationId, ... }
    |
    v
1. requireAuth(req) -> AuthContext { user, org, orgMember, role, permissions }
    |
    v
2. PERMISSION CHECK:
   - Is model in role.allowedModels? (403 if not)
   - Is user at daily request limit? (429 if yes)
   - Is org at monthly limit? (429 if yes)
    |
    v
3. BUILD PROMPT STACK:
   - Platform prompt (hardcoded)
   - + Org system instructions (from Organization)
   - + Role system instructions (from Role)
   - + User context (name, role name, custom instructions from OrgMember)
   - Enforce 2000-token combined budget
    |
    v
4. RESOLVE MCP TOOLS:
   - Get role's assigned MCP servers (role-level + org-wide)
   - Load tool descriptions from assigned connections
   - (Users cannot add/modify MCP connections)
    |
    v
5. BUILD API KEY:
   - Use org's assigned platform API key (from PlatformApiKey table)
   - NOT user's personal key (removed in RBAC version)
    |
    v
6. STREAM from Anthropic API (existing logic)
    |
    v
7. ON FINISH:
   - Save message to DB (with orgId on conversation)
   - Extract artifacts (existing)
   - Record usage: { orgId, userId, roleId, model, inputTokens, outputTokens }
   - Update conversation.updatedAt
    |
    v
8. Response streamed to client (existing)
```

### Invitation Flow (New)

```
Org Admin creates invitation
    |
    v
POST /api/org/invitations { email, roleId }
    |
    v
1. requireAuth -> requireRole(ORG_ADMIN)
2. Validate email not already in org
3. Create Invitation record { email, orgId, roleId, token, expiresAt }
4. Send email via Resend API with invitation link
5. Log audit event
    |
    v
Invitee clicks link -> /invite/[token]
    |
    v
1. Validate token (not expired, not used)
2. Display registration form (name, password)
3. POST /api/invite/accept { token, name, password }
    |
    v
Backend:
    1. Validate invitation token
    2. Create User (if email doesn't exist as user)
    3. Create OrgMember { userId, orgId, roleId }
    4. Mark invitation as accepted
    5. Create session
    6. Return { user, org, token }
    |
    v
Frontend redirects to /chat with org context
```

### Admin Action Flow (New, applies to all admin operations)

```
Admin performs action (e.g., suspend user)
    |
    v
PATCH /api/org/members/[id] { status: 'suspended' }
    |
    v
1. requireAuth -> requireRole(ORG_ADMIN)
2. Validate target user is in same org
3. Self-protection: cannot suspend self
4. Org protection: cannot suspend last Org Admin
5. Execute action: update OrgMember status
6. Side effects: revoke all sessions for suspended user
7. Log audit event { action: 'member.suspend', targetId, actorId, orgId }
8. Return success
```

### State Management (Enhanced)

```
Client State (enhanced):
  - localStorage: token, userId, orgId, role name
  - React context: AuthContext { user, org, role, permissions }
  - useChat hook: messages, streaming state (existing)
  - Usage state: { percentUsed, limitWarning }

Server State:
  - PostgreSQL via Prisma: all entities, org-scoped
  - Session table: token validation (existing, unchanged)

Derived State:
  - Allowed models: filtered from full model list by role.allowedModels
  - Available MCP: filtered by role-level + org-wide assignments
  - System prompt: assembled from 4-layer stack per request
  - Usage percentage: computed from usage records vs limits
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 5-20 orgs, hundreds of users (target) | Current architecture is sufficient. Single PostgreSQL instance handles all tenants. Audit logs and usage records are small. No caching needed beyond Prisma's query optimization. |
| 50-100 orgs, thousands of users | Add database indexes on (orgId, createdAt) for usage and audit tables. Consider read replicas for analytics queries to avoid impacting chat latency. Cache role permissions in memory (TTL: 5 minutes). |
| 500+ orgs, tens of thousands of users | Partition usage_records and audit_logs by month. Consider Redis for session validation and permission caching. Move analytics aggregation to background jobs. Consider connection pooling (PgBouncer). |

### Scaling Priorities

1. **First bottleneck: Analytics queries.** Aggregating usage data across large time ranges will be the first thing to slow down. Mitigation: Pre-aggregate daily/weekly/monthly totals in a summary table via a scheduled job, rather than computing on-the-fly from raw usage records.
2. **Second bottleneck: Audit log table size.** At hundreds of admin actions per day across 100+ orgs, the audit log grows fast. Mitigation: Partition by month, add composite index on (orgId, createdAt).
3. **Third bottleneck: Auth query latency.** If the enriched auth query (user + orgMember + role + org) becomes slow due to table sizes, add a session-local cache or Redis cache for the auth context with short TTL (1-2 minutes).

## Anti-Patterns

### Anti-Pattern 1: Scattering orgId Filters Across API Routes

**What people do:** Manually add `where: { orgId }` to every Prisma query in every API route handler.

**Why it's wrong:** A single missed filter leaks data across tenants. As the codebase grows, the probability of missing a filter approaches 1. Code reviews cannot reliably catch all instances.

**Do this instead:** Use the Tenant-Scoped Prisma Extension (Pattern 2) so that orgId filtering is automatic and centralized. API routes should never reference orgId in their query filters directly -- it should be injected by the extension.

### Anti-Pattern 2: Checking Roles with String Comparisons in Routes

**What people do:** Write `if (user.role === 'ORG_ADMIN')` checks directly in API route handlers.

**Why it's wrong:** Role names change, new roles are added, and string comparisons are fragile. Also, this conflates authentication (who are you?) with authorization (what can you do?).

**Do this instead:** Use `requireRole(auth, 'ORG_ADMIN')` from the centralized permissions module. The role hierarchy (SUPER_ADMIN > ORG_ADMIN > USER) should be defined once and enforced consistently.

### Anti-Pattern 3: Storing Role Permissions in Application Code

**What people do:** Hardcode which models each role can access, what limits they have, etc., in the API route handlers or config files.

**Why it's wrong:** Org Admins need to create custom roles and modify permissions without code changes. Hardcoded permissions require redeployment for any change.

**Do this instead:** Store all permission data in the database (Role model with allowedModels, maxDailyRequests, etc.). The application reads permissions from the database via the auth context.

### Anti-Pattern 4: Making Audit Logs Optional or Best-Effort

**What people do:** Wrap audit log writes in try/catch and swallow errors, or make them fire-and-forget with `.catch(() => {})`.

**Why it's wrong:** Audit logs exist for compliance and security. If an admin action succeeds but the audit log fails, you have an untracked privileged operation. This defeats the purpose.

**Do this instead:** Make audit log writes part of the same database transaction as the admin action. If the audit log fails, the admin action should roll back. Use `prisma.$transaction()` to guarantee atomicity.

### Anti-Pattern 5: Using Next.js Middleware for Authorization

**What people do:** Implement role-based route protection in Next.js `middleware.ts` (or `proxy.ts` in v16) by checking JWT/session and redirecting based on roles.

**Why it's wrong:** CVE-2025-29927 demonstrated that Next.js middleware can be bypassed. Middleware runs at the edge and is designed for routing optimizations, not security enforcement. It is an optimization layer, not a security boundary.

**Do this instead:** Use middleware only for routing hints (redirecting unauthenticated users to login). All actual authorization must happen in API route handlers via `requireAuth()` and `requireRole()`. Defense in depth: validate at the data access layer, not the routing layer.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Anthropic API** | Direct SDK via `@ai-sdk/anthropic` + `@anthropic-ai/sdk` (existing) | API key changes from per-user to per-org platform keys managed by Super Admin. The `anthropic()` provider call must use the org's assigned API key. |
| **Resend API** | New `lib/email.ts` module wrapping Resend SDK | Used for: invitations, password resets, forced password resets. Use React Email for templates. Estimated volume: very low (< 100 emails/day at target scale). |
| **MCP Servers** | Existing `lib/mcp-client.ts` (unchanged at protocol level) | Ownership changes: MCP connections move from per-user to per-org, assigned at org-wide or role level by Org Admin. Existing `executeMcpTool()` logic unchanged. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Auth Layer <-> API Routes** | Function call: `requireAuth(req)` returns `AuthContext` | Every API route starts with auth. AuthContext is the single source of truth for "who is this user and what can they do?" |
| **API Routes <-> Storage Layer** | Function call via `lib/storage.ts` using tenant-scoped client | API routes get tenant-scoped Prisma client from auth context. Storage functions receive this scoped client. |
| **Chat Route <-> Prompt Stack** | Function call: `buildPromptStack(config)` | Chat route passes org/role/user instructions. Prompt stack builder handles truncation and budget enforcement. Returns assembled system prompt string. |
| **Chat Route <-> Usage Tracker** | Function call in `onFinish`: `recordUsage()` and pre-check: `checkLimits()` | Limit check happens before streaming starts. Usage recording happens after streaming completes. Both are async but usage check blocks the request. |
| **Admin Routes <-> Audit Logger** | Function call: `logAuditEvent(entry)` inside `prisma.$transaction()` | Audit log write is transactional with the admin action. Failure in either rolls back both. |
| **Super Admin Dashboard <-> /api/admin/** | HTTP fetch from client components | Super Admin pages are full-page React components (not modals). Standard fetch pattern with auth token. |
| **Org Admin Dashboard <-> /api/org/** | HTTP fetch from client components | Org Admin pages follow same pattern. All API responses automatically scoped to the admin's org by auth context. |

## Database Schema Outline

The schema redesign creates these new/modified models (detailed schema in STACK.md but architectural boundaries shown here):

```
New Models:
  Organization     - Tenant entity, owns everything
  OrgMember        - Junction: User <-> Org with role, status, custom instructions
  Role             - Permission template within an org (system or custom)
  Invitation       - Pending invitation to join org
  AuditLog         - Immutable admin action log
  UsageRecord      - Per-request token consumption
  PlatformApiKey   - Anthropic API keys managed by Super Admin
  PasswordPolicy   - Per-org password rules

Modified Models:
  User             - Add globalRole (SUPER_ADMIN | USER), remove anthropicApiKey
  Session          - Add deviceInfo for session management UI
  Conversation     - Add orgId for tenant scoping
  McpConnection    - Move from per-user to per-org, add roleAssignment
  Artifact         - Add orgId for tenant scoping

Unchanged Models:
  Message          - Scoped via Conversation (no direct orgId needed)
  PasswordResetToken - Unchanged (scoped by email)
```

### Key Relationships

```
Organization  1--*  OrgMember
Organization  1--*  Role
Organization  1--*  Conversation
Organization  1--*  McpConnection
Organization  1--*  Invitation
Organization  1--*  AuditLog
Organization  1--*  UsageRecord
Organization  *--*  PlatformApiKey  (via OrgApiKeyAssignment)

User          1--*  OrgMember       (user can be in multiple orgs)
User          1--*  Session

OrgMember     *--1  Role
OrgMember     1--*  Conversation    (via userId + orgId)

Role          1--*  OrgMember
Role          *--*  McpConnection   (role-level MCP assignments)

Conversation  1--*  Message
Conversation  1--*  Artifact
Message       1--*  Artifact
```

## Build Order (Dependency Graph)

Components must be built in this order due to data and functional dependencies:

```
Phase 1: Foundation
  Database Schema + Prisma Models
       |
       v
  Auth Middleware Enhancement (AuthContext)
       |
       v
  Tenant-Scoped Prisma Extension
       |
       v
  Permission Checker (requireRole)
       |
       v
  Seed Script (Super Admin creation)

Phase 2: Organization Core
  Org Manager (CRUD, soft delete)
       |
       v
  Role Manager (system templates, custom roles)
       |
       v
  Invitation Service + Resend integration
       |
       v
  Audit Logger

Phase 3: Chat Integration
  Prompt Stack Builder
       |
       v
  Chat Route modifications (org-scoped, role-filtered models, org API key)
       |
       v
  Usage Tracker (recording + limit enforcement)
       |
       v
  MCP connection refactoring (per-org, role-assigned)

Phase 4: Admin Dashboards
  Shared admin components (data tables, charts)
       |
       v
  Super Admin Dashboard (orgs, API keys, analytics)
       |
       +---> Org Admin Dashboard (members, roles, invitations, analytics)
       |
       v
  Audit log viewer (both admin levels)

Phase 5: Polish
  Session management UI
  Password policy enforcement
  Conversation visibility controls
  Usage limit banners in chat UI
  Theme/branding propagation
```

**Build order rationale:**

1. **Schema first** because every other component depends on the data model. The auth middleware enhancement cannot work without OrgMember and Role models.
2. **Auth + tenant scoping second** because every API route depends on knowing "who is this user, in which org, with what role?"
3. **Org/Role management before chat** because the chat modifications need org and role data to exist.
4. **Invitation service before dashboards** because admins need to be able to add users before the dashboards provide UI for it (CLI/seed can bootstrap, but invitation is core).
5. **Chat integration before dashboards** because the chat route changes are the core value -- the dashboards are management tools around it.
6. **Dashboards last** because they are read-heavy visualization of data created by earlier phases. They can be built once the data exists.
7. **Polish last** because session management, password policies, and usage banners are refinements on a working system.

## Sources

- [Prisma Multi-Tenancy with Client Extensions](https://dev.to/murilogervasio/how-to-make-multi-tenant-applications-with-nestjs-and-a-prisma-proxy-to-automatically-filter-tenant-queries--4kl2) - MEDIUM confidence
- [PostgreSQL Row-Level Security for Multi-Tenant Applications](https://www.permit.io/blog/implementing-fine-grained-postgres-permissions-for-multi-tenant-applications) - MEDIUM confidence
- [Securing Multi-Tenant Applications with RLS in PostgreSQL + Prisma](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35) - MEDIUM confidence
- [Multi-Tenancy Implementation with Next.js and Prisma](https://qaffaf.medium.com/implementing-multi-tenancy-in-a-next-js-4f2608633a38) - MEDIUM confidence
- [CVE-2025-29927: Next.js Middleware Authorization Bypass](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) - HIGH confidence (security advisory)
- [Next.js Authentication Guide 2026 (WorkOS)](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) - MEDIUM confidence
- [Immutable Audit Logs in PostgreSQL](https://hoop.dev/blog/immutable-audit-logs-in-postgresql-with-pgcli/) - MEDIUM confidence
- [Multi-Tenant SaaS Architecture Patterns](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/) - MEDIUM confidence
- [Resend + Next.js Integration](https://resend.com/docs/send-with-nextjs) - HIGH confidence (official docs)
- [Multi-Tenant AI Agent Architecture](https://brimlabs.ai/blog/how-to-build-scalable-multi-tenant-architectures-for-ai-enabled-saas/) - LOW confidence (single source)
- [RBAC Design Patterns for PostgreSQL](https://medium.com/@07rohit/designing-a-role-based-access-control-rbac-system-a-scalable-approach-441f05168933) - MEDIUM confidence

---
*Architecture research for: RBAC Multi-Tenant AI Chat SaaS Platform*
*Researched: 2026-02-26*
