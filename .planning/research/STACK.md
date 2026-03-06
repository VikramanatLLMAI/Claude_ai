# Technology Stack

**Project:** LLMatscale.ai v1.1 Harden & Polish
**Researched:** 2026-03-06
**Scope:** NEW stack additions only for v1.1 milestone (existing stack validated in v1.0, not re-evaluated)

## Existing Stack (DO NOT CHANGE)

Already validated and working in v1.0. Listed for reference only:

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.4 | Framework |
| React | 19.2.3 | UI library |
| TypeScript | 5 | Language |
| Prisma | 7.4.1 | ORM |
| PostgreSQL | - | Database |
| TailwindCSS | v4 | Styling |
| Radix UI | various | Accessible primitives |
| Recharts | 3.7.0 | Analytics charts |
| TanStack Table | 8.21.3 | Data tables |
| Lucide React | 0.473.0 | Icons |
| Motion (Framer) | 12.29.2 | Animations |
| Sonner | 2.0.7 | Toast notifications |
| Zod | 4.3.6 | Validation |
| CVA | 0.7.1 | Component variants |
| Resend | 6.9.2 | Transactional email |

## Recommended Stack Additions

### Testing Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | ^4.0.18 | Unit/integration test runner | Official Next.js recommendation. 2-3x faster than Jest. Native ESM support matches Next.js 16. Stable browser mode in v4.0 (released Jan 2026). 35M+ weekly npm downloads. |
| @vitejs/plugin-react | ^5.1.3 | React transform for Vitest | Required for JSX/TSX transformation in Vitest. |
| @testing-library/react | ^16.3.2 | Component testing utilities | React 19 compatible (v16.x). Behavioral testing over implementation details. |
| @testing-library/dom | ^10.0.0 | DOM testing utilities | Required peer dependency for @testing-library/react v16+. |
| @testing-library/jest-dom | ^6.9.1 | Custom DOM matchers | Adds toBeInTheDocument(), toHaveTextContent(), etc. |
| @testing-library/user-event | ^14.6.1 | User interaction simulation | Realistic event simulation (click, type, tab, etc.) over fireEvent. |
| happy-dom | ^15.7.4 | Fast DOM implementation | 3-5x faster than jsdom for unit tests. Lighter memory footprint. Vitest docs recommend it. |
| Playwright | ^1.58.2 | E2E testing | Official Next.js recommendation for E2E. Cross-browser (Chromium, Firefox, WebKit). Built-in auth state persistence for multi-tenant login flow testing. Trace viewer for debugging. |
| @playwright/test | ^1.58.2 | Playwright test runner | Includes expect assertions, fixtures, parallel execution. |

**Why Vitest over Jest:** Next.js 16 official docs explicitly recommend Vitest for unit testing. Jest requires additional ESM module configuration that Next.js 16 uses extensively. Vitest shares Vite's transform pipeline, making TypeScript/JSX handling zero-config. Jest 30 exists but Vitest has won the ecosystem -- Angular 21 also adopted it as default (Oct 2025).

**Why Playwright over Cypress:** Playwright is the official Next.js E2E recommendation. Multi-browser support out of the box. Better handling of auth state reuse via `storageState` -- critical for testing multi-tenant login flows across orgs. No paid tier needed for CI features (parallel execution, traces). Cypress has moved increasingly toward paid features for CI.

**Why happy-dom over jsdom:** Vitest documentation recommends happy-dom for speed. For a project with 112K+ LOC and 354 files, faster test execution matters. Falls back cleanly to jsdom for edge cases if needed.

### Security Hardening

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Custom rate limiter (no package) | N/A | API route rate limiting | Self-hosted single-server Docker deployment. In-memory Map()-based sliding window is sufficient for 5-20 orgs and hundreds of users. Avoids Redis dependency. |

**Why NO rate limiting package:**

The project is self-hosted Docker on a single server (not serverless, not edge). The popular solutions do not fit:

- `@upstash/ratelimit` requires Redis (Upstash or self-hosted) -- unnecessary infrastructure for this scale and deployment model.
- `express-rate-limit` is designed for Express middleware, not Next.js App Router route handlers.
- Custom in-memory sliding window with `Map()` is ~50-80 lines of code, well-documented pattern, and appropriate for single-server deployment.

If the project scales to multi-server, revisit with Redis-backed rate limiting.

**Why NO CSRF package:**

The application authenticates via `Authorization: Bearer <token>` header, not session cookies. CSRF attacks exploit automatic cookie attachment by browsers. Bearer token auth is inherently CSRF-immune because browsers do not automatically attach Authorization headers to cross-origin requests. Adding `@csrf-armor/nextjs` or `@edge-csrf/nextjs` would add complexity for zero security benefit.

**Security headers -- no package needed:**

Next.js has built-in support for security headers via the `headers()` async function in `next.config.ts`. No package like `helmet` (Express-only) is needed.

### CI Pipeline

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| GitHub Actions | N/A (service) | CI/CD pipeline | Standard for GitHub-hosted repos. Free tier sufficient. Native PostgreSQL service container support for E2E tests. |

No additional packages needed. GitHub Actions workflow YAML files define the pipeline.

## Radix UI Components -- What NOT to Add

The existing Radix UI installation already covers all needs for the admin UI polish:

**Already installed and sufficient for v1.1 admin overhaul:**

| Installed Package | Use in Admin UI Overhaul |
|-------------------|--------------------------|
| `@radix-ui/react-collapsible` | Sidebar collapse/expand |
| `@radix-ui/react-tooltip` | Icon-only sidebar tooltips |
| `@radix-ui/react-dropdown-menu` | Profile expander menus, nav dropdowns |
| `@radix-ui/react-dialog` | Settings modals, confirmation dialogs |
| `@radix-ui/react-alert-dialog` | Destructive action confirmations |
| `@radix-ui/react-tabs` | Admin page sections |
| `@radix-ui/react-separator` | Visual dividers |
| `@radix-ui/react-scroll-area` | Scrollbar fixes on admin pages |
| `@radix-ui/react-avatar` | User avatars in sidebar/nav |
| `@radix-ui/react-switch` | Toggle settings |
| `@radix-ui/react-checkbox` | Permission checkboxes |
| `@radix-ui/react-label` | Form labels |

**The existing `components/ui/sidebar.tsx` (24KB) already implements:**
- SidebarProvider with React context
- Collapsible sidebar with icon-only mode (`SIDEBAR_WIDTH` constant, mobile sheet variant)
- SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton
- SidebarTrigger for collapse toggle
- Cookie-based state persistence (`sidebar_state`)

The admin UI overhaul is a **styling and layout task**, not a component library task. All primitives are present. The work is:
1. Adjusting sidebar collapse behavior (icons-only collapsed state with tooltips)
2. TailwindCSS styling refinements for Vercel-quality minimal design
3. Layout restructuring of admin pages (consistent spacing, remove unwanted borders)
4. Adding navigation elements (profile expander, "Back to chat") using existing components

**DO NOT add:** Additional Radix packages, shadcn/ui CLI beyond existing manual patterns, or alternative component libraries (Mantine, Ant Design, etc.).

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Unit testing | Vitest 4 | Jest 30 | Next.js 16 officially recommends Vitest. Jest requires extra ESM configuration. |
| E2E testing | Playwright 1.58 | Cypress 14 | Next.js officially recommends Playwright. Cypress paid tier for CI features. |
| DOM environment | happy-dom | jsdom | happy-dom is 3-5x faster. Vitest documentation recommends it. |
| Rate limiting | Custom in-memory | @upstash/ratelimit | Requires Redis infrastructure. Overkill for single-server self-hosted deployment. |
| Rate limiting | Custom in-memory | express-rate-limit | Designed for Express middleware, not Next.js App Router route handlers. |
| CSRF protection | None (Bearer auth) | @csrf-armor/nextjs | Bearer token auth is inherently CSRF-immune. Package would add complexity for zero benefit. |
| Security headers | next.config.ts | helmet | Helmet is Express middleware. Next.js has built-in headers configuration. |
| UI components | Existing Radix UI | Additional Radix packages | All needed primitives already installed. Verified sidebar.tsx has collapse infrastructure. |
| CI platform | GitHub Actions | GitLab CI, CircleCI | Project is on GitHub. Native integration. Free tier sufficient. |

## Installation

```bash
# Testing - unit/integration (all dev dependencies)
npm install -D vitest@^4.0.18 @vitejs/plugin-react@^5.1.3 @testing-library/react@^16.3.2 @testing-library/dom@^10.0.0 @testing-library/jest-dom@^6.9.1 @testing-library/user-event@^14.6.1 happy-dom@^15.7.4

# Testing - E2E (dev dependency)
npm install -D @playwright/test@^1.58.2

# Install Playwright browsers (Chromium only -- sufficient for CI)
npx playwright install --with-deps chromium
```

**Total new dependencies: 8 dev dependencies, 0 production dependencies.**

Zero production bundle size impact.

## Configuration Files Needed

### vitest.config.mts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/e2e/**', '**/node_modules/**', '**/.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '*.config.*', '.next/', 'prisma/'],
    },
  },
})
```

**Note:** `vite-tsconfig-paths` resolves `@/` path aliases. Install as dev dependency if not already present.

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### package.json script additions

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### GitHub Actions workflow (.github/workflows/ci.yml)

Two jobs:
1. **lint-and-test:** checkout, install, `npm run lint`, `npm run test`
2. **e2e:** checkout, install, install Playwright browsers (cached), PostgreSQL service container, `npx prisma db push`, `npm run db:seed`, build, `npm run test:e2e`, upload traces on failure

PostgreSQL runs as a GitHub Actions service container (`postgres:16`). No external database needed for CI.

## Implementation Notes

### Rate Limiting Strategy

Build a custom utility in `lib/rate-limit.ts`:

```typescript
// Sliding window counter using in-memory Map
// Key by: IP for unauthenticated routes, userId for authenticated routes
//
// Tiers:
//   Auth endpoints (login, register, password-reset): 5 req/min per IP
//   Find-org endpoint: 10 req/min per IP
//   Chat API: already controlled by existing usage limits (daily/monthly per role)
//   Admin API: 60 req/min per userId
//   General API: 30 req/min per userId
//
// Cleanup: periodic sweep of expired entries every 5 minutes via setInterval
// Response: 429 Too Many Requests with Retry-After header
```

This is ~50-80 lines of code. No package needed.

### Security Headers Strategy

Add to `next.config.ts` via the built-in `headers()` async function:

```typescript
// Headers to set on all routes:
//   X-Content-Type-Options: nosniff
//   X-Frame-Options: DENY
//   Referrer-Policy: strict-origin-when-cross-origin
//   Permissions-Policy: camera=(), microphone=(), geolocation=()
//   Strict-Transport-Security: max-age=63072000; includeSubDomains (production only)
//
// CSP considerations:
//   script-src needs 'unsafe-inline' 'unsafe-eval' for Sandpack live preview
//   style-src needs 'unsafe-inline' for TailwindCSS runtime
//   frame-src needs 'self' https://*.codesandbox.io for Sandpack
//   connect-src needs https://api.anthropic.com for chat streaming
//
// Note: CSP with nonces requires dynamic rendering per page load.
// For v1.1, use a permissive CSP that does not break Sandpack.
// Tighten in v2 if needed.
```

No package needed. Native Next.js configuration.

### Testing Strategy

**Unit tests (Vitest + Testing Library):**
- Utility functions in `lib/` (validation, rate limiting, token counting, encryption helpers)
- React hooks in `hooks/` (useDarkMode, useMobile, useFileContent)
- Service functions in `lib/services/` (business logic with mocked Prisma)
- API route handlers (mock Prisma client, test request/response patterns)
- Component rendering tests for admin UI components (sidebar, data-table, KPI cards)

**E2E tests (Playwright):**
- Auth flows (org login, logout, session expiry, force password change)
- Multi-tenant isolation (org A user cannot access org B routes)
- Admin dashboard navigation (Super Admin and Org Admin)
- Role-based access control enforcement (permission denied for unauthorized actions)
- Chat message sending (verify streaming works end-to-end)

**Known limitation:** Vitest does not support async Server Components (React 19 ecosystem limitation). Use E2E tests for pages that rely on async server components.

**Not in scope for v1.1:**
- Visual regression testing (Vitest 4 supports it, but defer to v2)
- Load/performance testing
- Mobile-specific E2E tests

## What This Milestone Does NOT Need

| Technology | Why Not Needed |
|------------|----------------|
| Redis | Single-server deployment. In-memory rate limiting sufficient at this scale. |
| Additional Radix UI packages | All needed primitives already installed. Verified against admin UI requirements. |
| CSS-in-JS (styled-components, Emotion) | TailwindCSS v4 handles all styling. |
| Form libraries (React Hook Form, Formik) | Existing controlled inputs + Zod work. Not worth migration churn for a polish milestone. |
| State management (Zustand, Jotai, Redux) | React state + useChat hook sufficient. Would add complexity without benefit. |
| Monitoring (Sentry, DataDog) | Out of scope for v1.1. Consider for v2. |
| Additional animation libraries | Motion (Framer Motion) already installed and sufficient. |
| Docker Compose for test DB | GitHub Actions service containers handle CI. Local dev uses existing PostgreSQL instance. |
| Storybook | Nice for component libraries, but this is an application not a library. Admin UI polish does not justify Storybook setup overhead. Consider for v2 if component count grows. |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Vitest 4.0.18 + React 19 | HIGH | Official Next.js docs recommend Vitest. Version 4.0.18 verified as latest stable (released ~Feb 2026). |
| Playwright 1.58.2 | HIGH | Official Next.js E2E recommendation. Version verified via npm and release notes. |
| @testing-library/react 16.x | MEDIUM | Works with React 19 but has known behavioral differences around Suspense rendering. Unit tests should avoid async Server Component patterns and rely on E2E for those paths. |
| Rate limiting (custom in-memory) | HIGH | Well-documented pattern for single-server Node.js apps. Multiple sources confirm Map-based sliding window is appropriate at this scale. |
| Security headers in next.config | HIGH | Built-in Next.js feature, documented in official docs. CSP needs careful handling around Sandpack. |
| No CSRF package needed | HIGH | Bearer token auth is inherently CSRF-immune. Well-established security principle. |
| GitHub Actions CI | HIGH | Standard, well-documented, free for this project size. PostgreSQL service containers documented. |
| No new Radix packages needed | HIGH | Verified existing sidebar.tsx (24KB) has full collapse infrastructure. All admin UI work is styling/layout refinement. |

## Sources

- [Next.js Testing: Vitest (official docs)](https://nextjs.org/docs/pages/guides/testing/vitest) -- Vitest setup recommended by Next.js
- [Next.js Testing: Playwright (official docs)](https://nextjs.org/docs/pages/guides/testing/playwright) -- Playwright setup recommended by Next.js
- [Next.js Testing Guide (official)](https://nextjs.org/docs/app/guides/testing) -- Overview of testing approaches
- [Vitest 4.0 Release Blog](https://vitest.dev/blog/vitest-4) -- v4.0 features, stable browser mode, Jan 2026
- [Vitest Getting Started](https://vitest.dev/guide/) -- Configuration and setup guide
- [Vitest npm](https://www.npmjs.com/package/vitest) -- v4.0.18 latest stable, 35M+ weekly downloads
- [Playwright Release Notes](https://playwright.dev/docs/release-notes) -- v1.58 features, CLI mode
- [Playwright CI Setup (official)](https://playwright.dev/docs/ci-intro) -- GitHub Actions integration
- [@testing-library/react npm](https://www.npmjs.com/package/@testing-library/react) -- v16.x for React 19
- [Next.js Content Security Policy (official)](https://nextjs.org/docs/pages/guides/content-security-policy) -- CSP with nonces
- [Next.js Security Blog](https://nextjs.org/blog/security-nextjs-server-components-actions) -- Server Actions CSRF protection
- [Next.js Self-Hosting Guide](https://nextjs.org/docs/pages/guides/self-hosting) -- Reverse proxy for rate limiting at scale
- [Rate Limiting Without External Packages](https://medium.com/@abrar.adam.09/implementing-rate-limiting-in-next-js-api-routes-without-external-packages-7195ca4ef768) -- In-memory Map pattern
- [@csrf-armor/nextjs npm](https://www.npmjs.com/package/@csrf-armor/nextjs) -- Evaluated and rejected (Bearer auth makes CSRF moot)
- [Vitest vs Jest 2026](https://dev.to/dataformathub/vitest-vs-jest-30-why-2026-is-the-year-of-browser-native-testing-2fgb) -- Ecosystem comparison
- [Playwright Best Practices 2026 (BrowserStack)](https://www.browserstack.com/guide/playwright-best-practices) -- Auth state reuse, Page Object Model

---
*Stack research for: LLMatscale.ai v1.1 Harden & Polish*
*Researched: 2026-03-06*
