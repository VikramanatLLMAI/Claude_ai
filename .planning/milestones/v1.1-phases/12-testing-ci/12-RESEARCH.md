# Phase 12: Testing & CI - Research

**Researched:** 2026-03-08
**Domain:** Testing infrastructure (Vitest unit tests, Playwright E2E, GitHub Actions CI)
**Confidence:** HIGH

## Summary

Phase 12 adds automated testing and CI to a mature Next.js 16 + Prisma 7 + TypeScript codebase with no existing test infrastructure. The unit test targets are pure functions and middleware with database dependencies that can be mocked. E2E tests cover login flows and admin navigation using seed data already present in the project.

The standard stack is Vitest 4.x for unit tests and Playwright 1.58.x for E2E, both well-documented with Next.js. The primary complexity lies in mocking the Prisma client singleton (`lib/db.ts`) and the tenant extension (`lib/tenant.ts`) so that auth middleware and usage service tests run without a database. The `vi.mock()` approach with `vitest-mock-extended` (for `mockDeep`) is the established pattern from Prisma's official testing guide, adapted from Jest.

**Primary recommendation:** Use Vitest 4.x with `vite-tsconfig-paths` for path alias resolution and `happy-dom` environment, mock Prisma via `vi.mock()` + `vitest-mock-extended` singleton pattern, configure Playwright with Chromium-only and `webServer` directive, and set up a two-job GitHub Actions workflow (unit+lint on push, E2E on PRs to main).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Separate `__tests__/` directory at project root (not co-located with source)
- Subdirectories: `__tests__/unit/`, `__tests__/e2e/`, `__tests__/fixtures/`, `__tests__/helpers/`
- Unit tests use `.test.ts` extension, E2E tests use `.spec.ts` extension
- Organized helpers directory: `__tests__/helpers/` with mock-db.ts, mock-auth.ts, factories.ts
- Fixtures use factory functions with sensible defaults (not static objects)
- Pure `vi.mock()` for all database interactions -- mock Prisma client entirely, no test DB for unit tests
- Auth middleware tests call actual `requireAuth()`/`requireOrgAuth()` functions with mocked DB underneath
- Tenant isolation tests mock the Prisma extension to verify `tenantPrisma()` adds correct `$allModels.$allOperations` filter and injects organizationId
- Encryption tests use real Node.js crypto -- actual AES-256-GCM encrypt/decrypt round-trips and scrypt password hashing
- Prompt sanitizer and system prompt composition tested with real functions (pure logic, no external deps)
- Playwright with Chromium only (no Firefox/WebKit)
- Headless by default (use `--headed` flag to watch locally)
- Test data comes from existing seed script dev data (sample org + 2 users) -- no API-based setup or DB fixtures
- Scope limited to TEST-07 (login flow) and TEST-08 (admin navigation) for E2E
- Unit tests + lint run on every push to any branch
- E2E tests run on pull requests to main only (need DB service container)
- Lint (npm run lint) runs as parallel job alongside unit tests
- PostgreSQL service container with hardcoded test URL: `postgres://postgres:postgres@localhost:5432/test_db`
- KEY_ENCRYPTION_SECRET hardcoded as test value in CI environment
- Upload Playwright trace files on test failure only (no coverage reports in CI)

### Claude's Discretion
- Vitest configuration details (happy-dom setup, path alias resolution, globals)
- Mock factory implementation patterns
- Playwright page object patterns vs inline selectors
- GitHub Actions workflow structure (job naming, caching strategy)
- Which specific assertions to write per test case
- Whether to add `npm run test` and `npm run test:e2e` scripts or different naming

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-01 | Vitest configured with path aliases, happy-dom, and TypeScript support | vitest.config.mts pattern with vite-tsconfig-paths + happy-dom environment |
| TEST-02 | Unit tests for auth middleware (session validation, org auth, super admin check) | Prisma mock singleton pattern; mock getSessionByToken, prisma.orgMember.findFirst, resolveOrgSlug |
| TEST-03 | Unit tests for tenant isolation (org-scoped queries, cross-org prevention) | Mock prisma.$extends to verify $allOperations callback injects organizationId |
| TEST-04 | Unit tests for prompt sanitizer and system prompt composition | Pure function tests -- no mocking needed; test sanitizePromptLayer and composeSystemPrompt directly |
| TEST-05 | Unit tests for usage limit enforcement | Mock tenantDb.usageRecord.aggregate and findFirst; test checkUserUsageLimits and checkOrgMonthlyCeiling |
| TEST-06 | Playwright configured for E2E testing | playwright.config.ts with webServer, Chromium-only project, baseURL localhost:3000 |
| TEST-07 | E2E tests for login flow (bare domain, org login) | Seed data: admin@acme-corp.test / password123 (Technical role), user@acme-corp.test / password123 (Basic role) |
| TEST-08 | E2E tests for admin navigation (sidebar, profile, back-to-chat) | Login as admin user, navigate to /org/acme-corp/admin, test sidebar collapse, profile expander, back-to-chat |
| TEST-09 | GitHub Actions CI pipeline with PostgreSQL service container | Two-job workflow: unit+lint on push, E2E+PostgreSQL on PR to main |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.0.18 | Unit test runner | Official Vitest 4 with happy-dom, native ESM, TypeScript support |
| @playwright/test | ^1.58.2 | E2E test framework | Official Playwright runner with auto-wait, trace support |
| vite-tsconfig-paths | ^5.x | Path alias resolution in Vitest | Reads `@/*` paths from tsconfig.json for Vitest |
| happy-dom | ^15.x | DOM environment for unit tests | 2-3x faster than jsdom, sufficient for non-rendering tests |
| vitest-mock-extended | ^3.1.0 | Deep mock support for Prisma | Provides mockDeep() for nested object mocking (prisma.user.create) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitejs/plugin-react | ^5.1.x | React JSX transform in Vitest | Only needed if testing React components (not required for pure logic tests) |

### Not Needed
| Library | Reason |
|---------|--------|
| @testing-library/react | No React component unit tests in scope (all unit tests are backend logic) |
| @testing-library/dom | No DOM-based unit tests in scope |
| jsdom | Using happy-dom instead (faster) |
| prisma-mock-vitest | Using vitest-mock-extended singleton pattern instead (official Prisma recommendation) |

**Installation:**
```bash
npm install -D vitest @playwright/test vite-tsconfig-paths happy-dom vitest-mock-extended
```

Then install Playwright browsers:
```bash
npx playwright install chromium
```

## Architecture Patterns

### Recommended Test Structure
```
__tests__/
  unit/
    auth-middleware.test.ts      # TEST-02: requireAuth, requireOrgAuth, requireSuperAdmin
    tenant-isolation.test.ts     # TEST-03: tenantPrisma org-scoping
    prompt-sanitizer.test.ts     # TEST-04: sanitizePromptLayer
    system-prompt-composition.test.ts  # TEST-04: composeSystemPrompt
    encryption.test.ts           # TEST-02 adjacent: encrypt/decrypt, hashPassword/verifyPassword
    usage-limits.test.ts         # TEST-05: checkUserUsageLimits, checkOrgMonthlyCeiling
  e2e/
    login-flow.spec.ts           # TEST-07: bare domain + org login
    admin-navigation.spec.ts     # TEST-08: sidebar, profile, back-to-chat
  helpers/
    mock-db.ts                   # Prisma mock singleton
    mock-auth.ts                 # NextRequest factory, auth header helpers
    factories.ts                 # Factory functions for User, OrgMember, Role, Session, etc.
  fixtures/
    (reserved for static test data if needed)
```

### Pattern 1: Prisma Mock Singleton
**What:** A shared mock of the Prisma client that all unit tests import
**When to use:** Any test that touches database operations

```typescript
// __tests__/helpers/mock-db.ts
import { vi } from 'vitest';
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@/lib/generated/prisma/client';

// Import the actual prisma singleton so vi.mock can intercept it
import prisma from '@/lib/db';

// Tell Vitest to mock the db module
vi.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

// Cast for type-safe mock access in tests
export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

// Reset all mocks between tests
beforeEach(() => {
  mockReset(prismaMock);
});
```

**Key insight:** The `vi.mock()` call is hoisted to the top of the file by Vitest, so it runs before any imports. The `mockDeep` from `vitest-mock-extended` creates a deeply nested mock that supports `prisma.user.create()`, `prisma.orgMember.findFirst()`, etc.

### Pattern 2: Factory Functions for Test Data
**What:** Typed factory functions that create test entities with sensible defaults
**When to use:** Every test that needs User, OrgMember, Role, Session, or Organization objects

```typescript
// __tests__/helpers/factories.ts
import type { User, Organization, OrgMember, Role, Session } from '@/lib/generated/prisma/client';

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hash',
    isSuperAdmin: false,
    preferences: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    status: 'ACTIVE',
    logoBase64: null,
    logoDisplayMode: 'PLATFORM_AND_ORG',
    monthlyRequestCeiling: null,
    monthlyTokenCeiling: null,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// Similar for Role, OrgMember, Session...
```

### Pattern 3: NextRequest Factory for Auth Tests
**What:** Helper to create mock NextRequest objects with auth headers and URL patterns
**When to use:** All auth middleware tests

```typescript
// __tests__/helpers/mock-auth.ts
import { NextRequest } from 'next/server';

export function createMockRequest(options: {
  url?: string;
  token?: string;
  method?: string;
} = {}): NextRequest {
  const url = options.url ?? 'http://localhost:3000/api/test';
  const req = new NextRequest(url, {
    method: options.method ?? 'GET',
    headers: options.token
      ? { Authorization: `Bearer ${options.token}` }
      : {},
  });
  return req;
}
```

### Pattern 4: Playwright Login Helper (for E2E)
**What:** Reusable login function for E2E tests
**When to use:** All E2E tests that require authenticated state

```typescript
// __tests__/e2e/helpers.ts (or inline in spec files)
import { Page } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/');
  // Email-first flow on bare domain
  await page.getByPlaceholder(/email/i).fill('admin@acme-corp.test');
  await page.getByRole('button', { name: /continue/i }).click();
  // Redirects to org login
  await page.getByPlaceholder(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait for chat page
  await page.waitForURL('**/chat');
}
```

### Anti-Patterns to Avoid
- **Connecting to a real database in unit tests:** Always mock Prisma. Unit tests must run without PostgreSQL.
- **Sharing mutable state between tests:** Each test gets fresh mock data via `mockReset()` in `beforeEach`.
- **Testing implementation details:** Test that `requireOrgAuth` returns the right response type (OrgAuthContext vs NextResponse), not the internal query structure.
- **Hardcoding wait times in E2E tests:** Use Playwright's built-in auto-wait and `waitForURL`/`waitForSelector` instead of `page.waitForTimeout()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep object mocking | Manual nested mock objects | `vitest-mock-extended` mockDeep | Prisma client has deeply nested methods; manual mocks miss type safety |
| Browser automation | Custom fetch-based tests | Playwright locators + auto-wait | Handles async rendering, network, animations automatically |
| CI caching | Custom cache scripts | `actions/cache` with npm cache | Standard, well-tested GitHub Actions caching |
| Playwright traces | Custom screenshot logic | Built-in trace recording | Playwright traces include timeline, network, DOM snapshots |

## Common Pitfalls

### Pitfall 1: Prisma Mock Not Working (methods returning undefined)
**What goes wrong:** `prisma.user.findUnique()` returns `undefined` instead of mocked value
**Why it happens:** Standard `vi.mock()` creates shallow mocks; nested properties like `prisma.user.create` are not mocked
**How to avoid:** Use `mockDeep` from `vitest-mock-extended` in the mock factory
**Warning signs:** Tests pass but assertions on return values fail silently

### Pitfall 2: Path Aliases Not Resolved in Tests
**What goes wrong:** `Error: Cannot find module '@/lib/db'`
**Why it happens:** Vitest doesn't read tsconfig.json paths by default
**How to avoid:** Add `vite-tsconfig-paths` plugin to vitest.config.mts
**Warning signs:** Import errors only in test files, not in source code

### Pitfall 3: vi.mock() Hoisting Order
**What goes wrong:** Mock is not applied when imported in helper files
**Why it happens:** `vi.mock()` is hoisted to the top of the file it appears in, but not across files
**How to avoid:** Put `vi.mock('@/lib/db')` in the mock-db.ts helper AND import that helper first in test files, or use `vi.mock()` directly in each test file
**Warning signs:** Some tests work, others don't, depending on import order

### Pitfall 4: E2E Tests Failing Due to Missing Seed Data
**What goes wrong:** Login tests fail because the test user doesn't exist
**Why it happens:** E2E tests depend on `npx tsx prisma/seed.ts --dev` having been run
**How to avoid:** In CI, run `npm run db:push && npm run db:seed -- --dev` before E2E tests; use `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD`/`SUPER_ADMIN_NAME` env vars to prevent interactive prompts
**Warning signs:** Tests pass locally but fail in CI

### Pitfall 5: NextRequest Constructor in Test Environment
**What goes wrong:** `NextRequest is not a constructor` or URL parsing errors
**Why it happens:** `next/server` may not be fully available outside the Next.js runtime
**How to avoid:** Use `happy-dom` environment (provides URL/Headers APIs); if NextRequest still fails, mock it or use a minimal shim
**Warning signs:** Import errors on `next/server` in test files

### Pitfall 6: Playwright webServer Not Waiting Long Enough
**What goes wrong:** Tests start before the Next.js dev server is ready
**Why it happens:** Next.js dev server takes time to compile on first request
**How to avoid:** Set generous `timeout` in webServer config (e.g., 120000ms) and use `reuseExistingServer: !process.env.CI`
**Warning signs:** First test run fails, retries pass

## Code Examples

### Vitest Configuration
```typescript
// vitest.config.mts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'happy-dom',
    include: ['__tests__/unit/**/*.test.ts'],
    globals: true,  // provides describe, it, expect globally
    setupFiles: ['__tests__/helpers/mock-db.ts'],
  },
});
```

**Note:** `@vitejs/plugin-react` is NOT needed since we are not testing React components -- all unit tests are backend logic (auth, tenant, prompt, usage). The `happy-dom` environment provides URL, Headers, and Request APIs needed by `next/server`.

### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### Auth Middleware Test Example
```typescript
// __tests__/unit/auth-middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { prismaMock } from '../helpers/mock-db';
import { createMockRequest } from '../helpers/mock-auth';
import { createMockUser, createMockSession } from '../helpers/factories';
import { requireAuth, requireOrgAuth, requireSuperAdmin } from '@/lib/auth-middleware';

// Mock storage module (getSessionByToken)
vi.mock('@/lib/storage', () => ({
  getSessionByToken: vi.fn(),
}));

// Mock resolve-org
vi.mock('@/lib/resolve-org', () => ({
  resolveOrgSlug: vi.fn(),
}));

// Mock tenant
vi.mock('@/lib/tenant', () => ({
  tenantPrisma: vi.fn(() => ({})),
}));

import { getSessionByToken } from '@/lib/storage';
import { resolveOrgSlug } from '@/lib/resolve-org';

describe('requireAuth', () => {
  it('returns 401 when no auth header', async () => {
    const req = createMockRequest();
    const result = await requireAuth(req);
    expect(result).toBeInstanceOf(NextResponse);
  });

  it('returns user when session is valid', async () => {
    const user = createMockUser();
    const session = createMockSession({ user });
    (getSessionByToken as ReturnType<typeof vi.fn>).mockResolvedValue(session);

    const req = createMockRequest({ token: 'a'.repeat(64) });
    const result = await requireAuth(req);
    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as { user: typeof user }).user.email).toBe(user.email);
  });
});
```

### GitHub Actions CI Workflow
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  unit-and-lint:
    name: Unit Tests & Lint
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Run lint
        run: npm run lint
      - name: Run unit tests
        run: npm run test -- --run
        env:
          KEY_ENCRYPTION_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

  e2e:
    name: E2E Tests
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 30
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium
      - name: Setup database
        run: npm run db:push && npm run db:seed -- --dev
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db
          SUPER_ADMIN_EMAIL: admin@test.com
          SUPER_ADMIN_PASSWORD: testpassword123
          SUPER_ADMIN_NAME: Test Admin
          KEY_ENCRYPTION_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
      - name: Run E2E tests
        run: npx playwright test
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db
          KEY_ENCRYPTION_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
          NODE_ENV: development
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-traces
          path: test-results/
          retention-days: 7
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest | Vitest 4 | 2025-2026 | Native ESM, faster execution, Vite plugin ecosystem |
| jsdom | happy-dom | 2024+ | 2-3x faster test execution for DOM API tests |
| Cypress | Playwright | 2023+ | Better multi-browser support, faster, built-in auto-wait |
| jest-mock-extended | vitest-mock-extended | 2024+ | Same API adapted for Vitest's vi.mock system |
| Manual CI scripts | GitHub Actions service containers | 2022+ | Built-in PostgreSQL containers, no Docker Compose needed |

## Open Questions

1. **vitest-mock-extended + Vitest 4 compatibility**
   - What we know: vitest-mock-extended 3.1.0 targets Vitest 2.0.0+ but was published ~1 year ago
   - What's unclear: Whether it works seamlessly with Vitest 4.0.18
   - Recommendation: Install and test; if incompatible, fall back to manual `vi.fn()` mocking with type casts. The `mockDeep` pattern is convenience, not essential -- can be replaced with explicit per-method mocks.

2. **NextRequest availability in happy-dom**
   - What we know: `next/server` exports NextRequest which wraps the Web Fetch API Request
   - What's unclear: Whether happy-dom provides all Web APIs NextRequest depends on
   - Recommendation: Test during setup; if NextRequest fails, mock it with a plain object matching the interface (headers, nextUrl.pathname, etc.)

3. **Playwright webServer with `npm run dev` in CI**
   - What we know: Next.js dev server works but requires compilation time
   - What's unclear: Whether `npm run build && npm run start` would be more reliable in CI
   - Recommendation: Start with `npm run dev` (simpler, matches dev path routing); switch to build+start if CI timing is an issue

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + Playwright 1.58.2 |
| Config file | vitest.config.mts + playwright.config.ts (Wave 0) |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test -- --run && npx playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | Vitest configured | setup | `npm run test -- --run` | No -- Wave 0 |
| TEST-02 | Auth middleware tests | unit | `npx vitest run __tests__/unit/auth-middleware.test.ts` | No -- Wave 0 |
| TEST-03 | Tenant isolation tests | unit | `npx vitest run __tests__/unit/tenant-isolation.test.ts` | No -- Wave 0 |
| TEST-04 | Prompt sanitizer + composition tests | unit | `npx vitest run __tests__/unit/prompt-sanitizer.test.ts __tests__/unit/system-prompt-composition.test.ts` | No -- Wave 0 |
| TEST-05 | Usage limit tests | unit | `npx vitest run __tests__/unit/usage-limits.test.ts` | No -- Wave 0 |
| TEST-06 | Playwright configured | setup | `npx playwright test --list` | No -- Wave 0 |
| TEST-07 | Login flow E2E | e2e | `npx playwright test __tests__/e2e/login-flow.spec.ts` | No -- Wave 0 |
| TEST-08 | Admin navigation E2E | e2e | `npx playwright test __tests__/e2e/admin-navigation.spec.ts` | No -- Wave 0 |
| TEST-09 | CI pipeline | ci | `gh workflow view ci.yml` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --run` (unit tests only, ~5 seconds)
- **Per wave merge:** Full suite `npm run test -- --run && npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.mts` -- Vitest configuration with happy-dom + path aliases
- [ ] `playwright.config.ts` -- Playwright configuration with Chromium + webServer
- [ ] `__tests__/helpers/mock-db.ts` -- Prisma mock singleton
- [ ] `__tests__/helpers/mock-auth.ts` -- NextRequest factory
- [ ] `__tests__/helpers/factories.ts` -- Entity factory functions
- [ ] `.github/workflows/ci.yml` -- GitHub Actions workflow
- [ ] `package.json` -- Add test/test:e2e scripts
- [ ] Install: `npm install -D vitest @playwright/test vite-tsconfig-paths happy-dom vitest-mock-extended`

## Sources

### Primary (HIGH confidence)
- [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest) - Official Next.js 16 Vitest setup
- [Next.js Playwright Guide](https://nextjs.org/docs/app/guides/testing/playwright) - Official Next.js 16 Playwright setup
- [Playwright CI Guide](https://playwright.dev/docs/ci-intro) - Official GitHub Actions workflow
- [Prisma Unit Testing Docs](https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing) - Official Prisma mock pattern

### Secondary (MEDIUM confidence)
- [Vitest 4.0 Announcement](https://vitest.dev/blog/vitest-4) - Vitest 4 features and migration
- [vitest-mock-extended npm](https://www.npmjs.com/package/vitest-mock-extended) - Deep mocking for Vitest
- [vite-tsconfig-paths npm](https://www.npmjs.com/package/vite-tsconfig-paths) - Path alias plugin

### Tertiary (LOW confidence)
- vitest-mock-extended 3.1.0 compatibility with Vitest 4 -- not yet confirmed by official source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Next.js docs confirm Vitest + Playwright pattern
- Architecture: HIGH - Prisma mock singleton is officially documented; test targets are well-understood from source code analysis
- Pitfalls: HIGH - Known issues from official docs and community reports
- CI pipeline: HIGH - PostgreSQL service containers and Playwright Actions are well-documented

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable tooling, 30-day validity)
