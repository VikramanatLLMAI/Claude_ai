# Phase 11: Security Hardening - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden all API routes with rate limiting, security headers, input validation, and tech debt cleanup. No new features — this phase locks down existing functionality for production readiness.

Requirements: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, DEBT-01, DEBT-02, DEBT-03, DEBT-04

</domain>

<decisions>
## Implementation Decisions

### Rate Limiting
- In-memory sliding window (no Redis — single-server Docker deployment)
- Auth routes (login, register, password reset, find-org): 5 attempts per IP per 15-minute window
- General API routes: 60 requests/minute per user session token
- Chat streaming endpoint (/api/chat): separate 10 requests/minute per user (most expensive route — Anthropic API calls)
- 429 responses include Retry-After header with seconds remaining + human-readable message ("Too many requests. Please try again in X seconds.")

### Security Headers
- Configure in next.config.ts headers section
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- HSTS: max-age=31536000; includeSubDomains (production only)
- Content-Security-Policy-Report-Only: must allow Sandpack blob: URLs, Mermaid inline rendering, KaTeX fonts/styles — do not break existing features

### Origin Validation
- Block mutation requests (POST/PUT/PATCH/DELETE) from unexpected origins with 403
- Allowed origins: localhost:3000 (dev) + ROOT_DOMAIN and its subdomains (prod)
- No CSRF tokens needed — Bearer token auth is inherently CSRF-immune

### Input Validation Audit
- Scope: mutation routes only (POST/PUT/PATCH/DELETE)
- Find routes that parse request bodies without Zod validation
- Add missing schemas to lib/validation.ts
- Validation errors return 400 with field-level details: { error: 'Validation failed', details: [{ field, message }] }
- Use existing formatValidationErrors() utility

### Debug Log Cleanup
- Remove all console.log/debug/info statements from app/api/**/*.ts
- Scope: API routes only (not lib/services/ or components/)
- 48 occurrences across 6 files (chat route has 22 alone)
- No structured logging replacement — just remove

### TypeScript Cast Cleanup
- Review all 28 `as any` casts across 11 API route files
- Remove casts where proper Prisma types exist
- Replace remaining necessary casts with specific types: `as unknown as { _sum: { inputTokens: number } }` etc.
- Document remaining casts that are truly required by tenantDb $extends limitation
- Root cause: Prisma 7 $extends loses model types; tenantPrisma() typed as `typeof prisma` to work around it

### Claude's Discretion
- CSP directive specifics (which domains, script-src, style-src, font-src rules)
- Rate limiter implementation pattern (middleware vs per-route, Map cleanup strategy)
- Which specific API routes are missing validation (audit findings)
- How to structure the rate limiter module
- Security header values beyond the ones specified above
- Order of implementation across the phase

</decisions>

<specifics>
## Specific Ideas

- User is a data scientist, not a backend developer — trusts production-grade recommended defaults
- All answers followed recommended options, indicating preference for standard SaaS security practices over custom approaches
- "We are building a production product, so we need to meet that kind of security level"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/validation.ts`: ~30 Zod schemas already defined (auth, chat, org, models, instructions, API keys) + `validate()` helper + `formatValidationErrors()` utility
- `lib/api-utils.ts`: Has rate limit retry handling for outgoing requests (retry on 429) — could inform incoming rate limit patterns
- `lib/auth-middleware.ts`: `requireAuth()`, `requireOrgAuth()`, `requireSuperAdmin()` — natural integration points for rate limiting

### Established Patterns
- Bearer token auth on all API routes (session token in Authorization header)
- Auth middleware returns userId/orgId — rate limiting can key off these
- `next.config.ts` is minimal (just `output: "standalone"`) — clean slate for headers
- Zod schemas centralized in `lib/validation.ts` with exported types

### Integration Points
- `next.config.ts` headers config for security headers
- Auth middleware stack for rate limit enforcement
- All API route handlers in `app/api/` for validation audit
- `lib/validation.ts` for new Zod schemas

### Current State
- 48 console.log occurrences across 6 API files
- 28 `as any` casts across 11 API files (mostly usage/analytics aggregates)
- Rate limiting TODO on find-org route (DEBT-01)
- No security headers configured anywhere

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-security-hardening*
*Context gathered: 2026-03-08*
