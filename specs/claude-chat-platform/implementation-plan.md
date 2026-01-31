# Claude Chat Platform - Implementation Plan

## Overview

This document outlines the phased implementation plan for the Claude Chat Platform. Each phase contains actionable tasks with checkboxes for progress tracking.

**Note:** Testing (unit and E2E) is excluded from this plan and will be addressed separately.

---

## Phase 1: Project Cleanup & Foundation

**Goal:** Clean up existing codebase, simplify artifacts to HTML-only, and establish the foundation for new features.

### 1.1 Artifact System Simplification

- [x] Review current artifact detection in `lib/artifacts.ts`
- [x] Remove support for React artifact type
- [x] Remove support for SVG artifact type
- [x] Remove support for Mermaid artifact type
- [x] Remove support for JSON artifact type
- [x] Remove support for Markdown artifact type
- [x] Keep only HTML and code artifact types
- [x] Update artifact type definitions in TypeScript
- [x] Simplify `ARTIFACT_PROMPT` to only mention HTML artifacts
- [x] Update regex patterns for HTML-only detection
- [x] Update `components/artifact-preview.tsx` to remove non-HTML renderers
- [x] Update `components/artifact-tile.tsx` to simplify type icons
- [x] Remove unused artifact-related dependencies if any

### 1.2 Database Schema Verification

- [x] Review `prisma/schema.prisma` for completeness
- [x] Verify User model has all required fields (AWS credentials, preferences)
- [x] Verify Session model exists with expiry support
- [x] Verify Conversation model has `solutionType` field
- [x] Verify Message model has `parts` and `metadata` JSON fields
- [x] Verify Artifact model exists with proper relations
- [x] Verify McpConnection model has all required fields
- [x] Add any missing indexes for query performance
- [x] Run `npm run db:push` to sync schema
- [x] Verify cascade delete behavior works correctly

### 1.3 Clean Up Deleted/Unused Files

- [x] Review git status for files marked as deleted
- [x] Remove references to deleted solution-specific routes if consolidated
- [x] Clean up any orphaned imports
- [x] Verify `lib/storage.ts` has all required CRUD operations
- [x] Ensure `lib/encryption.ts` is properly implemented

---

## Phase 2: Solution-Specific Architecture

**Goal:** Implement isolated solution experiences with separate sidebars and chat histories.

### 2.1 Solution Route Structure

- [x] Create route structure: `/solutions/[solution]/page.tsx`
- [x] Create Manufacturing solution page at `/solutions/manufacturing`
- [x] Create Maintenance solution page at `/solutions/maintenance`
- [x] Create Support solution page at `/solutions/support`
- [x] Create Change Management solution page at `/solutions/change-management`
- [x] Create Impact Analysis solution page at `/solutions/impact-analysis`
- [x] Create Requirements solution page at `/solutions/requirements`
- [x] Create General chat page at `/chat` (no solution context)
- [x] Implement solution-aware layout wrapper component

### 2.2 Solution-Specific API Endpoints

- [x] Verify/create `app/api/chat/manufacturing/route.ts`
- [x] Verify/create `app/api/chat/maintenance/route.ts`
- [x] Verify/create `app/api/chat/support/route.ts`
- [x] Verify/create `app/api/chat/change-management/route.ts`
- [x] Verify/create `app/api/chat/impact-analysis/route.ts`
- [x] Verify/create `app/api/chat/requirements/route.ts`
- [x] Ensure each endpoint filters conversations by `solutionType`
- [x] Add solution-specific system prompts to each endpoint

### 2.3 Solution-Specific Sidebar

- [x] Modify sidebar component to accept `solutionType` prop
- [x] Filter conversation list by current solution type
- [x] Update "New Chat" button to create solution-specific conversation
- [x] Add solution indicator/header in sidebar
- [x] Implement solution-specific empty state messaging
- [x] Update conversation API to filter by `solutionType` query param

### 2.4 Solution System Prompts

- [x] Create system prompt for Manufacturing (production, yield, forecasting)
- [x] Create system prompt for Maintenance (MTBF, MTTR, reliability)
- [x] Create system prompt for Support (tickets, RCA, troubleshooting)
- [x] Create system prompt for Change Management (ECO, impact tracking)
- [x] Create system prompt for Impact Analysis (ROI, cross-functional)
- [x] Create system prompt for Requirements (validation, dependencies)
- [x] Store prompts in `lib/system-prompts.ts` or similar

### 2.5 Solutions Landing Page

- [x] Update `/solutions` page with cards for each solution
- [x] Add "Start Chat" button linking to solution-specific chat
- [x] Add solution descriptions and use cases
- [x] Style solution cards consistently

---

## Phase 3: Prompt Kit Component Integration

**Goal:** Implement full Prompt Kit component library for enhanced chat UI.

### 3.1 Core Message Components

- [x] Verify `components/prompt-kit/message.tsx` matches Prompt Kit spec
- [x] Implement/verify user message styling (right-aligned, dark bubble)
- [x] Implement/verify assistant message styling (left-aligned, no bubble)
- [x] Add Claude asterisk icon for assistant avatar
- [x] Ensure message actions (copy, thumbs, regenerate) are present

### 3.2 Markdown & Code Components

- [x] Verify `components/prompt-kit/markdown.tsx` renders correctly
- [x] Verify `components/prompt-kit/code-block.tsx` with Shiki highlighting
- [x] Ensure code copy button works
- [x] Add line numbers to code blocks
- [x] Support common languages (javascript, typescript, python, html, css, bash)

### 3.3 Reasoning Component

- [x] Create `components/prompt-kit/reasoning.tsx` if not exists
- [x] Implement collapsible reasoning section
- [x] Show one-line summary when collapsed
- [x] Expand to show full thinking process
- [x] Style with appropriate visual hierarchy
- [x] Integrate with streaming reasoning content

### 3.4 Tool Execution Component

- [x] Create `components/prompt-kit/tool-card.tsx` if not exists
- [x] Display tool name and status indicator
- [x] Show input parameters in formatted JSON/code
- [x] Show output/results after execution
- [x] Support states: loading, success, error, timeout
- [x] Add collapsible details section

### 3.5 Web Search Components

- [x] Create `components/prompt-kit/loader.tsx` (TextShimmer/PulseLoader)
- [x] Create `components/prompt-kit/source.tsx` for search results
- [x] Display "Searching web..." shimmer during search
- [x] Display source cards with title, URL, snippet
- [x] Make source cards clickable to open URLs

### 3.6 Input Components

- [x] Verify `components/prompt-kit/prompt-input.tsx` functionality
- [x] Ensure auto-resize for multiline input
- [x] Add [+] button with dropdown menu
- [x] Add model selector dropdown integration
- [x] Add send button with proper styling
- [x] Implement keyboard shortcuts (Enter, Shift+Enter)

### 3.7 Suggestion Chips

- [x] Create `components/prompt-kit/prompt-suggestion.tsx`
- [x] Implement suggestion chip styling
- [x] Add default suggestions: Write, Learn, Code, Analyze, Create
- [x] Handle chip click to populate input
- [x] Show on welcome state only

### 3.8 Scroll & Navigation

- [x] Verify `components/prompt-kit/scroll-button.tsx` works
- [x] Floating scroll-to-bottom button appears when scrolled up
- [x] Smooth scroll animation on click
- [x] Hide button when at bottom of chat

### 3.9 Feedback Components

- [x] Create `components/prompt-kit/feedback-bar.tsx` if not exists
- [x] Implement thumbs up/down buttons
- [x] Add visual feedback on selection
- [x] Store feedback in message metadata

---

## Phase 4: MCP Integration

**Goal:** Implement full MCP (Model Context Protocol) connection management and tool integration.

### 4.1 MCP Settings UI

- [x] Create `app/settings/page.tsx` with tabs layout
- [x] Add "MCP Connectors" tab to settings
- [x] Create MCP connections list component
- [x] Display each connection with name, URL, status
- [x] Add status indicators (green=connected, red=error, gray=disconnected)
- [x] Add "Connect" button for each connection
- [x] Add edit and delete actions per connection

### 4.2 Add MCP Server Dialog

- [x] Create "Add custom connector" dialog/modal
- [x] Add Name input field
- [x] Add Remote MCP server URL input field
- [x] Add "Advanced settings" collapsible section
- [x] Add OAuth Client ID field (optional)
- [x] Add OAuth Client Secret field (optional)
- [x] Add warning text about trusting developers
- [x] Add Cancel and Add buttons
- [x] Validate inputs before submission

### 4.3 MCP Connection API

- [x] Create `app/api/mcp/connections/route.ts` for list/create
- [x] Create `app/api/mcp/connections/[id]/route.ts` for get/update/delete
- [x] Create `app/api/mcp/connections/[id]/test/route.ts` for testing
- [x] Create `app/api/mcp/connections/[id]/discover/route.ts` for tool discovery
- [x] Implement connection testing logic
- [x] Implement tool discovery from MCP server
- [x] Encrypt credentials before storing
- [x] Return appropriate error messages

### 4.4 MCP Tool Discovery

- [x] Implement MCP client connection logic
- [x] Call MCP server's tool listing endpoint
- [x] Parse tool schemas (name, description, parameters)
- [x] Store discovered tools in `available_tools` JSON field
- [x] Handle discovery errors gracefully
- [x] Update tools on reconnection

### 4.5 In-Chat MCP Toggle

- [x] Add MCP submenu to [+] dropdown in chat input
- [x] List all configured MCP connections
- [x] Show ON/OFF toggle for each connection
- [x] Display connection status indicator
- [x] Save active MCP IDs to conversation
- [x] Show badge count of active MCPs
- [x] Add "Manage Connections" link to settings

### 4.6 MCP Tool Execution in Chat

- [x] Load active MCP connections for conversation
- [x] Connect to each active MCP server
- [x] Build tools object for AI SDK
- [x] Pass MCP tools to `streamText` call
- [x] Handle tool execution requests from Claude
- [x] Display tool execution using Tool component
- [x] Handle execution errors gracefully

---

## Phase 5: Provider-Native Tools

**Goal:** Enable AWS Bedrock's built-in code execution and web search tools.

### 5.1 Code Execution Tool

- [x] Research AWS Bedrock code execution tool configuration
- [x] Create `lib/code-executor.ts` with math and utility tools
- [x] Configure tool in `streamText` API calls
- [x] Handle code execution results in response
- [x] Parse and display code execution output
- [x] Show executed code with syntax highlighting
- [x] Show execution output/results
- [x] Handle execution errors

### 5.2 Web Search Tool

- [x] Implement web search tool definition
- [x] Configure tool in `streamText` API calls
- [x] Handle web search results in response
- [x] Display TextShimmer during search
- [x] Parse search result sources
- [x] Display Source components with citations
- Note: Full web search integration requires external API (Tavily, Serper, etc.)

### 5.3 Tool Display Integration

- [x] Update chat message rendering to detect tool calls
- [x] Render Tool component for code execution
- [x] Render Source components for web search results
- [x] Ensure tools display inline with assistant message
- [x] Handle multiple tool calls in single response

---

## Phase 6: HTML Artifact System

**Goal:** Implement complete HTML artifact detection, preview, and storage.

### 6.1 Artifact Detection

- [x] Update `lib/artifacts.ts` with HTML-only detection
- [x] Implement `<artifact>` tag parsing regex
- [x] Extract type, title, and content from tags
- [x] Implement auto-detection for HTML without explicit tags
- [x] Handle partial tags during streaming
- [x] Return structured artifact objects

### 6.2 Artifact Preview Panel

- [x] Update `components/artifact-preview.tsx` for HTML-only
- [x] Implement Preview/Code tab toggle
- [x] Create sandboxed iframe for preview
- [x] Set iframe sandbox attributes for security
- [x] Implement code view with syntax highlighting (react-syntax-highlighter)
- [x] Add Copy Code button
- [x] Add Download HTML button
- [x] Add close button to return to full chat
- [x] Implement responsive panel sizing (50/50 split with react-resizable-panels)

### 6.3 Inline Artifact Reference

- [x] Update `components/artifact-tile.tsx` for HTML-only
- [x] Display artifact icon and title
- [x] Show "HTML" type badge
- [x] Add "Open Preview" button
- [x] Click anywhere opens artifact panel
- [x] Style as compact reference card

### 6.4 Artifact Storage

- [x] Implement artifact save in chat route handlers
- [x] Save artifact with conversationId, messageId, userId
- [x] Store full HTML content
- [x] Update artifact on regeneration
- [x] Load artifacts with conversation messages
- [x] Create API endpoint for artifact retrieval (`/api/artifacts`)
- [x] Implement artifact deletion cascade (via Prisma schema)

### 6.5 Artifact Panel Behavior

- [x] Auto-open panel when artifact detected during streaming
- [x] Animate panel slide-in (via react-resizable-panels)
- [x] Narrow chat area when panel open (resizable)
- [x] Remember panel state (open/closed)
- [x] Handle mobile view (MobileArtifactPreview component)
- [x] Support multiple artifacts (navigation between artifacts)

---

## Phase 7: Chat Experience Enhancement

**Status: Completed**

**Goal:** Polish the chat interface with welcome state, streaming improvements, and UX refinements.

### 7.1 Welcome State

- [x] Create welcome state component for empty chat (`components/prompt-kit/welcome-state.tsx`)
- [x] Implement time-based greeting logic (getTimeBasedGreeting function)
- [x] Display personalized greeting with user name
- [x] Center input box on welcome screen
- [x] Display suggestion chips below input
- [x] Animate transition when first message sent
- [x] Move input from center to bottom (sticky)
- [x] Hide greeting and suggestions on transition

### 7.2 Streaming Experience

- [x] Verify PulseLoader displays during initial response
- [x] Ensure text streams progressively
- [x] Implement stop button functionality
- [x] Stream reasoning section in real-time
- [x] Stream tool execution progress
- [x] Handle stream interruption gracefully
- [x] Save partial messages on interruption

### 7.3 Message Actions

- [x] Implement copy message functionality
- [x] Implement regenerate response functionality (`retryLastMessage`)
- [x] Implement upvote/downvote feedback (`FeedbackBar` component)
- [x] Store feedback in message metadata (`/api/messages/feedback`)
- [x] Add visual feedback on action click
- [x] Handle regeneration with loading state

### 7.4 Conversation Title Generation

- [x] Auto-generate title after first exchange (`/api/conversations/[id]/title`)
- [x] Use Claude to create concise title (Haiku model)
- [x] Make title generation async (non-blocking)
- [x] Fall back to "New Conversation" on failure
- [x] Allow manual title editing
- [x] Save edited titles immediately

### 7.5 Keyboard Shortcuts

- [x] Enter sends message
- [x] Shift+Enter inserts newline
- [x] Escape clears input/closes panel
- [x] Ctrl/Cmd+K for new chat
- [x] Ctrl/Cmd+, opens settings
- [x] Keyboard shortcuts hook created (`hooks/use-keyboard-shortcuts.tsx`)

---

## Phase 8: Settings & User Preferences

**Status: Completed**

**Goal:** Implement comprehensive settings pages for profile, AWS, MCP, and appearance.

### 8.1 Settings Layout

- [x] Create `/settings` page with tabs navigation
- [x] Implement Profile tab
- [x] Implement AWS Bedrock tab
- [x] Implement MCP Connectors tab (from Phase 4)
- [x] Implement Appearance tab
- [x] Style tabs consistently with Prompt Kit

### 8.2 Profile Settings

- [x] Display and edit user name
- [x] Display email (read-only)
- [x] Implement avatar upload functionality (URL-based)
- [x] Save avatar to storage
- [x] Implement password change form (`/api/auth/change-password`)
- [x] Add delete account option with confirmation

### 8.3 AWS Bedrock Settings

- [x] Display AWS Access Key ID input
- [x] Display AWS Secret Access Key input (with show/hide)
- [x] Display AWS Region selector
- [x] Implement "Test Connection" button
- [x] Show connection test results with status indicators
- [x] Save encrypted credentials on submit
- [x] Add link to AWS credentials documentation
- [x] Show existing credentials status when configured

### 8.4 Appearance Settings

- [x] Implement theme toggle (Light/Dark/System)
- [x] Implement font size slider (14px-20px)
- [x] Implement code theme selector (GitHub Dark, One Dark Pro, Dracula)
- [x] Save preferences to localStorage
- [x] Apply preferences on page load
- [x] Update UI immediately on change

---

## Phase 9: Authentication Hardening

**Status: Completed**

**Goal:** Strengthen the authentication system for production readiness.

### 9.1 Session Security

- [x] Review session token generation (crypto-random via `generateToken()`)
- [x] Verify 30-day expiry is enforced
- [x] Implement session invalidation on password change
- [x] Add session cleanup for expired tokens (`cleanupExpiredSessions()`)
- [x] Consider HTTP-only cookie option for tokens (documented for future)

### 9.2 Password Reset Flow

- [x] Create password reset request API (`/api/auth/password-reset`)
- [x] Generate secure reset tokens (64-char hex)
- [x] Password reset confirmation API (`/api/auth/password-reset/confirm`)
- [x] Validate reset token with 1-hour expiry
- [x] Update password and invalidate token
- [x] Invalidate all sessions on reset
- [x] Change password API (`/api/auth/change-password`)

### 9.3 API Route Protection

- [x] Create authentication middleware (`lib/auth-middleware.ts`)
- [x] Verify session token on all protected routes (`validateSession()`)
- [x] Extract user ID from valid sessions
- [x] Return 401 for invalid/expired sessions
- [x] Helper functions: `withAuth()`, `requireAuth()`, `getUserFromRequest()`

### 9.4 Input Validation

- [x] Add Zod schemas for API request bodies (`lib/validation.ts`)
- [x] Validate email format on registration (`EmailSchema`)
- [x] Validate password strength requirements (`PasswordSchema`)
- [x] Schemas: RegisterSchema, LoginSchema, PasswordResetSchema, etc.
- [x] Return clear validation error messages (`formatValidationErrors()`)

---

## Phase 10: Final Polish & Integration

**Goal:** Complete final integrations, fix edge cases, and prepare for production.

### 10.1 Error Handling

- [ ] Add error boundaries to React components
- [ ] Implement user-friendly error messages
- [ ] Handle AWS Bedrock rate limits
- [ ] Handle MCP connection timeouts
- [ ] Handle network disconnection gracefully
- [ ] Add retry logic for transient failures

### 10.2 Loading States

- [ ] Add skeleton loaders for conversation list
- [ ] Add loading state for settings save
- [ ] Add loading state for MCP operations
- [ ] Add loading state for artifact panel
- [ ] Ensure no UI flickers during loading

### 10.3 Responsive Design

- [ ] Test and fix desktop layout
- [ ] Test and fix tablet layout
- [ ] Test and fix mobile layout
- [ ] Implement collapsible sidebar on mobile
- [ ] Implement full-screen artifact panel on mobile
- [ ] Ensure touch-friendly interactions

### 10.4 Accessibility

- [ ] Add ARIA labels to interactive elements
- [ ] Ensure keyboard navigation works
- [ ] Test with screen reader
- [ ] Ensure sufficient color contrast
- [ ] Add focus indicators

### 10.5 Performance

- [ ] Optimize conversation list rendering
- [ ] Implement virtual scrolling if needed
- [ ] Optimize database queries with indexes
- [ ] Add caching where appropriate
- [ ] Review bundle size

### 10.6 Documentation

- [ ] Update CLAUDE.md with new features
- [ ] Document API endpoints
- [ ] Document MCP integration process
- [ ] Create user guide for settings

---

## Progress Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project Cleanup & Foundation | **Completed** |
| 2 | Solution-Specific Architecture | **Completed** |
| 3 | Prompt Kit Component Integration | **Completed** |
| 4 | MCP Integration | **Completed** |
| 5 | Provider-Native Tools | **Completed** |
| 6 | HTML Artifact System | **Completed** |
| 7 | Chat Experience Enhancement | Not Started |
| 8 | Settings & User Preferences | Partially Done (via Phase 4) |
| 9 | Authentication Hardening | Not Started |
| 10 | Final Polish & Integration | Not Started |

---

## Dependencies Between Phases

```
Phase 1 (Cleanup) ─────────────────────────────────────────────────────────────►
     │
     ├──► Phase 2 (Solutions) ──► Phase 7 (Chat Enhancement)
     │
     ├──► Phase 3 (Prompt Kit) ──► Phase 5 (Provider Tools)
     │                        └──► Phase 6 (Artifacts)
     │
     ├──► Phase 4 (MCP) ──────────► Phase 5 (Provider Tools)
     │
     └──► Phase 8 (Settings) ──► Phase 9 (Auth Hardening)
                             └──► Phase 10 (Final Polish)
```

**Recommended Order:**
1. Phase 1 (Foundation)
2. Phase 2 (Solutions) - can run parallel with Phase 3
3. Phase 3 (Prompt Kit)
4. Phase 4 (MCP)
5. Phase 5 (Provider Tools)
6. Phase 6 (Artifacts)
7. Phase 7 (Chat Enhancement)
8. Phase 8 (Settings)
9. Phase 9 (Auth Hardening)
10. Phase 10 (Final Polish)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | Claude | Initial implementation plan |
| 1.1 | 2026-01-30 | Claude | Completed Phases 1, 2, 3 - marked all tasks as done |
| 1.2 | 2026-01-30 | Claude | Verified Phases 4, 5, 6 - all tasks confirmed implemented |
| 1.3 | 2026-01-30 | Claude | Completed Phases 7, 8, 9 - chat enhancements, settings, and auth hardening |
