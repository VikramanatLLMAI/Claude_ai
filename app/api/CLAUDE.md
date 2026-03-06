# Backend API Documentation - LLMatscale.ai

## Quick Reference

| Item | Value |
|------|-------|
| **Framework** | Next.js 16 API Routes |
| **Database** | PostgreSQL + Prisma 7.3.0 |
| **AI Provider** | Anthropic API via Vercel AI SDK |
| **Authentication** | Bearer token + Session table |
| **Encryption** | AES-256-GCM (credentials), scrypt (passwords) |
| **Validation** | Zod schemas |
| **Multi-Tenancy** | Organization-scoped via `requireOrgAuth()` / `tenantDb` |

## Directory Structure

```
app/api/
├── auth/                          # Authentication
│   ├── register/route.ts         # POST - Disabled (invite-only)
│   ├── login/route.ts            # POST - Authenticate user
│   ├── logout/route.ts           # POST - Invalidate session
│   ├── me/route.ts               # GET - Current user info
│   ├── change-password/route.ts  # POST - Change password
│   ├── find-org/route.ts         # POST - Email-first org finder
│   ├── validate-invitation/route.ts # GET - Validate invitation token
│   ├── accept-invitation/route.ts   # POST - Accept invitation & register
│   └── password-reset/
│       ├── route.ts              # POST - Request reset
│       └── confirm/route.ts      # POST - Confirm reset
├── chat/                          # AI Chat
│   └── route.ts                  # POST - Stream AI response
├── files/                         # Anthropic Files API
│   └── [fileId]/
│       ├── route.ts              # GET - File metadata
│       └── download/route.ts     # GET - Download file
├── conversations/                 # Conversation CRUD
│   ├── route.ts                  # GET list, POST create
│   └── [id]/
│       ├── route.ts              # GET, PATCH, DELETE single
│       ├── title/route.ts        # POST - Auto-generate title
│       └── messages/
│           └── route.ts          # GET, POST, DELETE messages
├── mcp/                           # Personal MCP Connections
│   └── connections/
│       ├── route.ts              # GET list, POST create
│       └── [id]/
│           ├── route.ts          # GET, PATCH, DELETE
│           ├── discover/route.ts # POST - Discover tools
│           └── test/route.ts     # POST - Test connection
├── user/                          # User Settings
│   ├── settings/route.ts         # GET, PATCH user settings
│   ├── preferences/route.ts      # GET, PATCH user preferences (theme)
│   └── anthropic/
│       ├── route.ts              # GET, POST API key (org-scoped)
│       └── test/route.ts         # POST - Test API key
├── artifacts/                     # Artifacts
│   ├── route.ts                  # GET list, POST create
│   └── [id]/route.ts             # GET, PATCH, DELETE
├── messages/
│   └── feedback/route.ts         # POST - Message feedback
├── org/[slug]/                    # Organization-Scoped Routes
│   ├── models/route.ts           # GET - Permitted models for user
│   ├── theme/route.ts            # GET - Active org theme
│   ├── profile/route.ts          # GET, PATCH - User profile
│   ├── sessions/                 # User session management
│   │   ├── route.ts              # GET - List user sessions
│   │   └── [sessionId]/route.ts  # DELETE - Revoke session
│   ├── password-policy/route.ts  # GET - Read password policy
│   ├── usage-status/route.ts     # GET - User usage status
│   ├── onboarding/route.ts       # GET, POST - User onboarding
│   ├── user/
│   │   └── custom-instructions/route.ts # GET, PATCH - Custom instructions
│   ├── invitations/              # Org Admin: Invitations
│   │   ├── route.ts              # GET list, POST create
│   │   └── [id]/
│   │       ├── revoke/route.ts   # POST - Revoke invitation
│   │       └── resend/route.ts   # POST - Resend invitation
│   ├── settings/
│   │   └── default-role/route.ts # GET, PATCH - Default role
│   └── admin/                    # Org Admin Routes
│       ├── users/                # User management
│       │   ├── route.ts          # GET - List org members
│       │   └── [userId]/
│       │       ├── route.ts      # PATCH, DELETE - Manage user
│       │       ├── force-reset/route.ts  # POST - Force password reset
│       │       └── force-logout/route.ts # POST - Force logout
│       ├── roles/                # Role management
│       │   ├── route.ts          # GET list, POST create
│       │   └── [roleId]/
│       │       ├── route.ts      # PUT, DELETE - Manage role
│       │       ├── models/route.ts      # GET, PATCH - Role models
│       │       ├── settings/route.ts    # GET, PATCH - Role settings
│       │       └── instructions/route.ts # GET, PATCH - Role instructions
│       ├── instructions/route.ts # GET, PATCH - Org instructions
│       ├── models/route.ts       # GET - Active models (registry)
│       ├── analytics/route.ts    # GET - Org analytics
│       ├── audit-logs/
│       │   ├── route.ts          # GET - Paginated audit logs
│       │   └── export/route.ts   # GET - Export audit logs
│       ├── usage/
│       │   ├── route.ts          # GET - Org-wide usage
│       │   └── users/route.ts    # GET - Per-user usage
│       ├── mcp/connections/      # Org-managed MCP connections
│       │   ├── route.ts          # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts      # GET, PATCH, DELETE
│       │       ├── discover/route.ts # POST - Discover tools
│       │       └── test/route.ts     # POST - Test connection
│       ├── themes/route.ts       # GET, PUT - Org theme selection
│       ├── conversations/        # Conversation visibility
│       │   ├── route.ts          # GET - List conversations
│       │   ├── [id]/route.ts     # GET - Conversation detail
│       │   └── export/route.ts   # POST - Export conversations
│       ├── security/
│       │   ├── password-policy/route.ts # GET, PATCH - Password policy
│       │   └── force-reset/route.ts     # POST - Bulk force reset
│       ├── settings/
│       │   ├── api-keys/
│       │   │   ├── route.ts      # GET - View assigned API keys
│       │   │   └── [id]/test/route.ts # POST - Test API key
│       │   ├── visibility/route.ts    # GET, PATCH - Conversation visibility toggle
│       │   └── login-page/route.ts    # GET, PUT - Login page customization
│       ├── onboarding/route.ts   # GET, PUT - Onboarding config
│       └── logo/route.ts         # POST, DELETE - Org logo
├── super-admin/                   # Super Admin Routes
│   ├── organizations/
│   │   ├── route.ts              # GET list, POST create
│   │   └── [id]/
│   │       ├── route.ts          # GET, PATCH, DELETE
│   │       ├── suspend/route.ts  # POST - Suspend org
│   │       ├── activate/route.ts # POST - Activate org
│   │       ├── restore/route.ts  # POST - Restore deleted org
│   │       ├── logo/route.ts     # PATCH - Update org logo
│   │       └── themes/route.ts   # GET, PUT - Assign themes
│   ├── settings/route.ts         # GET, PATCH - Platform settings
│   ├── super-admins/
│   │   ├── route.ts              # GET list, POST create
│   │   └── [id]/route.ts         # GET, PATCH, DELETE
│   ├── models/
│   │   ├── route.ts              # GET list, POST create
│   │   └── [id]/route.ts         # GET, PATCH, DELETE
│   ├── role-templates/
│   │   ├── route.ts              # GET list
│   │   └── [id]/route.ts         # GET, PATCH, POST (reset)
│   ├── system-prompt/route.ts    # GET, PATCH - Platform prompt
│   ├── api-keys/
│   │   ├── route.ts              # GET list, POST create
│   │   └── [id]/
│   │       ├── route.ts          # GET, PATCH, DELETE
│   │       ├── reveal/route.ts   # GET - Reveal full key
│   │       └── test/route.ts     # POST - Test key validity
│   ├── audit-logs/
│   │   ├── route.ts              # GET - Paginated audit logs
│   │   └── export/route.ts       # GET - Export audit logs
│   ├── analytics/route.ts        # GET - Platform analytics
│   ├── users/
│   │   ├── route.ts              # GET - Search users cross-org
│   │   └── [id]/impersonate/route.ts # POST - Start impersonation
│   └── impersonation/route.ts    # GET status, DELETE end
└── cron/
    └── cleanup/route.ts          # GET - Scheduled cleanup tasks
```

## Authentication

### Auth Levels

| Level | Middleware | Description |
|-------|-----------|-------------|
| **Public** | None | No authentication required (find-org, validate-invitation, accept-invitation) |
| **Basic Auth** | `requireAuth()` | Session token required, no org context (me, preferences, change-password) |
| **Org Auth** | `requireOrgAuth()` | Session + org membership required, returns `tenantDb` for scoped queries |
| **Org Admin** | `requireOrgAdmin()` | Org auth + `org_admin` permission in role |
| **Super Admin** | `requireSuperAdmin()` | Session + `user.isSuperAdmin === true` |
| **Cron** | `CRON_SECRET` | Bearer token matching `CRON_SECRET` env var |

### How It Works

1. User logs in with org context -> Session created with `organizationId` (30-day expiry)
2. Token stored in `Session` table with userId, organizationId, userAgent, ipAddress
3. Frontend stores token in localStorage
4. All requests include `Authorization: Bearer <token>`
5. Backend validates token via appropriate middleware

### Multi-Tenant Data Scoping

Routes using `requireOrgAuth()` receive a `tenantDb` Prisma client that automatically filters all queries by the user's organization. This prevents cross-org data access at the database layer.

```typescript
const auth = await requireOrgAuth(req);
if (auth instanceof NextResponse) return auth;
const { user, orgMember, organization, role, permissions, tenantDb } = auth;
```

## API Endpoints

### Authentication (Public + Basic Auth)

#### POST /api/auth/register
**Disabled.** Returns 403. Registration is invite-only.
```typescript
// Response 403
{ error: "Registration is invite-only. Please use your invitation link." }
```

#### POST /api/auth/login
Authenticate user with org context. Resolves org from URL slug or body.slug.
```typescript
// Request
{ email: string, password: string, slug?: string }

// Response 200 (org user)
{ user: { id, email, name, avatarBase64, preferences }, token: string, expiresAt: string, organization?: { id, name, slug, logoBase64, logoDisplayMode } }

// Response 200 (force password change)
{ user: {...}, token, expiresAt, forcePasswordChange: true, reason: string }

// Response 200 (super admin)
{ user: {...}, token, expiresAt, isSuperAdmin: true }

// Errors: 400, 401 (invalid credentials), 403 (not org member)
```

#### POST /api/auth/logout
Invalidate session token. Requires Bearer token.
```typescript
// Response 200
{ success: true }
```

#### GET /api/auth/me
Get current user info with optional org context. Requires Bearer token.
```typescript
// Response 200
{ user: { id, email, name, avatarBase64, preferences, isSuperAdmin, createdAt }, organization?: { id, name, slug }, role?: { id, name, permissions } }
```

#### POST /api/auth/change-password
Change password for authenticated user. Validates against org password policy. Clears forcePasswordChange flag.
```typescript
// Request
{ currentPassword: string, newPassword: string }

// Response 200
{ message: "Password changed successfully" }

// Errors: 400 (validation, same password, policy violation)
```

#### POST /api/auth/find-org
**Public.** Email-first org finder. Constant-time response to prevent timing attacks.
```typescript
// Request
{ email: string }

// Response 200
{ type: "org", slug: "acme" }      // User found in active org
{ type: "super_admin" }             // User is Super Admin
{ type: "not_found" }               // Unknown email or inactive org
```

#### GET /api/auth/validate-invitation?token=xxx
**Public.** Validate an invitation token before showing registration form.
```typescript
// Response 200
{ valid: boolean, email?, orgName?, roleName?, error? }
```

#### POST /api/auth/accept-invitation
**Public.** Accept invitation and register new user account.
```typescript
// Request
{ token: string, name: string, password: string }

// Response 201
{ user: { id, email, name }, token: string, expiresAt: string, organization: { id, name, slug } }

// Errors: 400 (invalid/expired token, policy violation), 409 (email exists)
```

#### POST /api/auth/password-reset
Request password reset. Always returns success to prevent email enumeration.
```typescript
// Request
{ email: string }

// Response 200
{ message: "If an account exists..." }
```

#### POST /api/auth/password-reset/confirm
Confirm password reset with token. Invalidates all existing sessions.
```typescript
// Request
{ token: string, newPassword: string }

// Response 200
{ message: "Password has been reset successfully..." }

// Errors: 400 (invalid/expired token)
```

### Chat (Org Auth)

#### POST /api/chat
Stream AI response. Uses `requireOrgAuth`. Validates model access against role's `allowedModels`. Checks usage limits before processing. Supports adaptive thinking (4.6 models) and extended thinking (4.5 models). Uses `maxTokens: 65536` and `maxDuration: 300`.
```typescript
// Request
{
  messages: Array<{ role: 'user' | 'assistant', content: string | object[] }>,
  model: string,
  conversationId?: string,
  webSearch?: boolean,
  enableReasoning?: boolean,
  activeMcpIds?: string[]
}

// Response: Server-Sent Events (streaming)
// Content-Type: text/event-stream
```

### Conversations (Org Auth)

All endpoints use `requireOrgAuth` with `tenantDb` for org-scoped queries.

#### GET /api/conversations
List all conversations for user in current org. Ordered by pinned first, then updatedAt desc.
```typescript
// Response 200
[{ id, title, isPinned, isShared, model, createdAt, updatedAt, lastMessage }]
```

#### POST /api/conversations
Create new conversation.
```typescript
// Request
{ title?: string, model?: string }

// Response 201
{ id, title, isPinned, isShared, model, createdAt, updatedAt }
```

#### GET /api/conversations/[id]
Get single conversation with messages. Verifies ownership.
```typescript
// Response 200
{ id, title, isPinned, isShared, model, createdAt, updatedAt, messages: [...] }
```

#### PATCH /api/conversations/[id]
Update conversation metadata. Ownership-only (Org Admins cannot edit others').
```typescript
// Request (all optional)
{ title?, isPinned?, isShared?, model? }
```

#### DELETE /api/conversations/[id]
Delete conversation. Cascades to messages and artifacts. Ownership-only.

#### POST /api/conversations/[id]/title
Auto-generate title using Claude Haiku based on first user/assistant messages.
```typescript
// Response 200
{ title: string, conversationId: string }
```

#### GET /api/conversations/[id]/messages
List messages in conversation. Ordered by createdAt asc. Verifies ownership.

#### POST /api/conversations/[id]/messages
Add message to conversation. Verifies ownership.
```typescript
// Request
{ role: 'user' | 'assistant' | 'tool', content: string, parts?: any[] }
```

#### DELETE /api/conversations/[id]/messages
Clear all messages in conversation. Verifies ownership.

### MCP Connections (Org Auth - Personal)

Personal MCP connections owned by individual users.

#### GET /api/mcp/connections
List all personal MCP connections for user.

#### POST /api/mcp/connections
Create new personal MCP connection.
```typescript
// Request
{ name: string, serverUrl: string, authType: 'none' | 'api_key' | 'oauth', apiKey?: string, oauthClientId?: string, oauthClientSecret?: string }

// Response 201
{ id, name, serverUrl, authType, status, isActive }
```

#### GET /api/mcp/connections/[id]
Get single connection. Verifies ownership.

#### PATCH /api/mcp/connections/[id]
Update connection. Allowed fields: name, serverUrl, status, isActive, lastError, availableTools, lastConnectedAt.

#### DELETE /api/mcp/connections/[id]
Delete connection. Verifies ownership.

#### POST /api/mcp/connections/[id]/discover
Discover available tools on MCP server via JSON-RPC `tools/list`.

#### POST /api/mcp/connections/[id]/test
Test connection via JSON-RPC `initialize`. Auto-discovers tools on success. Stores session ID.

### User Settings

#### GET /api/user/settings (Org Auth)
Get user name, avatar, and preferences.

#### PATCH /api/user/settings (Org Auth)
Update user name, avatar (Base64), and preferences.

#### GET /api/user/preferences (Basic Auth)
Get user preferences (theme mode). Works without org context.

#### PATCH /api/user/preferences (Basic Auth)
Update user preferences (themeMode: 'light' | 'dark' | 'system').

#### GET /api/user/anthropic (Org Auth)
Get org's Anthropic API key status (masked).
```typescript
// Response 200
{ hasApiKey: boolean, maskedKey: string }
```

#### POST /api/user/anthropic (Org Auth)
Save org's Anthropic API key (encrypted). Must start with "sk-ant-".

#### POST /api/user/anthropic/test (Org Auth)
Test Anthropic API key with lightweight Claude Haiku call.

### Files (Org Auth)

#### GET /api/files/[fileId]
Get file metadata from Anthropic Files API.
```typescript
// Response 200
{ id, filename, mime_type, size_bytes }
```

#### GET /api/files/[fileId]/download
Download file content from Anthropic Files API. Returns binary with appropriate Content-Type.

### Artifacts (Org Auth)

#### GET /api/artifacts?conversationId=xxx
List artifacts for a conversation. Returns metadata without full content.

#### POST /api/artifacts
Create new artifact.
```typescript
// Request
{ conversationId: string, messageId: string, type?: 'html' | 'code', title: string, content: string }

// Response 201
{ id, conversationId, messageId, type, title, createdAt, updatedAt }
```

#### GET /api/artifacts/[id]
Get single artifact with full content. Verifies ownership.

#### PATCH /api/artifacts/[id]
Update artifact title and/or content.

#### DELETE /api/artifacts/[id]
Delete artifact. Verifies ownership.

### Message Feedback (Org Auth)

#### POST /api/messages/feedback
Record user feedback on a message. Stores in message metadata.
```typescript
// Request
{ messageId: string, feedback: 'positive' | 'negative', comment?: string }

// Response 200
{ success: true, messageId, feedback }
```

### Organization User Routes (Org Auth)

#### GET /api/org/[slug]/models
Get models permitted for current user's role, from the Model Registry.
```typescript
// Response 200
{ models: [{ id, name, generationGroup, supportsThinking, thinkingType, ... }], defaultModel: string | null, isOrgAdmin: boolean }
```

#### GET /api/org/[slug]/theme
Get active theme for the organization. Returns `null` for platform default.

#### GET /api/org/[slug]/profile
Get current user's profile with org context (name, email, avatar, role, joinedAt).

#### PATCH /api/org/[slug]/profile
Update display name and/or avatar. Email and role are read-only. Avatar max 200KB Base64.

#### GET /api/org/[slug]/sessions
List all active sessions for current user with parsed user agent info.

#### DELETE /api/org/[slug]/sessions/[sessionId]
Revoke a specific session. Cannot revoke the current session.

#### GET /api/org/[slug]/password-policy
Read the org's password policy (accessible by any org member).

#### GET /api/org/[slug]/usage-status
Get current user's rolling 24h usage status with warning/blocked flags. Lightweight for polling.
```typescript
// Response 200
{ requestStatus: { current, limit, percentage } | null, tokenStatus: { ... } | null, resetAt, warning: boolean, blocked: boolean }
```

#### GET /api/org/[slug]/onboarding
Check if onboarding is required for current user. Returns text and version.

#### POST /api/org/[slug]/onboarding
Record onboarding acceptance.

#### GET /api/org/[slug]/user/custom-instructions
Get user's custom instructions with enabled status and max token limit.

#### PATCH /api/org/[slug]/user/custom-instructions
Update user's custom instructions. Respects role-level `customInstructionsEnabled` flag and token budget.

### Organization Admin Routes (Org Admin)

All routes under `/api/org/[slug]/admin/` and `/api/org/[slug]/invitations/` require Org Admin authentication via `requireOrgAdmin`.

#### Invitations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/org/[slug]/invitations` | List all invitations for org |
| POST | `/api/org/[slug]/invitations` | Create new invitation (email, roleId) |
| POST | `/api/org/[slug]/invitations/[id]/revoke` | Revoke pending invitation |
| POST | `/api/org/[slug]/invitations/[id]/resend` | Resend invitation with new token |

#### User Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `.../admin/users` | List org members with search, role, status filters |
| PATCH | `.../admin/users/[userId]` | Update user (action: suspend, activate, changeRole, promote, updateName) |
| DELETE | `.../admin/users/[userId]` | Remove user from organization |
| POST | `.../admin/users/[userId]/force-reset` | Force user to change password on next login |
| POST | `.../admin/users/[userId]/force-logout` | Force logout user from all org sessions |

#### Role Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `.../admin/roles` | List all roles with member counts |
| POST | `.../admin/roles` | Create custom role |
| PUT | `.../admin/roles/[roleId]` | Update role (name, models, limits, etc.) |
| DELETE | `.../admin/roles/[roleId]` | Delete custom role (blocked if has members) |
| GET | `.../admin/roles/[roleId]/models` | Get role's allowed models |
| PATCH | `.../admin/roles/[roleId]/models` | Update role's allowed models (min 1) |
| GET | `.../admin/roles/[roleId]/settings` | Get role settings (custom instructions, MCP) |
| PATCH | `.../admin/roles/[roleId]/settings` | Update role settings |
| GET | `.../admin/roles/[roleId]/instructions` | Get role system instructions |
| PATCH | `.../admin/roles/[roleId]/instructions` | Update role system instructions |

#### Instructions & Models

| Method | Path | Description |
|--------|------|-------------|
| GET | `.../admin/instructions` | Get org-wide system instructions |
| PATCH | `.../admin/instructions` | Update org-wide system instructions |
| GET | `.../admin/models` | List all active models from Model Registry |

#### Org-Managed MCP Connections

| Method | Path | Description |
|--------|------|-------------|
| GET | `.../admin/mcp/connections` | List org-managed connections (userId=null) |
| POST | `.../admin/mcp/connections` | Create org-managed connection (org-wide or role-specific) |
| GET | `.../admin/mcp/connections/[id]` | Get connection details |
| PATCH | `.../admin/mcp/connections/[id]` | Update connection |
| DELETE | `.../admin/mcp/connections/[id]` | Delete connection (204) |
| POST | `.../admin/mcp/connections/[id]/discover` | Discover tools |
| POST | `.../admin/mcp/connections/[id]/test` | Test connection |

#### Analytics & Audit

| Method | Path | Description |
|--------|------|-------------|
| GET | `.../admin/analytics?section=...` | Org analytics (kpi, trends, users, models, roles, usage, mcp, errors, peak, invitations, apiKeys, all). Supports CSV export. |
| GET | `.../admin/audit-logs` | Paginated audit logs. `?meta=true` for filter options. |
| GET | `.../admin/audit-logs/export?format=csv\|json` | Export audit logs (max 10,000 rows) |

#### Usage Monitoring

| Method | Path | Description |
|--------|------|-------------|
| GET | `.../admin/usage` | Org-wide usage (24h/7d/30d totals, per-model, daily trend) |
| GET | `.../admin/usage/users` | Per-user usage with status (normal/warning/blocked/inactive) |

#### Security

| Method | Path | Description |
|--------|------|-------------|
| GET | `.../admin/security/password-policy` | Get current password policy |
| PATCH | `.../admin/security/password-policy` | Update password policy (minLength, requireUppercase, etc.) |
| POST | `.../admin/security/force-reset` | Bulk force all users (except self) to change password |

#### Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `.../settings/default-role` | Get default role for new invitations |
| PATCH | `.../settings/default-role` | Set or clear default role |
| GET | `.../admin/settings/api-keys` | View assigned API keys (read-only, masked) |
| POST | `.../admin/settings/api-keys/[id]/test` | Test assigned API key |
| GET | `.../admin/settings/visibility` | Get conversation visibility toggle |
| PATCH | `.../admin/settings/visibility` | Toggle conversation visibility on/off |
| GET | `.../admin/settings/login-page` | Get login page tagline & welcome message |
| PUT | `.../admin/settings/login-page` | Update login page customization |

#### Conversations (Compliance Viewing)

Requires `conversationVisibility` to be enabled in OrgSettings.

| Method | Path | Description |
|--------|------|-------------|
| GET | `.../admin/conversations` | List conversations (paginated, filtered). `?meta=true` for filter options. |
| GET | `.../admin/conversations/[id]` | Get conversation detail with messages (read-only) |
| POST | `.../admin/conversations/export` | Export conversations as JSON/ZIP |

#### Theming & Branding

| Method | Path | Description |
|--------|------|-------------|
| GET | `.../admin/themes` | Get assigned themes + current active theme |
| PUT | `.../admin/themes` | Set active theme (must be in assigned set) |
| POST | `.../admin/logo` | Upload org logo (multipart, max 500KB, PNG/SVG/JPEG) |
| DELETE | `.../admin/logo` | Remove org logo |

#### Onboarding

| Method | Path | Description |
|--------|------|-------------|
| GET | `.../admin/onboarding` | Get onboarding config (text + version) |
| PUT | `.../admin/onboarding` | Update onboarding text (bumps version) |

### Super Admin Routes

All routes under `/api/super-admin/` require Super Admin authentication via `requireSuperAdmin`.

#### Organizations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super-admin/organizations` | List all organizations with stats |
| POST | `/api/super-admin/organizations` | Create new organization |
| GET | `/api/super-admin/organizations/[id]` | Get organization details |
| PATCH | `/api/super-admin/organizations/[id]` | Update organization |
| DELETE | `/api/super-admin/organizations/[id]` | Soft-delete organization |
| POST | `.../[id]/suspend` | Suspend organization (invalidates all sessions) |
| POST | `.../[id]/activate` | Activate suspended organization |
| POST | `.../[id]/restore` | Restore soft-deleted org (within 30-day grace) |
| PATCH | `.../[id]/logo` | Update organization logo (Base64) |
| GET | `.../[id]/themes` | Get assigned themes for org |
| PUT | `.../[id]/themes` | Set assigned themes and default for org |

#### Super Admins

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super-admin/super-admins` | List all Super Admin users |
| POST | `/api/super-admin/super-admins` | Create new Super Admin |
| GET | `/api/super-admin/super-admins/[id]` | Get Super Admin details |
| PATCH | `/api/super-admin/super-admins/[id]` | Update Super Admin |
| DELETE | `/api/super-admin/super-admins/[id]` | Delete Super Admin |

#### Platform Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super-admin/settings` | Get platform settings |
| PATCH | `/api/super-admin/settings` | Update platform settings |

#### Model Registry

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super-admin/models` | List all models (optional ?status filter) |
| POST | `/api/super-admin/models` | Create new model |
| GET | `/api/super-admin/models/[id]` | Get model by UUID |
| PATCH | `/api/super-admin/models/[id]` | Update model (deprecation, pricing) |
| DELETE | `/api/super-admin/models/[id]` | Delete model (fails if referenced) |

#### Role Templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super-admin/role-templates` | List all system role templates |
| GET | `/api/super-admin/role-templates/[id]` | Get template by name |
| PATCH | `/api/super-admin/role-templates/[id]` | Update template (store override) |
| POST | `/api/super-admin/role-templates/[id]` | Reset template to defaults |

#### System Prompt

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super-admin/system-prompt` | Get platform system prompt (Layer 1) |
| PATCH | `/api/super-admin/system-prompt` | Update platform system prompt |

#### API Keys

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super-admin/api-keys` | List all platform API keys (masked) |
| POST | `/api/super-admin/api-keys` | Create new API key |
| GET | `/api/super-admin/api-keys/[id]` | Get key with assignments |
| PATCH | `/api/super-admin/api-keys/[id]` | Update org assignments |
| DELETE | `/api/super-admin/api-keys/[id]` | Delete key and all assignments |
| GET | `/api/super-admin/api-keys/[id]/reveal` | Reveal full decrypted key (audit-logged) |
| POST | `/api/super-admin/api-keys/[id]/test` | Test key validity |

#### Audit Logs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super-admin/audit-logs` | Paginated audit logs. `?meta=true` for filter options. |
| GET | `/api/super-admin/audit-logs/export?format=csv\|json` | Export audit logs (max 10,000 rows) |

#### Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super-admin/analytics?section=...` | Platform analytics (kpi, trends, topOrgs, errors, peakHours, apiKeys, mcp, registrations, adoption, all) |

#### User Management & Impersonation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super-admin/users?search=...` | Search users across all orgs |
| POST | `/api/super-admin/users/[id]/impersonate` | Start impersonation (duration: 15/30/60 min, reason required) |
| GET | `/api/super-admin/impersonation` | Check impersonation status |
| DELETE | `/api/super-admin/impersonation` | End impersonation session |

### Cron Routes

#### GET /api/cron/cleanup
Run scheduled cleanup tasks (purge soft-deleted orgs, expired invitations, expired sessions). Authenticated via `CRON_SECRET` Bearer token, not session-based.
```typescript
// Response 200
{ purgedOrgs: { count }, expiredInvitations: { count }, expiredSessions: { count } }
```

## Security Checklist

- [x] All routes require appropriate authentication level
- [x] Multi-tenant data isolation via `tenantDb` (org-scoped Prisma client)
- [x] Passwords hashed with scrypt (timing-safe comparison)
- [x] API keys/MCP credentials encrypted with AES-256-GCM
- [x] Session tokens are cryptographically random
- [x] Input validation with Zod schemas
- [x] Cascade deletes for referential integrity
- [x] Ownership verification on CRUD operations
- [x] Audit logging for admin actions
- [x] Constant-time response for email enumeration prevention
- [x] Conversation visibility requires explicit opt-in
- [x] Impersonation requires reason and has time limits
- [ ] Rate limiting (TODO)
- [ ] CORS configuration (TODO)
- [ ] CSP headers (TODO)

## External Resources

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Anthropic API](https://docs.anthropic.com/en/docs)
- [Prisma](https://www.prisma.io/docs)
- [Zod](https://zod.dev)
