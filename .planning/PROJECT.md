# LLMatscale.ai — RBAC Multi-Tenant Platform

## What This Is

LLMatscale.ai is a production SaaS AI chat platform powered by Anthropic's Claude models with a complete Role-Based Access Control (RBAC) multi-tenant system. Organizations have isolated data, controlled access to AI models and tools, granular admin features, and visual branding — all built on top of a fully working chat application with streaming, file upload/preview, MCP tool integration, Sandpack preview, and artifact generation.

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
- Multi-tenant database schema (17 models) with automatic tenant scoping — v1.0
- Organization CRUD with suspension, soft delete, 30-day grace period — v1.0
- Subdomain-based routing (super-admin.*, {org-slug}.*) — v1.0
- Enriched auth context with org membership and role — v1.0
- Email-based invitation flow with Resend — v1.0
- System role templates (Technical, Business, Basic) — v1.0
- Custom role creation with granular permissions — v1.0
- 4-layer system prompt stack (platform + org + role + user) — v1.0
- Role-filtered model access from Platform Model Registry — v1.0
- MCP server assignment (org-wide + role-specific) — v1.0
- Per-request usage tracking with daily/monthly limit enforcement — v1.0
- Usage alerts at 80% warning and 100% hard block — v1.0
- Per-org password policy with graceful enforcement — v1.0
- Session management (view, revoke, force-logout) — v1.0
- Super Admin dashboard with org/user/key management, analytics, audit logs — v1.0
- Org Admin dashboard with members, invitations, analytics, audit logs — v1.0
- Theme assignment (Super Admin) and selection (Org Admin) — v1.0
- Org logo upload with login page branding — v1.0
- User light/dark/system mode independent from org theme — v1.0
- Conversation visibility with compliance export — v1.0
- User impersonation for support (read-only, audit-logged) — v1.0
- Scheduled cleanup tasks (org purge, expired invitations, expired sessions) — v1.0
- Onboarding wizard with conversation visibility notice — v1.0

### Active

(No active requirements — next milestone not yet defined)

### Out of Scope

- Email notifications for usage alerts — deferred to v2
- OAuth/SSO login providers — v1 is email/password only
- Multiple AI providers — v1 is Anthropic only
- Mobile native app — web only
- Real-time chat between users — AI chat only
- Billing/payment integration — manual org management
- Public API for external integrations
- Brand colors per org — org identity via theme + logo only (v1.0 decision)

## Context

**Shipped v1.0** with 112,116 LOC TypeScript across 354 files.
Tech stack: Next.js 16.1.4, React 19.2.3, Prisma 7.3.0, PostgreSQL, TailwindCSS v4, Radix UI, Recharts, TanStack Table.
Scale: Medium — designed for 5-20 organizations, hundreds of users.
Deployment: Self-hosted Docker with PostgreSQL.

**Known tech debt:**
- Rate limiting TODO on find-org route
- TypeScript `as any` casts on tenantDb aggregates
- 12 human verification browser tests pending (Phases 5 and 7)

## Constraints

- **Tech Stack**: Next.js 16 + React 19 + TypeScript 5 + Prisma 7 + PostgreSQL + TailwindCSS v4
- **AI Provider**: Anthropic API only (v1)
- **Auth**: Email/password only (v1)
- **Email**: Resend API for all transactional email
- **Deployment**: Self-hosted Docker
- **Existing Features**: All chat features preserved as-is

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fresh database start | RBAC schema fundamentally different; migration not worth it | Good |
| Invite-only registration | SaaS multi-tenant requires controlled onboarding | Good |
| Seed script for Super Admin | No UI registration for Super Admin (no org context) | Good |
| Resend for email | Modern API, good DX, reliable delivery | Good |
| Recharts for analytics | React-native, good Next.js integration | Good |
| 4-layer prompt stack with token budget | Prevents prompt bloat while allowing per-level personalization | Good |
| Soft delete + auto-purge for orgs | Balance between recovery and cleanup | Good |
| Custom instructions on OrgMember | Org-specific; user in multiple orgs gets different instructions | Good |
| Auth at route handler level (not middleware) | CVE-2025-29927 defense-in-depth | Good |
| Tenant scoping via Prisma Extensions | Single enforcement point, auto-inject orgId | Good |
| Existing chat UI untouched | RBAC through admin panels + surgical integration points | Good |
| Super Admin renamed to super-admin.* | Avoid conflict with org admin paths | Good |
| Brand colors dropped for theme + logo | Simpler, less maintenance, themes cover visual identity | Good |
| Model Registry as single source of truth | No hardcoded model lists, UI-manageable | Good |

---
*Last updated: 2026-03-06 after v1.0 milestone*
