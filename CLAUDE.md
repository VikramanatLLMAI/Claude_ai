# Athena MCP - AI Chat Application

## Quick Reference

| Item | Value |
|------|-------|
| **Framework** | Next.js 16.1.4 + React 19.2.3 |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL + Prisma 7.3.0 |
| **AI Provider** | AWS Bedrock (Claude 4.5 Sonnet/Haiku/Opus, Claude 4 Sonnet) |
| **Styling** | TailwindCSS v4 + Radix UI |
| **Node Version** | 20+ |

## Project Overview

Athena MCP is a full-stack AI chat application featuring Claude models powered by AWS Bedrock. It provides specialized solution-specific AI agents for different business domains (Manufacturing, Maintenance, Support, Change Management, Impact Analysis, Requirements).

## Project Structure

```
athena_mcp/
├── app/                          # Next.js App Router
│   ├── api/                     # Backend API routes (see app/api/CLAUDE.md)
│   │   ├── auth/               # Authentication endpoints
│   │   ├── chat/               # AI chat endpoints (general + solution-specific)
│   │   ├── conversations/      # Conversation CRUD
│   │   ├── mcp/                # MCP connection management
│   │   ├── user/               # User settings & AWS credentials
│   │   ├── artifacts/          # Artifact management
│   │   └── messages/           # Message feedback
│   ├── chat/page.tsx           # Chat application page
│   ├── solutions/page.tsx      # Solutions showcase page
│   ├── settings/page.tsx       # User settings page
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Login page (entry point)
│   └── globals.css             # Global styles & theme variables
├── components/                  # React components (see components/CLAUDE.md)
│   ├── full-chat-app.tsx       # Main chat interface (86KB)
│   ├── login-page.tsx          # Authentication UI
│   ├── prompt-kit/             # 17 custom chat UI components
│   └── ui/                     # 16 Radix UI wrapper components
├── hooks/                      # Custom React hooks
│   ├── use-keyboard-shortcuts.tsx
│   ├── use-mobile.tsx
│   └── use-smooth-streaming.ts
├── lib/                        # Core utilities & business logic
│   ├── db.ts                  # Prisma client singleton
│   ├── storage.ts             # Database CRUD operations
│   ├── encryption.ts          # AES-256-GCM encryption
│   ├── auth-middleware.ts     # Session validation
│   ├── validation.ts          # Zod schemas
│   ├── bedrock.ts             # AWS Bedrock client
│   ├── system-prompts.ts      # Solution-specific AI prompts
│   ├── artifacts.ts           # Artifact parsing
│   ├── mcp-client.ts          # MCP tool execution
│   ├── code-executor.ts       # Math & web search tools
│   ├── api-utils.ts           # HTTP, retry, error handling
│   ├── performance.ts         # Debounce, throttle utilities
│   ├── accessibility.ts       # A11y helpers
│   └── utils.ts               # className merge utility (cn)
├── prisma/                     # Database layer
│   ├── schema.prisma          # PostgreSQL schema (7 models)
│   └── migrations/            # Database migrations
├── .claude/                    # Claude Code configuration
│   ├── agents/                # Custom agent definitions
│   └── settings.local.json    # Local settings
└── Configuration files         # package.json, tsconfig.json, etc.
```

## Database Schema

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | Authentication & settings | email, passwordHash, awsCredentials (encrypted), preferences |
| **Session** | Session management | token, expiresAt (30-day) |
| **Conversation** | Chat sessions | title, model, solutionType, isPinned, isShared |
| **Message** | Chat messages | role (user/assistant/tool), content, parts, metadata |
| **Artifact** | Generated visualizations | type (html/code), title, content |
| **McpConnection** | MCP server connections | serverUrl, authType, availableTools |
| **PasswordResetToken** | Password recovery | token, expiresAt |

## Key Features

### Authentication
- Scrypt password hashing with timing-safe comparison
- 30-day session tokens stored in PostgreSQL
- Bearer token authentication for all API routes
- AES-256-GCM encryption for AWS/MCP credentials

### AI Chat
- Real-time streaming via Vercel AI SDK `useChat` hook
- 4 Claude models: Sonnet 4.5, Haiku 4.5, Opus 4.5, Sonnet 4
- Extended thinking/reasoning support
- MCP tool integration
- Web search tool (placeholder)
- Artifact generation (HTML/code)

### Solution-Specific Agents

| Solution | Endpoint | Domain |
|----------|----------|--------|
| Manufacturing | `/api/chat/manufacturing` | Production, yield, OEE, forecasting |
| Maintenance | `/api/chat/maintenance` | MTBF/MTTR, failure prediction, SPC |
| Support | `/api/chat/support` | Tickets, RCA, knowledge base |
| Change Management | `/api/chat/change-management` | ECO workflow, impact tracking |
| Impact Analysis | `/api/chat/impact-analysis` | Operational insights, ROI |
| Requirements | `/api/chat/requirements` | Validation, gap detection |
| General | `/api/chat` | No domain context |

## Environment Variables

```env
# AWS Bedrock
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-west-2

# PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/athena_mcp"

# Encryption (64 hex chars = 32 bytes for AES-256)
KEY_ENCRYPTION_SECRET="your_64_hex_character_key"
```

## Getting Started

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

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
npm run db:migrate   # Run migrations
npm run db:push      # Push schema directly
npm run db:studio    # Prisma Studio GUI
npm run db:reset     # Reset database (WARNING: deletes data)
```

## Claude Models

| Model | ID | Best For |
|-------|-----|----------|
| Claude 4.5 Sonnet | us.anthropic.claude-sonnet-4-5-20250929-v1:0 | Complex tasks |
| Claude 4.5 Haiku | us.anthropic.claude-haiku-4-5-20251001-v1:0 | Fast, simple tasks |
| Claude 4.5 Opus | us.anthropic.claude-opus-4-5-20251101-v1:0 | Complex reasoning |
| Claude 4 Sonnet | us.anthropic.claude-sonnet-4-20250514-v1:0 | Balanced performance |

## Architecture

### Data Flow
1. User authenticates → Session token in localStorage
2. Frontend uses `useChat` hook → Calls solution-specific `/api/chat/{solution}`
3. Backend validates session → Adds system prompt → Streams from Bedrock
4. Messages saved to PostgreSQL → Artifacts extracted and stored
5. Frontend displays streaming response with markdown/code highlighting

### Security
- All API routes require Bearer token authentication
- Passwords hashed with scrypt (salt + derived key)
- AWS/MCP credentials encrypted with AES-256-GCM
- Session tokens are cryptographically random (32+ bytes)
- Cascade deletes maintain referential integrity

## File References

### Key Files
| File | Purpose |
|------|---------|
| `components/full-chat-app.tsx` | Main chat UI (86KB) |
| `app/api/chat/route.ts` | General chat endpoint |
| `lib/storage.ts` | All database CRUD operations |
| `lib/auth-middleware.ts` | Authentication utilities |
| `lib/system-prompts.ts` | Solution-specific AI prompts |
| `prisma/schema.prisma` | Database schema |
| `app/globals.css` | Theme variables & styles |

### Documentation
| File | Content |
|------|---------|
| `CLAUDE.md` | Project overview (this file) |
| `components/CLAUDE.md` | Frontend documentation |
| `app/api/CLAUDE.md` | Backend API documentation |
| `DEPLOYMENT.md` | AWS deployment guide |

## Contributing

1. Use TypeScript for all new files
2. Run `npm run lint` before committing
3. Follow existing patterns in each layer
4. Test solution-specific endpoints thoroughly
5. Update documentation when adding features

## External Documentation

- [Next.js](https://nextjs.org/docs) | [Vercel AI SDK](https://sdk.vercel.ai/docs) | [AWS Bedrock](https://docs.aws.amazon.com/bedrock)
- [Prisma](https://www.prisma.io/docs) | [Radix UI](https://www.radix-ui.com/primitives) | [TailwindCSS](https://tailwindcss.com/docs)
