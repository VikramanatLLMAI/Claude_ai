# External Integrations

**Analysis Date:** 2026-02-26

## APIs & External Services

**Anthropic API:**
- Claude AI models (4.6 Opus, 4.6 Sonnet, 4.5 Sonnet, 4.5 Haiku, 4.5 Opus, 4 Opus, 4 Sonnet)
  - SDK/Client: `@ai-sdk/anthropic` (Vercel SDK) + `@anthropic-ai/sdk` (native SDK)
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Endpoint: POST `/api/chat` streams responses from Anthropic API
  - Features: Adaptive thinking (4.6 models), extended thinking (4.5 models), web search/fetch tools, code execution, container skills

**Anthropic Files API:**
- Upload and manage files for chat context
  - SDK: `@anthropic-ai/sdk`
  - Implementation: `lib/anthropic-files.ts`
  - Used by: `app/api/files/[fileId]/route.ts`, `app/api/files/[fileId]/download/route.ts`
  - Capabilities: File metadata retrieval, binary file downloads

**Model Context Protocol (MCP):**
- External tool servers providing custom capabilities
  - Implementation: `lib/mcp-client.ts`
  - Protocol: JSON-RPC 2.0 over HTTP
  - Auth types: none, api_key, oauth
  - Credentials encryption: AES-256-GCM
  - Endpoints: POST `/api/mcp/connections/[id]/discover`, `/api/mcp/connections/[id]/test`
  - Timeout: 30 seconds per request (configurable via MCP_TIMEOUT_MS)
  - Tool execution: Integrated into chat stream via `/api/chat`

## Data Storage

**Databases:**
- PostgreSQL 12+ (primary database)
  - Connection: `DATABASE_URL` environment variable
  - Client: `@prisma/client` with `@prisma/adapter-pg`
  - Connection pooling: Native `pg` Pool with 10 default connections
  - SSL: Disabled for local development and AWS RDS POC
  - Schema: 7 models (User, Session, Conversation, Message, Artifact, McpConnection, PasswordResetToken)
  - Hosted: AWS RDS (db.t4g.micro) in us-west-2 for production

**File Storage:**
- Anthropic Files API (for chat-related files, encrypted transmission)
- Local filesystem only (no S3 or other cloud storage)
- File uploads processed through `/api/files/` endpoints

**Caching:**
- None (application-level caching not detected)
- Session data: PostgreSQL `Session` table with 30-day expiry
- User preferences: Stored in `User.preferences` (JSON)

## Authentication & Identity

**Auth Provider:**
- Custom implementation (no OAuth provider like Auth0)
  - Implementation: `lib/auth-middleware.ts`
  - Password hashing: Scrypt with salt (Node.js crypto module)
  - Password verification: Timing-safe comparison
  - Session tokens: Cryptographically random (32+ bytes), stored in PostgreSQL

**Session Management:**
- 30-day session tokens
- Stored in `Session` table (token, userId, expiresAt)
- Token-based Bearer authentication on all protected routes
- Frontend storage: localStorage (`llmatscale_auth_token`)

**Password Reset:**
- PasswordResetToken table with expiring tokens
- Endpoints: POST `/api/auth/password-reset`, POST `/api/auth/password-reset/confirm`

**API Key Storage:**
- User's Anthropic API key encrypted with AES-256-GCM
  - Stored in `User.anthropicApiKeyEncrypted`
  - Decryption key: `KEY_ENCRYPTION_SECRET` environment variable (64-char hex = 32 bytes)
  - Implementation: `lib/encryption.ts`

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, DataDog, or similar service)
- Error handling: try-catch blocks with logging to console

**Logs:**
- Console logging via `console.error()`, `console.log()`
- Structured logging not implemented
- No centralized log aggregation detected

**Performance Monitoring:**
- Not detected (no Performance API integration)

## CI/CD & Deployment

**Hosting:**
- AWS (inferred from AWS RDS usage)
- Dockerfile present (`Dockerfile`) with multi-stage build
- Deployment: Likely AWS ECS, AppRunner, or similar container service

**CI Pipeline:**
- `buildspec.yml` present (AWS CodeBuild configuration)
- Build steps: Install dependencies, run Prisma generate, Next.js build, start server
- Not detected: GitHub Actions, GitLab CI, Jenkins

## Environment Configuration

**Required env vars:**
```env
ANTHROPIC_API_KEY              # Anthropic API key (sk-ant-...)
DATABASE_URL                   # PostgreSQL connection string
KEY_ENCRYPTION_SECRET          # 64-char hex encryption key (32 bytes)
ENABLE_MCP                     # Optional: Enable/disable MCP tools (default: true)
MCP_TIMEOUT_MS                 # Optional: MCP timeout in ms (default: 10000)
NODE_ENV                       # Optional: 'production' or 'development'
```

**Secrets location:**
- `.env` file (local development only, listed in `.gitignore`)
- AWS Secrets Manager or similar (production, inferred)
- Environment variables passed to Docker container at runtime

## Webhooks & Callbacks

**Incoming:**
- Not detected (no webhook endpoints for external services)

**Outgoing:**
- MCP tool results returned via SSE stream in chat response
- No external webhooks to third-party services detected

## API Response Streaming

**Chat Streaming:**
- Server-Sent Events (SSE) via `/api/chat` POST endpoint
- Content-Type: `text/event-stream`
- Response type: Streamed UI messages with formatting
- Max duration: 300 seconds (5 minutes)
- Max output tokens: 65536 per request

**Format:**
```
data: {"type": "text", "text": "..."}
data: {"type": "reasoning", "reasoning": "..."}
data: {"type": "tool_call", "tool": "...", "result": "..."}
data: {"type": "data-fileDownload", ...}
data: {"type": "done"}
```

## Key Integration Files

| File | Purpose |
|------|---------|
| `lib/anthropic.ts` | Anthropic SDK clients (Vercel AI SDK + native SDK) |
| `lib/anthropic-files.ts` | Anthropic Files API integration |
| `lib/mcp-client.ts` | MCP server connection and tool execution |
| `lib/encryption.ts` | AES-256-GCM encryption for credentials, scrypt for passwords |
| `lib/auth-middleware.ts` | Session validation, Bearer token verification |
| `lib/db.ts` | PostgreSQL connection pool via Prisma |
| `app/api/chat/route.ts` | Main chat endpoint with AI streaming |
| `app/api/auth/` | Authentication endpoints (login, register, etc.) |
| `app/api/mcp/connections/` | MCP connection management |
| `app/api/files/` | Anthropic Files API proxy endpoints |
| `prisma/schema.prisma` | Database schema definition |

---

*Integration audit: 2026-02-26*
