# Codebase Concerns

**Analysis Date:** 2026-02-26

## Tech Debt

**Large Component Complexity:**
- Files: `components/full-chat-app.tsx` (2186 LOC), `components/settings-modal.tsx` (1011 LOC), `components/artifact-preview.tsx` (864 LOC)
- Impact: Hard to test, maintain, and reason about. Single component handles state management, rendering, sidebar navigation, settings, and chat logic together.
- Fix approach: Break into smaller, composable components. Extract conversation management into custom hook. Extract settings into separate context provider. Create separate Sidebar component with full state isolation.

**Oversized Chat Route:**
- Files: `app/api/chat/route.ts` (516 LOC)
- Impact: Difficult to test individual concerns (tool loading, streaming, context window fitting, MCP integration). Single POST handler contains all chat logic.
- Fix approach: Extract MCP tool loading into separate service. Create standalone context-window fitting utility. Extract system prompt building. Create helper for thinking mode detection. Use composition pattern to chain concerns.

**MCP Tool Integration Complexity:**
- Files: `lib/mcp-client.ts` (16515 bytes, complex integration logic)
- Impact: MCP tool loading and execution tightly coupled with error handling. No clear separation between discovery, validation, and execution phases.
- Fix approach: Create MCP service layer with separate methods for each phase. Add comprehensive error recovery for partial tool failures. Separate tool schema validation from execution.

## Known Bugs

**Missing DEBUG Logging Removal:**
- Files: `app/api/chat/route.ts` (lines 104-137)
- Symptoms: Console logs remain in production code with format `console.log('[Chat] activeMcpIds...')`, `console.log('[Chat] Attempting to load MCP tools...')`, `console.log('[Chat] Available tools...')`
- Impact: Exposes internal state/ids to logs; increases log verbosity in production; may reveal user data
- Workaround: Search logs and filter by `[Chat]` prefix
- Fix approach: Remove all `console.log` calls from route handlers. Replace with structured logging that respects log level configuration. Keep `console.error` for actual errors only.

**Error Handling in Context Window Fitting:**
- Files: `lib/context-window.ts`, `app/api/chat/route.ts`
- Symptoms: Context window trimming happens silently; no logging of how many messages were dropped or tokens saved. If trimming fails, user doesn't know conversation is corrupted.
- Impact: Silent data loss when conversation exceeds context window. User may not realize messages were truncated.
- Fix approach: Add validation after trimming. Log when >10% of messages removed. Return warning in response if trimming occurred. Add test coverage for edge cases (all messages identical, very long single message).

**Race Condition in Conversation Create:**
- Files: `app/api/chat/route.ts` (lines 65-84)
- Symptoms: When user sends message to conversation, message is saved with `addMessage()` but if save fails, user doesn't receive error feedback. They may think message was sent.
- Impact: Data loss - user message lost if database fails. No transaction boundary around message save and response streaming.
- Fix approach: Wrap user message save in try-catch with explicit error response. Consider transactional saves (save message only after stream completes successfully). Add message queue for resilience.

**Session Expiration Not Checked Consistently:**
- Files: `lib/auth-middleware.ts` (line 65), individual route handlers
- Symptoms: Session expiration is checked in `validateSession()` but some routes may not call this. If session expires mid-stream (5-minute chat), response continues without re-auth.
- Impact: After session expires, user can continue using app with old token. Security boundary violation.
- Fix approach: Middleware-level session refresh/validation. Add periodic session checks during long streams. Client-side session expiry polling.

## Security Considerations

**Encryption Key Validation Too Strict:**
- Files: `lib/encryption.ts` (lines 10-23)
- Risk: `KEY_ENCRYPTION_SECRET` must be exactly 64 hex characters. If missing or wrong length, app crashes at runtime (throws Error). No fallback or safe defaults.
- Current mitigation: Environment validation at startup would catch this
- Recommendations: Add startup validation that checks encryption key before accepting requests. Return 503 Service Unavailable if key is invalid. Add warning logs before crash.

**No Rate Limiting on Authentication Endpoints:**
- Files: `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/password-reset/route.ts`
- Risk: Brute force attacks possible on login. No throttling per IP/email. API key is also unprotected.
- Current mitigation: None noted in code
- Recommendations: Implement rate limiting (e.g., 5 attempts per 15 minutes per IP). Add CAPTCHA after N failed attempts. Log failed auth attempts. Consider IP-based blocking after repeated failures.

**CORS and CSP Headers Missing:**
- Files: Global API configuration
- Risk: Cross-site request forgery possible. No Content Security Policy means XSS can access all resources.
- Current mitigation: None
- Recommendations: Add CORS middleware limiting to frontend origin. Add strict CSP header. Whitelist only necessary external resources (Anthropic API, fonts).

**Session Tokens Stored in LocalStorage:**
- Files: `app/page.tsx`, `app/chat/page.tsx` (session retrieval patterns)
- Risk: XSS attacks can steal session tokens from localStorage. No httpOnly flag possible (localStorage is JS-accessible).
- Current mitigation: HTTPS assumed
- Recommendations: Move to httpOnly cookies if possible (requires HTTPS). Add token rotation on sensitive operations. Implement short session timeouts (currently 30 days is very long). Add session invalidation on logout.

**No Input Validation on MCP Tool Arguments:**
- Files: `lib/mcp-client.ts`
- Risk: MCP tool arguments passed directly to external servers. No validation of tool input schemas. Malicious server could request arbitrary data through tool parameters.
- Current mitigation: None observed
- Recommendations: Validate tool input against schema before execution. Whitelist allowed parameter types. Add input size limits. Log all external tool calls for audit.

**Anthropic API Key Encrypted But Not Fully Secured:**
- Files: `lib/encryption.ts`, `app/api/user/anthropic/route.ts`
- Risk: API keys encrypted at rest but must be decrypted to use. If database is compromised, decryption key from `.env` can decrypt all keys. No per-user key derivation.
- Current mitigation: Environment variable protection
- Recommendations: Use per-user salt for key derivation. Implement key escrow or hardware security module integration. Add audit logging for key access. Consider OAuth instead of key storage.

## Performance Bottlenecks

**Context Window Estimation Rough (4 chars = 1 token):**
- Files: `lib/context-window.ts` (lines 39-41)
- Problem: Token estimation uses fixed 1:4 character-to-token ratio. Actual tokens vary by ~20% depending on content (many short words = fewer tokens, code = more tokens).
- Impact: Context window fits may fail unpredictably. Messages get dropped when they could fit. Or overflow occurs causing API errors.
- Improvement path: Use actual tokenizer library (js-tiktoken for Anthropic). Cache token counts. Add buffer for safety.

**Full Message Re-serialization on Every API Call:**
- Files: `app/api/chat/route.ts` (line 128: `convertToModelMessages()`)
- Problem: All UI messages converted to model messages on every chat request. No caching of parsed message format.
- Impact: If conversation has 100 messages, parsing happens 100x per request. Inefficient for long conversations.
- Improvement path: Cache parsed message format in database or client. Use incremental parsing (parse only new messages). Implement message compression for storage.

**MCP Tool Discovery Called Every Chat:**
- Files: `app/api/chat/route.ts` (lines 108-124)
- Problem: `loadActiveMcpToolsWithDescriptions()` fetches tool schemas from all connected MCP servers on every chat message. Schemas rarely change.
- Impact: Adds 2-5 seconds latency per chat message. Network I/O bottleneck.
- Improvement path: Cache tool schemas in database with TTL (24 hours). Validate cache against server on first use only. Provide manual refresh button in UI.

**No Database Query Optimization:**
- Files: `lib/storage.ts`, various API routes
- Problem: Conversations and messages fetched without explicit `select` clause. All fields returned even if only subset needed. No query batching.
- Impact: Slower response times, higher memory usage. Especially noticeable with many conversations or long message lists.
- Improvement path: Use Prisma `select` to return only needed fields. Implement batch loaders for N+1 query prevention. Add query caching layer.

**Artifact Preview Component May Load Large Files:**
- Files: `components/artifact-preview.tsx` (864 LOC)
- Problem: PPTX/DOCX/XLSX viewers load entire files into memory. No streaming or pagination.
- Impact: Very large files (>100MB) cause client-side crash. Server sends full file even if user only views first page.
- Improvement path: Implement virtual scrolling for large sheets. Add file size validation. Stream file content from server. Show progress indicator.

## Fragile Areas

**Message Parts Parsing:**
- Files: `app/api/chat/route.ts` (lines 70-75)
- Why fragile: Manual array filtering and text extraction from `lastUserMessage.parts`. If Vercel AI SDK changes message shape, this breaks silently.
- Safe modification: Add type guard and validation. Extract to separate function with tests. Handle null/undefined parts gracefully.
- Test coverage: No visible tests for message parts extraction. Missing edge cases (empty parts, mixed content types).

**Artifact Extraction from Stream:**
- Files: `lib/artifact-parser.ts`, `components/full-chat-app.tsx`
- Why fragile: Regex-based artifact detection (`<artifact>` tags). Claude may generate variations. If format changes, artifacts won't be detected.
- Safe modification: Add fallback detection patterns. Log unmatched artifacts. Validate extracted XML structure. Add test cases for edge cases (nested tags, special characters, missing closing tags).
- Test coverage: Limited visible tests. Edge cases untested (artifact with code containing `</artifact>` in string).

**Thinking Mode Detection:**
- Files: `app/api/chat/route.ts` (lines 14-33)
- Why fragile: Hardcoded model IDs in arrays. If Anthropic adds new model or changes naming, thinking mode breaks.
- Safe modification: Move model lists to configuration. Check Anthropic SDK for model capabilities. Add logging when model not recognized.
- Test coverage: No tests for model version handling. May fail silently with new model versions.

**File Type Classification:**
- Files: `lib/file-classifier.ts`
- Why fragile: MIME type detection and viewer selection via string matching. Custom file formats or unusual MIME types fail silently.
- Safe modification: Add exhaustive type checking. Handle unknown MIME types gracefully (download instead of preview). Add fallback preview.
- Test coverage: Missing tests for edge cases (fake MIME types, binary files with text extensions).

**MCP Tool Error Recovery:**
- Files: `lib/mcp-client.ts`, `app/api/chat/route.ts` (lines 121-123)
- Why fragile: If MCP server fails, tool loading silently fails with generic error log. No user feedback. Chat may proceed with wrong tool set.
- Safe modification: Differentiate connection errors from tool discovery errors. Notify frontend of tool availability. Allow chat to continue with degraded tool set. Log server-specific errors.
- Test coverage: No visible error scenario tests. Edge cases (server timeout, malformed tool schema, empty tool list) untested.

**Session Token Expiry Boundary:**
- Files: `lib/auth-middleware.ts` (line 65)
- Why fragile: `session.expiresAt < new Date()` exact comparison. Timezone issues or clock skew could cause edge case failures. No grace period.
- Safe modification: Add 30-second grace period for clock skew. Use millisecond precision. Add telemetry for expiry boundary hits.
- Test coverage: No visible tests for expiry logic. Edge case (session expires during request) untested.

## Scaling Limits

**Message History Limited by Context Window:**
- Current capacity: 200K tokens context (approx 50K words). With 65K output tokens max, effectively 135K tokens available for history.
- Limit: At ~4 chars/token, that's ~540KB of conversation history before truncation.
- Scaling path: Implement message summarization (summarize old messages to retain context). Use retrieval-augmented generation (RAG) to fetch relevant past context. Archive old conversations separately. Implement message pruning strategy.

**Database Scaling Without Pagination:**
- Current capacity: Single conversation can have unlimited messages. No pagination on `GET /api/conversations/[id]` messages endpoint.
- Limit: Loading 10,000+ messages kills performance. Memory usage grows with message count.
- Scaling path: Implement cursor-based pagination (100 messages per page). Add message archival. Implement lazy loading in UI.

**MCP Tool Discovery Linear Time:**
- Current capacity: Tool discovery per server is serial. If 10 connections defined, ~10 network requests.
- Limit: 10 connections × 2 second timeout each = 20 second chat latency.
- Scaling path: Parallelize tool discovery with `Promise.all()`. Implement server-side tool discovery cache. Add timeout aggregation (fail fast if one server timeout).

**Frontend State Management Not Optimized:**
- Current capacity: All conversations loaded into state at once. With 1000+ conversations, state object becomes very large.
- Limit: App slows down with many conversations. Memory usage on client grows linearly.
- Scaling path: Implement lazy loading (load 50 conversations at a time). Add server-side search/filter. Use virtualized list for conversations.

**Session Table Growth Unlimited:**
- Current capacity: One session per login per device. No cleanup of old sessions.
- Limit: Over time, sessions table grows unbounded. Old/expired sessions persist forever.
- Scaling path: Implement cleanup job (`cleanupExpiredSessions()` exists but may not be scheduled). Add index on `expiresAt` for efficient cleanup. Archive old sessions.

## Dependencies at Risk

**Next.js 16 (Latest):**
- Risk: Latest major version. May introduce breaking changes in minor updates. App Router still relatively new compared to Pages Router.
- Impact: Updates could require codebase refactoring. Limited community resources for troubleshooting.
- Migration plan: Monitor release notes. Pin major version. Consider feature flags for experimental features.

**Vercel AI SDK v6.0.97:**
- Risk: `useChat` hook and `streamText` are core to streaming chat. If API changes, entire chat flow breaks.
- Impact: Dependency on Vercel's SDK evolution. Limited alternatives for streaming in Next.js.
- Migration plan: Monitor breaking changes. Consider wrapper around `useChat` for isolation. Evaluate alternatives (LangChain, etc.).

**Prisma 7.3.0:**
- Risk: ORM updates could introduce performance regressions or breaking query changes.
- Impact: Database access patterns may break. Migration required to upgrade.
- Migration plan: Test migrations in staging first. Monitor raw SQL performance. Keep detailed schema docs.

**Radix UI (Unpinned):**
- Risk: Component library updates may cause styling or accessibility breaks.
- Impact: UI could break unexpectedly. Component behavior may change.
- Migration plan: Pin major version. Test on upgrade. Monitor accessibility reports.

**TailwindCSS v4 (Latest):**
- Risk: Latest version. Custom CSS variable system may conflict with TailwindCSS defaults.
- Impact: Styling could break unexpectedly. Build times may increase.
- Migration plan: Test build. Monitor CSS file size. Consider pinning if stability issues emerge.

## Missing Critical Features

**Rate Limiting:**
- Problem: No protection against API abuse. Users could hammer endpoints or exhaust tokens.
- Blocks: Security hardening. Production deployment recommendation.
- Fix approach: Add rate limiting middleware (e.g., `ratelimit` package). Limit by IP and by user. Implement token bucket algorithm.

**CORS Configuration:**
- Problem: CORS not configured. Frontend may be able to make cross-origin requests if deployed separately.
- Blocks: Frontend/backend separation. Security hardening.
- Fix approach: Add CORS middleware. Whitelist frontend origin. Handle preflight requests.

**CSP Headers:**
- Problem: Content Security Policy not set. XSS attacks could access all resources.
- Blocks: Security hardening. Production deployment.
- Fix approach: Add CSP middleware. Start with strict policy. Gradually allow necessary resources.

**Audit Logging:**
- Problem: No audit trail of user actions. Can't investigate security incidents or compliance violations.
- Blocks: Compliance (HIPAA, GDPR, SOC 2). Incident investigation.
- Fix approach: Add audit log table. Log all sensitive operations (auth, API key changes, message access). Implement log immutability.

**Message Encryption at Rest:**
- Problem: Messages stored in plain text in database. If database is breached, all conversation history exposed.
- Blocks: Data privacy. Compliance requirements.
- Fix approach: Encrypt message content at rest (using user's encryption key derived from password). Implement end-to-end encryption option.

**Background Jobs/Scheduling:**
- Problem: No background job system. Cleanup tasks (expired sessions, old artifacts) must run inline.
- Blocks: Performance optimization. Scheduled maintenance.
- Fix approach: Implement Bull/BullMQ job queue. Add scheduled cleanup. Implement async email notifications.

## Test Coverage Gaps

**Authentication Flow:**
- What's not tested: Registration with duplicate email, password reset with expired token, session expiration during request
- Files: `app/api/auth/` routes
- Risk: Auth vulnerabilities could be missed. Session handling edge cases uncovered.
- Priority: High

**Chat Streaming with MCP Tools:**
- What's not tested: MCP tool failure during stream, tool discovery timeout, malformed tool schema
- Files: `app/api/chat/route.ts`, `lib/mcp-client.ts`
- Risk: Production failures if MCP server fails. Unclear error messages to user.
- Priority: High

**Context Window Trimming:**
- What's not tested: Edge cases (single very long message, all identical messages, mixed content types), actual token overflow
- Files: `lib/context-window.ts`
- Risk: Silent data loss when messages dropped. Messages could overflow context window.
- Priority: High

**Artifact Extraction and Parsing:**
- What's not tested: Malformed XML, nested artifacts, artifacts with special characters, edge cases in regex
- Files: `lib/artifact-parser.ts`
- Risk: Artifacts fail silently. Claude output with edge cases loses artifact content.
- Priority: Medium

**File Upload and Preview:**
- What's not tested: Large files (>100MB), corrupted files, unusual MIME types, concurrent uploads
- Files: `components/full-chat-app.tsx`, `components/viewers/`
- Risk: App crashes on large files. Unusual formats cause preview failures.
- Priority: Medium

**Database Transaction Safety:**
- What's not tested: Concurrent message saves, transaction rollback, orphaned records
- Files: `lib/storage.ts`, API routes
- Risk: Data inconsistency. Messages saved without corresponding conversation. Orphaned artifacts.
- Priority: Medium

**Error Handling in API Routes:**
- What's not tested: Database connection failures, timeout errors, rate limit errors from Anthropic API
- Files: All `/api/` routes
- Risk: Unclear error messages. No distinction between client errors and server errors.
- Priority: Medium

**Keyboard Shortcuts:**
- What's not tested: Shortcut conflicts, modifier key combinations, non-US keyboard layouts
- Files: `hooks/use-keyboard-shortcuts.tsx`
- Risk: Shortcuts may not work on some keyboards. Conflicts with browser shortcuts.
- Priority: Low

---

*Concerns audit: 2026-02-26*
