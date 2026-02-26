# Phase 1: Schema and Auth Foundation - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-tenant database schema, tenant-scoped Prisma client, enriched auth middleware, and routing infrastructure. This phase creates the data model and auth foundation that every subsequent phase depends on. No UI dashboards, no org management CRUD, no chat integration — just schema, auth, and routing plumbing.

</domain>

<decisions>
## Implementation Decisions

### Migration Strategy
- Fresh start — drop existing single-user data, no migration of existing conversations/messages/artifacts
- Rewrite `prisma/schema.prisma` from scratch with multi-tenant structure baked in from the ground up
- Use `prisma db push` for schema deployment (no formal migration file for the initial schema)
- Include a `db:reset` npm script that drops everything, pushes schema, and runs the seed — one command for a clean dev environment

### Super Admin Seeding
- Seed script reads from environment variables (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME`), falls back to interactive CLI prompts if env vars are missing
- Idempotent: if the Super Admin email already exists, skip creation with a message (safe to run repeatedly)
- Dev sample data gated behind `NODE_ENV=development` or `--dev` flag:
  - 1 Super Admin account (always created)
  - 1 sample organization (e.g., "Acme Corp") with 2 users in different roles (only in dev mode)
- Production seed only creates the Super Admin — no sample data

### Subdomain Routing
- **Development**: Path-based routing — `/org/:slug/chat`, `/org/:slug/admin`, `/admin` for Super Admin
- **Production**: Subdomain-based routing — `{org-slug}.llmatscale.ai`, `admin.llmatscale.ai`
- Single `resolveOrgContext()` abstraction layer that reads subdomain in prod or path segment in dev — rest of the app receives org context without caring about the source
- **Bare domain behavior** (llmatscale.ai / localhost:3000):
  - If valid session cookie exists → auto-redirect to the user's org subdomain (or admin panel for Super Admin)
  - If no session → show email input form ("find my org" helper)
  - User enters email → system looks up their org → redirects to org login page (`acme-corp.llmatscale.ai/login`)
  - Super Admin email → redirects to `admin.llmatscale.ai/login`
  - This is a **fallback path** — primary login happens directly on org/admin subdomains
- **Unknown subdomains**: 404 "Organization not found" page with link back to bare domain login. No information leakage about which orgs exist.
- **Org login pages**: Display org name + logo placeholder (default icon until logo is uploaded in later phases)
- **Organization model includes `logoDisplayMode`**: `PLATFORM_AND_ORG` (LLMatscale.ai logo + org logo side by side) or `ORG_ONLY` (just org logo). Super Admin sets this per org during org creation (Phase 2).

### Session & Auth Context
- **One user = one org** — no multi-org membership, no org picker
- One org can have multiple Org Admins
- Multiple Super Admins can exist platform-wide
- Super Admin has no org context and cannot use chat
- Auth context (user + org membership + role + permissions) loaded fresh from DB on every API request — no caching, permission changes take effect immediately
- Org suspension: block on next request via auth middleware checking org status (no active session invalidation)
- Role changes: take effect immediately on next request (DB lookup is always fresh)
- Session tokens: keep existing random string format, stored in DB (no JWT)
- **Wrapper function pattern**: Route handlers call `requireOrgAuth(req)` or `requireSuperAdmin(req)` at the top — returns enriched context or throws 401/403. Enforced at route handler level per AUTH-07 (CVE defense-in-depth).
- **Tenant-scoped Prisma**: `tenantPrisma(orgId)` returns a scoped Prisma client that auto-injects organizationId. Platform-level queries (Super Admin) use the regular unscoped Prisma client.

### Claude's Discretion
- Exact schema field types and indexes
- Prisma Client Extension implementation details
- Session table structure changes
- Error response formats for 401/403
- `resolveOrgContext()` implementation approach
- Development path-to-subdomain mapping logic

</decisions>

<specifics>
## Specific Ideas

- Bare domain is a "find my org" helper — like Slack's "find your workspace" flow. Not the primary login path.
- Org login should feel branded even in Phase 1 — org name displayed prominently, placeholder where logo will go
- Platform logo (LLMatscale.ai) + org logo side-by-side display option is important for white-label feel
- The `db:reset` script should be a single command that gets developers from any state to a clean working environment

</specifics>

<deferred>
## Deferred Ideas

- **Phase 2**: Org creation UI should include `logoDisplayMode` setting (Platform + Org logo side-by-side, or Org logo only). Super Admin chooses per-org.
- **Phase 2**: Org logo upload during org creation/editing
- **Phase 7**: Login page customization — tagline, custom text on org login pages
- **Phase 7**: Full branding implementation (org colors, logo rendering, theme application on login page)
- **Phase 7**: Platform logo + org logo side-by-side rendering implementation

</deferred>

---

*Phase: 01-schema-and-auth-foundation*
*Context gathered: 2026-02-26*
