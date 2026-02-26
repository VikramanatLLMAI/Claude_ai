# LLMatscale.ai — RBAC Multi-Tenant Platform

## What This Is

LLMatscale.ai is a production SaaS AI chat platform powered by Anthropic's Claude models. It already has a fully working chat application with streaming, file upload/preview, MCP tool integration, Sandpack preview, artifact generation, themes, and settings. The goal is to layer a complete Role-Based Access Control (RBAC) system on top — transforming the single-user app into a multi-tenant platform where organizations have isolated data, controlled access, and granular admin features.

## Core Value

Organizations can securely deploy AI chat to their teams with full control over who can access what — models, tools, settings, and conversations — while maintaining complete data isolation between organizations.

## Requirements

### Validated

- ✓ AI chat with streaming via Anthropic API (7 Claude models) — existing
- ✓ File upload and preview (PDF, DOCX, XLSX, PPTX, images, text) — existing
- ✓ MCP tool integration with encrypted credentials — existing
- ✓ Sandpack live React preview — existing
- ✓ Artifact generation (HTML/code) — existing
- ✓ 5 platform themes (Claude, Vercel, Solar Dusk, Twitter, Violet Bloom) — existing
- ✓ Settings modal with model selection, web search, reasoning toggles — existing
- ✓ Conversation management (create, list, pin, share, delete) — existing
- ✓ Session-based authentication with scrypt password hashing — existing
- ✓ AES-256-GCM encryption for API keys and credentials — existing
- ✓ Markdown rendering with syntax highlighting, mermaid, KaTeX — existing
- ✓ Container skills for document generation (PPTX, DOCX, PDF, XLSX) — existing

### Active

#### Multi-Tenancy & Organization Management
- [ ] Organization CRUD (create, edit, suspend, activate, delete with 30-day grace)
- [ ] Org logo upload (Base64 stored in database)
- [ ] Theme assignment per org (Super Admin assigns subset of 5 platform themes)
- [ ] Default theme per org
- [ ] Org branding (primary color, accent color)
- [ ] Data isolation — all data strictly filtered by org

#### Role Hierarchy (Super Admin → Org Admin → User)
- [ ] Super Admin role — platform-wide management, no chat access
- [ ] Org Admin role — org-scoped management with full org control
- [ ] Regular User role — chat access within org constraints
- [ ] Seed script for initial Super Admin creation
- [ ] Self-protection rules (cannot demote/suspend/delete self)
- [ ] Organization protection (at least 1 Org Admin per org)
- [ ] Platform protection (at least 1 Super Admin always)

#### Invitation-Based User Management
- [ ] Invite users via email (Resend API)
- [ ] Accept invitation flow with registration
- [ ] Default role for new users per org
- [ ] Resend or revoke pending invitations
- [ ] No open self-registration — invite only

#### Role Management & Permissions
- [ ] System roles (Technical, Business, Basic) with templates
- [ ] Custom role creation by Org Admin
- [ ] Per-role model access control (which Claude models available)
- [ ] Per-role MCP server assignment (role-specific + org-wide)
- [ ] Per-role system instructions (stacks on platform + org prompt)
- [ ] Per-role usage limits (daily requests, daily tokens)
- [ ] Per-role custom instructions toggle and character limit

#### System Prompt Stack (4 Layers)
- [ ] Platform prompt (hardcoded, no one can edit)
- [ ] Org system instructions (2000 char limit)
- [ ] Role system instructions (2000 char limit)
- [ ] User layer (name + role name + custom instructions auto-injected)
- [ ] Combined token budget enforcement (2000 tokens max)

#### Password Policy
- [ ] Per-org password policy (length, complexity requirements)
- [ ] Password expiry period
- [ ] Force password reset (individual or all users)
- [ ] Graceful enforcement — existing passwords enforced on next login only

#### Conversation Visibility
- [ ] Org-level toggle (default off — all conversations private)
- [ ] When enabled, Org Admin gets read-only access to all org conversations
- [ ] User notice in chat UI when visibility is enabled
- [ ] Filter and export conversations for compliance

#### Usage Limits & Alerts
- [ ] Role-level daily limits (requests and tokens)
- [ ] Org-level monthly limits
- [ ] Warning banner at 80% of limit
- [ ] Hard block at 100% with clear message
- [ ] Dashboard alerts for Org Admin

#### Platform API Key Management
- [ ] Super Admin adds/removes API keys per provider (v1: Anthropic)
- [ ] API key validity testing
- [ ] Assign API keys to specific organizations

#### Platform Analytics (Super Admin)
- [ ] Org statistics (active, suspended, deleted, growth over time)
- [ ] User statistics across all orgs
- [ ] Total conversations, messages, token consumption by org/provider/model
- [ ] Usage trend charts (daily/weekly/monthly) via Recharts
- [ ] Top orgs by usage, peak hours, error rates
- [ ] MCP server and tool usage trends
- [ ] Feature adoption trends

#### Org Analytics (Org Admin)
- [ ] User statistics (active, suspended, pending invite)
- [ ] Conversations, messages, token usage by user/role/model
- [ ] Model usage distribution, top users
- [ ] Per-role usage breakdown
- [ ] Usage trend charts via Recharts
- [ ] MCP usage, response times, error rates
- [ ] Invitation status overview
- [ ] Users approaching/exceeding limits, inactive users report

#### Audit Logs
- [ ] Platform audit logs (all admin actions across all orgs)
- [ ] Org audit logs (all admin actions within org)
- [ ] Filter by date, org, action type, user
- [ ] Export as CSV or JSON
- [ ] Immutable — cannot be edited or deleted
- [ ] User impersonation for support (read-only, logged)

#### Theme Management
- [ ] Org Admin picks active theme from Super Admin-assigned themes
- [ ] User toggles light/dark/system mode (independent from org theme)
- [ ] Theme fallback when assigned theme removed
- [ ] Org branding colors apply across entire org UI

#### Session Management
- [ ] Users view all active sessions (device, last active)
- [ ] Users can revoke specific sessions
- [ ] Org Admin can force-logout a user from all sessions

### Out of Scope

- Email notifications for usage alerts — deferred to v2
- OAuth/SSO login providers — v1 is email/password only
- Multiple AI providers — v1 is Anthropic only
- Mobile native app — web only
- Real-time chat between users — AI chat only
- Billing/payment integration — manual org management
- Public API for external integrations

## Context

**Existing Codebase:** Fully working Next.js 16.1.4 + React 19.2.3 chat application with PostgreSQL + Prisma 7.3.0. All chat features, file viewers, MCP integration, themes, and settings work correctly. The codebase follows a layered architecture: Presentation → API Routes → Business Logic → Data Access → Infrastructure.

**Approach:** Fresh database start. No data migration from existing single-user schema. The existing Prisma schema (User, Session, Conversation, Message, Artifact, McpConnection) will be redesigned to support multi-tenancy with Organization, OrgMember, Role, and related models.

**Email Provider:** Resend API for transactional email (invitations, password resets, forced resets).

**Deployment:** Self-hosted (Docker on own infrastructure with PostgreSQL).

**Scale:** Medium — 5-20 organizations, hundreds of users. Schema and queries designed for this tier.

**Charting:** Recharts for all analytics dashboards.

**Key Architecture Decisions:**
- Super Admin has no org context — cannot use chat
- Custom instructions stored on OrgMember (org-specific, not portable)
- MCP servers assigned at org-wide or role level — users cannot configure
- Token tracking extracted from Anthropic API responses (input_tokens + output_tokens)
- Org deletion: soft delete + 30-day auto-purge with Super Admin restore option
- Themes exist at CSS level — RBAC controls which themes each org can use

## Constraints

- **Tech Stack**: Next.js 16 + React 19 + TypeScript 5 + Prisma 7 + PostgreSQL + TailwindCSS v4 — must use existing stack
- **AI Provider**: Anthropic API only (v1) — no OpenAI, no Gemini
- **Auth**: Email/password only (v1) — no OAuth/SSO
- **Email**: Resend API for all transactional email
- **Deployment**: Self-hosted Docker — no Vercel-specific features
- **DB Fresh Start**: Complete schema redesign, no migration from existing data
- **Existing Features**: All current chat features (file viewers, Sandpack, artifacts, MCP, streaming) must be preserved exactly as-is

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fresh database start | RBAC schema is fundamentally different from single-user schema; migration complexity not worth it | — Pending |
| Invite-only registration | SaaS multi-tenant model requires controlled onboarding per org | — Pending |
| Seed script for Super Admin | No UI registration path for Super Admin since they have no org context | — Pending |
| Resend for email | Modern email API, good DX, reliable delivery | — Pending |
| Recharts for analytics | React-native charting library, good Next.js integration | — Pending |
| 4-layer prompt stack with token budget | Prevents prompt bloat while allowing personalization at every level | — Pending |
| Soft delete + auto-purge for orgs | Balance between data recovery and cleanup; Super Admin can restore within 30 days | — Pending |
| Custom instructions on OrgMember | Org-specific behavior; user in multiple orgs gets different instructions per org | — Pending |

---
*Last updated: 2026-02-26 after initialization*
