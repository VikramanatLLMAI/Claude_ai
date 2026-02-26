# Project Research Summary

**Project:** LLMatscale.ai RBAC Multi-Tenant Layer
**Domain:** Multi-tenant SaaS platform with RBAC, layered onto an existing single-user AI chat application
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

LLMatscale.ai is adding multi-tenant RBAC to an existing, working single-user AI chat application built on Next.js 16.1.4, React 19.2.3, Prisma 7.3.0, and PostgreSQL. The expert-recommended approach is to build custom RBAC (not adopt a library like CASL or an auth service like Clerk) because the permission model is a fixed 3-level hierarchy (Super Admin / Org Admin / User) that maps cleanly to API route guards. Tenant isolation should be enforced at the application level via Prisma Client Extensions that auto-inject `organizationId` into every query, not via PostgreSQL Row-Level Security (which adds operational complexity unjustified at the target scale of 5-20 organizations). The existing authentication system (scrypt password hashing, session tokens, Bearer auth) should be extended with org and role context, not replaced.

The recommended approach preserves every working piece of the existing application while surgically adding multi-tenancy. New libraries are minimal: Resend for transactional email, React Email for templates, Recharts for analytics charts, and date-fns for date handling. The architecture introduces five key patterns: enriched auth context (user + org + role in one query), tenant-scoped Prisma extensions, a 4-layer system prompt stack (platform/org/role/user), append-only audit logging, and per-request usage tracking with limit enforcement. The competitive differentiators are the 4-layer prompt stack, per-role MCP server assignment, and self-hosted deployment with full admin control -- features that neither ChatGPT Enterprise nor Claude Enterprise offer.

The primary risks are cross-tenant data leakage (the existing `storage.ts` has ~30 data access functions that all need org scoping), authorization inconsistency between route-level and data-level checks, and soft delete complexity with the 30-day org purge. These risks are mitigated by centralizing tenant scoping in Prisma extensions (not scattered across routes), building the auth middleware to return full RBAC context in a single query, and limiting soft delete to the Organization model only with hard cascade on purge. The build order is schema-first because every feature depends on the data model; auth and tenant scoping second because every API route depends on knowing "who is this user, in which org, with what role?"; chat integration third because it is the core value; and dashboards last because they visualize data created by earlier phases.

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, React 19, Prisma 7, PostgreSQL, TailwindCSS v4, Radix UI) remains unchanged. Only targeted additions are needed. The decision is explicitly to NOT adopt CASL (fragile Prisma 7 compatibility, overkill for fixed hierarchy), NextAuth/Clerk (wrong auth model for email/password self-hosted), PostgreSQL RLS (operational complexity unjustified at target scale), or bcrypt (existing scrypt works, no migration benefit).

**Core new technologies:**
- **Resend** (^6.9.2): Transactional email for invitations and password resets -- specified in PROJECT.md, modern API, excellent DX
- **@react-email/components** (^1.0.8): Email templates with React 19 + Tailwind 4 support -- eliminates manual table-based email layout
- **Recharts** (^3.7.0): Analytics dashboard charts -- specified in PROJECT.md, React 19 compatible, declarative API
- **date-fns** (^4.1.0): Date formatting for analytics and audit logs -- tree-shakeable, immutable, TypeScript-first
- **node-cron** (^3.0.3): Scheduled cleanup (30-day org purge, expired sessions/invitations) -- lightweight, no Redis dependency
- **Additional Radix UI primitives**: Tabs, Select, Checkbox, AlertDialog, Progress -- consistent with existing component library

**Critical version note:** Recharts 3.x may need `--legacy-peer-deps` if react-is peer dep is outdated. Verify at install time.

### Expected Features

**Must have (table stakes -- P1):**
- Organization model + data isolation (orgId on all tables) -- foundational, everything depends on this
- Role hierarchy (Super Admin / Org Admin / User) -- minimum viable structure for platform, org, and chat management
- Invitation-based user management via Resend -- enterprise-standard onboarding, no self-registration
- Per-role model access control -- the core RBAC value proposition for AI chat
- Session auth with org context -- extends existing sessions to carry orgId and role
- System prompt stack (4 layers) -- genuine differentiator, unique to LLMatscale.ai
- Basic usage/token tracking -- prerequisite for limits and analytics

**Should have (competitive -- P2):**
- Custom role creation by Org Admins -- enables per-role model access, MCP assignment, usage limits
- Usage limits (role-level daily, org-level monthly) with 80%/100% thresholds
- Audit logs (immutable, filterable, exportable CSV/JSON) -- compliance requirement
- Per-role MCP server assignment -- unique differentiator
- Password policy per org -- enterprise compliance feature
- Session management (user view/revoke, admin force-logout)

**Defer (v2+):**
- SSO/OAuth -- massive complexity, email/password sufficient at 5-20 org scale
- Multiple AI providers -- premature generalization without a second provider
- Billing/payment integration -- manual invoicing sufficient until org count grows
- Public API -- no external contract until internal patterns stabilize
- Email notifications for usage alerts -- in-app warnings sufficient for v1

### Architecture Approach

The architecture is a 5-layer system: Presentation (admin dashboards + modified chat UI), Authorization (enhanced auth middleware + permission checker + tenant context resolver), API Routes (new `/api/admin/` and `/api/org/` alongside modified existing routes), Business Logic (org manager, role manager, prompt stack, usage tracker, audit logger, invitation service, analytics engine), and Data Access (tenant-scoped Prisma client extension wrapping all org-aware queries). The key architectural decisions are: authorization enforced in API route handlers (NOT Next.js middleware, per CVE-2025-29927), tenant scoping centralized in one Prisma extension module, and audit log writes transactional with admin actions.

**Major components:**
1. **Tenant-Scoped Prisma Client** -- auto-filters all queries by orgId, single enforcement point for data isolation
2. **Enriched Auth Middleware** -- returns AuthContext (user + org + role + permissions) in one query, replaces flat User return
3. **Permission Checker** -- `requireRole()` and `requireSuperAdmin()` guards, centralized role hierarchy definition
4. **Prompt Stack Builder** -- assembles 4-layer system prompt with XML delimiters, sanitization, and 2000-token budget
5. **Usage Tracker** -- per-request token recording from Anthropic API responses, daily/monthly limit enforcement with atomic operations
6. **Audit Logger** -- append-only log of all admin actions, transactional with the action itself
7. **Invitation Service** -- secure token-based invite flow via Resend, single-use tokens bound to email

### Critical Pitfalls

1. **Incomplete tenant scoping on existing data access** -- The existing `storage.ts` has ~30 functions that fetch by primary key without org context. Missing even one creates a cross-tenant data leak. **Avoid by:** centralizing tenant scoping in Prisma Client Extensions so orgId is auto-injected, never manual. Write cross-tenant integration tests for every endpoint.

2. **Authorization check inconsistency** -- Developers implement role checks (Layer 3) while forgetting org membership checks (Layer 2.5). A user in Org A could access Org B's data if the route only checks "is admin?" without checking "admin in which org?" **Avoid by:** replacing bare `requireAuth()` with `requireOrgAuth(req)` that returns full org context, and using a separate `requireSuperAdmin()` for platform routes.

3. **System prompt injection** -- Org Admins control org and role instructions that get concatenated into the system prompt. Naive concatenation allows overriding platform safety instructions. **Avoid by:** XML-delimited sections, input sanitization, character limits enforced server-side, and placing the platform prompt last (models weight recent instructions higher).

4. **Soft delete + auto-purge complexity** -- Soft-deleted orgs hold unique constraints (org name, user emails), cascade behavior is broken (Prisma cascades are hard-delete only), and restore has edge cases. **Avoid by:** limiting soft delete to Organization only, using partial unique indexes, and implementing auto-purge as a hard delete with database cascades.

5. **Token/usage tracking race conditions** -- Concurrent requests create check-then-act races where multiple requests pass the limit check simultaneously. **Avoid by:** atomic database operations (increment-and-check in one transaction), accepting that limits are approximate within one request margin (industry standard approach).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Database Schema and Auth Foundation
**Rationale:** Everything depends on the data model and auth context. The schema must include orgId on all tenant-scoped tables, and the auth middleware must return enriched context (user + org + role + permissions) before any feature can be built. This is the highest-risk phase because tenant isolation errors here propagate to every subsequent feature.
**Delivers:** New Prisma schema with all RBAC models (Organization, OrgMember, Role, Invitation, AuditLog, UsageRecord, PlatformApiKey, PasswordPolicy), tenant-scoped Prisma client extension, enhanced auth middleware with `requireOrgAuth()` and `requireSuperAdmin()`, permission checker, Super Admin seed script, fresh database migrations.
**Addresses features:** Organization model + data isolation, Role hierarchy, Session auth with org context, Seed script for Super Admin
**Avoids pitfalls:** Incomplete tenant scoping (Pitfall 1), Authorization inconsistency (Pitfall 2), Soft delete complexity (Pitfall 4)

### Phase 2: Organization Management and Invitation System
**Rationale:** Before any user can access the multi-tenant system, organizations must exist and users must be invitable. The invitation flow is the primary onboarding mechanism (no self-registration). This phase also introduces Resend email integration and the audit logger, both of which are prerequisites for later phases.
**Delivers:** Org CRUD (create, edit, suspend, soft delete with 30-day grace), role templates (system roles: Technical, Business, Basic), invitation flow (create, send via Resend, accept with registration, resend, revoke), audit logging for all admin actions, email service integration.
**Addresses features:** Invitation system, basic audit logging, org management
**Avoids pitfalls:** Invitation token security gaps (Pitfall 7)
**Uses:** Resend, @react-email/components

### Phase 3: Chat Integration and Core RBAC
**Rationale:** This is the core value delivery. The chat endpoint must be modified to enforce org-scoped data access, role-filtered model selection, the 4-layer prompt stack, and org-level API key resolution. Usage tracking must start here because it is the prerequisite for limits and analytics. MCP connections must be refactored from per-user to per-org with role assignment.
**Delivers:** Modified chat route (org-scoped, role-filtered models, org API key), 4-layer system prompt stack, per-request usage/token tracking, MCP connection refactoring (per-org, role-assigned), modified conversation/message storage (org-scoped).
**Addresses features:** Per-role model access control, System prompt stack, Basic usage tracking, Per-role MCP server assignment
**Avoids pitfalls:** Prompt injection (Pitfall 3), Frontend-only gating (Pitfall 6)

### Phase 4: Custom Roles and Usage Limits
**Rationale:** Custom roles are the container for per-role configurations (model access, MCP assignment, usage limits, system instructions). Usage limits depend on the token tracking established in Phase 3. These features add the enterprise credibility and operational control that distinguish a multi-tenant platform from a shared single-user app.
**Delivers:** Custom role creation by Org Admins, per-role daily limits (requests + tokens), org-level monthly limits, 80% warning / 100% hard block, usage limit banners in chat UI, password policy per org, session management (view, revoke, admin force-logout).
**Addresses features:** Custom role creation, Usage limits, Password policy, Session management
**Avoids pitfalls:** Usage tracking race conditions (Pitfall 5)
**Uses:** date-fns (for limit period calculations)

### Phase 5: Admin Dashboards and Analytics
**Rationale:** Dashboards are read-heavy visualization of data created by earlier phases. They should be built last because they depend on org, role, usage, and audit data all existing. Building dashboards before the data pipeline is complete leads to placeholder-heavy UIs and rework.
**Delivers:** Shared admin components (data tables, stat cards, chart wrappers), Super Admin dashboard (org management, API key management, platform analytics, platform audit logs), Org Admin dashboard (member management, role management, invitation management, org analytics, org audit logs), CSV/JSON export for audit logs and usage data.
**Addresses features:** Org analytics dashboard, Platform analytics dashboard, Platform API key management
**Uses:** Recharts, export-to-csv, Radix UI primitives (Tabs, Select, Progress)

### Phase 6: Polish and Advanced Features
**Rationale:** These features refine a working system. Conversation visibility, theme/branding, and user impersonation are valuable but not required for a functional multi-tenant platform. They can be shipped incrementally after the core is stable and orgs are actively using the platform.
**Delivers:** Conversation visibility toggle (default off, user notice in chat UI), org branding and theme control (logo, colors, theme assignment), user impersonation (read-only, fully audited), enhanced session management, usage limit email notifications (if warranted by usage patterns).
**Addresses features:** Conversation visibility, Theme/branding, User impersonation

### Phase Ordering Rationale

- **Schema first** because every component depends on the data model. Auth middleware enhancement cannot work without OrgMember and Role models. Tenant scoping cannot exist without orgId columns.
- **Org management and invitations before chat** because the chat modifications need org and role data to exist. Users must be onboarded before they can chat.
- **Chat integration before dashboards** because chat route changes are the core value. Dashboards are management tools around the core, not the core itself.
- **Custom roles after basic chat works** because system role templates are sufficient for initial launch. Custom roles add flexibility but require the foundational RBAC to be proven first.
- **Dashboards last** because they visualize data from all earlier phases. Building them early leads to repeated rework as the data model evolves.
- **Polish last** because conversation visibility, branding, and impersonation are refinements that require the entire system to be stable.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Schema/Auth):** Needs careful review of the existing `storage.ts` (~30 functions) to map every data access function that needs org scoping. The soft delete strategy needs explicit edge case documentation before implementation.
- **Phase 3 (Chat Integration):** The 4-layer prompt stack is a novel pattern without established community examples. Prompt sanitization and token budget enforcement need experimentation to get right.
- **Phase 5 (Analytics):** Recharts 3.x with React 19 compatibility may have peer dependency issues. The analytics aggregation queries need performance validation at target scale.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Org Management/Invitations):** Well-documented SaaS patterns. Resend has excellent official documentation. Invitation token security is well-understood (OWASP, security advisories).
- **Phase 4 (Custom Roles/Usage Limits):** Standard RBAC patterns. Usage limiting with atomic database operations is well-documented.
- **Phase 6 (Polish):** Straightforward UI features with no novel architecture.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Core technologies verified via official docs. Some npm version numbers are WebSearch-only. Recharts React 19 compatibility confirmed but may need `--legacy-peer-deps`. |
| Features | HIGH | Feature landscape verified against ChatGPT Enterprise and Claude Enterprise documentation. Prioritization is well-grounded in competitive analysis and dependency mapping. |
| Architecture | HIGH | Patterns (Prisma extensions for tenant scoping, enriched auth context, append-only audit logs) are verified via official Prisma docs, OWASP guidelines, and multiple community sources. Build order is dependency-driven and logical. |
| Pitfalls | HIGH | All critical pitfalls are grounded in OWASP Top 10, CVE advisories, and real-world security incidents. The existing codebase analysis (storage.ts, auth-middleware.ts) provides concrete evidence for the tenant scoping risk. |

**Overall confidence:** HIGH

### Gaps to Address

- **Recharts 3.x peer dependency resolution:** May require `--legacy-peer-deps` or pinning a specific version. Validate at install time in Phase 5.
- **Anthropic API token tracking for extended thinking:** The usage object may include `cache_creation_input_tokens` and `cache_read_input_tokens` in addition to standard `input_tokens` / `output_tokens`. Need to verify exact response shape for all 7 Claude models during Phase 3 implementation.
- **Prompt stack token budget enforcement:** The 2000-token combined budget is a heuristic (chars / 4). Need to decide whether to use a proper tokenizer or accept the approximation. A proper tokenizer adds dependency; the approximation is likely sufficient given the conservative budget.
- **Soft delete restore edge cases:** What happens to users who joined another org during the 30-day deletion period? What about role templates modified during deletion? These edge cases need explicit policy decisions before Phase 1 implementation.
- **node-cron in Docker:** Requires the Node.js process to be persistent (not serverless). Verify the Docker deployment model supports long-running processes for scheduled cleanup tasks.
- **Per-org API key assignment UI/UX:** The workflow for Super Admin assigning Anthropic API keys to orgs is not well-documented in competitor analysis (competitors own the keys). Need UX research during Phase 5 planning.

## Sources

### Primary (HIGH confidence)
- [Prisma Client Extensions docs](https://www.prisma.io/docs/orm/prisma-client/client-extensions) -- query component API for tenant scoping
- [OWASP Top 10: Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) -- RBAC security patterns
- [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) -- prompt stack security
- [CVE-2025-29927 Vercel postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) -- Next.js middleware bypass, defense-in-depth auth
- [Prisma 7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) -- generator changes affecting library compatibility
- [React Email 5.0 announcement](https://resend.com/blog/react-email-5) -- React 19 + Tailwind 4 support
- [Resend Node.js docs](https://resend.com/docs/send-with-nodejs) -- email API integration
- [AWS Multi-Tenant Data Isolation with RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) -- isolation patterns
- [AWS Fairness in Multi-Tenant Systems](https://aws.amazon.com/builders-library/fairness-in-multi-tenant-systems/) -- rate limiting patterns
- [Authentik invitation token reuse advisory](https://github.com/goauthentik/authentik/security/advisories/GHSA-9qwp-jf7p-vr7h) -- invitation security
- Existing codebase analysis (storage.ts, auth-middleware.ts, API routes, schema.prisma) -- foundational context

### Secondary (MEDIUM confidence)
- [ChatGPT Enterprise Workspace Roles](https://help.openai.com/en/articles/8266431-what-is-the-difference-between-different-roles-on-my-chatgpt-enterprise-workspace) -- competitor feature analysis
- [Claude Enterprise Plan Features](https://support.claude.com/en/articles/9797531-what-is-the-enterprise-plan) -- competitor feature analysis
- [Prisma multi-tenancy discussion #2846](https://github.com/prisma/prisma/discussions/2846) -- community patterns
- [Recharts React 19 issue #4558](https://github.com/recharts/recharts/issues/4558) -- compatibility confirmation
- [WorkOS RBAC for Multi-Tenant SaaS](https://workos.com/blog/top-rbac-providers-for-multi-tenant-saas-2025) -- RBAC patterns
- [Oso RBAC Best Practices 2025](https://www.osohq.com/learn/rbac-best-practices) -- permission patterns
- [Brandur: Soft Deletion Probably Isn't Worth It](https://brandur.org/soft-deletion) -- soft delete trade-offs
- [Multi-Tenant SaaS Architecture Patterns](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/) -- architecture validation

### Tertiary (LOW confidence)
- [Sombrainc: LLM Security Risks 2026](https://sombrainc.com/blog/llm-security-risks-2026) -- prompt injection trends
- [Multi-Tenant AI Agent Architecture](https://brimlabs.ai/blog/how-to-build-scalable-multi-tenant-architectures-for-ai-enabled-saas/) -- AI-specific multi-tenant patterns
- [Discourse AI LLM Usage Quotas](https://meta.discourse.org/t/configuring-llm-usage-quotas-in-discourse-ai/348125) -- real-world usage quota patterns

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
