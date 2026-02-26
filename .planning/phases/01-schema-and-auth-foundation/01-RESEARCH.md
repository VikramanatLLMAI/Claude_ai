# Phase 1: Schema and Auth Foundation - Research

**Researched:** 2026-02-26
**Domain:** Multi-tenant database schema, Prisma Client Extensions, auth middleware, subdomain routing
**Confidence:** HIGH

## Summary

Phase 1 transforms a single-user Next.js 16 + Prisma 7 chat application into a multi-tenant platform. The core work is: (1) rewriting the Prisma schema from scratch with Organization, OrgMember, Role, and supporting models alongside updated existing tables with `organizationId` columns; (2) building a tenant-scoped Prisma Client Extension that auto-injects `organizationId` into every query; (3) enriching the existing auth middleware to load user + org membership + role + permissions on every request; and (4) implementing dual-mode routing (path-based in dev, subdomain in prod) that resolves org context from the URL.

The existing codebase has 6 Prisma models (User, Session, Conversation, Message, Artifact, McpConnection), ~30 data access functions in `lib/storage.ts`, a simple session-based auth system, and 23 API route files. All of these must be adapted for multi-tenancy. The biggest risk is cross-tenant data leaks in `storage.ts` -- every function that touches org-scoped data needs the tenant-scoped Prisma client.

**Primary recommendation:** Use Prisma Client Extensions with `$allModels` + `$allOperations` query interception to auto-inject `organizationId` into all read/write operations. Enforce authorization at the route handler level (not proxy/middleware) per CVE-2025-29927 defense-in-depth. Use Next.js 16's `proxy.ts` for subdomain-to-path rewriting in production, with path-based routing as the canonical internal format.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Fresh start -- drop existing single-user data, rewrite schema from scratch with multi-tenant structure
- Use `prisma db push` for schema deployment (no formal migration file)
- Include `db:reset` npm script (drop + push + seed in one command)
- Seed script: env vars (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME`) + interactive CLI fallback, idempotent
- Dev sample data gated behind `NODE_ENV=development` or `--dev` flag: 1 Super Admin + 1 sample org + 2 users
- Production seed only creates Super Admin
- Development: path-based routing (`/org/:slug/chat`, `/org/:slug/admin`, `/admin`)
- Production: subdomain-based routing (`{org-slug}.llmatscale.ai`, `admin.llmatscale.ai`)
- Single `resolveOrgContext()` abstraction layer
- Bare domain: email-first "find my org" helper (like Slack's "find your workspace")
- Unknown subdomains: 404 with link back, no info leakage
- Org login pages: org name + logo placeholder
- Organization model includes `logoDisplayMode` field (PLATFORM_AND_ORG | ORG_ONLY)
- One user = one org (no multi-org membership, no org picker)
- Multiple Org Admins per org allowed; multiple Super Admins platform-wide allowed
- Super Admin has no org context and cannot use chat
- Auth context loaded fresh from DB on every request (no caching)
- Org suspension: block on next request via auth middleware
- Session tokens: keep existing random string format, stored in DB (no JWT)
- Wrapper function pattern: `requireOrgAuth(req)` / `requireSuperAdmin(req)` at top of route handlers
- Tenant-scoped Prisma: `tenantPrisma(orgId)` returns scoped client; platform queries use unscoped client

### Claude's Discretion
- Exact schema field types and indexes
- Prisma Client Extension implementation details
- Session table structure changes
- Error response formats for 401/403
- `resolveOrgContext()` implementation approach
- Development path-to-subdomain mapping logic

### Deferred Ideas (OUT OF SCOPE)
- Phase 2: Org creation UI with `logoDisplayMode` setting
- Phase 2: Org logo upload during org creation/editing
- Phase 7: Login page customization (tagline, custom text)
- Phase 7: Full branding implementation (org colors, logo rendering)
- Phase 7: Platform logo + org logo side-by-side rendering
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHEMA-01 | Fresh database schema with multi-tenant models (Organization, OrgMember, Role, Invitation, AuditLog, UsageRecord, PlatformApiKey, PasswordPolicy, OrgThemeAssignment, OrgSettings) | Prisma schema design patterns, field types, relationships documented below |
| SCHEMA-02 | Existing tables (Conversation, Message, Artifact, McpConnection) gain mandatory organizationId | FK pattern with cascade deletes, index strategy documented |
| SCHEMA-03 | Tenant-scoped Prisma Client Extension auto-injects organizationId | Prisma $extends query component with $allModels/$allOperations documented with code examples |
| SCHEMA-04 | Soft delete on Organization model (deletedAt timestamp, 30-day grace) | Soft delete pattern with nullable DateTime documented |
| SCHEMA-05 | OrgMember junction model (User to Organization with role and custom instructions) | Junction model pattern documented |
| SCHEMA-06 | Partial unique indexes for soft-deleted org name conflicts | Requires Prisma upgrade to 7.4.0+ for `partialIndexes` preview feature, or raw SQL workaround |
| AUTH-01 | Enriched auth context (user + org + role + permissions) in single query | Prisma include/select with nested relations pattern documented |
| AUTH-02 | `requireOrgAuth()` middleware for org-scoped routes | Wrapper function pattern extending existing `requireAuth()` |
| AUTH-03 | `requireSuperAdmin()` middleware for platform routes | Wrapper function pattern with isSuperAdmin check |
| AUTH-04 | Session model extended with organizationId and role context | Session schema changes documented |
| AUTH-05 | Super Admin seed script (CLI, env vars + interactive fallback) | Node.js readline + dotenv pattern documented |
| AUTH-06 | Super Admin has no org context, cannot use chat | Auth context type system with discriminated union |
| AUTH-07 | Authorization at API route handler level (CVE-2025-29927) | CVE details and defense-in-depth pattern documented |
| ROUTE-01 | `admin.llmatscale.ai` for Super Admin panel | proxy.ts subdomain detection + rewrite documented |
| ROUTE-02 | `{org-slug}.llmatscale.ai` for org user chat | proxy.ts hostname parsing + rewrite documented |
| ROUTE-03 | Org Admin panel at `{org-slug}.llmatscale.ai/admin` | Route protection via requireOrgAuth with admin role check |
| ROUTE-04 | Org slug resolved from subdomain on every request | `resolveOrgContext()` pattern documented |
| ROUTE-05 | Data isolation (users from Org A cannot access Org B) | Tenant-scoped Prisma client ensures isolation at data layer |
| SAFE-03 | Only Super Admin can delete an organization | Authorization check in route handler |
| SAFE-06 | Must always have at least 1 Super Admin | Count check before Super Admin deletion |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.4 | App framework, routing, API routes | Already in use; proxy.ts for subdomain routing |
| React | 19.2.3 | UI framework | Already in use |
| Prisma | 7.3.0 (upgrade to 7.4.0 recommended) | ORM, schema, migrations | Already in use; Client Extensions for tenant scoping |
| PostgreSQL | latest | Database | Already in use |
| TypeScript | 5.9.3 | Type safety | Already in use |
| Zod | 4.3.6 | Request validation | Already in use |
| pg | 8.17.2 | PostgreSQL driver | Already in use with @prisma/adapter-pg |

### New for Phase 1
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | 17.2.3 | Seed script env var loading | Already in devDependencies |
| readline (Node built-in) | N/A | Interactive CLI prompts for seed | Fallback when env vars missing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma Client Extensions | PostgreSQL RLS | RLS is more secure at DB level but harder to debug, test, and manage with Prisma; Extensions are simpler and sufficient for 5-20 org scale |
| proxy.ts rewrites | next.config.ts rewrites | Static rewrites cannot handle dynamic subdomain logic |
| Route handler auth | proxy.ts auth | CVE-2025-29927 demonstrated proxy/middleware can be bypassed; route handler auth is defense-in-depth |

**Prisma Upgrade Note:** The project is on Prisma 7.3.0. The `partialIndexes` preview feature (needed for SCHEMA-06) was introduced in Prisma 7.4.0 (released 2026-02-19). **Recommend upgrading to Prisma 7.4.0** to use the native `@@unique([slug], where: { deletedAt: null })` syntax. Alternative: use raw SQL in a post-push script to create the partial unique index.

**Installation:**
```bash
npm install prisma@^7.4.0 @prisma/client@^7.4.0 @prisma/adapter-pg@^7.4.0
```

## Architecture Patterns

### Recommended Project Structure (New/Modified Files)
```
prisma/
  schema.prisma              # Complete rewrite with multi-tenant models
  seed.ts                    # Super Admin seed + dev sample data
lib/
  db.ts                      # Updated: export tenantPrisma(orgId) + unscoped prisma
  storage.ts                 # Updated: all functions accept scoped client or orgId
  auth-middleware.ts          # Updated: requireOrgAuth(), requireSuperAdmin()
  tenant.ts                  # NEW: tenantPrisma() Client Extension factory
  resolve-org.ts             # NEW: resolveOrgContext() abstraction
proxy.ts                     # NEW: subdomain-to-path rewriting (prod)
app/
  org/[slug]/                # NEW: org-scoped pages (dev path-based routing target)
    chat/page.tsx            # Renders existing FullChatApp with org context
    admin/page.tsx           # Org Admin panel placeholder
    login/page.tsx           # Org-branded login page
  admin/                     # NEW: Super Admin panel pages
    page.tsx                 # Super Admin dashboard placeholder
    login/page.tsx           # Super Admin login
  api/
    auth/login/route.ts      # Updated: org-aware login
    auth/register/route.ts   # Updated: disabled (invite-only in Phase 2)
    chat/route.ts            # Updated: use scoped client
    conversations/...        # Updated: use scoped client
    ...                      # All API routes updated for tenant context
```

### Pattern 1: Tenant-Scoped Prisma Client Extension
**What:** Factory function that returns an extended PrismaClient with auto-injected organizationId
**When to use:** Every org-scoped data access operation
**Example:**
```typescript
// Source: Prisma Client Extensions docs + community patterns
// lib/tenant.ts

import { PrismaClient } from './generated/prisma/client';
import prisma from './db';

// Models that have organizationId and need tenant scoping
const TENANT_SCOPED_MODELS = new Set([
  'Conversation', 'Message', 'Artifact', 'McpConnection',
  'OrgMember', 'Role', 'Invitation', 'AuditLog',
  'UsageRecord', 'OrgSettings', 'OrgThemeAssignment',
  'PasswordPolicy', 'PlatformApiKey',
]);

// Operations that read data (need where filter)
const READ_OPS = new Set([
  'findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow',
  'findMany', 'count', 'aggregate', 'groupBy',
]);

// Operations that write data (need where filter + data injection)
const WRITE_OPS = new Set([
  'create', 'createMany', 'update', 'updateMany',
  'delete', 'deleteMany', 'upsert',
]);

export function tenantPrisma(orgId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          // Inject organizationId into WHERE for reads
          if (READ_OPS.has(operation)) {
            args.where = {
              ...args.where,
              organizationId: orgId,
            };
          }

          // Inject organizationId into DATA for creates
          if (operation === 'create') {
            args.data = {
              ...args.data,
              organizationId: orgId,
            };
          }

          if (operation === 'createMany') {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d: Record<string, unknown>) => ({
                ...d,
                organizationId: orgId,
              }));
            } else {
              args.data = { ...args.data, organizationId: orgId };
            }
          }

          // Inject into WHERE for update/delete operations
          if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = {
              ...args.where,
              organizationId: orgId,
            };
          }

          // Inject into both WHERE and CREATE for upsert
          if (operation === 'upsert') {
            args.where = { ...args.where, organizationId: orgId };
            args.create = { ...args.create, organizationId: orgId };
          }

          return query(args);
        },
      },
    },
  });
}
```

### Pattern 2: Enriched Auth Context
**What:** Wrapper functions that validate session + load org/role context in one DB roundtrip
**When to use:** Top of every API route handler
**Example:**
```typescript
// lib/auth-middleware.ts (additions)

interface OrgAuthContext {
  user: User;
  orgMember: OrgMember & { organization: Organization; role: Role };
  organization: Organization;
  role: Role;
  permissions: string[];
}

interface SuperAdminContext {
  user: User;
  isSuperAdmin: true;
}

export async function requireOrgAuth(
  req: NextRequest
): Promise<OrgAuthContext | NextResponse> {
  const auth = await validateSession(req);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve org from request context (subdomain or path)
  const orgSlug = resolveOrgSlug(req);
  if (!orgSlug) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
  }

  // Load org membership with role in single query
  const orgMember = await prisma.orgMember.findFirst({
    where: {
      userId: auth.user.id,
      organization: { slug: orgSlug, deletedAt: null, status: 'ACTIVE' },
    },
    include: {
      organization: true,
      role: true,
    },
  });

  if (!orgMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return {
    user: auth.user,
    orgMember,
    organization: orgMember.organization,
    role: orgMember.role,
    permissions: orgMember.role.permissions as string[],
  };
}

export async function requireSuperAdmin(
  req: NextRequest
): Promise<SuperAdminContext | NextResponse> {
  const auth = await validateSession(req);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!auth.user.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user: auth.user, isSuperAdmin: true };
}
```

### Pattern 3: Org Context Resolution
**What:** Single function that extracts org slug from subdomain (prod) or path (dev)
**When to use:** Called by auth middleware and proxy.ts
**Example:**
```typescript
// lib/resolve-org.ts

import { NextRequest } from 'next/server';

const PLATFORM_SUBDOMAINS = new Set(['admin', 'www', 'api']);

export function resolveOrgSlug(req: NextRequest): string | null {
  // In development: extract from path /org/:slug/...
  if (process.env.NODE_ENV === 'development') {
    const pathname = req.nextUrl.pathname;
    const match = pathname.match(/^\/org\/([^/]+)/);
    return match ? match[1] : null;
  }

  // In production: extract from subdomain
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host') || '';
  const rootDomain = process.env.ROOT_DOMAIN || 'llmatscale.ai';

  if (!host.endsWith(rootDomain)) return null;

  const subdomain = host.replace(`.${rootDomain}`, '').split('.')[0];

  if (!subdomain || PLATFORM_SUBDOMAINS.has(subdomain)) return null;

  return subdomain;
}

export function isSuperAdminContext(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') {
    return req.nextUrl.pathname.startsWith('/admin');
  }

  const host = req.headers.get('host') || req.headers.get('x-forwarded-host') || '';
  const rootDomain = process.env.ROOT_DOMAIN || 'llmatscale.ai';
  return host === `admin.${rootDomain}`;
}
```

### Pattern 4: proxy.ts for Subdomain Routing
**What:** Next.js 16 proxy file that rewrites subdomain requests to path-based routes
**When to use:** Production deployment with subdomain-based multi-tenancy
**Example:**
```typescript
// proxy.ts (project root)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'llmatscale.ai';
const PLATFORM_SUBDOMAINS = new Set(['www', 'api']);

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  // Development mode: no subdomain rewriting needed
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Bare domain: serve the "find my org" landing
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) {
    return NextResponse.next();
  }

  // Extract subdomain
  const subdomain = host.replace(`.${ROOT_DOMAIN}`, '');

  // admin.llmatscale.ai -> /admin/...
  if (subdomain === 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  // {org-slug}.llmatscale.ai -> /org/{slug}/...
  if (!PLATFORM_SUBDOMAINS.has(subdomain)) {
    const url = request.nextUrl.clone();
    url.pathname = `/org/${subdomain}${pathname}`;

    // Pass org slug as header for server components
    const response = NextResponse.rewrite(url);
    response.headers.set('x-org-slug', subdomain);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Anti-Patterns to Avoid
- **Auth in proxy.ts only:** CVE-2025-29927 proved middleware/proxy auth can be bypassed. Always enforce auth in route handlers as the primary defense. Proxy is for routing only.
- **Manual organizationId in every query:** Use the tenant-scoped client. Manual injection is error-prone and guaranteed to miss spots.
- **Shared Prisma client for tenant queries:** Always use `tenantPrisma(orgId)` for org-scoped operations, never the raw `prisma` singleton.
- **Caching auth context:** The user decided auth context is loaded fresh from DB on every request. Do not add caching layers.
- **JWT sessions:** The user decided to keep existing DB-stored session tokens. Do not switch to JWT.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tenant data isolation | Manual WHERE clauses in every query | Prisma Client Extension with `$allModels.$allOperations` | Single enforcement point; eliminates human error across 30+ storage functions |
| Subdomain routing | Custom server.js or Express middleware | Next.js 16 `proxy.ts` with `NextResponse.rewrite()` | Framework-native, supports standalone output, Docker-compatible |
| Password hashing | Custom hash functions | Existing `lib/encryption.ts` scrypt implementation | Already battle-tested in the codebase |
| Session tokens | JWT generation | Existing `generateToken()` from `lib/encryption.ts` | Already implemented with crypto.randomBytes |
| Schema deployment | Raw SQL files | `prisma db push` | User decision; simpler for fresh start without migration history |
| Interactive CLI prompts | Custom stdin reader | Node.js `readline` module | Built-in, zero dependencies |

**Key insight:** The single biggest source of multi-tenant security bugs is forgetting to add org filtering to a query. The Prisma Client Extension pattern eliminates this entire class of bugs by making it impossible to run an unscoped query through the tenant client.

## Common Pitfalls

### Pitfall 1: Prisma Client Extension Query Nesting Limitation
**What goes wrong:** Prisma Client Extensions `$allModels.$allOperations` do not intercept nested operations (e.g., `include`, `select` with nested creates/updates). A nested write inside a `findMany` will NOT have the organizationId auto-injected.
**Why it happens:** Extensions only intercept top-level operations. Nested operations use the raw client.
**How to avoid:** For nested writes, always use separate top-level operations. For nested reads via `include`, the FK relationship ensures data integrity (a Message always belongs to a Conversation in the same org). Add runtime assertions for defense-in-depth.
**Warning signs:** Data from another org appearing in nested includes (test with multi-org seed data).

### Pitfall 2: Forgetting to Scope the Session Query
**What goes wrong:** The session lookup (`getSessionByToken`) currently returns only `user`. If it does not also validate org membership, a user could use a session token from before their org was suspended.
**Why it happens:** Sessions are not org-scoped by default; the existing system has no org concept.
**How to avoid:** Either (a) add organizationId to Session model (as per AUTH-04) and validate it during session lookup, or (b) load org membership fresh after session validation in the `requireOrgAuth()` function. The user chose option (b) -- fresh DB lookup on every request.
**Warning signs:** Suspended org users can still make API calls.

### Pitfall 3: proxy.ts Cannot Do Heavy Logic
**What goes wrong:** Using proxy.ts for database lookups (e.g., validating org slug against DB) creates performance bottleneck and cold start issues.
**Why it happens:** proxy.ts runs before every request and is designed for lightweight URL manipulation.
**How to avoid:** proxy.ts should only parse the hostname and rewrite URLs. Org validation (does slug exist, is org active?) happens in the route handler via `requireOrgAuth()`. Unknown org slugs get a 404 from the route handler, not from proxy.
**Warning signs:** Proxy importing prisma client or making database calls.

### Pitfall 4: CVE-2025-29927 -- Auth in Middleware/Proxy Only
**What goes wrong:** If authorization is only enforced in proxy.ts, an attacker can bypass it by setting the `x-middleware-subrequest` header (fixed in Next.js 15.2.3+, but defense-in-depth is still required).
**Why it happens:** Historical Next.js vulnerability allowed middleware bypass.
**How to avoid:** **Always enforce auth in the route handler** using `requireOrgAuth()` or `requireSuperAdmin()`. Proxy.ts does routing only, never auth. This is explicitly required by AUTH-07.
**Warning signs:** Any API route that does not call `requireOrgAuth()` or `requireSuperAdmin()` as its first operation.

### Pitfall 5: Partial Unique Index for Soft-Deleted Orgs
**What goes wrong:** Without a partial unique index, creating a new org with the same slug as a soft-deleted org fails with a unique constraint violation.
**Why it happens:** Standard `@unique` on slug doesn't account for soft-deleted records.
**How to avoid:** Use `@@unique([slug], where: { deletedAt: null })` with the `partialIndexes` preview feature in Prisma 7.4.0+. This requires upgrading from 7.3.0.
**Warning signs:** "Unique constraint violation" errors when re-creating orgs with previously used slugs.

### Pitfall 6: Existing API Routes Missing Org Context
**What goes wrong:** Existing routes (23 files) use `requireAuth(req)` which returns only `{ user }`. If any route is missed during the migration to `requireOrgAuth()`, it runs without tenant scoping.
**Why it happens:** Large number of files to update; easy to miss one.
**How to avoid:** Systematically audit every route file. The `requireAuth()` function should be updated to fail loudly if called on an org-scoped route, or replaced entirely.
**Warning signs:** API routes that import `requireAuth` instead of `requireOrgAuth` after the migration.

### Pitfall 7: Type Inference with Prisma 7 + PrismaPg + $extends
**What goes wrong:** When using `@prisma/adapter-pg` with Prisma 7 and `$extends`, the return type can be inferred as `any`, losing type safety.
**Why it happens:** Known issue (prisma/prisma#28661) with adapter + extension type inference.
**How to avoid:** Explicitly type the return of `tenantPrisma()` or use `as` casting when needed. Test that IDE autocomplete works for the extended client. Consider defining a type alias for the extended client.
**Warning signs:** TypeScript not catching incorrect model property access.

## Code Examples

### Schema Design -- Organization Model
```prisma
// Source: Prisma schema patterns + CONTEXT.md decisions

model Organization {
  id              String    @id @default(uuid())
  name            String
  slug            String    // Unique among non-deleted orgs (partial index)
  status          String    @default("ACTIVE")  // ACTIVE | SUSPENDED
  logoBase64      String?   @map("logo_base64") @db.Text
  logoDisplayMode String    @default("PLATFORM_AND_ORG") @map("logo_display_mode")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  members           OrgMember[]
  roles             Role[]
  conversations     Conversation[]
  messages          Message[]
  artifacts         Artifact[]
  mcpConnections    McpConnection[]
  invitations       Invitation[]
  auditLogs         AuditLog[]
  usageRecords      UsageRecord[]
  platformApiKeys   PlatformApiKey[]
  passwordPolicy    PasswordPolicy?
  themeAssignments  OrgThemeAssignment[]
  settings          OrgSettings?

  @@unique([slug], where: { deletedAt: null })  // Requires partialIndexes preview
  @@index([status])
  @@map("organizations")
}
```

### Schema Design -- OrgMember Junction
```prisma
model OrgMember {
  id                 String   @id @default(uuid())
  userId             String   @map("user_id")
  organizationId     String   @map("organization_id")
  roleId             String   @map("role_id")
  customInstructions String?  @map("custom_instructions") @db.Text
  status             String   @default("ACTIVE")  // ACTIVE | SUSPENDED
  joinedAt           DateTime @default(now()) @map("joined_at")
  lastActiveAt       DateTime? @map("last_active_at")

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  role         Role         @relation(fields: [roleId], references: [id])

  @@unique([userId, organizationId])  // One user per org
  @@index([organizationId])
  @@index([roleId])
  @@map("org_members")
}
```

### Schema Design -- User Model (Updated)
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  name          String
  avatarBase64  String?   @map("avatar_base64") @db.Text
  isSuperAdmin  Boolean   @default(false) @map("is_super_admin")
  preferences   Json      @default("{\"themeMode\": \"system\"}")
  createdAt     DateTime  @default(now()) @map("created_at")
  lastLogin     DateTime? @map("last_login")

  sessions       Session[]
  orgMemberships OrgMember[]

  @@index([email])
  @@map("users")
}
```

### Schema Design -- Session Model (Updated per AUTH-04)
```prisma
model Session {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  token          String   @unique
  organizationId String?  @map("organization_id")  // null for Super Admin
  userAgent      String?  @map("user_agent")
  ipAddress      String?  @map("ip_address")
  expiresAt      DateTime @map("expires_at")
  createdAt      DateTime @default(now()) @map("created_at")
  lastUsedAt     DateTime? @map("last_used_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@index([organizationId])
  @@map("sessions")
}
```

### Seed Script Pattern
```typescript
// prisma/seed.ts
// Source: Node.js built-in readline + dotenv patterns

import { hashPassword } from '../lib/encryption';
import prisma from '../lib/db';
import * as readline from 'readline';

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || await prompt('Super Admin email: ');
  const password = process.env.SUPER_ADMIN_PASSWORD || await prompt('Super Admin password: ');
  const name = process.env.SUPER_ADMIN_NAME || await prompt('Super Admin name: ');

  // Idempotent: skip if exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super Admin ${email} already exists. Skipping.`);
  } else {
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: { email, passwordHash, name, isSuperAdmin: true },
    });
    console.log(`Super Admin ${email} created.`);
  }

  // Dev sample data
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  if (isDev) {
    // Create sample org + roles + users
    // ... (Phase 1 implementation detail)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Route Handler Migration Pattern
```typescript
// Before (existing pattern):
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const conversations = await getAllConversations(user.id);
  return NextResponse.json({ conversations });
}

// After (multi-tenant pattern):
export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, organization } = auth;

  const db = tenantPrisma(organization.id);
  const conversations = await db.conversation.findMany({
    where: { userId: user.id },
    orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
  });
  return NextResponse.json({ conversations });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16.0.0 (2025) | Rename + Node.js runtime default; clarifies purpose as thin proxy |
| Edge Runtime middleware | Node.js runtime proxy | Next.js 15.5+ / 16.0 | proxy.ts always runs on Node.js; Edge no longer default |
| Prisma middleware | Prisma Client Extensions | Prisma 4.16+ (GA) | Extensions are type-safe, composable, and officially recommended |
| Auth in middleware | Auth in route handlers | Post CVE-2025-29927 (Mar 2025) | Defense-in-depth; middleware can be bypassed |
| Manual tenant filtering | Client Extension auto-injection | Prisma Client Extensions GA | Single enforcement point for data isolation |

**Deprecated/outdated:**
- `middleware.ts`: Still works in Next.js 16 but deprecated. Will be removed in a future version. Use `proxy.ts` for new code.
- Prisma `$use()` middleware: Replaced by Client Extensions. Extensions are type-safe and composable.

## Open Questions

1. **Prisma 7 + adapter-pg type inference with $extends**
   - What we know: GitHub issue #28661 reports return type inferred as `any` when using adapter + $extends
   - What's unclear: Whether this is fixed in 7.4.0 or requires a specific workaround
   - Recommendation: Test during implementation. If types break, define explicit type alias for the extended client.

2. **proxy.ts behavior with standalone output**
   - What we know: The project uses `output: "standalone"` in next.config.ts. proxy.ts is supported in Node.js server and Docker deployments.
   - What's unclear: Whether standalone output bundles proxy.ts correctly with all dependencies
   - Recommendation: Test early that `next build` + standalone output includes proxy correctly.

3. **Development subdomain testing**
   - What we know: `*.localhost` maps to 127.0.0.1 on most systems. Path-based is the user's chosen dev approach.
   - What's unclear: Whether `*.localhost:3000` works reliably on Windows for testing subdomain flow
   - Recommendation: Use path-based routing as primary dev approach (user decision). Add an optional env var `FORCE_SUBDOMAIN_MODE=true` for local subdomain testing if needed.

4. **Conversation/Message migration to org scope**
   - What we know: Existing Conversation/Message models have no organizationId. Fresh start means dropping data.
   - What's unclear: How many of the 30+ storage.ts functions need the tenant client vs. can remain on the unscoped client
   - Recommendation: Audit every function in storage.ts. Functions touching Conversation, Message, Artifact, McpConnection need tenant scoping. User/Session functions use unscoped client.

## Sources

### Primary (HIGH confidence)
- [Prisma Client Extensions: query component](https://www.prisma.io/docs/orm/prisma-client/client-extensions/query) -- $allModels, $allOperations, args mutation syntax
- [Prisma Indexes documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes) -- partialIndexes preview feature syntax
- [Next.js 16 proxy.ts API reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) -- Full proxy documentation with examples
- [Next.js 16 proxy getting started](https://nextjs.org/docs/app/getting-started/proxy) -- Proxy use cases and patterns
- [Prisma Client Extension examples](https://www.prisma.io/docs/orm/prisma-client/client-extensions/extension-examples) -- Official extension examples including row-level-security

### Secondary (MEDIUM confidence)
- [CVE-2025-29927 JFrog analysis](https://jfrog.com/blog/cve-2025-29927-next-js-authorization-bypass/) -- Detailed CVE analysis
- [Next.js multi-tenant guide](https://nextjs.org/docs/app/guides/multi-tenant) -- Official (minimal) multi-tenant guidance
- [Prisma ORM v7.4 blog](https://www.prisma.io/blog/prisma-orm-v7-4-query-caching-partial-indexes-and-major-performance-improvements) -- partialIndexes introduced in 7.4.0
- [Prisma GitHub Discussion #19917](https://github.com/prisma/prisma/discussions/19917) -- Multi-tenant client extension patterns
- [Prisma soft delete with partial indexes](https://www.thisdot.co/blog/how-to-implement-soft-delete-with-prisma-using-partial-indexes) -- Partial index + soft delete pattern

### Tertiary (LOW confidence)
- [Prisma 7 + PrismaPg $extends type issue #28661](https://github.com/prisma/prisma/issues/28661) -- Type inference issue, needs validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Using existing project stack (Next.js 16, Prisma 7, PostgreSQL), verified versions and capabilities against official docs
- Architecture: HIGH -- Prisma Client Extensions for tenant scoping is the officially recommended pattern; proxy.ts is the current Next.js 16 standard; route handler auth is post-CVE best practice
- Pitfalls: HIGH -- CVE-2025-29927 is well-documented; Prisma extension nesting limitation is documented; type inference issue is reported with GitHub issue number
- Schema design: MEDIUM -- Schema field types and indexes are Claude's discretion per CONTEXT.md; recommended patterns are based on Prisma docs and multi-tenant best practices but will need refinement during implementation

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (30 days -- stable technologies, no fast-moving changes expected)
