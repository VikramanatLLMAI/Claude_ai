# LLMatscale.ai — RBAC Multi-Tenant Platform

## What This Is

LLMatscale.ai is a production SaaS AI chat platform powered by Anthropic's Claude models with a complete Role-Based Access Control (RBAC) multi-tenant system. Organizations have isolated data, controlled access to AI models and tools, granular admin features, and visual branding — all built on top of a fully working chat application with streaming, file upload/preview, MCP tool integration, Sandpack preview, and artifact generation. The platform features production-grade admin dashboards with Vercel-level polish, a 6-layer prompt stack with restriction enforcement, comprehensive security hardening, and an automated test suite with CI pipeline.

## Core Value

Organizations can securely deploy AI chat to their teams with full control over who can access what — models, tools, settings, and conversations — while maintaining complete data isolation between organizations.

## Requirements

### Validated

- AI chat with streaming via Anthropic API (7 Claude models) — existing
- File upload and preview (PDF, DOCX, XLSX, PPTX, images, text) — existing
- MCP tool integration with encrypted credentials — existing
- Sandpack live React preview — existing
- Artifact generation (HTML/code) — existing
- 5 platform themes (Claude, Vercel, Solar Dusk, Twitter, Violet Bloom) — existing
- Settings modal with model selection, web search, reasoning toggles — existing
- Conversation management (create, list, pin, share, delete) — existing
- Session-based authentication with scrypt password hashing — existing
- AES-256-GCM encryption for API keys and credentials — existing
- Markdown rendering with syntax highlighting, mermaid, KaTeX — existing
- Container skills for document generation (PPTX, DOCX, PDF, XLSX) — existing
- Multi-tenant database schema (21 models) with automatic tenant scoping — v1.0
- Organization CRUD with suspension, soft delete, 30-day grace period — v1.0
- Subdomain-based routing (super-admin.*, {org-slug}.*) — v1.0
- Enriched auth context with org membership and role — v1.0
- Email-based invitation flow with Resend — v1.0
- System role templates (Technical, Business, Basic) — v1.0
- Custom role creation with granular permissions — v1.0
- Role-filtered model access from Platform Model Registry — v1.0
- MCP server assignment (org-wide + role-specific) — v1.0
- Per-request usage tracking with daily/monthly limit enforcement — v1.0
- Usage alerts at 80% warning and 100% hard block — v1.0
- Per-org password policy with graceful enforcement — v1.0
- Session management (view, revoke, force-logout) — v1.0
- Super Admin dashboard with org/user/key management, analytics, audit logs — v1.0
- Org Admin dashboard with members, invitations, analytics, audit logs — v1.0
- Theme assignment and selection — v1.0
- Org logo upload with login page branding — v1.0
- User light/dark/system mode independent from org theme — v1.0
- Conversation visibility with compliance export — v1.0
- User impersonation for support (read-only, audit-logged) — v1.0
- Scheduled cleanup tasks (org purge, expired invitations, expired sessions) — v1.0
- Onboarding wizard with conversation visibility notice — v1.0
- 6-layer XML-tagged prompt stack with org/role restriction enforcement — v1.1
- Collapsible icon-mode admin sidebar with profile expander — v1.1
- Vercel-level visual polish across all 20+ admin pages — v1.1
- Prompt suggestions customization for chat welcome screen — v1.1
- Two-column login page with admin-customizable branding — v1.1
- Chat welcome screen with org/platform logos and suggestion chips — v1.1
- Theme-aware shadcn/ui chart wrappers (17 charts migrated) — v1.1
- Rate limiting on all 100+ API routes with sliding window — v1.1
- Security headers (X-Frame-Options, HSTS, CSP report-only) — v1.1
- Origin validation on mutation requests — v1.1
- Zod input validation across all API routes — v1.1
- 86 unit tests + 6 E2E tests + GitHub Actions CI pipeline — v1.1
- Full functionality audit (128 UI controls verified) — v1.1
- MCP auto-include org/role tools with source labels — v1.1
- personalMcpEnabled gating (frontend + backend) — v1.1
- Font size and code theme persistence to user preferences — v1.1

### Active

(None — next milestone not yet planned)

### Out of Scope

- Email notifications for usage alerts — deferred to future
- OAuth/SSO login providers — email/password only for now
- Multiple AI providers — Anthropic only
- Mobile native app — web only
- Real-time chat between users — AI chat only
- Billing/payment integration — manual org management
- Public API for external integrations
- Brand colors per org — org identity via theme + logo only (v1.0 decision)
- Nonce-based CSP — requires dynamic rendering (deferred)
- Redis-backed rate limiting — in-memory sufficient for single-server Docker
- CSRF tokens — Bearer token auth is inherently CSRF-immune

## Context

**Shipped v1.1** with 73,515 LOC TypeScript across 296 files changed (+34,840/-6,381 since v1.0).
Tech stack: Next.js 16.1.4, React 19.2.3, Prisma 7.4.1, PostgreSQL, TailwindCSS v4, Radix UI, shadcn/ui Charts, TanStack Table, Vitest, Playwright, GitHub Actions.
Scale: Medium — designed for 5-20 organizations, hundreds of users.
Deployment: Self-hosted Docker with PostgreSQL.

**Known tech debt:**
- "Coming Soon" tooltip on disabled admin nav items (intentional)
- "Coming soon" in Settings Advanced tab (intentional placeholder)
- Nyquist validation partial (non-blocking)
- In-memory rate limiter (sufficient for single-server, upgrade to Redis for multi-server)
- CSP in report-only mode (switch to enforce after monitoring)

## Constraints

- **Tech Stack**: Next.js 16 + React 19 + TypeScript 5 + Prisma 7 + PostgreSQL + TailwindCSS v4
- **AI Provider**: Anthropic API only
- **Auth**: Email/password only
- **Email**: Resend API for all transactional email
- **Deployment**: Self-hosted Docker
- **Existing Features**: All chat features preserved as-is

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fresh database start | RBAC schema fundamentally different; migration not worth it | ✓ Good |
| Invite-only registration | SaaS multi-tenant requires controlled onboarding | ✓ Good |
| Seed script for Super Admin | No UI registration for Super Admin (no org context) | ✓ Good |
| Resend for email | Modern API, good DX, reliable delivery | ✓ Good |
| 4-layer prompt stack with token budget | Prevents prompt bloat while allowing per-level personalization | ✓ Good |
| Soft delete + auto-purge for orgs | Balance between recovery and cleanup | ✓ Good |
| Auth at route handler level | CVE-2025-29927 defense-in-depth | ✓ Good |
| Tenant scoping via Prisma Extensions | Single enforcement point, auto-inject orgId | ✓ Good |
| Brand colors dropped for theme + logo | Simpler, less maintenance, themes cover visual identity | ✓ Good |
| Model Registry as single source of truth | No hardcoded model lists, UI-manageable | ✓ Good |
| tenantPrisma() typed as `typeof prisma` | Prisma 7 `$extends` loses model types; cast fixes 93 TS errors | ✓ Good |
| 6-layer XML prompt stack (v1.1) | Restriction layers prevent prompt override without breaking existing 4-layer | ✓ Good |
| Character-based validation for restrictions | Simpler for admins than token-based counting | ✓ Good |
| ChartConfig inline with `satisfies` | Type safety without separate config files | ✓ Good |
| CSP in report-only mode (v1.1) | Safe monitoring before enforcement; avoids breaking Sandpack/Mermaid/KaTeX | ✓ Good |
| In-memory rate limiter (v1.1) | Sufficient for single-server Docker deployment; upgrade path to Redis | ✓ Good |
| Chromium-only Playwright (v1.1) | Speed and CI simplicity; cross-browser testing deferred | ✓ Good |
| McpSource enum (v1.1) | Explicit ORG/ROLE/PERSONAL classification for defense-in-depth | ✓ Good |
| LoginBranding as separate model (v1.1) | Structured feature card JSON separate from OrgSettings | ✓ Good |

## Important Patterns for Next Milestone

- **Tenant-scoped creates**: When using `tenantDb.model.create()`, always include `organizationId: '' as string` in the data — the tenant extension overwrites it at runtime, but TypeScript requires it
- **Json fields**: Cast `parts`, `metadata`, `availableTools` as `as any` when passing to Prisma create/update — Prisma's `InputJsonValue` type is stricter than runtime allows
- **tenantPrisma() return type**: `lib/tenant.ts` casts the `$extends` result as `typeof prisma` — do NOT change this or 93+ TS errors return

---
*Last updated: 2026-03-10 after v1.1 milestone*
