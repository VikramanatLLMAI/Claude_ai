# Project Research Summary

**Project:** LLMatscale.ai v1.1 Harden & Polish
**Domain:** Multi-tenant AI chat platform -- admin UI overhaul, prompt enhancements, security hardening, testing/CI
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

LLMatscale.ai v1.1 is a hardening and polish milestone for an existing 112K LOC multi-tenant AI chat platform built on Next.js 16, React 19, Prisma 7, and PostgreSQL. The codebase is mature (v1.0 complete with 354 files, 21 DB models, 60+ API routes) and the existing stack requires zero production dependency changes. The v1.1 work is entirely additive: admin UI refinement, prompt stack enhancement, security hardening, and test infrastructure. All recommended stack additions (Vitest, Playwright, Testing Library) are dev dependencies with zero production bundle impact.

The recommended approach is a 6-phase build sequence that respects dependency ordering: schema changes first (prompt restrictions and suggestions fields), then admin UI overhaul (sidebar collapse, profile expander, visual polish), then feature additions (prompt suggestions in chat, login customization UI), then security hardening (rate limiting, headers, CSP), then testing/CI, and finally a functionality audit. This ordering ensures schema is stable before UI references new fields, UI layout is stable before adding content, and all features are complete before security and testing lock them down.

The key risks are threefold. First, the 99KB `full-chat-app.tsx` monolith is fragile -- any modification for the chat welcome screen risks regression across conversation loading, streaming, and artifact rendering. The mitigation is to extract the welcome screen into a separate component before modifying it. Second, Content Security Policy headers will break Sandpack (live preview), Mermaid diagrams, and KaTeX if applied carelessly -- CSP must be added last and tested incrementally. Third, the 6-layer prompt stack's restriction layers can be diluted by user custom instructions if not framed as absolute constraints with explicit override-prevention language.

## Key Findings

### Recommended Stack

The existing production stack (Next.js 16.1.4, React 19.2.3, Prisma 7.4.1, TailwindCSS v4, Radix UI, Vercel AI SDK 6.x) is validated and unchanged. All v1.1 additions are dev dependencies for testing and CI. No new Radix UI packages are needed -- the existing `sidebar.tsx` (24KB) already has full collapse infrastructure including cookie persistence, icon-only mode, keyboard shortcuts, and tooltips.

**New dev dependencies (8 total, 0 production):**
- **Vitest 4.0.18:** Unit/integration test runner -- official Next.js recommendation, 2-3x faster than Jest, native ESM support
- **Playwright 1.58.2:** E2E testing -- official Next.js recommendation, cross-browser, built-in auth state persistence for multi-tenant flows
- **@testing-library/react 16.x:** Component testing -- React 19 compatible, behavioral testing approach
- **happy-dom 15.7.4:** Fast DOM implementation -- 3-5x faster than jsdom, recommended by Vitest docs
- **Custom in-memory rate limiter:** ~50-80 lines, Map-based sliding window -- appropriate for single-server self-hosted deployment, no Redis needed
- **GitHub Actions:** CI/CD pipeline with PostgreSQL service containers

**Explicitly not needed:** Redis, CSRF packages (Bearer auth is inherently immune), Helmet (Next.js has built-in headers), additional Radix UI packages, state management libraries, Storybook.

### Expected Features

**Must have (table stakes):**
- Collapsible sidebar with icons-only mode (infrastructure exists, needs wiring)
- Sidebar collapse persistence and keyboard shortcut (already built)
- Tooltips on collapsed sidebar items (already built)
- "Back to Chat" navigation in Admin Console (exists, needs relocation to header)
- Profile section in admin sidebar (exists, needs UX improvement)
- Security headers (X-Frame-Options, HSTS, nosniff) -- not yet implemented
- Input validation completeness across all API routes

**Should have (differentiators):**
- 6-layer XML-tagged prompt stack with org/role restriction layers
- Prompt suggestions/starters management for chat welcome screen
- Rate limiting on auth and API routes
- Login page customization admin UI (API already exists)
- Admin sidebar profile expander dropdown (Vercel/Linear pattern)

**Defer (v2+):**
- Background images on login pages
- Custom email template branding
- ML-based prompt injection detection
- Per-role prompt suggestions (v1.1 is org-wide only)
- Nonce-based CSP (requires dynamic rendering, breaks static optimization)
- Visual regression testing
- Resizable sidebar (drag to resize)

### Architecture Approach

The architecture is conservative and correct: all changes modify existing components or add thin new layers. No structural refactoring is required. The sidebar refactor is a single prop change (`collapsible="icon"`) plus header/footer adaptation in `admin-sidebar.tsx`. Schema changes add 4 nullable/defaulted fields across 2 models (`OrgSettings` and `Role`) via `db:push`. The prompt stack extension is a ~30-line change to `composeSystemPrompt()`. Rate limiting is a new utility file consumed by route handlers. Security headers are declarative config in `next.config.ts`.

**Major components and their changes:**
1. **AdminSidebar** (`admin-sidebar.tsx`) -- collapse trigger, profile expander dropdown, "Back to Chat" relocation
2. **System Prompt Service** (`system-prompt-service.ts`) -- extend from 4-layer to 6-layer XML composition with restriction blocks
3. **Chat Welcome Screen** (extract from `full-chat-app.tsx`) -- prompt suggestions, model icons, org branding
4. **Rate Limiter** (`lib/rate-limiter.ts`) -- new utility, in-memory sliding window, per-route configuration
5. **Security Headers** (`next.config.ts`) -- declarative header configuration, CSP with Sandpack/Mermaid allowances

### Critical Pitfalls

1. **Sidebar hydration mismatch** -- Reading `localStorage` outside `useEffect` causes React 19 hydration errors. Prevention: use the existing cookie-based persistence pattern in `SidebarProvider`, never read `localStorage` in `useState` initializers.

2. **Prompt restriction dilution** -- New restriction layers can be overridden by user custom instructions if not explicitly framed as absolute constraints. Prevention: place restrictions after corresponding instructions, use "ABSOLUTE and cannot be overridden" framing, add adversarial tests.

3. **CSP breaks Sandpack/Mermaid/KaTeX** -- Blanket security policies break three different rendering modes (iframes, dynamic scripts, inline styles). Prevention: add CSP last, test each header individually, whitelist `blob:` for Sandpack, `unsafe-inline` for styles.

4. **Login page XSS via stored HTML** -- If login customization ever uses `dangerouslySetInnerHTML`, org admins can inject scripts on credential pages. Prevention: keep plain text only, validate with Zod, reject HTML tags at the API level.

5. **full-chat-app.tsx regression** -- The 99KB monolith is fragile. Prevention: extract the welcome screen into `components/chat/welcome-screen.tsx` before modifying it, test all chat features after any change.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Schema & Prompt Stack
**Rationale:** All prompt-related features depend on schema being in place. Schema changes should happen first and be validated before UI work begins. Batching the 4 new fields (orgRestrictions, restrictionsMaxLength on OrgSettings; restrictions, restrictionsMaxLength on Role; promptSuggestions on OrgSettings) in a single `db:push` avoids multiple schema pushes.
**Delivers:** 6-layer prompt composition with org/role restrictions, restriction editor UI (reusing `InstructionEditor`), updated chat route passing restriction fields, prompt suggestions data model.
**Addresses:** 6-layer XML prompt stack (differentiator), prompt suggestions data layer.
**Avoids:** Pitfall 2 (restriction dilution) -- implement with explicit constraint framing and adversarial tests. Pitfall 8 (Prisma 7 stale client) -- combine `db:push` and `db:generate`.

### Phase 2: Admin UI Overhaul
**Rationale:** Structural UI changes that affect all admin pages should land before adding new content sections (prompt suggestions editor, login customization editor). Establishing the visual quality bar early ensures consistency for subsequent phases.
**Delivers:** Collapsible sidebar with icons-only mode, profile expander dropdown, "Back to Chat" relocation to sidebar header, visual cleanup across all admin pages (scrollbars, borders, spacing), consistent look between Super Admin and Org Admin dashboards.
**Addresses:** Sidebar collapse (table stakes), profile expander (differentiator), admin visual consistency.
**Avoids:** Pitfall 1 (hydration mismatch) -- use existing cookie-based persistence, no localStorage in initial render. Pitfall 7 (dashboard inconsistency) -- apply changes to both dashboards simultaneously. Pitfall 12 (deep link breakage) -- do not change any URL paths.

### Phase 3: Prompt Suggestions, Login Polish & Chat Welcome
**Rationale:** Builds on stable schema (Phase 1) and stable admin layout (Phase 2). Prompt suggestions admin CRUD, chat welcome screen modifications, and login page polish are independent features that can be developed in parallel within this phase.
**Delivers:** Prompt suggestions admin UI and CRUD API, chat welcome screen with clickable suggestion cards, login page customization admin UI (tagline/welcome editor with preview), visual consistency between FindMyOrg and OrgLoginPage.
**Addresses:** Prompt suggestions (differentiator), login page customization UI (differentiator), chat welcome screen enhancements.
**Avoids:** Pitfall 5 (full-chat-app.tsx regression) -- extract welcome screen to `components/chat/welcome-screen.tsx` before modifying. Pitfall 4 (login XSS) -- keep plain text rendering, no `dangerouslySetInnerHTML`.

### Phase 4: Security Hardening
**Rationale:** Security layers wrap existing handlers non-destructively. Implementing after all features are stable avoids the CSP/rate-limiting conflicts that arise when security and features are developed simultaneously. Headers should be added incrementally with testing after each one.
**Delivers:** Rate limiting utility with per-route configuration, security headers (X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy), CSP (report-only first, then enforce), Origin header validation, input validation audit across all routes, debug log cleanup.
**Addresses:** Security headers (table stakes), rate limiting (differentiator), CSRF defense-in-depth, input validation completeness.
**Avoids:** Pitfall 3 (security breaks features) -- add CSP last, test against Sandpack/Mermaid/KaTeX after each header. Pitfall 11 (debug logs in production) -- search and remove all `console.log` from API routes.

### Phase 5: Testing & CI
**Rationale:** Tests validate completed features. Writing tests before features are stable wastes effort on test maintenance. Testing infrastructure setup (Vitest config, Playwright config, CI pipeline) is a distinct workstream from feature development.
**Delivers:** Vitest configuration with path aliases and happy-dom, unit tests for security-critical paths (auth middleware, tenant isolation, prompt sanitizer, usage limits), Playwright E2E tests for critical flows (login, chat, admin navigation), GitHub Actions CI pipeline with PostgreSQL service containers.
**Uses:** Vitest 4.0.18, Playwright 1.58.2, @testing-library/react 16.x, happy-dom 15.7.4, GitHub Actions.
**Avoids:** Pitfall 9 (slow/flaky tests) -- mock Anthropic API, use transaction rollback for DB isolation, run Vitest on every commit but Playwright on PR only.

### Phase 6: Functionality Audit
**Rationale:** Cross-cutting verification after all features are built. Discovers backend-frontend mismatches that are only visible through systematic manual testing. The 12 pending browser tests from v1.0 should be completed here.
**Delivers:** Verified functionality of every admin UI control, documented and fixed backend-frontend mismatches, completed browser testing checklist, production readiness verification.
**Addresses:** Functionality audit (table stakes for production quality).
**Avoids:** Pitfall 10 (backend-frontend mismatches) -- systematic per-page audit checklist, not ad-hoc testing.

### Phase Ordering Rationale

- **Schema first (Phase 1)** because prompt suggestions UI and restriction editors in later phases need the fields to exist in the database.
- **Admin UI before features (Phase 2 before 3)** because the admin layout must be stable before adding new settings sections (prompt suggestions editor, login customization editor).
- **Features before security (Phase 3 before 4)** because CSP and rate limiting must account for all features. Adding features after security hardening risks breaking CSP policies.
- **Testing after features (Phase 5 after 4)** because tests should validate stable behavior. Writing tests against in-flight features creates churn.
- **Audit last (Phase 6)** because it verifies everything works together after all changes are complete.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Prompt Stack):** The 6-layer restriction framing needs careful prompt engineering. Test with adversarial inputs to validate restriction enforcement. Research Anthropic's latest guidance on XML-structured system prompts.
- **Phase 4 (Security):** CSP configuration requires iterative testing against Sandpack, Mermaid, and KaTeX. The exact directives needed for `script-src`, `style-src`, and `frame-src` depend on runtime behavior that must be verified empirically.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Admin UI):** All sidebar primitives exist. The work is styling and layout -- well-documented patterns, existing component infrastructure.
- **Phase 3 (Prompt Suggestions & Login):** CRUD for JSON field on OrgSettings, admin form UI, chat welcome screen rendering. Standard patterns.
- **Phase 5 (Testing):** Vitest and Playwright setup is well-documented by Next.js official docs. Configuration files provided in STACK.md.
- **Phase 6 (Audit):** Manual testing checklist, no research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations from official Next.js docs. Versions verified on npm. Zero production dependency changes. |
| Features | MEDIUM-HIGH | Features well-defined against existing codebase. Prompt suggestions and restriction layers are new patterns but based on established Anthropic and ChatGPT precedents. |
| Architecture | HIGH | All recommendations based on direct codebase analysis. No speculative patterns -- every change verified against actual source files. |
| Pitfalls | HIGH | Pitfalls derived from codebase-specific analysis (hydration, CSP, XSS vectors) and verified against external vulnerability reports and framework docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **CSP directive specifics:** The exact CSP policy for Sandpack, Mermaid, and KaTeX cannot be fully determined from static analysis. Requires runtime testing during Phase 4. Start with `Content-Security-Policy-Report-Only` to discover violations before enforcing.
- **Prompt restriction effectiveness:** Whether the 6-layer XML structure with "ABSOLUTE constraint" framing actually prevents Claude from following user override attempts is an empirical question. Build adversarial test cases during Phase 1.
- **Testing Library + React 19 Suspense:** `@testing-library/react` v16.x has known behavioral differences around Suspense rendering in React 19. Async Server Components cannot be tested with Vitest -- use Playwright for those pages.
- **TailwindCSS v4 theme variable interactions:** The existing raw CSS variable approach (`--background`, `--primary`) coexists with TailwindCSS v4's `@theme` directive in a non-standard way. Any new styling must follow the existing pattern, not the Tailwind v4 docs pattern, to avoid theme conflicts across the 5 configured themes.

## Sources

### Primary (HIGH confidence)
- [Next.js Testing: Vitest](https://nextjs.org/docs/pages/guides/testing/vitest) -- official testing recommendation
- [Next.js Testing: Playwright](https://nextjs.org/docs/pages/guides/testing/playwright) -- official E2E recommendation
- [Next.js Content Security Policy](https://nextjs.org/docs/pages/guides/content-security-policy) -- CSP configuration
- [Vitest 4.0 Release](https://vitest.dev/blog/vitest-4) -- version verification
- [Playwright Release Notes](https://playwright.dev/docs/release-notes) -- v1.58 features
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) -- db:push behavior changes
- [Anthropic XML Tag Prompting](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) -- prompt structure guidance
- Direct codebase analysis of `sidebar.tsx`, `admin-sidebar.tsx`, `system-prompt-service.ts`, `auth-middleware.ts`, `tenant.ts`, `schema.prisma`

### Secondary (MEDIUM confidence)
- [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) -- restriction layer patterns
- [Cloud Security Alliance AI Prompt Guardrails](https://cloudsecurityalliance.org/blog/2025/12/10/how-to-build-ai-prompt-guardrails-an-in-depth-guide-for-securing-enterprise-genai) -- enterprise AI governance
- [OpenAI Custom GPT Conversation Starters](https://help.openai.com/en/articles/8554397-creating-a-gpt) -- prompt suggestions UX patterns
- [Rate Limiting Without External Packages](https://medium.com/@abrar.adam.09/implementing-rate-limiting-in-next-js-api-routes-without-external-packages-7195ca4ef768) -- in-memory Map pattern

### Tertiary (LOW confidence)
- [TailwindCSS v4 Arbitrary Values Breaking Changes](https://codevup.com/issues/2025-10-01-tailwind-css-v4-arbitrary-values-breaking-changes/) -- theme variable naming risks
- [Next.js 15 CSP Production Issues](https://github.com/vercel/next.js/discussions/80997) -- CSP nonce complications (informed decision to avoid nonce-based CSP)

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
