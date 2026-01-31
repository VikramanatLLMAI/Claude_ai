# Athena MCP - AI Chat Application

## Project Overview

Athena MCP is a modern, full-stack AI chat application built with Next.js 16, featuring Claude AI models (4.5 Sonnet, Haiku, Opus, and 4 Sonnet) powered by AWS Bedrock. The application provides a polished chat interface with conversation management, message persistence, real-time AI streaming responses, and specialized solution-specific AI agents for different business domains.

## Tech Stack

### Core Framework
- **Next.js 16.1.4** - React framework with App Router
- **React 19.2.3** - UI library
- **TypeScript 5** - Type safety
- **Node.js 20+** - Runtime environment

### Frontend Technologies
- **TailwindCSS v4** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives (Avatar, Dialog, Dropdown Menu, Scroll Area, Separator, Tooltip)
- **Lucide React v0.473.0** - Icon library
- **Class Variance Authority v0.7.1** - Component variant management
- **clsx v2.1.1 & tailwind-merge v2.6.0** - Conditional className utilities
- **react-markdown v10.1.0 & remark-gfm v4.0.1** - Markdown rendering

### Backend Technologies
- **Vercel AI SDK v6.0.62** - AI/LLM integration and streaming
- **AWS Bedrock (@ai-sdk/amazon-bedrock v4.0.41)** - Claude model provider
- **Prisma v7.3.0** - ORM for database operations with PostgreSQL adapter
- **PostgreSQL** - Local PostgreSQL database with @prisma/adapter-pg
- **Zod v4.3.6** - Schema validation
- **AES-256-GCM** - Encryption for sensitive credentials

### Development Tools
- **ESLint v9** - Code linting with Next.js rules
- **PostCSS** - CSS processing with TailwindCSS plugin
- **Prisma CLI** - Database migrations and schema management

## Project Structure

```
athena_mcp/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with fonts
│   ├── page.tsx                 # Login page (entry point)
│   ├── globals.css              # Global styles & theme variables
│   ├── api/                     # Backend API routes
│   │   ├── chat/
│   │   │   ├── route.ts                  # General AI chat endpoint
│   │   │   ├── manufacturing/route.ts    # Manufacturing-specific chat
│   │   │   ├── maintenance/route.ts      # Maintenance-specific chat
│   │   │   ├── support/route.ts          # Support-specific chat
│   │   │   ├── change-management/route.ts # Change management chat
│   │   │   ├── impact-analysis/route.ts  # Impact analysis chat
│   │   │   └── requirements/route.ts     # Requirements chat
│   │   └── conversations/
│   │       ├── route.ts        # List/create conversations
│   │       └── [id]/
│   │           ├── route.ts    # Get/update/delete conversation
│   │           └── messages/
│   │               └── route.ts # Manage messages
│   ├── chat/
│   │   └── page.tsx            # Chat application page
│   └── solutions/
│       └── page.tsx            # Solutions showcase page
├── components/                  # React components
│   ├── login-page.tsx          # Authentication UI
│   ├── full-chat-app.tsx       # Main chat interface
│   ├── prompt-kit/             # Custom chat UI components
│   │   ├── chat-container.tsx
│   │   ├── message.tsx
│   │   ├── prompt-input.tsx
│   │   ├── scroll-button.tsx
│   │   ├── code-block.tsx
│   │   └── markdown.tsx
│   └── ui/                     # Radix UI wrapper components
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       ├── input.tsx
│       ├── dropdown-menu.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       └── tooltip.tsx
├── hooks/                      # Custom React hooks
│   └── use-mobile.tsx         # Mobile viewport detection
├── lib/                        # Utilities & shared code
│   ├── db.ts                  # Prisma client singleton with PostgreSQL adapter
│   ├── storage.ts             # Database CRUD operations
│   ├── encryption.ts          # AES-256-GCM encryption utilities
│   ├── bedrock.ts             # AWS Bedrock client
│   ├── artifacts.ts           # Artifact parsing and prompts
│   ├── generated/prisma/      # Generated Prisma client
│   └── utils.ts               # Utility functions (cn)
├── prisma/                     # Database layer
│   ├── schema.prisma          # PostgreSQL database schema
│   └── migrations/            # Database migrations
├── ref_docs/                   # Reference documentation
│   └── prompt-kit-docs/       # Prompt Kit component examples
├── public/                     # Static assets
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
├── next.config.ts             # Next.js configuration
├── prisma.config.ts           # Prisma configuration
├── postcss.config.mjs         # PostCSS configuration
└── eslint.config.mjs          # ESLint configuration
```

## Database Schema (PostgreSQL)

### User Model
- `id` (UUID) - Primary key
- `email` (String, unique) - User email
- `passwordHash` (String) - Scrypt hashed password
- `name` (String, nullable) - Display name
- `avatarUrl` (String, nullable) - Profile picture URL
- `awsAccessKeyEncrypted` (String, nullable) - AES-256-GCM encrypted AWS access key
- `awsSecretKeyEncrypted` (String, nullable) - AES-256-GCM encrypted AWS secret key
- `awsRegion` (String) - AWS region (default: us-east-1)
- `preferences` (JSON) - User preferences (theme, fontSize, etc.)
- `createdAt` (DateTime) - Creation timestamp
- `lastLogin` (DateTime, nullable) - Last login timestamp
- `emailVerified` (Boolean) - Email verification status

### Session Model
- `id` (UUID) - Primary key
- `userId` (String) - Foreign key to User
- `token` (String, unique) - Session token
- `expiresAt` (DateTime) - Session expiry
- `createdAt` (DateTime) - Creation timestamp
- CASCADE delete on user removal

### Conversation Model
- `id` (UUID) - Primary key
- `userId` (String) - Foreign key to User
- `title` (String) - Conversation name
- `model` (String) - Selected Claude model
- `activeMcpIds` (JSON) - Active MCP connection IDs
- `isPinned` (Boolean) - Pin status
- `isShared` (Boolean) - Share status
- `solutionType` (String, nullable) - Solution type identifier
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp
- `lastMessageAt` (DateTime, nullable) - Last message timestamp
- CASCADE delete on user removal

### Message Model
- `id` (UUID) - Primary key
- `conversationId` (String) - Foreign key to Conversation
- `role` (String) - "user", "assistant", or "tool"
- `content` (String) - Message text content
- `parts` (JSON, nullable) - UIMessage parts array
- `metadata` (JSON) - Additional data (reasoning, tool_calls, etc.)
- `createdAt` (DateTime) - Creation timestamp
- `editedAt` (DateTime, nullable) - Last edit timestamp
- CASCADE delete on conversation removal

### Artifact Model
- `id` (UUID) - Primary key
- `conversationId` (String) - Foreign key to Conversation
- `messageId` (String) - Foreign key to Message
- `userId` (String) - Foreign key to User
- `type` (String) - Artifact type (default: html)
- `title` (String) - Artifact title
- `content` (String) - Full artifact content
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp
- CASCADE delete on conversation/message/user removal

### McpConnection Model
- `id` (UUID) - Primary key
- `userId` (String) - Foreign key to User
- `name` (String) - Connection name
- `serverUrl` (String) - MCP server URL
- `authType` (String) - Auth type (none, api_key, oauth)
- `authCredentialsEncrypted` (String, nullable) - AES-256-GCM encrypted credentials
- `availableTools` (JSON) - List of available tools
- `isActive` (Boolean) - Active status
- `status` (String) - Connection status
- `lastError` (String, nullable) - Last error message
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp
- `lastConnectedAt` (DateTime, nullable) - Last connection timestamp
- CASCADE delete on user removal

## Key Features

### Authentication
- Database-backed session management with PostgreSQL
- Secure password hashing with scrypt algorithm
- Session tokens with 30-day expiry
- Demo mode available for unauthenticated access
- API routes for login, register, logout, and user info

#### Auth API Endpoints
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate and get session token
- `POST /api/auth/logout` - Invalidate session token
- `GET /api/auth/me` - Get current user info (requires Bearer token)
- `POST /api/auth/password-reset` - Request password reset email
- `POST /api/auth/password-reset/confirm` - Confirm password reset with token
- `POST /api/auth/change-password` - Change password (authenticated)

#### Auth Middleware
- `lib/auth-middleware.ts` - Authentication utilities for API routes
- `validateSession()` - Validate session token and return user
- `requireAuth()` - Require valid session or return 401
- `withAuth()` - Wrap API handler with authentication check
- `getUserFromRequest()` - Extract user from Bearer token

#### Input Validation
- `lib/validation.ts` - Zod schemas for API request validation
- `RegisterSchema` - User registration validation
- `LoginSchema` - Login credentials validation
- `PasswordResetSchema` - Password reset request validation
- `AwsCredentialsSchema` - AWS credentials validation
- `ChatRequestSchema` - Chat message validation

### Chat Interface
- Real-time AI streaming responses
- Multiple Claude model selection (4.5 Sonnet, Haiku, Opus, 4 Sonnet)
- Web search tool integration (placeholder)
- Message actions (copy, edit, upvote, downvote)
- Auto-scrolling during message streaming
- Voice input button (UI ready)
- Markdown rendering with syntax highlighting
- Code block support with copy functionality

### Solution-Specific AI Agents
Athena MCP provides specialized chat endpoints for different business domains:

| Solution | Endpoint | Domain Focus |
|----------|----------|--------------|
| **Manufacturing** | `/api/chat/manufacturing` | Production visibility, traceability, yield analysis, forecasting |
| **Maintenance** | `/api/chat/maintenance` | Failure prediction, reliability analysis, MTBF/MTTR optimization |
| **Support** | `/api/chat/support` | Incident classification, root cause analysis, troubleshooting |
| **Change Management** | `/api/chat/change-management` | Impact tracking, change communication, ECO workflow management |
| **Impact Analysis** | `/api/chat/impact-analysis` | Operational impact, cross-functional insights, ROI analysis |
| **Requirements** | `/api/chat/requirements` | Requirements validation, gap detection, dependency analysis |
| **General** | `/api/chat` | General purpose chat (no domain-specific context) |

### Conversation Management
- Create, read, update, delete (CRUD) operations
- Pin/unpin conversations
- Share conversations (generates share link)
- Automatic title generation from first message
- Sidebar with pinned and recent conversations
- Collapsible sidebar for mobile
- Solution type tracking for analytics

### Solutions Page
- Showcase of AI solution use cases
- Cards for Manufacturing, Maintenance, Support, Change Management, Impact Analysis, Requirements
- Direct navigation to specialized chat interfaces

### Analytics & Tracking
- Scale-level event tracking
- Usage analytics by solution type
- Performance monitoring (response times, token usage)
- Error tracking with full context
- Cost analysis for AWS Bedrock usage
- User behavior analysis

## Environment Variables

Create `.env` file in the root directory:

```env
# AWS Bedrock Credentials
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-west-2

# PostgreSQL Database
# Local: postgresql://user:password@localhost:5432/athena_mcp
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/athena_mcp"

# Encryption key for sensitive data (AWS credentials, MCP credentials)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Must be 64 hex characters (32 bytes) for AES-256
KEY_ENCRYPTION_SECRET="your_64_hex_character_encryption_key_here"
```

## Getting Started

### Prerequisites
- Node.js 20+ installed
- PostgreSQL 14+ installed and running locally
- AWS Bedrock access with Claude models enabled
- AWS credentials with Bedrock permissions

### Database Setup

1. Install PostgreSQL locally or use Docker:
```bash
# Using Docker
docker run --name athena-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

# Create database
docker exec -it athena-postgres psql -U postgres -c "CREATE DATABASE athena_mcp;"
```

2. Or install PostgreSQL natively and create the database:
```bash
createdb athena_mcp
```

### Installation

```bash
# Install dependencies (automatically generates Prisma client)
npm install

# Push schema to database (creates tables)
npm run db:push

# Or run migrations for production
npm run db:migrate

# Run development server
npm run dev
```

### Database Scripts

```bash
npm run db:generate  # Regenerate Prisma client
npm run db:migrate   # Run migrations (development)
npm run db:push      # Push schema directly (development)
npm run db:studio    # Open Prisma Studio GUI
npm run db:reset     # Reset database (WARNING: deletes all data)
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Create production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture & Data Flow

### Client-Side Flow
1. User authenticates at `/` (LoginPage) using localStorage
2. Redirected to `/solutions` or `/chat`
3. User selects a solution card (optional) which sets the solution type
4. Chat page loads `FullChatApp` component
5. Component fetches conversation history from `GET /api/conversations`
6. User selects conversation or creates new one
7. User sends message → calls `POST /api/chat/{solution}` with streaming
8. Messages displayed in real-time via Vercel AI SDK `useChat` hook
9. Automatically saved to database via API handler

### Server-Side Flow
1. **Chat Route Handler** (`app/api/chat/*/route.ts`):
   - Receives messages array, model selection, and conversation ID
   - Adds solution-specific system prompt (if applicable)
   - Saves user message to database
   - Streams response from Claude via AWS Bedrock
   - Saves assistant message to database on completion
   - Updates conversation title on first exchange
   - Updates conversation solutionType field
   - Logs analytics events (optional)
   - Returns data stream for real-time display

2. **Conversation API Routes**:
   - List, create, update, delete conversations
   - Manage conversation metadata (pin, share, model selection, solutionType)
   - Filter by solution type for analytics

3. **Database Operations**:
   - All data persists to SQLite via Prisma ORM
   - Conversations and messages stored with foreign key relation
   - Cascade deletes enabled for data integrity
   - Analytics events logged asynchronously

## Claude Models Available

| Model | ID | Description |
|-------|-----|-------------|
| Claude 4.5 Sonnet | us.anthropic.claude-sonnet-4-5-20250929-v1:0 | Most intelligent, best for complex tasks |
| Claude 4.5 Haiku | us.anthropic.claude-haiku-4-5-20251001-v1:0 | Fast and efficient for simple tasks |
| Claude 4.5 Opus | us.anthropic.claude-opus-4-5-20251101-v1:0 | Best for complex reasoning and analysis |
| Claude 4 Sonnet | us.anthropic.claude-sonnet-4-20250514-v1:0 | Balanced performance and speed |

## Styling & Theming

### Global Styles
- TailwindCSS v4 with custom CSS variables
- Light and dark theme support via CSS variables
- Theme colors: background, foreground, primary, secondary, accent, destructive, border, input, ring
- Sidebar-specific variables for customization
- Geist font family (Sans and Mono variants)

### Component Architecture
- Radix UI primitives for accessibility
- shadcn-style component patterns
- Class Variance Authority for variant management
- Responsive design with mobile breakpoints

## API Endpoints

### Chat
- `POST /api/chat` - Stream AI responses (general, no domain context)
- `POST /api/chat/manufacturing` - Manufacturing-specific AI responses
- `POST /api/chat/maintenance` - Maintenance-specific AI responses
- `POST /api/chat/support` - Support-specific AI responses
- `POST /api/chat/change-management` - Change management AI responses
- `POST /api/chat/impact-analysis` - Impact analysis AI responses
- `POST /api/chat/requirements` - Requirements AI responses
- `GET /api/chat` - List available Claude models

### Conversations
- `GET /api/conversations` - List all conversations (ordered by pin status and update time)
- `POST /api/conversations` - Create new conversation (body: title, model, solutionType)
- `GET /api/conversations/[id]` - Get single conversation with all messages
- `PATCH /api/conversations/[id]` - Update conversation (body: title, isPinned, isShared, model, solutionType)
- `DELETE /api/conversations/[id]` - Delete conversation (cascades to messages)

### Messages
- `GET /api/conversations/[id]/messages` - List all messages in conversation
- `POST /api/conversations/[id]/messages` - Add message to conversation (body: role, content)
- `DELETE /api/conversations/[id]/messages` - Clear all messages in conversation

## Development Notes

### Authentication
Current implementation uses localStorage for simplicity. For production:
- Implement proper authentication (NextAuth.js, Clerk, Auth0, etc.)
- Add server-side session management
- Secure API routes with middleware
- Add user model to database schema

### Web Search Tool
The web search tool in chat route handlers is a placeholder. To enable real web search:
- Integrate with search APIs (Tavily, Serper, Google Custom Search)
- Update the `webSearchTool.execute` function
- Configure API keys in environment variables

### Adding New Solution Types
To add a new solution-specific AI agent:
1. Create new route file: `app/api/chat/[solution-name]/route.ts`
2. Define solution-specific system prompt
3. Implement POST and GET handlers
4. Add solution card to `/solutions` page
5. Update TypeScript types for solutionType
6. Update database schema if needed

### Production Checklist
- [ ] Implement proper authentication
- [ ] Add environment variable validation (Zod)
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Configure production database (PostgreSQL, MySQL)
- [ ] Add rate limiting for API routes
- [ ] Implement input sanitization and validation
- [ ] Add security headers (CSP, CORS)
- [ ] Set up monitoring and analytics dashboard
- [ ] Configure CDN for static assets
- [ ] Add comprehensive error handling
- [ ] Write unit and integration tests
- [ ] Implement real web search integration
- [ ] Add user authentication and authorization
- [ ] Set up analytics dashboard for business metrics

## File Paths Reference

### Important Files
- **Main Chat Component**: `components/full-chat-app.tsx`
- **Chat API Handlers**: `app/api/chat/*/route.ts`
- **Database Client**: `lib/db.ts`
- **Schema Definition**: `prisma/schema.prisma`
- **Global Styles**: `app/globals.css`
- **Root Layout**: `app/layout.tsx`

### Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript compiler options
- `next.config.ts` - Next.js configuration
- `prisma.config.ts` - Prisma configuration
- `eslint.config.mjs` - ESLint rules
- `postcss.config.mjs` - PostCSS plugins

## Contributing Guidelines

1. Follow existing code style and conventions
2. Use TypeScript for all new files
3. Run `npm run lint` before committing
4. Test changes locally before pushing
5. Update this documentation when adding features
6. Use meaningful commit messages
7. Test solution-specific chat endpoints thoroughly
8. Ensure analytics events are logged properly

## License

This project is private. All rights reserved.

## Support & Documentation

- **Next.js Docs**: https://nextjs.org/docs
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **AWS Bedrock**: https://docs.aws.amazon.com/bedrock
- **Prisma Docs**: https://www.prisma.io/docs
- **Radix UI**: https://www.radix-ui.com/primitives
- **TailwindCSS**: https://tailwindcss.com/docs
- **React Markdown**: https://github.com/remarkjs/react-markdown
