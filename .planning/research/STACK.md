# Stack Research: RBAC Multi-Tenant Layer

**Domain:** Multi-tenant SaaS platform with RBAC, transactional email, analytics dashboards, and audit logging
**Researched:** 2026-02-26
**Confidence:** MEDIUM-HIGH (most recommendations verified via official docs and multiple sources; a few version numbers are WebSearch-only)

## Context

This research covers ONLY the new libraries and patterns needed to add RBAC multi-tenancy to the existing LLMatscale.ai application. The existing stack (Next.js 16.1.4, React 19.2.3, Prisma 7.3.0, PostgreSQL, TailwindCSS v4, Vercel AI SDK, Anthropic SDK, Radix UI, Zod, etc.) is already in place and not re-evaluated here.

## Recommended Stack

### Core Technologies (New Additions)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `resend` | ^6.9.2 | Transactional email delivery (invitations, password resets) | PROJECT.md specifies Resend. Modern API, excellent DX, `{ data, error }` return pattern matches project conventions. | HIGH |
| `@react-email/components` | ^1.0.8 | Email template components (invitation, password reset, forced reset emails) | Built by Resend team. Supports React 19.2 and Tailwind 4 as of v5.0. Renders to email-safe HTML with inline styles. Eliminates manual table-based email layout. | HIGH |
| `recharts` | ^3.7.0 | Analytics dashboard charts (usage trends, model distribution, org statistics) | PROJECT.md specifies Recharts. v3.x supports React 19. Declarative composable API fits React component patterns. Large ecosystem. | MEDIUM |
| `date-fns` | ^4.1.0 | Date formatting and manipulation for analytics, audit logs, session timestamps | Tree-shakeable, immutable, TypeScript-first. No prototype pollution (unlike moment.js). Handles relative time, formatting, date math needed for dashboards. | HIGH |
| `node-cron` | ^3.0.3 | Scheduled cleanup tasks (30-day org auto-purge, expired session cleanup, expired invitation cleanup) | Lightweight, GNU crontab syntax, works with self-hosted persistent Node.js process (Docker deployment). No external service dependency. | MEDIUM |
| `export-to-csv` | ^1.4.0 | CSV export for audit logs and analytics data | Zero-dependency, works server-side and client-side, simple API for converting JSON arrays to CSV downloads. | LOW |

### Authorization & Multi-Tenancy (Build Custom, Not Library)

**Decision: Custom RBAC implementation, NOT CASL or similar library.**

**Rationale:**

The project has a fixed 3-level role hierarchy (Super Admin > Org Admin > User) with well-defined permission boundaries that map cleanly to API route guards. CASL (@casl/ability 6.8.0, @casl/prisma 1.6.1) is powerful for complex attribute-based access control with dynamic rules, but introduces unnecessary abstraction for this use case:

1. **Fixed hierarchy, not dynamic rules.** The permission model is "Super Admin can do X, Org Admin can do Y within their org, User can do Z within their org." This is a simple role check, not "User can edit Post if they are the author and the post is in draft status."

2. **@casl/prisma Prisma 7 compatibility is fragile.** The @casl/prisma package requires custom import path configuration for Prisma 7's new `prisma-client` generator. This adds friction without proportional benefit given the simple permission model.

3. **Multi-tenancy is enforced at the data access layer, not the authorization layer.** The primary security boundary is `organizationId` filtering on every query, which is a Prisma Client extension concern, not a CASL concern.

4. **Three route guard functions cover the entire API surface:**
   - `requireSuperAdmin(req)` -- checks user.role === 'SUPER_ADMIN'
   - `requireOrgAdmin(req)` -- checks user.orgMember.role === 'ORG_ADMIN' within org context
   - `requireOrgMember(req)` -- checks user has an active membership in the target org

These are straightforward extensions of the existing `withAuth` / `requireAuth` pattern in `lib/auth-middleware.ts`.

### Prisma Multi-Tenancy Pattern

**Decision: Application-level tenant filtering via Prisma Client Extensions, NOT PostgreSQL Row-Level Security (RLS).**

**Rationale:**

1. **RLS adds operational complexity.** RLS requires PostgreSQL session variables (`SET app.current_tenant`), custom database roles, careful migration management, and testing with multiple database connections. For 5-20 organizations at medium scale, this complexity is not justified.

2. **Prisma Client Extensions provide type-safe tenant filtering.** A `$extends` query component can automatically inject `organizationId` into every `where` clause for tenant-scoped models. This runs in application code where it is testable, debuggable, and visible.

3. **The existing codebase already uses Prisma Client extensions pattern.** The project uses Prisma 7.3.0 with `prisma-client` generator and custom output path -- Client Extensions are the idiomatic Prisma 7 approach.

4. **Defense in depth.** The application-level filtering is the primary mechanism. Compound indexes on `(organizationId, ...)` ensure queries are efficient. Database constraints (`NOT NULL` on `organizationId`) prevent data without tenant context.

**Implementation pattern:**

```typescript
// lib/db-tenant.ts
import { PrismaClient } from './generated/prisma/client';

export function createTenantClient(orgId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId: orgId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, organizationId: orgId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, organizationId: orgId };
          return query(args);
        },
        // ... update, delete similarly
      },
    },
  });
}
```

### Audit Logging Pattern

**Decision: Application-level audit logging via a dedicated Prisma model, NOT PostgreSQL triggers or third-party services.**

**Rationale:**

1. **PostgreSQL triggers are invisible to application code.** They fire at the database level, making them hard to test, debug, and include application context (who did it, from what IP, what session).

2. **Third-party services (Bemi) add external dependencies.** The project is self-hosted Docker -- minimizing external service dependencies is a design goal.

3. **A Prisma model (`AuditLog`) with explicit writes in API route handlers provides full context:** actor, action, entity, entityId, organizationId, metadata (IP, session, before/after snapshots). This is queryable with Prisma, exportable to CSV/JSON, and filterable in the admin dashboard.

4. **Immutability enforced by application policy.** No `update` or `delete` API routes for audit logs. The model has no `@@updatedAt`. Database-level immutability (write-only role) can be added later if compliance requires it.

**AuditLog schema pattern:**

```prisma
model AuditLog {
  id             String   @id @default(uuid())
  organizationId String?  @map("organization_id") // null for platform-level actions
  actorId        String   @map("actor_id")
  actorRole      String   @map("actor_role") // SUPER_ADMIN, ORG_ADMIN, USER
  action         String   // e.g., "user.invited", "role.updated", "org.suspended"
  entity         String   // e.g., "User", "Organization", "Role"
  entityId       String?  @map("entity_id")
  metadata       Json     @default("{}") // before/after snapshots, IP, session
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([organizationId, createdAt(sort: Desc)])
  @@index([actorId])
  @@index([action])
  @@map("audit_logs")
}
```

### Password Hashing

**Decision: Keep existing Node.js `crypto.scrypt` implementation. Do NOT switch to bcrypt or argon2.**

**Rationale:**

1. **The existing codebase already uses `crypto.scrypt` with timing-safe comparison.** This is documented in CLAUDE.md and working correctly.

2. **Scrypt is OWASP-approved and production-proven.** While Argon2id is theoretically superior for new greenfield projects, scrypt with proper parameters (N=16384, r=8, p=1, keylen=64) provides equivalent practical security at the scale of this application (hundreds of users, not millions).

3. **Switching hashing algorithms mid-project requires migration complexity** (dual-hash verification, gradual re-hashing on login) with no practical security benefit at this scale.

4. **Zero external dependencies.** Node.js `crypto` module is built-in. No native binary compilation issues (unlike `bcrypt` which requires node-gyp, problematic in Alpine Docker).

### Authentication Architecture

**Decision: Extend existing session-based auth with role and org context, NOT adopt NextAuth.js / Auth.js / Clerk.**

**Rationale:**

1. **The existing auth system works.** Session tokens, Bearer auth, `validateSession()`, `withAuth()` -- all production-ready.

2. **NextAuth.js/Auth.js is designed for OAuth provider aggregation.** This project is email/password only (v1 constraint). NextAuth.js adds complexity (callbacks, adapters, JWT handling) without value for this auth model.

3. **Clerk/WorkOS are hosted services.** This project is self-hosted Docker -- external auth dependencies contradict the deployment model.

4. **The auth extension is minimal:** Add `role` to session lookup, add `orgMember` with org context, add `requireRole()` guards to API routes. This is a few hundred lines of code, not a library adoption decision.

### Security Note: CVE-2025-29927

**Critical finding:** Next.js had a middleware authorization bypass vulnerability (CVE-2025-29927) where attackers could spoof the `x-middleware-subrequest` header to skip middleware entirely. Fixed in Next.js 14.2.25 and 15.2.3.

**Impact on this project:** Next.js 16.1.4 includes the fix. However, this reinforces the existing architecture decision: **authentication and authorization are enforced at the API route handler level (via `requireAuth`, `requireRole`), NOT in Next.js middleware.** The existing `lib/auth-middleware.ts` validates sessions inside route handlers, which is the correct defense-in-depth pattern. Continue this pattern for RBAC -- never rely solely on Next.js middleware for authorization.

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| `@radix-ui/react-tabs` | ^1.1.3 | Tab navigation in admin dashboards (org settings, user management, analytics) | Admin panel UI where tabbed navigation is needed | HIGH |
| `@radix-ui/react-select` | ^2.1.6 | Dropdown selects for role assignment, org selection, model filtering | Admin forms that need accessible select components | HIGH |
| `@radix-ui/react-checkbox` | ^1.1.4 | Multi-select for permissions, model access, theme assignment | Role configuration forms | HIGH |
| `@radix-ui/react-alert-dialog` | ^1.1.6 | Confirmation dialogs for destructive actions (delete org, suspend user, force logout) | Any destructive admin action requiring explicit confirmation | HIGH |
| `@radix-ui/react-badge` | N/A | Use existing Radix + Tailwind pattern | Status indicators (active/suspended/pending) | HIGH |
| `@radix-ui/react-progress` | ^1.1.2 | Usage limit progress bars (80%/100% threshold visualization) | Usage dashboard showing limit consumption | HIGH |

**Note on Radix UI:** The project already uses Radix UI extensively. New admin UI should use additional Radix primitives rather than introducing a different component library. These maintain consistent accessibility and styling patterns.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `prisma db seed` | Seed initial Super Admin account | Use `prisma/seed.ts` with tsx runner. Required because Super Admin has no UI registration path. |
| `tsx` | TypeScript execution for seed scripts | Already available via Node.js 20+. Use `npx tsx prisma/seed.ts` for seeding. |

## Installation

```bash
# Core new dependencies
npm install resend @react-email/components recharts date-fns node-cron export-to-csv

# Additional Radix UI primitives for admin UI
npm install @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-alert-dialog @radix-ui/react-progress

# Dev dependencies (types)
npm install -D @types/node-cron
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Custom RBAC guards | CASL (@casl/ability) | When you need attribute-based access control with dynamic rules (e.g., "user can edit post if they are the author"). Overkill for fixed 3-level role hierarchy. |
| Custom RBAC guards | Permify | When you need an external authorization service with policy engine. Overkill for self-hosted app with fixed permissions. |
| Application-level tenant filtering (Prisma $extends) | PostgreSQL RLS | When you have untrusted application code or need database-enforced isolation for compliance (SOC2, HIPAA). Worth it at 100+ tenants or with regulatory requirements. |
| Application-level audit logging (Prisma model) | PostgreSQL triggers | When you need to capture ALL database changes including those from direct SQL. Harder to include application context (actor, session, IP). |
| Application-level audit logging (Prisma model) | Bemi | When you want zero-code audit trails with time-travel queries. Adds external service dependency incompatible with self-hosted goal. |
| Existing `crypto.scrypt` | Argon2id (`argon2`) | For greenfield projects with no existing password hashing. Argon2id is technically superior but requires native binary compilation. Not worth migration cost here. |
| Existing session-based auth | NextAuth.js / Auth.js | When you need OAuth providers (Google, GitHub login). This project is email/password only in v1. |
| Existing session-based auth | Clerk / WorkOS | When you want hosted auth with pre-built UI. Incompatible with self-hosted Docker deployment. |
| `resend` | SendGrid / AWS SES | When you need high-volume email (100K+/month) or already have AWS infrastructure. Resend is specified in PROJECT.md and has better DX. |
| `recharts` | Chart.js / D3.js | Chart.js when you need Canvas-based rendering for large datasets. D3.js when you need custom visualizations beyond standard chart types. Recharts is specified in PROJECT.md. |
| `date-fns` | dayjs / Temporal API | dayjs when you need moment.js-compatible API. Temporal API when it reaches Stage 4 and browser support is universal (not yet as of 2026). |
| `node-cron` | BullMQ / Agenda | When you need persistent job queues with retry, priority, and concurrency. BullMQ requires Redis. For simple scheduled cleanup, node-cron is sufficient. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-auth` / `auth.js` | Designed for OAuth aggregation. Adds session strategy complexity (JWT vs database), callback chains, and adapter boilerplate for zero benefit when auth is email/password only. | Extend existing `lib/auth-middleware.ts` with role context. |
| `bcrypt` (npm package) | Requires native C++ compilation via node-gyp. Breaks in Alpine Docker containers without extra build dependencies. Project already uses `crypto.scrypt` which is built-in. | Keep existing `crypto.scrypt`. |
| `moment.js` | Deprecated. Mutable API causes bugs. 300KB+ bundle size. | `date-fns` -- tree-shakeable, immutable, 30KB used. |
| PostgreSQL RLS for v1 | Operational complexity (session variables, migration management, dual connection pools, BYPASSRLS admin user) exceeds benefit at 5-20 tenant scale. | Prisma Client Extensions with `organizationId` injection. |
| `@casl/prisma` with Prisma 7 | Requires workarounds for Prisma 7's new `prisma-client` generator (custom import paths). Fragile compatibility for a library you do not need. | Custom role check functions (`requireSuperAdmin`, `requireOrgAdmin`, `requireOrgMember`). |
| Separate authorization microservice (Permify, OPA, Casbin) | Architectural overkill. Adds network hop, deployment complexity, and operational burden for a fixed 3-role hierarchy. | Inline role checks in API route handlers. |
| `@tanstack/react-table` for admin tables | The existing codebase has no table library and admin tables are straightforward (user list, audit log list, invitation list). A full-featured table library adds bundle size for pagination/sorting that can be done with simple state + Prisma `skip/take/orderBy`. | Custom table components with Prisma-powered server-side pagination. |
| `react-hook-form` for admin forms | The existing codebase uses controlled inputs. Admin forms (invite user, create role, org settings) are simple enough not to warrant a form library. Zod validation is already in place. | Controlled inputs + Zod validation (existing pattern). |

## Stack Patterns by Variant

**If future compliance requirements emerge (SOC2, HIPAA):**
- Add PostgreSQL RLS as a secondary defense layer ON TOP of application-level filtering
- Add database-level write-only role for audit_logs table
- Consider Bemi for automated audit trail capture
- Add session recording / impersonation logging

**If scale exceeds 50+ organizations:**
- Evaluate PostgreSQL RLS for database-enforced isolation
- Add Redis + BullMQ for job queue (replace node-cron)
- Consider read replicas for analytics queries (avoid impacting chat performance)
- Add connection pooling (PgBouncer) between Prisma and PostgreSQL

**If OAuth/SSO is added in v2:**
- Evaluate Auth.js at that time -- it becomes valuable when aggregating multiple OAuth providers
- Keep existing email/password as one auth method alongside OAuth
- Add `authProvider` field to User model

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `recharts@^3.7.0` | `react@19.x` | Recharts 3.x supports React 19. May need `--legacy-peer-deps` if react-is peer dep is outdated. Verify at install time. |
| `@react-email/components@^1.0.8` | `react@19.x`, `tailwindcss@4.x` | React Email 5.0+ explicitly supports React 19.2 and Tailwind 4. |
| `resend@^6.9.2` | Node.js 18+ | No React peer dependency. Pure Node.js SDK. |
| `date-fns@^4.1.0` | TypeScript 5.x | Pure TypeScript, no framework dependencies. |
| `node-cron@^3.0.3` | Node.js 20+ | Pure Node.js, no framework dependencies. Requires persistent process (OK for Docker self-hosted). |
| `@casl/prisma@1.6.1` (NOT recommended) | Prisma 7 via workaround | Requires swapping @prisma/client imports for custom generated client path. Fragile. |
| `export-to-csv@^1.4.0` | TypeScript 5.x | Zero dependency, works in Node.js and browser. |
| Radix UI `@radix-ui/react-*` | `react@19.x` | Already in use in project. All Radix primitives support React 19. |

## Environment Variables (New)

```env
# Resend API (transactional email)
RESEND_API_KEY=re_...

# Email sender identity (must be verified domain in Resend)
EMAIL_FROM="LLMatscale.ai <noreply@yourdomain.com>"

# Application URL (for invitation links, password reset links)
APP_URL="https://your-deployment-url.com"
```

## Sources

- [Resend npm package](https://www.npmjs.com/package/resend) -- version 6.9.2 verified (MEDIUM confidence, npm page)
- [Resend Node.js docs](https://resend.com/docs/send-with-nodejs) -- API pattern verified (HIGH confidence, official docs)
- [React Email 5.0 announcement](https://resend.com/blog/react-email-5) -- React 19 + Tailwind 4 support confirmed (HIGH confidence, official blog)
- [@react-email/components npm](https://www.npmjs.com/package/@react-email/components) -- version 1.0.8 verified (MEDIUM confidence, npm page)
- [Recharts npm](https://www.npmjs.com/package/recharts) -- version 3.7.0 verified (MEDIUM confidence, npm page)
- [Recharts React 19 issue #4558](https://github.com/recharts/recharts/issues/4558) -- React 19 support confirmed in 3.x (MEDIUM confidence, GitHub issue)
- [Prisma Client Extensions docs](https://www.prisma.io/docs/orm/prisma-client/client-extensions) -- query component API (HIGH confidence, official docs)
- [Prisma multi-tenancy discussion](https://github.com/prisma/prisma/discussions/2846) -- community patterns (MEDIUM confidence, official GitHub)
- [CASL Prisma docs](https://casl.js.org/v6/en/package/casl-prisma/) -- Prisma integration patterns (HIGH confidence, official docs)
- [@casl/ability npm](https://www.npmjs.com/package/@casl/ability) -- version 6.8.0 (MEDIUM confidence, npm page)
- [Prisma 7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) -- generator changes affecting @casl/prisma (HIGH confidence, official docs)
- [CVE-2025-29927 Vercel postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) -- middleware bypass vulnerability (HIGH confidence, official postmortem)
- [Next.js auth guide 2026](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) -- defense-in-depth auth pattern (MEDIUM confidence, WorkOS blog)
- [Password hashing comparison 2026](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/) -- scrypt remains OWASP-approved (MEDIUM confidence, technical blog)
- [date-fns npm](https://www.npmjs.com/package/date-fns) -- version 4.1.0 (MEDIUM confidence, npm page)
- [node-cron Better Stack guide](https://betterstack.com/community/guides/scaling-nodejs/node-cron-scheduled-tasks/) -- usage patterns (MEDIUM confidence, technical guide)
- [Multi-tenant RLS patterns](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35) -- RLS vs application-level comparison (MEDIUM confidence, technical blog)
- [Audit trail with Prisma](https://medium.com/@arjunlall/prisma-audit-trail-guide-for-postgres-5b09aaa9f75a) -- implementation patterns (MEDIUM confidence, technical blog)

---
*Stack research for: RBAC Multi-Tenant SaaS Platform*
*Researched: 2026-02-26*
