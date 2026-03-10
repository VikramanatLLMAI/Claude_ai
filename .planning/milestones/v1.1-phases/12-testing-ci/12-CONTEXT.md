# Phase 12: Testing & CI - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated unit tests for critical paths (auth middleware, tenant isolation, prompt sanitizer/composition, usage limits), E2E tests for key flows (login, admin navigation), and a GitHub Actions CI pipeline that runs on every push. No new features or UI changes.

</domain>

<decisions>
## Implementation Decisions

### Test file organization
- Separate `__tests__/` directory at project root (not co-located with source)
- Subdirectories: `__tests__/unit/`, `__tests__/e2e/`, `__tests__/fixtures/`, `__tests__/helpers/`
- Unit tests use `.test.ts` extension, E2E tests use `.spec.ts` extension
- Organized helpers directory: `__tests__/helpers/` with mock-db.ts, mock-auth.ts, factories.ts
- Fixtures use factory functions with sensible defaults (e.g., `createMockUser({ email: 'custom@test.com' })`) — not static objects

### Mocking strategy
- Pure `vi.mock()` for all database interactions — mock Prisma client entirely, no test DB for unit tests
- Auth middleware tests call actual `requireAuth()`/`requireOrgAuth()` functions with mocked DB underneath
- Tenant isolation tests mock the Prisma extension to verify `tenantPrisma()` adds correct `$allModels.$allOperations` filter and injects organizationId
- Encryption tests use real Node.js crypto — actual AES-256-GCM encrypt/decrypt round-trips and scrypt password hashing (pure functions, no reason to mock)
- Prompt sanitizer and system prompt composition tested with real functions (pure logic, no external deps)

### E2E test approach
- Playwright with Chromium only (no Firefox/WebKit — add later if needed)
- Headless by default (use `--headed` flag to watch locally)
- Test data comes from existing seed script dev data (sample org + 2 users) — no API-based setup or DB fixtures
- Scope limited to required flows only:
  - TEST-07: Login flow (bare domain email-first + org login page)
  - TEST-08: Admin navigation (sidebar collapse, profile expander, back-to-chat)
- No chat flow or settings flow E2E in this phase (defer to Phase 13 audit)

### CI pipeline design
- Unit tests + lint run on every push to any branch
- E2E tests run on pull requests to main only (need DB service container)
- Lint (npm run lint) runs as parallel job alongside unit tests
- PostgreSQL service container with hardcoded test URL: `postgres://postgres:postgres@localhost:5432/test_db` — no GitHub secrets needed for DB
- KEY_ENCRYPTION_SECRET hardcoded as test value in CI environment
- Upload Playwright trace files on test failure only (no coverage reports in CI)
- No test artifacts beyond Playwright traces

### Claude's Discretion
- Vitest configuration details (happy-dom setup, path alias resolution, globals)
- Mock factory implementation patterns
- Playwright page object patterns vs inline selectors
- GitHub Actions workflow structure (job naming, caching strategy)
- Which specific assertions to write per test case
- Whether to add `npm run test` and `npm run test:e2e` scripts or different naming

</decisions>

<specifics>
## Specific Ideas

- User is a data scientist, not a testing specialist — trusts Claude's technical judgment on all implementation details
- Production-ready quality is the priority — tests should catch real bugs, not just check boxes
- All recommended options were chosen, indicating preference for industry-standard, well-trodden approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/auth-middleware.ts`: requireAuth(), requireOrgAuth(), requireSuperAdmin() — primary unit test targets
- `lib/tenant.ts`: tenantPrisma() with $extends — tenant isolation test target
- `lib/encryption.ts`: encrypt(), decrypt(), hashPassword(), verifyPassword() — pure function tests
- `lib/system-prompts.ts`: 6-layer prompt composition — pure function tests
- `lib/prompt-sanitizer.ts`: prompt sanitization logic — pure function tests
- `lib/validation.ts`: Zod schemas + validate() helper — pure function tests
- `lib/services/usage-service.ts`: usage limit enforcement — mock DB for limit checks

### Established Patterns
- Path aliases: `@/*` maps to project root (tsconfig.json) — Vitest needs `vite-tsconfig-paths` plugin
- TypeScript strict mode enabled, target ES2017
- All API routes use Bearer token auth via requireAuth/requireOrgAuth
- Prisma client singleton at `lib/db.ts` — primary mock target
- Auth returns `NextResponse | AuthResult` pattern (instanceof check)

### Integration Points
- `package.json`: needs vitest, @playwright/test, happy-dom dev dependencies
- `tsconfig.json`: test files need to be included
- `.github/workflows/`: new CI workflow file
- `prisma/seed.ts`: E2E tests depend on `--dev` seed data
- `next.config.ts`: Playwright needs dev server configuration

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-testing-ci*
*Context gathered: 2026-03-08*
