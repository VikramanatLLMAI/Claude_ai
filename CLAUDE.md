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
- **Vercel AI SDK v6.0.48** - AI/LLM integration and streaming
- **AWS Bedrock (@ai-sdk/amazon-bedrock v4.0.29)** - Claude model provider
- **Prisma v5.22.0** - ORM for database operations
- **SQLite** - Embedded database (dev.db)
- **Zod v4.3.6** - Schema validation

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
│   ├── db.ts                  # Prisma client singleton
│   └── utils.ts               # Utility functions (cn)
├── prisma/                     # Database layer
│   ├── schema.prisma          # Database schema
│   ├── dev.db                 # SQLite database file
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

## Database Schema

### Conversation Model
- `id` (CUID) - Primary key
- `title` (String) - Conversation name
- `isPinned` (Boolean) - Pin status
- `isShared` (Boolean) - Share status
- `model` (String) - Selected Claude model (default: Claude 4.5 Sonnet)
- `solutionType` (String, nullable) - Solution type identifier (manufacturing, maintenance, support, change-management, impact-analysis, requirements, or null for general)
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp
- `messages[]` - One-to-many relation with messages

### Message Model
- `id` (CUID) - Primary key
- `role` (String) - "user" or "assistant"
- `content` (String) - Message text
- `conversationId` (String) - Foreign key to Conversation
- `conversation` (Conversation) - Relation
- `createdAt` (DateTime) - Creation timestamp
- CASCADE delete on conversation removal

### AnalyticsEvent Model
- `id` (CUID) - Primary key
- `eventType` (String) - Event type: "api_call", "conversation_created", "message_sent", "model_switched", "error"
- `solutionType` (String, nullable) - Solution type for the event
- `userId` (String, nullable) - User ID (for future auth implementation)
- `conversationId` (String, nullable) - Optional link to conversation
- `model` (String, nullable) - Claude model used
- `metadata` (String, nullable) - JSON string for additional event data
- `timestamp` (DateTime) - Event timestamp

## Key Features

### Authentication
- Simple localStorage-based session management
- Sign-in and sign-up forms
- Session key: `athena_auth_session`
- Note: Not production-grade, suitable for demo/development

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

Create `.env` and `.env.local` files in the root directory:

```env
# AWS Bedrock Credentials
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1

# Database
DATABASE_URL=file:./prisma/dev.db
```

## Getting Started

### Prerequisites
- Node.js 20+ installed
- AWS Bedrock access with Claude models enabled
- AWS credentials with Bedrock permissions

### Installation

```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma migrate dev

# Run development server
npm run dev
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
