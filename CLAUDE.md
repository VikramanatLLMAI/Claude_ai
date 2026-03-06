# LLMatscale.ai - Multi-Tenant AI Chat Platform

## Quick Reference

| Item | Value |
|------|-------|
| **Framework** | Next.js 16.1.4 + React 19.2.3 |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL + Prisma 7.4.1 (via `@prisma/adapter-pg`) |
| **AI Provider** | Anthropic API (Claude 4.6 Opus/Sonnet, Claude 4.5 Sonnet/Haiku/Opus, Claude 4 Opus/Sonnet) |
| **AI SDK** | Vercel AI SDK 6.x (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`) |
| **Styling** | TailwindCSS v4 + Radix UI |
| **Email** | Resend + React Email |
| **Node Version** | 20+ |

## Project Overview

LLMatscale.ai is a multi-tenant AI chat platform with RBAC, organization management, and a Super Admin dashboard. Organizations get their own login pages, roles, user management, usage tracking, and theming. AI chat is powered by Claude models via the Anthropic API.

## Project Structure

```
llmatscale_ai/
├── app/                          # Next.js App Router
│   ├── api/                     # Backend API routes (see app/api/CLAUDE.md)
│   │   ├── auth/               # Auth endpoints (login, register, logout, me, find-org,
│   │   │                       #   change-password, password-reset, accept-invitation,
│   │   │                       #   validate-invitation)
│   │   ├── chat/               # AI chat streaming endpoint
│   │   ├── conversations/      # Conversation CRUD + messages + title
│   │   ├── cron/               # Cron jobs (cleanup)
│   │   ├── files/              # Anthropic Files API (download/metadata)
│   │   ├── mcp/                # MCP connection management (personal)
│   │   ├── messages/           # Message feedback
│   │   ├── artifacts/          # Artifact management
│   │   ├── user/               # User settings, preferences, Anthropic API key
│   │   ├── org/[slug]/         # Org-scoped API routes
│   │   │   ├── admin/          # Org admin: analytics, audit-logs, conversations,
│   │   │   │                   #   instructions, logo, mcp, models, onboarding,
│   │   │   │                   #   roles, security, settings, themes, usage, users
│   │   │   ├── invitations/    # Invitation management (create, resend, revoke)
│   │   │   ├── models/         # Available models for org member
│   │   │   ├── onboarding/     # Onboarding agreement acceptance
│   │   │   ├── password-policy/# Org password policy
│   │   │   ├── profile/        # User profile within org
│   │   │   ├── sessions/       # Session management
│   │   │   ├── settings/       # Org settings (default-role)
│   │   │   ├── theme/          # Org theme
│   │   │   ├── usage-status/   # User usage status
│   │   │   └── user/           # User custom instructions
│   │   └── super-admin/        # Super Admin API routes
│   │       ├── analytics/      # Platform analytics
│   │       ├── api-keys/       # Platform API key management
│   │       ├── audit-logs/     # Platform audit logs + export
│   │       ├── impersonation/  # User impersonation
│   │       ├── models/         # Model registry CRUD
│   │       ├── organizations/  # Org CRUD + suspend/activate/restore/logo/themes
│   │       ├── role-templates/ # Role template management
│   │       ├── settings/       # Platform settings
│   │       ├── super-admins/   # Super Admin user management
│   │       ├── system-prompt/  # Platform system prompt
│   │       └── users/          # User management + impersonation
│   ├── org/[slug]/              # Org-scoped pages
│   │   ├── login/page.tsx      # Org login page
│   │   ├── register/page.tsx   # Invitation-based registration
│   │   ├── chat/page.tsx       # Chat application page
│   │   ├── force-password-change/page.tsx
│   │   ├── admin/              # Org admin dashboard pages
│   │   │   ├── page.tsx        # Admin overview
│   │   │   ├── analytics/      # Analytics dashboard
│   │   │   ├── audit-logs/     # Audit log viewer
│   │   │   ├── conversations/  # Conversation management
│   │   │   ├── instructions/   # System instructions editor
│   │   │   ├── invitations/    # Invitation management
│   │   │   ├── mcp/            # MCP connections
│   │   │   ├── roles/          # Role management
│   │   │   ├── security/       # Security settings
│   │   │   ├── settings/       # Org settings
│   │   │   ├── usage/          # Usage tracking
│   │   │   └── users/          # User management
│   │   └── layout.tsx          # Org layout
│   ├── super-admin/             # Super Admin dashboard pages
│   │   ├── page.tsx            # Dashboard overview
│   │   ├── login/              # Super Admin login
│   │   ├── analytics/          # Platform analytics
│   │   ├── api-keys/           # API key management
│   │   ├── audit-logs/         # Audit log viewer
│   │   ├── models/             # Model registry
│   │   ├── organizations/      # Organization management
│   │   ├── settings/           # Platform settings
│   │   ├── super-admins/       # Super Admin management
│   │   ├── system-prompt/      # System prompt editor
│   │   ├── users/              # User management
│   │   └── layout.tsx          # Super Admin layout
│   ├── chat/page.tsx            # Legacy chat page
│   ├── settings/page.tsx        # Settings page
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing / email-first login entry point
│   ├── not-found.tsx            # 404 page
│   ├── loading.tsx              # Loading state
│   ├── globals.css              # Global styles & theme variables
│   └── artifact-panel.css       # Artifact panel styles
├── components/                   # React components (see components/CLAUDE.md)
│   ├── full-chat-app.tsx        # Main chat interface (99KB)
│   ├── settings-modal.tsx       # Settings modal (65KB)
│   ├── login-page.tsx           # Authentication UI
│   ├── org-login-page.tsx       # Org-specific login page
│   ├── register-page.tsx        # Registration page
│   ├── find-my-org.tsx          # Org finder component
│   ├── onboarding-wizard.tsx    # Onboarding flow
│   ├── org-theme-provider.tsx   # Theme context provider
│   ├── sandpack-preview.tsx     # Live React preview
│   ├── artifact-preview.tsx     # Artifact rendering
│   ├── artifact-panel-wrapper.tsx
│   ├── error-boundary.tsx       # Error boundary
│   ├── providers.tsx            # App providers
│   ├── admin/                   # Org admin components (sidebar, breadcrumb,
│   │                            #   analytics, data-table, roles, users, themes,
│   │                            #   MCP, instructions, model registry, impersonation)
│   ├── chat/                    # Chat-specific components (usage-banner)
│   ├── mcp/                     # MCP UI (add dialog, connection card)
│   ├── prompt-kit/              # Custom chat UI components (markdown, code-block,
│   │                            #   message, reasoning, tool, file-card, loader, etc.)
│   ├── viewers/                 # Document viewers (PDF, DOCX, XLSX, PPTX, Mermaid)
│   └── ui/                      # Radix UI wrapper components (button, dialog,
│                                #   dropdown-menu, tabs, sheet, sidebar, skeleton, etc.)
├── hooks/                        # Custom React hooks
│   ├── use-file-content.ts     # File content caching hook
│   ├── use-dark-mode.ts        # Dark mode detection hook
│   ├── use-keyboard-shortcuts.tsx
│   ├── use-mobile.tsx
│   └── use-smooth-streaming.ts
├── lib/                          # Core utilities & business logic
│   ├── db.ts                   # Prisma client singleton (pg adapter)
│   ├── tenant.ts               # Multi-tenant Prisma extension (org row-level filtering)
│   ├── storage.ts              # Database CRUD operations
│   ├── encryption.ts           # AES-256-GCM encryption
│   ├── auth-middleware.ts      # Session validation + org auth (requireAuth, requireOrgAuth, requireSuperAdmin)
│   ├── resolve-org.ts          # Org slug resolution (path-based dev, subdomain prod)
│   ├── validation.ts           # Zod schemas
│   ├── anthropic.ts            # Anthropic SDK client
│   ├── anthropic-files.ts      # Anthropic Files API client
│   ├── system-prompts.ts       # System prompts
│   ├── artifacts.ts            # Artifact parsing
│   ├── artifact-parser.ts      # Artifact content parser
│   ├── mcp-client.ts           # MCP tool execution
│   ├── file-classifier.ts     # File type classification
│   ├── file-utils.ts           # File utilities
│   ├── api-utils.ts            # HTTP, retry, error handling
│   ├── context-window.ts       # Context window management
│   ├── performance.ts          # Debounce, throttle utilities
│   ├── accessibility.ts        # A11y helpers
│   ├── language-aliases.ts     # Programming language aliases
│   ├── sandpack-deps.ts        # Sandpack dependency resolution
│   ├── prompt-sanitizer.ts     # Prompt sanitization
│   ├── token-counter.ts        # Token counting utilities
│   ├── user-agent.ts           # User agent parsing
│   ├── utils.ts                # className merge utility (cn)
│   ├── constants/              # Application constants
│   │   └── role-templates.ts   # Default role templates
│   ├── email/                  # Email subsystem
│   │   ├── resend.ts           # Resend client singleton
│   │   └── templates/          # Email templates (invitation)
│   ├── services/               # Business logic services
│   │   ├── api-key-service.ts
│   │   ├── audit-log-service.ts
│   │   ├── audit-service.ts
│   │   ├── cleanup-service.ts
│   │   ├── conversation-visibility-service.ts
│   │   ├── impersonation-service.ts
│   │   ├── instruction-service.ts
│   │   ├── invitation-service.ts
│   │   ├── model-registry-service.ts
│   │   ├── onboarding-service.ts
│   │   ├── org-analytics-service.ts
│   │   ├── org-service.ts
│   │   ├── org-user-service.ts
│   │   ├── password-policy-service.ts
│   │   ├── password-validation.ts
│   │   ├── platform-analytics-service.ts
│   │   ├── platform-settings-service.ts
│   │   ├── registration-service.ts
│   │   ├── role-service.ts
│   │   ├── role-template-service.ts
│   │   ├── session-service.ts
│   │   ├── super-admin-service.ts
│   │   ├── system-prompt-service.ts
│   │   ├── theme-service.ts
│   │   └── usage-service.ts
│   └── generated/              # Prisma generated client
├── prisma/                      # Database layer
│   ├── schema.prisma           # PostgreSQL schema (21 models)
│   └── seed.ts                 # Database seeding (Super Admin + dev data)
├── .claude/                     # Claude Code configuration
│   ├── agents/                 # Custom agent definitions
│   └── settings.local.json     # Local settings
├── proxy.ts                     # Subdomain proxy for production routing
└── Configuration files          # package.json, tsconfig.json, etc.
```

## Database Schema

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | Authentication & global identity | email, passwordHash, name, isSuperAdmin, preferences |
| **Session** | Session management (org-aware) | token, organizationId, expiresAt, impersonatorId |
| **PasswordResetToken** | Password recovery | email, token, expiresAt, usedAt |
| **Organization** | Top-level tenant entity | name, slug, status, logoBase64, logoDisplayMode, monthlyRequestCeiling |
| **OrgMember** | User-to-org junction with role | userId, organizationId, roleId, status, customInstructions |
| **Role** | Org-scoped RBAC role | permissions, allowedModels, systemInstructions, dailyRequestLimit, personalMcpEnabled |
| **Invitation** | Org user invitations | email, roleId, token, status (PENDING/ACCEPTED/EXPIRED/REVOKED) |
| **Model** | Platform model registry | modelId, displayName, generationGroup, pricing fields, capabilities |
| **AuditLog** | Platform & org audit trail | action, targetType, targetId, metadata |
| **UsageRecord** | AI model usage tracking | model, inputTokens, outputTokens, thinkingTokens, cacheTokens |
| **OnboardingAgreement** | Org onboarding acceptance | userId, orgMemberId, agreementVersion |
| **PlatformApiKey** | Encrypted API keys | provider, encryptedKey, isActive |
| **PlatformApiKeyAssignment** | API key-to-org mapping | apiKeyId, organizationId |
| **PlatformSettings** | Platform config (singleton) | platformName, sessionExpiryDays, maintenanceMode, platformPrompt |
| **PasswordPolicy** | Per-org password rules | minLength, requireUppercase/Lowercase/Numbers/SpecialChars, expiryDays |
| **OrgThemeAssignment** | Themes assigned to orgs | themeName, isDefault |
| **OrgSettings** | Per-org configuration | systemInstructions, conversationVisibility, activeTheme, loginTagline, onboardingText |
| **Conversation** | Chat sessions (org-scoped) | title, model, activeMcpIds, isPinned, isShared |
| **Message** | Chat messages (org-scoped) | role (user/assistant/tool), content, parts, metadata |
| **Artifact** | Generated artifacts (org-scoped) | type (html/code), title, content |
| **McpConnection** | MCP server connections (org-scoped) | serverUrl, authType, roleId, availableTools |

## Key Features

### Multi-Tenancy & RBAC
- Organizations with slug-based routing (path-based in dev, subdomain in prod)
- Role-based access control with configurable permissions per org
- OrgMember junction model (one user per org constraint)
- Org-level settings, theming, and branding
- Invitation-based user onboarding with email notifications

### Authentication & Security
- Scrypt password hashing with timing-safe comparison
- Session tokens stored in PostgreSQL (org-aware, with impersonation support)
- Bearer token authentication for all API routes
- AES-256-GCM encryption for API keys and MCP credentials
- Per-org password policies (length, complexity, expiry)
- Force password change capability
- Super Admin impersonation with audit trail

### Super Admin Dashboard
- Platform-wide analytics and usage tracking
- Organization lifecycle management (create, suspend, activate, restore, delete)
- Model registry (CRUD for Claude models with pricing/capabilities)
- Platform API key management (assign to orgs)
- Super Admin user management
- Platform settings and system prompt management
- Role templates for org bootstrapping
- Audit log viewer with export

### Org Admin Dashboard
- User management (invite, suspend, force logout, force password reset)
- Role management with model access control and rate limits
- Analytics and usage dashboards
- Conversation visibility/management
- MCP connection management (org-wide and role-scoped)
- System instructions (org-level and role-level)
- Theme assignment and login page customization
- Security settings (password policy)
- Onboarding text configuration
- Audit log viewer with export

### AI Chat
- Real-time streaming via Anthropic API with Vercel AI SDK `useChat` hook
- 7 Claude models: Opus 4.6, Sonnet 4.6, Sonnet 4.5, Haiku 4.5, Opus 4.5, Opus 4, Sonnet 4
- Model access controlled per role via the Model registry
- Adaptive thinking (4.6 models) and extended thinking (4.5 models)
- File upload and preview (PDF, DOCX, XLSX, PPTX, images, text)
- Container skills for document generation (PPTX, DOCX, PDF, XLSX)
- Sandpack live React preview
- MCP tool integration (personal + org-wide + role-scoped)
- Artifact generation (HTML/code)
- Mermaid diagram rendering
- Usage tracking per request (tokens, cost)
- Context window management

## Environment Variables

```env
# Anthropic API (fallback if no platform API key assigned)
ANTHROPIC_API_KEY=<your-anthropic-api-key>

# PostgreSQL
DATABASE_URL=<your-postgresql-connection-string>

# Encryption (64 hex chars = 32 bytes for AES-256)
KEY_ENCRYPTION_SECRET=<64-hex-character-key>

# Email (Resend)
RESEND_API_KEY=<your-resend-api-key>       # Optional; emails log to console in dev if unset
RESEND_FROM_EMAIL=<sender-email>           # Optional; defaults to dev placeholder if unset

# Organization routing
ROOT_DOMAIN=<your-domain>                  # Used for subdomain routing in production

# MCP Tools
ENABLE_MCP=true                            # Set to "false" to disable MCP tools
MCP_TIMEOUT_MS=10000                       # MCP client creation timeout

# Cron
CRON_SECRET=<your-cron-secret>             # Secret for cron endpoint authentication

# Seeding
SUPER_ADMIN_EMAIL=<email>                  # For automated seeding (optional; prompts if unset)
SUPER_ADMIN_PASSWORD=<password>
SUPER_ADMIN_NAME=<name>
```

## Getting Started

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Seed the database (creates Super Admin + model registry; --dev flag adds sample org/users)
npm run db:seed

# Start development server
npm run dev
```

## Available Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run db:generate  # Regenerate Prisma client
npm run db:migrate   # Run migrations (dev)
npm run db:push      # Push schema directly
npm run db:studio    # Prisma Studio GUI
npm run db:reset     # Reset database + re-seed (WARNING: deletes data)
npm run db:seed      # Run seed script
```

## Claude Models

Models are managed via the `Model` database table (Super Admin CRUD). Default seed values:

| Model | ID | Best For |
|-------|-----|----------|
| Claude 4.6 Opus | claude-opus-4-6 | Most powerful, adaptive thinking |
| Claude 4.6 Sonnet | claude-sonnet-4-6 | Fast, intelligent, adaptive thinking |
| Claude 4.5 Sonnet | claude-sonnet-4-5-20250929 | Complex tasks |
| Claude 4.5 Haiku | claude-haiku-4-5-20251001 | Fast, simple tasks |
| Claude 4.5 Opus | claude-opus-4-5-20251101 | Complex reasoning |
| Claude 4 Opus | claude-opus-4-20250514 | Balanced performance |
| Claude 4 Sonnet | claude-sonnet-4-20250514 | Balanced performance |

## Architecture

### Multi-Tenant Data Flow
1. User navigates to org login page (`/org/{slug}/login` in dev, `{slug}.llmatscale.ai` in prod)
2. User authenticates -> Session token with `organizationId` stored in PostgreSQL
3. Frontend uses `useChat` hook -> Calls `/api/chat`
4. Backend validates session + org membership + role permissions -> Resolves API key -> Streams from Anthropic API
5. Messages saved to PostgreSQL (org-scoped) -> Artifacts extracted and stored -> Usage recorded
6. Frontend displays streaming response with markdown/code highlighting

### Auth Middleware Stack
- `requireAuth()` -- validates session token, returns userId
- `requireOrgAuth()` -- validates session + org membership + role, returns `tenantDb` (org-scoped Prisma)
- `requireSuperAdmin()` -- validates session + Super Admin flag

### Tenant Isolation
- `lib/tenant.ts` provides `tenantPrisma()` which returns an org-filtered Prisma client via `$extends`
- All org-scoped models (Conversation, Message, Artifact, McpConnection, etc.) are automatically filtered by `organizationId`

### Security
- All API routes require Bearer token authentication
- Passwords hashed with scrypt (salt + derived key)
- API keys/MCP credentials encrypted with AES-256-GCM
- Session tokens are cryptographically random (32+ bytes)
- Cascade deletes maintain referential integrity
- Org-level password policies enforced at registration and password change
- Super Admin impersonation creates time-limited sessions with audit trail

## File References

### Key Files
| File | Purpose |
|------|---------|
| `components/full-chat-app.tsx` | Main chat UI (99KB) |
| `components/settings-modal.tsx` | Settings modal (65KB) |
| `components/ui/claude-style-chat-input.tsx` | Custom chat input (41KB) |
| `app/api/chat/route.ts` | Chat streaming endpoint |
| `lib/storage.ts` | Database CRUD operations |
| `lib/tenant.ts` | Multi-tenant Prisma extension |
| `lib/auth-middleware.ts` | Auth utilities (requireAuth, requireOrgAuth, requireSuperAdmin) |
| `lib/resolve-org.ts` | Org slug resolution |
| `lib/anthropic.ts` | Anthropic SDK client |
| `lib/anthropic-files.ts` | Anthropic Files API client |
| `lib/system-prompts.ts` | System prompts |
| `lib/validation.ts` | Zod schemas |
| `lib/encryption.ts` | AES-256-GCM encryption |
| `prisma/schema.prisma` | Database schema (21 models) |
| `prisma/seed.ts` | Database seeding |
| `app/globals.css` | Theme variables & styles |

### Documentation
| File | Content |
|------|---------|
| `CLAUDE.md` | Project overview (this file) |
| `components/CLAUDE.md` | Frontend documentation |
| `app/api/CLAUDE.md` | Backend API documentation |

## Tenant DB Patterns (Important)

When writing code that uses `tenantDb` (from `requireOrgAuth()`):

1. **Creates require `organizationId`**: Always include `organizationId: '' as string` in `.create()` data -- the tenant extension auto-injects the real value at runtime, but TypeScript requires it
2. **Json fields need `as any`**: Cast `parts`, `metadata`, `availableTools` with `as any` when passing to Prisma -- `InputJsonValue` type is stricter than runtime
3. **Do not change `lib/tenant.ts` return type**: `tenantPrisma()` casts `$extends` result as `typeof prisma` for full model type inference

## Contributing

1. Use TypeScript for all new files
2. Run `npm run lint` before committing
3. Follow existing patterns in each layer
4. Test endpoints thoroughly
5. Update documentation when adding features

## External Documentation

- [Next.js](https://nextjs.org/docs) | [Vercel AI SDK](https://sdk.vercel.ai/docs) | [Anthropic API](https://docs.anthropic.com/en/docs)
- [Prisma](https://www.prisma.io/docs) | [Radix UI](https://www.radix-ui.com/primitives) | [TailwindCSS](https://tailwindcss.com/docs)
