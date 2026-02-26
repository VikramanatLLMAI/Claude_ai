# Architecture

**Analysis Date:** 2026-02-26

## Pattern Overview

**Overall:** Layered full-stack architecture with separation of concerns across API routes, business logic, data access, and frontend components. Follows Next.js App Router patterns with server-side rendering for initial page load and client-side reactivity via React hooks.

**Key Characteristics:**
- Server-side authentication and authorization via bearer tokens
- Streaming API responses for real-time chat experience
- Database-centric state with Prisma ORM for PostgreSQL
- React component-based UI with hooks for state management
- Tool/MCP integration pattern for extensible AI capabilities

## Layers

**Presentation Layer:**
- Purpose: React components rendering UI and handling user interaction
- Location: `components/`, `app/`
- Contains: React components (full-chat-app, login-page, UI primitives), pages, layouts
- Depends on: Hooks, utilities (cn), Vercel AI SDK (`useChat`)
- Used by: Next.js page router

**API Route Layer:**
- Purpose: HTTP endpoints handling authentication, chat, conversations, file storage, MCP management
- Location: `app/api/`
- Contains: Route handlers with business logic, validation, error handling
- Depends on: Storage layer, encryption, validation, Anthropic SDK
- Used by: Frontend via fetch/useChat

**Business Logic Layer:**
- Purpose: Core operations for chat, file management, MCP tools, artifact parsing
- Location: `lib/` (anthropic.ts, anthropic-files.ts, mcp-client.ts, artifacts.ts, system-prompts.ts)
- Contains: Anthropic API integration, MCP protocol implementation, artifact extraction
- Depends on: Storage layer, external APIs (Anthropic, MCP servers)
- Used by: API routes

**Data Access Layer:**
- Purpose: Database CRUD operations with Prisma ORM
- Location: `lib/storage.ts`, `lib/db.ts`
- Contains: User, Session, Conversation, Message, Artifact, McpConnection operations
- Depends on: `prisma/schema.prisma`, PostgreSQL
- Used by: API routes, business logic layer

**Infrastructure Layer:**
- Purpose: Cross-cutting utilities for encryption, validation, error handling, performance
- Location: `lib/` (encryption.ts, validation.ts, api-utils.ts, auth-middleware.ts, performance.ts, file-utils.ts)
- Contains: Scrypt password hashing, AES-256-GCM encryption, Zod validation, retry logic, debouncing
- Depends on: Node.js crypto, third-party validation libraries
- Used by: All layers

## Data Flow

**Chat Message Flow (Streaming):**

1. User submits message in `PromptInput` component
2. React component calls `useChat.handleSubmit()` from Vercel AI SDK
3. `POST /api/chat` with request body: `{ messages, model, conversationId, webSearch, enableReasoning, activeMcpIds }`
4. `app/api/chat/route.ts` receives request:
   - Validates session via `requireAuth()` middleware
   - Validates request body with `validate(ChatRequestSchema, body)`
   - Builds system prompt with `buildSystemPromptWithTools()`
   - Fits messages to context window with `fitMessagesToContextWindow()`
   - Builds tools object (code_execution, web_search, web_fetch based on flags)
   - If conversationId exists, saves user message to database via `addMessage()`
5. Backend calls `streamText()` from Vercel AI SDK with:
   - Anthropic model provider
   - System prompt
   - Messages (converted to Anthropic format)
   - Tools
   - Thinking mode (adaptive/manual/none based on model)
   - maxTokens: 65536, maxDuration: 300
6. Anthropic API streams response back via Server-Sent Events (SSE)
7. Response streamed through to frontend with events:
   - `{ type: "text", text: "..." }`
   - `{ type: "reasoning", reasoning: "..." }`
   - `{ type: "tool_call", tool: "...", result: "..." }`
   - `{ type: "data-fileDownload", ... }` (for Files API downloads)
   - `{ type: "done" }`
8. Frontend `useChat` hook updates local messages state in real-time
9. On stream finish:
   - Artifacts extracted from response via `extractArtifacts()`
   - Assistant message saved to database
   - Conversation updatedAt timestamp refreshed
   - Conversation list refreshed in sidebar

**Conversation Initialization Flow:**

1. User navigates to `/chat` page (protected route)
2. `app/chat/page.tsx` checks localStorage for valid session
3. `FullChatApp` component mounts and calls `GET /api/conversations`
4. Backend fetches conversations from database (ordered by isPinned desc, then updatedAt desc)
5. Frontend renders conversation list in sidebar
6. User selects conversation or starts new one
7. If new: `POST /api/conversations` creates Conversation record
8. If existing: `GET /api/conversations/[id]` fetches conversation with messages
9. Messages rendered in chat container with streaming support

**Authentication Flow:**

1. User navigates to `/` (login page)
2. User enters email/password and submits LoginPage form
3. `POST /api/auth/login` with { email, password }
4. Backend:
   - Looks up user via `getUserByEmail()`
   - Verifies password with `verifyPassword()` (timing-safe comparison)
   - Creates 30-day session token via `createSession()`
   - Returns { user, token }
5. Frontend stores token in localStorage (`llmatscale_auth_token`)
6. Redirects to `/chat`
7. All subsequent API requests include `Authorization: Bearer <token>` header
8. Backend validates token on every request via `requireAuth()` middleware

**File Upload & Processing Flow:**

1. User uploads file via `PromptInput` file input
2. Frontend reads file as base64 and includes in message `parts`
3. Message sent to `/api/chat` with file embedded
4. Backend sends file to Anthropic Files API via `getAnthropicFilesClient()`
5. Anthropic returns file ID
6. File ID included in follow-up chat messages
7. Frontend caches file content via `useFileContent()` hook
8. File preview rendered via appropriate viewer (PDF, DOCX, XLSX, PPTX)

**MCP Tool Integration Flow:**

1. User adds MCP connection via settings modal
2. `POST /api/mcp/connections` stores connection details (encrypted credentials)
3. User selects conversation and activates MCP connection
4. Conversation updates `activeMcpIds` field
5. During chat, backend calls `loadActiveMcpToolsWithDescriptions()` to fetch available tools
6. Tools included in system prompt via `buildSystemPromptWithTools()`
7. If Claude uses tool, MCP server called via `executeMcpTool()`:
   - Decrypts stored credentials
   - Makes JSON-RPC 2.0 request to MCP server
   - Returns tool result to Claude
   - Tool result displayed in chat

**State Management:**

- **Client State**: Managed via React hooks in components (useChat, useState, useCallback)
- **Server State**: PostgreSQL database via Prisma ORM
- **Session State**: localStorage (token, user data) + Session table (server validation)
- **UI State**: Component-level (FullChatApp manages selected conversation, model, web search toggle)
- **Cache**: `useFileContent` hook caches fetched file contents; MCP tool schemas cached during session

## Key Abstractions

**Request/Response Pattern:**

- All API routes follow: Validate → Authenticate → Business Logic → Response
- Responses use standardized format: `{ data } | { error }` with appropriate HTTP status codes
- Errors wrapped in try/catch with logging to console

**Authentication Abstraction:**

- `requireAuth(request)` validates bearer token and returns user or Response error
- All protected routes check auth at route entry point
- Pattern: `const authResult = await requireAuth(req); if (authResult instanceof Response) return authResult;`
- Examples: `app/api/chat/route.ts`, `app/api/conversations/route.ts`

**Database Operations Abstraction:**

- `lib/storage.ts` centralizes all database CRUD operations
- Thin wrapper over Prisma with typed return values
- Operations: `createUser()`, `getUserByEmail()`, `createConversation()`, `addMessage()`, etc.
- Message transformation: `toUIMessage()` converts DB format to frontend format with parts/metadata

**Validation Abstraction:**

- `lib/validation.ts` defines Zod schemas for all inputs
- `validate(Schema, data)` returns `{ data, errors }` or `{ success: false, errors }`
- Used by all API routes before processing
- Examples: `ChatRequestSchema`, `RegisterSchema`, `CreateConversationSchema`

**Encryption Abstraction:**

- `lib/encryption.ts` handles credential encryption/decryption
- `encrypt(plaintext)` returns hex-encoded string: "iv:authTag:encrypted"
- `decrypt(encrypted)` returns plaintext
- Used for API keys (`anthropicApiKeyEncrypted`) and MCP credentials (`authCredentialsEncrypted`)
- Password hashing uses scrypt with salt: "salt:derivedKey" format

**Streaming Response Abstraction:**

- Vercel AI SDK `streamText()` handles Server-Sent Events format
- Response sent as `TextStreamResponse` with content-type `text/event-stream`
- Frontend `useChat` hook parses events and updates messages in real-time

**Tool Integration Abstraction:**

- `buildSystemPromptWithTools()` converts MCP tool schemas to system prompt text
- `executeMcpTool()` handles JSON-RPC 2.0 protocol and credential decryption
- MCP servers queried via HTTP with 30-second timeout
- Tools available to Claude via Anthropic SDK tool definitions

**File Type Classification Abstraction:**

- `lib/file-classifier.ts` determines viewer component based on MIME type
- Maps MIME types to viewer components (PDF, DOCX, XLSX, PPTX, images, text)
- Used by `FileCard` component to render appropriate preview

**Artifact Extraction Abstraction:**

- `lib/artifacts.ts` contains `extractArtifacts()`, `hasArtifacts()`, `parseArtifacts()`
- Parses XML-like artifact blocks from Claude response: `<artifact type="html" title="...">content</artifact>`
- Extracted artifacts saved to database and displayed in `ArtifactPanel`

**Anthropic SDK Integration:**

- Dual usage: Vercel AI SDK provider for streaming chat, direct Anthropic SDK for Files API
- `lib/anthropic.ts` exports `anthropic` (provider) and `anthropicClient` (direct SDK)
- Container ID forwarding for document generation features (PPTX, DOCX, PDF, XLSX)

## Entry Points

**Frontend Entry:**

- Location: `app/page.tsx`
- Triggers: User navigates to `/` or localhost:3000
- Responsibilities: Renders `LoginPage` component for authentication

**Protected Chat Entry:**

- Location: `app/chat/page.tsx`
- Triggers: User navigates to `/chat` after authentication
- Responsibilities: Checks session validity, renders `FullChatApp` main component

**API Entry:**

- Location: `app/api/` with route handlers
- Triggers: Frontend fetch/useChat calls to `/api/*`
- Responsibilities: Route handling, validation, authentication, business logic

**Root Layout Entry:**

- Location: `app/layout.tsx`
- Triggers: Next.js app initialization
- Responsibilities: Global providers, fonts, metadata, theme setup via `Providers` component

## Error Handling

**Strategy:** Layered error handling with validation at entry, try/catch at business logic, typed responses at API layer

**Patterns:**

- **Validation Errors**: Caught at API route entry, returned as 400 with formatted error messages via `formatValidationErrors()`
- **Authentication Errors**: Returned as 401 from `requireAuth()` middleware
- **Database Errors**: Caught in try/catch, logged to console, returned as 500 with generic message
- **API Errors**: Caught from Anthropic SDK or MCP servers, returned as 400/500 with error message
- **Error Boundary**: Frontend error boundary component catches React errors and logs via console (production can integrate Sentry)

**Examples:**

```typescript
// Validation error
const { data, error } = validate(ChatRequestSchema, body)
if (error) return NextResponse.json({ error: formatValidationErrors(error) }, { status: 400 })

// Auth error
const auth = await requireAuth(req)
if (auth instanceof Response) return auth

// Try/catch for business logic
try {
  const result = await streamText({ ... })
} catch (e) {
  console.error('Chat error:', e)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

## Cross-Cutting Concerns

**Logging:** Console.error for development, can integrate Sentry for production (see Providers component)

**Validation:** Zod schemas at all API entry points, client-side form validation in components

**Authentication:** Bearer token via `requireAuth()` middleware on all protected routes

**Encryption:** AES-256-GCM for API keys and MCP credentials at rest in database, scrypt for passwords

**Performance:**
- Debouncing for search/input via `useDebouncedCallback()`
- Smooth streaming animation via `useSmoothStreaming()` hook
- Context window fitting via `fitMessagesToContextWindow()` to avoid exceeding token limits
- Database query optimization via Prisma indexes on frequently queried fields

**Accessibility:**
- Semantic HTML in components (button, nav, main, aside)
- ARIA labels on icon buttons via `aria-label`
- Focus management in modals
- Keyboard navigation support (Tab, Enter, Escape, Arrow keys)
- Reduced motion respect via `MotionConfig` in Providers

---

*Architecture analysis: 2026-02-26*
