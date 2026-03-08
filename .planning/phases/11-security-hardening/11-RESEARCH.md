# Phase 11: Security Hardening - Research

**Researched:** 2026-03-08
**Domain:** API security hardening (rate limiting, headers, validation, cleanup)
**Confidence:** HIGH

## Summary

Phase 11 is a hardening phase with no new features -- it locks down existing API routes with rate limiting, security headers, input validation, and tech debt cleanup. The project uses Next.js 16.1.4 with App Router API routes, Bearer token authentication, and Zod for validation.

The primary challenge is implementing in-memory rate limiting without Redis (single-server Docker deployment), configuring CSP in report-only mode that does not break Sandpack (uses iframes with blob: URLs via CodeSandbox CDN), Mermaid (renders SVG via innerHTML), or KaTeX (CSS bundled from node_modules). The validation audit scope is manageable -- approximately 75 mutation routes exist, with ~18 already importing from `lib/validation.ts`.

**Primary recommendation:** Implement rate limiting as a standalone `lib/rate-limiter.ts` module with a Map-based sliding window, integrate it via helper functions called at the top of route handlers (not middleware), and configure all security headers in `next.config.ts` using the `headers()` function.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- In-memory sliding window rate limiting (no Redis -- single-server Docker deployment)
- Auth routes (login, register, password reset, find-org): 5 attempts per IP per 15-minute window
- General API routes: 60 requests/minute per user session token
- Chat streaming endpoint (/api/chat): separate 10 requests/minute per user (most expensive route)
- 429 responses include Retry-After header with seconds remaining + human-readable message
- Security headers configured in next.config.ts headers section
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- HSTS: max-age=31536000; includeSubDomains (production only)
- Content-Security-Policy-Report-Only: must allow Sandpack blob: URLs, Mermaid inline rendering, KaTeX fonts/styles
- Block mutation requests (POST/PUT/PATCH/DELETE) from unexpected origins with 403
- Allowed origins: localhost:3000 (dev) + ROOT_DOMAIN and its subdomains (prod)
- No CSRF tokens needed -- Bearer token auth is inherently CSRF-immune
- Input validation scope: mutation routes only (POST/PUT/PATCH/DELETE)
- Validation errors return 400 with field-level details
- Use existing formatValidationErrors() utility
- Remove all console.log/debug/info statements from app/api/**/*.ts
- Debug log cleanup scope: API routes only (not lib/services/ or components/)
- No structured logging replacement -- just remove
- Review all 28 `as any` casts across 11 API route files
- Replace necessary casts with specific types
- Document remaining casts that are truly required by tenantDb $extends limitation

### Claude's Discretion
- CSP directive specifics (which domains, script-src, style-src, font-src rules)
- Rate limiter implementation pattern (middleware vs per-route, Map cleanup strategy)
- Which specific API routes are missing validation (audit findings)
- How to structure the rate limiter module
- Security header values beyond the ones specified above
- Order of implementation across the phase

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | Rate limiting on auth routes (login, register, password reset) with sliding window | Rate limiter module with IP-based keying, 5/15min window |
| SEC-02 | Rate limiting on API routes with configurable per-route limits | Session-token-based keying, 60/min general + 10/min chat |
| SEC-03 | Security headers configured (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) | next.config.ts headers() function with /:path* source |
| SEC-04 | HSTS header enabled for production | Conditional header or always-on (browsers ignore on HTTP) |
| SEC-05 | Content-Security-Policy in report-only mode (does not break Sandpack/Mermaid/KaTeX) | CSP directives researched for Sandpack CDN, blob: frames, inline SVG, bundled KaTeX CSS |
| SEC-06 | Origin header validation on mutation requests | Origin check utility in auth middleware or standalone helper |
| DEBT-01 | Rate limiting TODO on find-org route resolved | Covered by SEC-01 (auth route rate limiting) |
| DEBT-02 | console.log debug statements removed from chat route and API routes | 48 occurrences across 6 files identified |
| DEBT-03 | TypeScript `as any` casts on tenantDb aggregates reviewed and minimized | 28 casts across 11 files identified with specific types |
| DEBT-04 | Input validation audit across all API routes (Zod schemas) | ~75 mutation handlers found, ~18 already use validation |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.4 | `headers()` in next.config.ts for security headers | Built-in, no additional dependency |
| Zod | (existing) | Input validation schemas | Already used in `lib/validation.ts` with ~30 schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | - | Rate limiting is in-memory Map | No new dependencies required |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory Map | rate-limiter-flexible | Adds dependency; Map is sufficient for single-server |
| next.config.ts headers | Next.js middleware | middleware.ts runs on Edge Runtime; headers() is simpler for static headers |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── rate-limiter.ts        # NEW: Sliding window rate limiter
├── origin-validator.ts    # NEW: Origin validation helper
├── validation.ts          # EXISTING: Add ~15 new Zod schemas
├── auth-middleware.ts     # EXISTING: Integration point for rate limiting
next.config.ts             # MODIFIED: Add headers() function
```

### Pattern 1: In-Memory Sliding Window Rate Limiter
**What:** A Map-based rate limiter that tracks request timestamps per key (IP or session token) and uses a sliding window to count requests within the time period.
**When to use:** All rate-limited routes.
**Example:**
```typescript
// lib/rate-limiter.ts
interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks
const CLEANUP_INTERVAL = 60_000; // 1 minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    // Remove entries where all timestamps are expired
    entry.timestamps = entry.timestamps.filter(t => now - t < MAX_WINDOW_MS);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, CLEANUP_INTERVAL);

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key) || { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => now - t < config.windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldestInWindow);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      remaining: 0,
    };
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: config.maxRequests - entry.timestamps.length,
  };
}

// Pre-configured rate limit configs
export const RATE_LIMITS = {
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 },    // 5/15min
  api: { maxRequests: 60, windowMs: 60 * 1000 },          // 60/min
  chat: { maxRequests: 10, windowMs: 60 * 1000 },         // 10/min
} as const;
```

### Pattern 2: Rate Limit Response Helper
**What:** A helper that creates the 429 response with proper headers.
**When to use:** When rate limit is exceeded.
**Example:**
```typescript
export function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: `Too many requests. Please try again in ${retryAfterSeconds} seconds.` },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }
  );
}
```

### Pattern 3: Origin Validation
**What:** Check Origin header on mutation requests against allowed origins.
**When to use:** All POST/PUT/PATCH/DELETE API routes.
**Example:**
```typescript
// lib/origin-validator.ts
export function validateOrigin(req: NextRequest): boolean {
  const method = req.method;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;

  const origin = req.headers.get('Origin');
  if (!origin) return true; // Same-origin requests may not include Origin

  const rootDomain = process.env.ROOT_DOMAIN;
  const allowedOrigins = [
    'http://localhost:3000',
    `https://${rootDomain}`,
  ];

  // Allow subdomains of ROOT_DOMAIN
  if (rootDomain && origin.endsWith(`.${rootDomain}`)) return true;

  return allowedOrigins.includes(origin);
}
```

### Pattern 4: Security Headers in next.config.ts
**What:** Configure all static security headers via the Next.js `headers()` function.
**When to use:** Applied globally to all responses.
**Example:**
```typescript
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.codesandbox.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.codesandbox.io https://api.anthropic.com",
      "frame-src 'self' blob: https://*.codesandbox.io",
      "worker-src 'self' blob:",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

### Anti-Patterns to Avoid
- **Rate limiting in Next.js middleware.ts:** Edge Runtime has limited API surface; in-memory Maps won't persist across Edge workers. Use in route handlers instead.
- **Global rate limit without route differentiation:** Auth routes need much stricter limits (5/15min) than API routes (60/min). Always use route-specific configs.
- **Storing full request objects in rate limit map:** Only store timestamps. Full objects cause memory leaks.
- **CSP with strict nonces on static export:** This project uses `output: "standalone"` which supports dynamic rendering, but nonces add complexity deferred to v1.2 (ASEC-01). Use report-only mode for now.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sliding window algorithm | Token bucket or fixed window | Sliding window with timestamp array | Smoother rate distribution, avoids burst-at-boundary problem |
| Security header configuration | Custom middleware for headers | `next.config.ts headers()` | Built into Next.js, applied before route handlers, no middleware overhead |
| Zod error formatting | Custom error formatter | Existing `formatValidationErrors()` | Already defined in `lib/validation.ts`, already used across ~18 routes |

## Common Pitfalls

### Pitfall 1: Memory Leaks in Rate Limiter
**What goes wrong:** Map entries accumulate without cleanup, causing OOM on long-running server.
**Why it happens:** Entries keyed by IP or session token never expire if cleanup is not implemented.
**How to avoid:** Run a periodic cleanup (setInterval every 60s) that removes entries with all timestamps older than the largest window.
**Warning signs:** Server memory usage growing linearly over time.

### Pitfall 2: CSP Breaking Sandpack
**What goes wrong:** Sandpack live preview stops rendering; console shows CSP violations.
**Why it happens:** Sandpack uses `blob:` URLs for iframes, loads bundler from `*.codesandbox.io`, and uses `eval()` for code execution.
**How to avoid:** CSP must include `frame-src blob: https://*.codesandbox.io`, `script-src 'unsafe-eval' 'unsafe-inline'`, and `connect-src https://*.codesandbox.io`. Use `Content-Security-Policy-Report-Only` to detect violations without breaking functionality.
**Warning signs:** Blank Sandpack preview panel, browser console CSP violation reports.

### Pitfall 3: CSP Breaking Mermaid Diagrams
**What goes wrong:** Mermaid diagrams fail to render.
**Why it happens:** Mermaid renders SVG and injects it via `innerHTML`. It may also use inline styles.
**How to avoid:** Ensure `style-src 'unsafe-inline'` and `img-src data:` are in CSP. Mermaid is loaded from local node_modules (no CDN), so no external script-src needed.
**Warning signs:** Mermaid container shows error state instead of diagram.

### Pitfall 4: CSP Breaking KaTeX
**What goes wrong:** Math equations render without proper fonts/styles.
**Why it happens:** KaTeX CSS is imported from `katex/dist/katex.min.css` (bundled, not CDN). KaTeX uses inline styles and data: URIs for fonts.
**How to avoid:** Ensure `font-src 'self' data:` and `style-src 'unsafe-inline'` are in CSP.
**Warning signs:** Math symbols appear as boxes or wrong characters.

### Pitfall 5: CSP Breaking HTML Artifact Iframe
**What goes wrong:** HTML artifacts fail to render in preview panel.
**Why it happens:** The artifact-preview component uses `<iframe srcDoc={...} sandbox="allow-scripts">` which requires `frame-src 'self'` at minimum.
**How to avoid:** Include `frame-src 'self' blob:` in CSP.
**Warning signs:** Blank artifact preview for HTML type artifacts.

### Pitfall 6: Origin Validation Blocking Legitimate Requests
**What goes wrong:** Fetch API requests from the same origin get blocked.
**Why it happens:** Same-origin fetch requests may not always include the `Origin` header (depends on browser and request mode). Some requests only include `Referer`.
**How to avoid:** If `Origin` header is absent, allow the request (same-origin requests without Origin are safe with Bearer token auth). Only block when Origin IS present but does not match allowed list.
**Warning signs:** API calls failing with 403 on legitimate user actions.

### Pitfall 7: Removing console.error Statements
**What goes wrong:** Real errors become invisible in production.
**Why it happens:** Overzealous cleanup removes `console.error` along with `console.log`.
**How to avoid:** Scope cleanup to `console.log`, `console.debug`, and `console.info` only. Keep `console.error` for genuine error handling.
**Warning signs:** Production errors silently swallowed.

## Code Examples

### Validation Audit Pattern (adding Zod to a route)
```typescript
// Before: No validation
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, roleId } = body; // Unsafe
  // ...
}

// After: With Zod validation
import { z } from 'zod';
import { formatValidationErrors } from '@/lib/validation';

const MySchema = z.object({
  name: z.string().min(1).max(100),
  roleId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = MySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) },
      { status: 400 }
    );
  }
  const { name, roleId } = result.data; // Type-safe
  // ...
}
```

### Rate Limiting Integration in Route Handler
```typescript
// In an auth route (e.g., app/api/auth/login/route.ts)
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  // Rate limit by IP for auth routes
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const rl = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  // ... existing route logic
}
```

### TypeScript Cast Cleanup Pattern
```typescript
// Before: as any
const result = await (tenantDb.usageRecord as any).aggregate({
  _sum: { inputTokens: true, outputTokens: true },
});
const total = (result as any)._sum;

// After: specific type assertion
interface UsageAggregate {
  _sum: { inputTokens: number | null; outputTokens: number | null };
}
const result = await (tenantDb.usageRecord as { aggregate: (args: unknown) => Promise<UsageAggregate> }).aggregate({
  _sum: { inputTokens: true, outputTokens: true },
});
const total = result._sum;

// Or: for tenantDb model access where $extends loses types
// Document as required cast with comment
const result = await (tenantDb.usageRecord as typeof prisma.usageRecord).aggregate({
  _sum: { inputTokens: true, outputTokens: true },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| X-Frame-Options DENY | CSP frame-ancestors 'none' | CSP Level 2 | X-Frame-Options still needed for old browsers; use both |
| Feature-Policy | Permissions-Policy | 2021 | Renamed header; modern syntax uses `=()` not `'none'` |
| Fixed window rate limiting | Sliding window | N/A | Prevents burst-at-boundary attacks |

## Audit Findings

### Console.log Occurrences (48 total)
| File | Count | Notes |
|------|-------|-------|
| `app/api/chat/route.ts` | 22 | MCP debug logging, step tracing, usage recording |
| `app/api/mcp/connections/[id]/test/route.ts` | 18 | MCP parse/test debug logging |
| `app/api/mcp/connections/[id]/discover/route.ts` | 1 | Session ID debug |
| `app/api/cron/cleanup/route.ts` | 1 | Cleanup summary |
| `app/api/auth/password-reset/route.ts` | 1 | Token debug (SECURITY: must remove) |
| `app/api/org/[slug]/admin/mcp/connections/[id]/discover/route.ts` | duplicated with personal MCP | Session ID debug |

### `as any` Casts (28 total across 11 files)
| Category | Files | Count | Resolution |
|----------|-------|-------|------------|
| tenantDb model access | usage, conversations, users | ~12 | Cast to `typeof prisma.modelName` |
| Prisma Json fields (parts, metadata, availableTools) | chat, messages, mcp | ~8 | Cast to specific `InputJsonValue` compatible type |
| AI SDK type gaps (streamText, usage details) | chat | ~5 | Cast to specific interfaces |
| Preferences Json | user/preferences | ~1 | Cast to `Prisma.InputJsonValue` |
| groupBy/aggregate results | usage | ~2 | Define result interfaces |

### Routes Missing Validation (~57 mutation handlers without Zod)
Routes that currently import from validation.ts: ~18 files.
Total mutation routes: ~75 handlers (POST/PUT/PATCH/DELETE).
Estimated routes needing new schemas: ~15-20 new schemas needed.

Key groups needing validation:
- Org admin routes (roles CRUD, user management, themes, onboarding, visibility, branding)
- Super admin routes (org CRUD, model CRUD, super admin CRUD, role templates)
- User routes (settings, preferences, anthropic key)
- MCP routes (connection CRUD)
- Artifact routes (create, update)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (Phase 12 scope) |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Auth route rate limiting returns 429 | manual-only | Manual: rapid-fire login requests | N/A |
| SEC-02 | API route rate limiting returns 429 | manual-only | Manual: rapid-fire API requests | N/A |
| SEC-03 | Security headers present in responses | manual-only | `curl -I http://localhost:3000` | N/A |
| SEC-04 | HSTS header in production responses | manual-only | Check response headers | N/A |
| SEC-05 | CSP-Report-Only present, no feature breakage | manual-only | Browser console check for CSP violations | N/A |
| SEC-06 | Cross-origin mutation blocked with 403 | manual-only | `curl -X POST -H "Origin: http://evil.com"` | N/A |
| DEBT-01 | find-org rate limited | manual-only | Covered by SEC-01 verification | N/A |
| DEBT-02 | No console.log in API routes | manual-only | `grep -r "console.log" app/api/` | N/A |
| DEBT-03 | `as any` reduced, specific casts used | manual-only | `grep -r "as any" app/api/` | N/A |
| DEBT-04 | All mutation routes have Zod validation | manual-only | Review each POST/PUT/PATCH/DELETE handler | N/A |

### Sampling Rate
- **Per task commit:** Manual curl/browser verification
- **Per wave merge:** Full grep audit for console.log and as any counts
- **Phase gate:** All security headers verified via curl, CSP report-only confirmed in browser

### Wave 0 Gaps
- No test framework configured (deferred to Phase 12 - TEST-01)
- Manual verification is appropriate for this security hardening phase
- Phase 12 will add automated tests for auth middleware and rate limiting

## Open Questions

1. **Sandpack CDN domains**
   - What we know: Sandpack loads bundler from CodeSandbox infrastructure. The npm package `@codesandbox/sandpack-react` is v2.20.0.
   - What's unclear: Exact CDN domains used at runtime (likely `*.codesandbox.io` and `*.csb.app`).
   - Recommendation: Start with `https://*.codesandbox.io` in CSP. Use report-only mode to discover additional domains from violation reports. Iterate.

2. **HSTS in Development**
   - What we know: User specified HSTS for production only.
   - What's unclear: Whether to conditionally apply or always include (browsers ignore HSTS on non-HTTPS).
   - Recommendation: Apply unconditionally. Browsers ignore it on HTTP (localhost:3000), so it's harmless in dev and simplifies config.

## Sources

### Primary (HIGH confidence)
- [Next.js headers documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) - Security header configuration syntax and examples
- Project codebase analysis - `lib/validation.ts`, `lib/auth-middleware.ts`, `next.config.ts`, all API route files

### Secondary (MEDIUM confidence)
- [Next.js Content Security Policy guide](https://nextjs.org/docs/pages/guides/content-security-policy) - CSP implementation patterns
- Sandpack npm package analysis - `@codesandbox/sandpack-react` iframe behavior

### Tertiary (LOW confidence)
- Sandpack CDN domains - exact domains need runtime verification via CSP report-only violations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all patterns use existing Next.js and project infrastructure
- Architecture: HIGH - rate limiter pattern is well-understood; headers() API is documented
- Pitfalls: HIGH - CSP directives verified against actual component code (Sandpack, Mermaid, KaTeX)
- Audit findings: HIGH - grep results from actual codebase provide exact counts

**Research date:** 2026-03-08
**Valid until:** 2026-04-07 (stable patterns, no fast-moving dependencies)
