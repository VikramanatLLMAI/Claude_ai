# Codebase Structure

**Analysis Date:** 2026-02-26

## Directory Layout

```
chatbot_ui/
├── app/                          # Next.js App Router with pages and API routes
│   ├── api/                     # Backend API endpoints (Route handlers)
│   │   ├── auth/               # Authentication endpoints
│   │   │   ├── register/       # POST - Create user account
│   │   │   ├── login/          # POST - Authenticate and get session
│   │   │   ├── logout/         # POST - Invalidate session
│   │   │   ├── me/             # GET - Current user info
│   │   │   ├── change-password/ # POST - Change password
│   │   │   └── password-reset/ # Password recovery endpoints
│   │   ├── chat/               # POST/GET - AI chat streaming
│   │   ├── conversations/      # Conversation CRUD endpoints
│   │   │   ├── route.ts        # GET list, POST create
│   │   │   └── [id]/           # Single conversation routes
│   │   │       ├── route.ts    # GET, PATCH, DELETE
│   │   │       ├── title/      # PATCH title only
│   │   │       └── messages/   # Message CRUD
│   │   ├── files/              # Anthropic Files API wrappers
│   │   │   └── [fileId]/       # File metadata and download
│   │   ├── mcp/                # MCP connection management
│   │   │   └── connections/    # Connection CRUD
│   │   │       └── [id]/       # Discover, test, manage
│   │   ├── user/               # User settings and API keys
│   │   │   ├── settings/       # GET/PATCH preferences
│   │   │   └── anthropic/      # Manage Anthropic API key
│   │   ├── artifacts/          # Artifact management
│   │   └── messages/           # Message feedback
│   ├── chat/                    # Chat application page (protected)
│   │   └── page.tsx           # Protected chat UI with session check
│   ├── settings/               # Settings page (redirects to chat modal)
│   │   └── page.tsx
│   ├── page.tsx                # Login page (entry point)
│   ├── layout.tsx              # Root layout (fonts, metadata, providers)
│   ├── globals.css             # Global styles and CSS variables
│   ├── artifact-panel.css      # Artifact panel specific styles
│   ├── CLAUDE.md              # App directory documentation
│   └── api/CLAUDE.md          # API routes documentation
├── components/                  # React components
│   ├── full-chat-app.tsx       # Main chat application (86KB)
│   ├── login-page.tsx          # Authentication UI
│   ├── settings-modal.tsx      # Settings modal (42.7KB)
│   ├── sandpack-preview.tsx    # Live React code preview
│   ├── artifact-panel-wrapper.tsx # Artifact display wrapper
│   ├── artifact-preview.tsx    # Artifact content preview
│   ├── error-boundary.tsx      # Error handling wrapper
│   ├── providers.tsx           # Global context providers
│   ├── prompt-kit/             # Chat-specific UI components
│   │   ├── message.tsx         # Message display with actions
│   │   ├── prompt-input.tsx    # Auto-resizing chat input
│   │   ├── chat-container.tsx  # Layout with auto-scroll
│   │   ├── code-block.tsx      # Syntax-highlighted code
│   │   ├── markdown.tsx        # Markdown renderer (GFM, KaTeX)
│   │   ├── tool.tsx            # Tool call visualization
│   │   ├── tool-card.tsx       # Tool result display
│   │   ├── tool-timeline.tsx   # Tool execution timeline
│   │   ├── feedback-bar.tsx    # Thumbs up/down actions
│   │   ├── reasoning.tsx       # Collapsible thinking blocks
│   │   ├── streaming-text.tsx  # Real-time text animation
│   │   ├── steps.tsx           # Step-by-step display
│   │   ├── loader.tsx          # Loading animation
│   │   ├── scroll-button.tsx   # Scroll-to-bottom button
│   │   ├── file-card.tsx       # File upload display
│   │   ├── system-message.tsx  # System notifications
│   │   └── text-shimmer.tsx    # Loading shimmer effect
│   ├── mcp/                    # MCP-specific components
│   │   ├── mcp-add-dialog.tsx  # Add MCP connection form
│   │   └── mcp-connection-card.tsx # Connection status card
│   ├── viewers/                # Document viewer components
│   │   ├── pdf-viewer.tsx      # PDF preview
│   │   ├── docx-viewer.tsx     # Word document preview
│   │   ├── xlsx-viewer.tsx     # Excel spreadsheet preview
│   │   └── pptx-viewer.tsx     # PowerPoint presentation preview
│   ├── ui/                     # Radix UI wrapper components
│   │   ├── button.tsx          # Button with variants
│   │   ├── card.tsx            # Card container
│   │   ├── badge.tsx           # Status badges
│   │   ├── input.tsx           # Text input
│   │   ├── dropdown-menu.tsx   # Dropdown menus
│   │   ├── dialog.tsx          # Modal dialogs
│   │   ├── sheet.tsx           # Slide-out panels
│   │   ├── sidebar.tsx         # Complex sidebar (24KB)
│   │   ├── collapsible.tsx     # Expandable sections
│   │   ├── switch.tsx          # Toggle switch
│   │   ├── label.tsx           # Form labels
│   │   ├── separator.tsx       # Dividers
│   │   ├── skeleton.tsx        # Loading placeholder
│   │   ├── skeleton-loaders.tsx # Complex loading states
│   │   ├── tooltip.tsx         # Hover tooltips
│   │   └── claude-style-chat-input.tsx # Custom chat input (39.7KB)
│   └── CLAUDE.md              # Frontend documentation
├── hooks/                      # Custom React hooks
│   ├── use-keyboard-shortcuts.tsx # Chat keyboard shortcuts
│   ├── use-mobile.tsx          # Mobile viewport detection
│   ├── use-smooth-streaming.ts # Smooth text streaming
│   └── use-file-content.ts    # File content caching
├── lib/                        # Core business logic and utilities
│   ├── db.ts                  # Prisma client singleton
│   ├── storage.ts             # Database CRUD operations (user, session, conversation, message, artifact, mcp)
│   ├── auth-middleware.ts     # Session validation and requireAuth helper
│   ├── encryption.ts          # Scrypt password hashing, AES-256-GCM
│   ├── validation.ts          # Zod schemas for all inputs
│   ├── anthropic.ts           # Anthropic SDK provider (Vercel AI SDK + direct SDK)
│   ├── anthropic-files.ts     # Anthropic Files API client wrapper
│   ├── system-prompts.ts      # System prompt builder with tool descriptions
│   ├── artifacts.ts           # Artifact extraction and parsing
│   ├── artifact-parser.ts     # Low-level artifact block parsing
│   ├── mcp-client.ts          # MCP tool execution via JSON-RPC 2.0
│   ├── context-window.ts      # Message fitting to token limits
│   ├── file-classifier.ts     # File type → viewer component mapping
│   ├── file-utils.ts          # File utility functions
│   ├── api-utils.ts           # HTTP utilities, retry logic, error handling
│   ├── performance.ts         # Debounce, throttle utilities
│   ├── accessibility.ts       # A11y helpers (focus management)
│   ├── utils.ts               # className merge utility (cn)
│   ├── language-aliases.ts    # Programming language aliases
│   ├── sandpack-deps.ts       # Sandpack external dependencies
│   └── generated/             # Auto-generated files
│       └── prisma/            # Generated Prisma client
├── prisma/                     # Database schema and migrations
│   ├── schema.prisma          # PostgreSQL schema (7 models)
│   └── migrations/            # Database migration files
├── .claude/                    # Claude Code configuration
│   ├── agents/                # Custom agent definitions
│   ├── commands/              # CLI command definitions
│   ├── hooks/                 # Claude Code hooks
│   ├── get-shit-done/         # GSD workflow definitions
│   ├── settings.json          # Global settings
│   └── package.json           # Dependencies for Claude Code tools
├── .planning/                  # GSD planning outputs
│   └── codebase/              # Codebase analysis documents
├── public/                     # Static assets
├── package.json               # Project dependencies
├── tsconfig.json              # TypeScript configuration
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # TailwindCSS configuration
├── eslint.config.js           # ESLint configuration
├── CLAUDE.md                  # Project overview
└── README.md                  # README
```

## Directory Purposes

**app/:**
- Purpose: Next.js App Router pages and API route handlers
- Contains: Page components, API routes, global layout, styles
- Key files: `page.tsx` (login), `chat/page.tsx` (protected), `layout.tsx` (root), `globals.css` (theme)

**app/api/:**
- Purpose: Backend REST API endpoints
- Contains: Route handlers for auth, chat, conversations, files, MCP, user settings
- Organized by resource: `auth/`, `conversations/`, `chat/`, `files/`, `mcp/`, `user/`, `artifacts/`, `messages/`

**components/:**
- Purpose: React UI components
- Contains: Pages (full-chat-app, login-page, settings-modal), reusable UI components
- Organized by domain: `prompt-kit/` (chat UI), `ui/` (design system), `viewers/` (file viewers), `mcp/` (MCP features)

**lib/:**
- Purpose: Core business logic, utilities, infrastructure
- Contains: Database access (storage.ts), auth (auth-middleware.ts), encryption, validation, external API integration
- Key files: `storage.ts` (CRUD), `db.ts` (Prisma singleton), `anthropic.ts` (AI SDK), `validation.ts` (Zod schemas)

**prisma/:**
- Purpose: Database schema and migrations
- Contains: `schema.prisma` (7 models), migration files
- Key file: `schema.prisma` (User, Session, Conversation, Message, Artifact, McpConnection, PasswordResetToken)

**hooks/:**
- Purpose: Custom React hooks for state and effects
- Contains: Keyboard shortcuts, mobile detection, smooth streaming, file content caching

## Key File Locations

**Entry Points:**

- `app/page.tsx` - Login page (user enters app here)
- `app/chat/page.tsx` - Protected chat interface (main app)
- `app/layout.tsx` - Root layout (global setup)
- `app/api/chat/route.ts` - AI chat endpoint (message processing)

**Configuration:**

- `prisma/schema.prisma` - Database schema definition
- `app/globals.css` - CSS variables, theme colors, fonts
- `tsconfig.json` - TypeScript compiler settings
- `.env` - Environment variables (not committed, secrets)

**Core Logic:**

- `lib/storage.ts` - All database CRUD operations (600+ lines)
- `lib/anthropic.ts` - Anthropic SDK client configuration
- `app/api/chat/route.ts` - Chat endpoint with streaming (200+ lines)
- `lib/auth-middleware.ts` - Session validation
- `lib/validation.ts` - Request body schemas

**Testing:**

- No test files present (testing not set up)

**Authentication:**

- `lib/auth-middleware.ts` - `requireAuth()` function for route protection
- `lib/encryption.ts` - Password hashing and credential encryption
- `app/api/auth/` - Login, register, logout, password reset endpoints

**Database:**

- `lib/db.ts` - Prisma client singleton
- `lib/storage.ts` - CRUD operations for all models

**AI Integration:**

- `lib/anthropic.ts` - Anthropic SDK initialization
- `app/api/chat/route.ts` - Chat streaming endpoint
- `lib/system-prompts.ts` - System prompt builder
- `lib/context-window.ts` - Message fitting to token limits

**Components:**

- `components/full-chat-app.tsx` - Main UI container (86KB)
- `components/login-page.tsx` - Authentication form
- `components/settings-modal.tsx` - Settings panel (42.7KB)
- `components/prompt-kit/message.tsx` - Message display
- `components/ui/sidebar.tsx` - Navigation sidebar (24KB)

## Naming Conventions

**Files:**

- Page components: `page.tsx` (Next.js pages)
- API routes: `route.ts` (Next.js API handlers)
- Components: `kebab-case.tsx` (e.g., `full-chat-app.tsx`, `prompt-input.tsx`)
- Utilities: `kebab-case.ts` (e.g., `auth-middleware.ts`, `file-utils.ts`)
- Hooks: `use-kebab-case.tsx` or `use-kebab-case.ts` (e.g., `use-keyboard-shortcuts.tsx`)
- Styles: Global → `globals.css`, Component-specific → `module.css` (none currently used)

**Directories:**

- Segments: `kebab-case/` or `[dynamic]/` (e.g., `app/api/conversations/[id]/`)
- Feature groups: `kebab-case/` (e.g., `components/prompt-kit/`, `app/api/auth/`)

**Variables/Functions:**

- Variables: `camelCase` (e.g., `selectedModel`, `webSearchEnabled`)
- Functions: `camelCase` (e.g., `createConversation()`, `validateSession()`)
- Types/Interfaces: `PascalCase` (e.g., `User`, `ChatRequest`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `ADAPTIVE_THINKING_MODELS`, `AUTH_TOKEN_KEY`)

**Database Models:**

- Table names: `snake_case` plural (e.g., `users`, `conversations`, `mcp_connections`)
- Fields: `snake_case` (e.g., `created_at`, `password_hash`, `auth_type`)
- Relations: `camelCase` in Prisma schema (e.g., `user`, `conversations`)

## Where to Add New Code

**New Feature (e.g., "User Profiles"):**

1. **Database Schema:**
   - Add model to `prisma/schema.prisma`
   - Create migration: `npm run db:migrate` (creates migration file)

2. **Primary Code:**
   - CRUD operations: `lib/storage.ts` (add functions like `createProfile()`, `getProfile()`)
   - Validation schema: `lib/validation.ts` (add `ProfileSchema`, `UpdateProfileSchema`)
   - API route: `app/api/user/profile/route.ts` (GET, POST, PATCH, DELETE)

3. **Frontend:**
   - Page: `app/user/profile/page.tsx` or component modal
   - Components: `components/profile-card.tsx`, `components/profile-form.tsx`
   - Styling: Use global CSS variables in `app/globals.css`, component classes inline with TailwindCSS

4. **Tests:**
   - API tests: `app/api/user/profile/route.test.ts` (not set up, would go here)
   - Component tests: `components/profile-card.test.tsx` (not set up, would go here)

**New Component (e.g., "AvatarUploader"):**

1. Create file: `components/avatar-uploader.tsx`
2. Follow structure:
   ```typescript
   import { cn } from "@/lib/utils"
   import { Button } from "@/components/ui/button"

   interface AvatarUploaderProps {
     onUpload?: (file: File) => void
     className?: string
   }

   export function AvatarUploader({ onUpload, className }: AvatarUploaderProps) {
     return <div className={cn("base-classes", className)}>...</div>
   }
   ```
3. Use existing UI components from `components/ui/`
4. TailwindCSS for styling (no CSS files needed)
5. TypeScript for type safety

**New Utility (e.g., "Date formatting"):**

1. Create file: `lib/date-utils.ts`
2. Export functions: `formatDate()`, `parseDate()`, etc.
3. Use from components/routes: `import { formatDate } from "@/lib/date-utils"`

**New API Endpoint:**

1. Create directory: `app/api/[resource]/[action]/`
2. Create file: `route.ts` with POST/GET/PATCH/DELETE handler
3. Pattern:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { requireAuth } from '@/lib/auth-middleware'
   import { validate, MySchema } from '@/lib/validation'

   export async function POST(req: NextRequest) {
     const auth = await requireAuth(req)
     if (auth instanceof Response) return auth

     const body = await req.json()
     const { data, error } = validate(MySchema, body)
     if (error) return NextResponse.json({ error }, { status: 400 })

     try {
       const result = await doSomething(auth.user.id, data)
       return NextResponse.json(result, { status: 201 })
     } catch (e) {
       console.error('Error:', e)
       return NextResponse.json({ error: 'Internal error' }, { status: 500 })
     }
   }
   ```

**New Hook:**

1. Create file: `hooks/use-my-feature.tsx` or `.ts`
2. Prefix with `use-`: `export function useMyFeature() { ... }`
3. Can use useState, useEffect, useCallback, useMemo
4. Return typed value/functions

## Special Directories

**app/api/:**
- Purpose: Route handlers (not front-end code)
- Generated: No
- Committed: Yes
- Note: Each resource has `route.ts` for HTTP methods

**lib/generated/prisma/:**
- Purpose: Auto-generated Prisma client
- Generated: Yes (by `prisma generate`)
- Committed: No (in .gitignore)
- Note: Regenerated on schema changes

**prisma/migrations/:**
- Purpose: Database migration history
- Generated: Yes (by `npm run db:migrate`)
- Committed: Yes (track schema evolution)
- Note: Never edit manually

**.next/:**
- Purpose: Build output
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)
- Note: Recreated on each build

**.claude/:**
- Purpose: Claude Code configuration
- Generated: No (manually configured)
- Committed: Yes (tracked in git)
- Note: Contains agent definitions and workflow configs

---

*Structure analysis: 2026-02-26*
