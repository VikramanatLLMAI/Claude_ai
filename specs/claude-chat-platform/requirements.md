# Claude Chat Platform - Requirements Document

## Project Overview

Build a clean, focused AI chat interface powered by AWS Bedrock Claude models. Features streaming conversations, HTML artifacts with live preview, MCP tool integrations, provider-native tools (code execution, web search), solution-specific AI agents, and comprehensive conversation management.

## Initial Requirements (From Discovery)

Based on stakeholder discussions, the following key decisions were made:

| Requirement Area | Decision |
|------------------|----------|
| **Database** | Keep local PostgreSQL with Prisma ORM (no Supabase migration) |
| **Authentication** | Keep current custom auth with scrypt + session tokens |
| **Solution Endpoints** | Keep separate endpoints with isolated sidebars and chat histories per solution |
| **Artifacts** | Simplify to HTML-only (remove React, SVG, Mermaid support) |
| **MCP Integration** | Full implementation with settings UI similar to Claude's Connectors |
| **Provider Tools** | Always enabled (AWS Bedrock code execution + web search) |
| **UI Components** | Full Prompt Kit implementation |

---

## Functional Requirements

### FR-1: Authentication & User Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Users can register with email and password | High |
| FR-1.2 | Users can log in with email and password | High |
| FR-1.3 | Users can log out and invalidate their session | High |
| FR-1.4 | Users can reset their password via email | Medium |
| FR-1.5 | Users can update their profile (name, avatar) | Medium |
| FR-1.6 | Users can store AWS Bedrock credentials securely | High |
| FR-1.7 | Users can test their AWS Bedrock connection | High |
| FR-1.8 | Session tokens expire after 30 days | High |

### FR-2: Chat Interface

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Display real-time streaming AI responses | High |
| FR-2.2 | Support markdown rendering in messages | High |
| FR-2.3 | Support code blocks with syntax highlighting | High |
| FR-2.4 | Allow users to copy message content | High |
| FR-2.5 | Allow users to regenerate AI responses | Medium |
| FR-2.6 | Allow users to stop generation mid-stream | High |
| FR-2.7 | Display reasoning/thinking process in collapsible section | High |
| FR-2.8 | Display tool execution with input/output details | High |
| FR-2.9 | Show web search sources with citations | High |
| FR-2.10 | Auto-scroll during message streaming | Medium |
| FR-2.11 | Floating scroll-to-bottom button | Medium |
| FR-2.12 | Message actions: copy, upvote, downvote, regenerate | Medium |

### FR-3: Model Selection

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Support Claude Opus 4.5 model | High |
| FR-3.2 | Support Claude Sonnet 4.5 model | High |
| FR-3.3 | Support Claude Haiku 4.5 model | High |
| FR-3.4 | Support Claude 4 Sonnet model | High |
| FR-3.5 | Display model selector dropdown in chat input | High |
| FR-3.6 | Show model context window and cost indicator | Low |

### FR-4: Solution-Specific AI Agents

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Separate chat endpoint for Manufacturing solutions | High |
| FR-4.2 | Separate chat endpoint for Maintenance solutions | High |
| FR-4.3 | Separate chat endpoint for Support solutions | High |
| FR-4.4 | Separate chat endpoint for Change Management solutions | High |
| FR-4.5 | Separate chat endpoint for Impact Analysis solutions | High |
| FR-4.6 | Separate chat endpoint for Requirements solutions | High |
| FR-4.7 | General purpose chat endpoint (no domain context) | High |
| FR-4.8 | Each solution has isolated conversation history | High |
| FR-4.9 | Each solution has its own sidebar conversation list | High |
| FR-4.10 | Solution-specific system prompts for domain expertise | Medium |

### FR-5: Conversation Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Create new conversations | High |
| FR-5.2 | List conversations in sidebar (per solution) | High |
| FR-5.3 | View conversation with full message history | High |
| FR-5.4 | Rename conversations | Medium |
| FR-5.5 | Delete conversations with confirmation | High |
| FR-5.6 | Auto-generate conversation title from first message | High |
| FR-5.7 | Pin/unpin conversations | Low |
| FR-5.8 | Sort conversations by last message time | High |

### FR-6: HTML Artifacts

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | Detect HTML artifacts in AI responses using XML tags | High |
| FR-6.2 | Auto-detect HTML content without explicit tags | Medium |
| FR-6.3 | Display live HTML preview in sandboxed iframe | High |
| FR-6.4 | Toggle between preview and code view | High |
| FR-6.5 | Syntax highlight HTML code with Shiki | High |
| FR-6.6 | Copy HTML code to clipboard | High |
| FR-6.7 | Download HTML as .html file | Medium |
| FR-6.8 | Show inline artifact reference card in chat | High |
| FR-6.9 | Artifact panel opens automatically on detection | High |
| FR-6.10 | Close artifact panel to return to full chat view | High |
| FR-6.11 | Save artifacts to database linked to message | High |

### FR-7: MCP (Model Context Protocol) Integration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | Settings page for managing MCP connections | High |
| FR-7.2 | Add new MCP server with name and URL | High |
| FR-7.3 | Support no-auth MCP servers | High |
| FR-7.4 | Support API key authentication for MCP | High |
| FR-7.5 | Support OAuth 2.0 authentication for MCP | Medium |
| FR-7.6 | Test MCP connection before saving | High |
| FR-7.7 | Auto-discover available tools from MCP server | High |
| FR-7.8 | Display list of configured MCP servers | High |
| FR-7.9 | Edit existing MCP server configuration | Medium |
| FR-7.10 | Delete MCP server connection | High |
| FR-7.11 | Toggle MCP connections on/off per conversation | High |
| FR-7.12 | Show MCP toggle in chat input [+] menu | High |
| FR-7.13 | Display active MCP count badge | Medium |
| FR-7.14 | Show connection status (connected/error/disconnected) | High |
| FR-7.15 | Display last error message for failed connections | Medium |

### FR-8: Provider-Native Tools

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-8.1 | AWS Bedrock code execution tool always enabled | High |
| FR-8.2 | AWS Bedrock web search tool always enabled | High |
| FR-8.3 | Display code execution with code blocks and output | High |
| FR-8.4 | Display web search progress with shimmer effect | High |
| FR-8.5 | Display web search results as source cards | High |
| FR-8.6 | Tools automatically available when user has valid AWS credentials | High |

### FR-9: Settings

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-9.1 | Profile settings tab (name, avatar, email) | Medium |
| FR-9.2 | AWS Bedrock credentials tab | High |
| FR-9.3 | MCP Connectors tab | High |
| FR-9.4 | Appearance settings tab (theme, font size, code theme) | Low |
| FR-9.5 | Light/Dark/System theme toggle | Medium |
| FR-9.6 | Font size adjustment slider | Low |
| FR-9.7 | Code syntax highlighting theme selector | Low |

### FR-10: Welcome State

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10.1 | Time-based personalized greeting | Medium |
| FR-10.2 | Centered input box on welcome screen | High |
| FR-10.3 | Suggestion chips (Write, Learn, Code, Analyze, Create) | Medium |
| FR-10.4 | Input transitions from center to bottom on first message | Medium |

---

## Non-Functional Requirements

### NFR-1: Security

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1.1 | AWS credentials encrypted with AES-256-GCM | High |
| NFR-1.2 | MCP credentials encrypted with AES-256-GCM | High |
| NFR-1.3 | Passwords hashed with scrypt algorithm | High |
| NFR-1.4 | HTML artifacts rendered in sandboxed iframe | High |
| NFR-1.5 | API routes require valid session token | High |
| NFR-1.6 | Users can only access their own data | High |
| NFR-1.7 | Encryption key stored in environment variable | High |
| NFR-1.8 | Session tokens are cryptographically random | High |

### NFR-2: Performance

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-2.1 | Streaming responses begin within 2 seconds | High |
| NFR-2.2 | Conversation list loads within 500ms | Medium |
| NFR-2.3 | Artifact preview renders within 1 second | Medium |
| NFR-2.4 | Sidebar scrolls smoothly with 100+ conversations | Medium |

### NFR-3: Usability

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-3.1 | Responsive design for desktop, tablet, mobile | High |
| NFR-3.2 | Keyboard shortcuts (Enter to send, Shift+Enter for newline) | High |
| NFR-3.3 | Clear error messages for failed operations | High |
| NFR-3.4 | Loading states for all async operations | Medium |
| NFR-3.5 | Tooltips on interactive elements | Low |

### NFR-4: Reliability

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-4.1 | Graceful handling of AWS Bedrock API errors | High |
| NFR-4.2 | Graceful handling of MCP connection failures | High |
| NFR-4.3 | Auto-retry failed message saves | Medium |
| NFR-4.4 | Session recovery on page refresh | High |

### NFR-5: Maintainability

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-5.1 | TypeScript for all code | High |
| NFR-5.2 | Consistent code style with ESLint | Medium |
| NFR-5.3 | Database migrations via Prisma | High |
| NFR-5.4 | Environment-based configuration | High |

---

## Acceptance Criteria

### AC-1: Authentication

- [ ] User can register with email/password and receive confirmation
- [ ] User can log in and access protected routes
- [ ] Invalid credentials show clear error message
- [ ] Session persists across page refreshes within 30 days
- [ ] User can log out and session is invalidated
- [ ] AWS credentials can be saved and tested successfully

### AC-2: Chat Interface

- [ ] Messages stream in real-time without visible delay
- [ ] Markdown renders correctly (headers, lists, bold, italic, links)
- [ ] Code blocks show syntax highlighting with correct language
- [ ] Stop button halts generation immediately
- [ ] Copy button copies message content to clipboard
- [ ] Regenerate creates new response and replaces previous

### AC-3: Solution Isolation

- [ ] Each solution endpoint has separate API route
- [ ] Conversations created in Manufacturing only appear in Manufacturing sidebar
- [ ] Switching solutions shows only that solution's conversations
- [ ] Solution-specific system prompts are applied to AI requests

### AC-4: Artifacts

- [ ] HTML wrapped in `<artifact>` tags is detected automatically
- [ ] Preview panel opens when artifact is detected
- [ ] Preview renders HTML correctly including CSS and JavaScript
- [ ] Code view shows syntax-highlighted HTML source
- [ ] Download button saves valid .html file
- [ ] Artifact reference card appears in chat message

### AC-5: MCP Integration

- [ ] User can add new MCP server from settings
- [ ] Connection test validates server is reachable
- [ ] Available tools are discovered and displayed
- [ ] MCP toggle appears in chat [+] menu
- [ ] Enabled MCPs provide tools to Claude during chat
- [ ] Tool execution displays name, input, and output

### AC-6: Provider Tools

- [ ] Code execution runs and displays output
- [ ] Web search returns and displays source citations
- [ ] Tools work without user configuration (auto-enabled)

### AC-7: Settings

- [ ] Profile changes save successfully
- [ ] AWS credentials encrypt and decrypt correctly
- [ ] MCP connections persist after page refresh
- [ ] Theme toggle switches between light/dark modes

---

## Out of Scope

The following features are explicitly excluded from this implementation:

- Multi-organization support
- Role-based access control (RBAC)
- Admin panels
- Multiple artifact types (React, SVG, Mermaid, etc.)
- Projects and knowledge base
- Conversation sharing/export
- Analytics and usage tracking
- Multiple AI providers (only AWS Bedrock)
- Prompt library
- Folders/organization features
- Unit testing
- End-to-end testing

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | Next.js 16 with App Router |
| UI Library | React 19 |
| Styling | TailwindCSS v4 |
| UI Components | Prompt Kit (shadcn-based) + Radix UI |
| State Management | React hooks and context |
| Markdown | react-markdown + remark-gfm |
| Code Highlighting | Shiki via Prompt Kit CodeBlock |
| Backend | Next.js API Routes |
| Database | PostgreSQL (local) |
| ORM | Prisma 7.x |
| AI Integration | Vercel AI SDK 6.x |
| AI Provider | AWS Bedrock (@ai-sdk/amazon-bedrock) |
| Encryption | AES-256-GCM (crypto module) |

---

## Database Schema

### Models Required

1. **User** - Authentication and profile
2. **Session** - Session management
3. **Conversation** - Chat conversations per solution
4. **Message** - Chat messages with metadata
5. **Artifact** - HTML artifacts linked to messages
6. **McpConnection** - MCP server configurations
7. **PasswordResetToken** - Password reset flow

*Detailed schema available in `prisma/schema.prisma`*

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | Claude | Initial requirements document |
