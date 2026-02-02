# Backend API Documentation - Athena MCP

## Quick Reference

| Item | Value |
|------|-------|
| **Framework** | Next.js 16 API Routes |
| **Database** | PostgreSQL + Prisma 7.3.0 |
| **AI Provider** | AWS Bedrock via Vercel AI SDK |
| **Authentication** | Bearer token + Session table |
| **Encryption** | AES-256-GCM (credentials), scrypt (passwords) |
| **Validation** | Zod schemas |

## Directory Structure

```
app/api/
├── auth/                          # Authentication
│   ├── register/route.ts         # POST - Create account
│   ├── login/route.ts            # POST - Get session token
│   ├── logout/route.ts           # POST - Invalidate session
│   ├── me/route.ts               # GET - Current user info
│   ├── change-password/route.ts  # POST - Change password
│   └── password-reset/
│       ├── route.ts              # POST - Request reset
│       └── confirm/route.ts      # POST - Confirm reset
├── chat/                          # AI Chat
│   ├── route.ts                  # General chat (no domain context)
│   ├── manufacturing/route.ts    # Manufacturing-specific
│   ├── maintenance/route.ts      # Maintenance-specific
│   ├── support/route.ts          # Support-specific
│   ├── change-management/route.ts # Change management
│   ├── impact-analysis/route.ts  # Impact analysis
│   └── requirements/route.ts     # Requirements
├── conversations/                 # Conversation CRUD
│   ├── route.ts                  # GET list, POST create
│   └── [id]/
│       ├── route.ts              # GET, PATCH, DELETE single
│       ├── title/route.ts        # PATCH title only
│       └── messages/
│           └── route.ts          # GET, POST, DELETE messages
├── mcp/                           # MCP Connections
│   └── connections/
│       ├── route.ts              # GET list, POST create
│       └── [id]/
│           ├── route.ts          # GET, PATCH, DELETE
│           ├── discover/route.ts # POST - Discover tools
│           └── test/route.ts     # POST - Test connection
├── user/                          # User Settings
│   ├── settings/route.ts         # GET, PATCH preferences
│   └── aws/
│       ├── route.ts              # GET, POST credentials
│       └── test/route.ts         # POST - Test credentials
├── artifacts/                     # Artifacts
│   ├── route.ts                  # POST create
│   └── [id]/route.ts             # GET, PATCH, DELETE
└── messages/
    └── feedback/route.ts         # POST - Message feedback

lib/
├── db.ts                         # Prisma client singleton
├── storage.ts                    # Database CRUD operations
├── auth-middleware.ts            # Authentication utilities
├── validation.ts                 # Zod schemas
├── encryption.ts                 # AES-256-GCM + scrypt
├── bedrock.ts                    # AWS Bedrock client
├── system-prompts.ts             # Solution-specific prompts
├── artifacts.ts                  # Artifact parsing
├── mcp-client.ts                 # MCP tool execution
├── code-executor.ts              # Math & search tools
└── api-utils.ts                  # HTTP, retry, errors
```

## Authentication

### How It Works

1. User registers/logs in → Session created (30-day expiry)
2. Token stored in `Session` table with userId
3. Frontend stores token in localStorage
4. All requests include `Authorization: Bearer <token>`
5. Backend validates token via `requireAuth()` middleware

### Auth Middleware (`lib/auth-middleware.ts`)

```typescript
// Validate session and get user
const { user, error } = await validateSession(request)
if (error) return unauthorizedResponse(error)

// Or use helper
const authResult = await requireAuth(request)
if (authResult instanceof Response) return authResult
const { user } = authResult

// Higher-order function wrapper
export const withAuth = (handler) => async (req) => {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  return handler(req, auth)
}
```

### Password Hashing (`lib/encryption.ts`)

```typescript
// Hash password with scrypt
const hash = await hashPassword(plaintext)  // Returns "salt:derivedKey" (hex)

// Verify password (timing-safe)
const isValid = await verifyPassword(plaintext, hash)
```

### Credential Encryption (`lib/encryption.ts`)

```typescript
// Encrypt sensitive data (AWS keys, MCP credentials)
const encrypted = encrypt(plaintext)  // Returns "iv:authTag:encrypted" (hex)

// Decrypt
const decrypted = decrypt(encrypted)
```

## API Endpoints

### Authentication

#### POST /api/auth/register
Create new user account.
```typescript
// Request
{ email: string, password: string, name?: string }

// Response 201
{ user: { id, email, name }, token: string }

// Errors: 400 (validation), 409 (email exists)
```

#### POST /api/auth/login
Authenticate and get session token.
```typescript
// Request
{ email: string, password: string }

// Response 200
{ user: { id, email, name }, token: string }

// Errors: 400 (validation), 401 (invalid credentials)
```

#### POST /api/auth/logout
Invalidate session token. Requires Bearer token.
```typescript
// Response 200
{ success: true }
```

#### GET /api/auth/me
Get current user info. Requires Bearer token.
```typescript
// Response 200
{ user: { id, email, name, avatarUrl, preferences, awsRegion } }
```

#### POST /api/auth/change-password
Change password for authenticated user.
```typescript
// Request
{ currentPassword: string, newPassword: string }

// Response 200
{ success: true }

// Errors: 401 (wrong password)
```

#### POST /api/auth/password-reset
Request password reset email.
```typescript
// Request
{ email: string }

// Response 200
{ success: true }  // Always returns success (security)
```

#### POST /api/auth/password-reset/confirm
Confirm password reset with token.
```typescript
// Request
{ token: string, newPassword: string }

// Response 200
{ success: true }

// Errors: 400 (invalid/expired token)
```

### Chat

All chat endpoints require Bearer token authentication.

#### POST /api/chat (or /api/chat/{solution})
Stream AI response.
```typescript
// Request
{
  messages: Array<{ role: 'user' | 'assistant', content: string }>,
  model: string,           // Claude model ID
  conversationId?: string, // Existing conversation
  webSearch?: boolean,     // Enable web search tool
  enableReasoning?: boolean, // Enable extended thinking
  activeMcpIds?: string[]  // Active MCP connection IDs
}

// Response: Server-Sent Events (streaming)
// Content-Type: text/event-stream

// Events:
// data: {"type": "text", "text": "..."}
// data: {"type": "reasoning", "reasoning": "..."}
// data: {"type": "tool_call", "tool": "...", "result": "..."}
// data: {"type": "done"}
```

**Solution-specific endpoints:**
- `/api/chat` - General (no domain context)
- `/api/chat/manufacturing` - Production, yield, OEE, forecasting
- `/api/chat/maintenance` - MTBF/MTTR, failure prediction, SPC
- `/api/chat/support` - Tickets, RCA, knowledge base
- `/api/chat/change-management` - ECO workflow, impact tracking
- `/api/chat/impact-analysis` - Operational insights, ROI
- `/api/chat/requirements` - Validation, gap detection

#### GET /api/chat
List available Claude models.
```typescript
// Response 200
{
  models: [
    { id: string, name: string, description: string }
  ]
}
```

### Conversations

All endpoints require Bearer token authentication.

#### GET /api/conversations
List all conversations for user.
```typescript
// Query params
?solutionType=manufacturing  // Filter by solution
?all=true                    // Show all regardless of filter

// Response 200
{
  conversations: [
    { id, title, isPinned, isShared, model, solutionType, createdAt, updatedAt }
  ]
}
// Ordered: pinned first, then by updatedAt desc
```

#### POST /api/conversations
Create new conversation.
```typescript
// Request
{ title?: string, model?: string, solutionType?: string }

// Response 201
{ id, title, isPinned, isShared, model, solutionType, createdAt, updatedAt }
```

#### GET /api/conversations/[id]
Get single conversation with messages.
```typescript
// Response 200
{
  id, title, isPinned, isShared, model, solutionType, createdAt, updatedAt,
  messages: [{ id, role, content, parts, metadata, createdAt }]
}
```

#### PATCH /api/conversations/[id]
Update conversation metadata.
```typescript
// Request (all optional)
{ title?: string, isPinned?: boolean, isShared?: boolean, model?: string, solutionType?: string }

// Response 200
{ id, title, isPinned, isShared, model, solutionType, createdAt, updatedAt }
```

#### DELETE /api/conversations/[id]
Delete conversation (cascades to messages and artifacts).
```typescript
// Response 200
{ success: true }
```

#### PATCH /api/conversations/[id]/title
Update conversation title only.
```typescript
// Request
{ title: string }

// Response 200
{ id, title, ... }
```

### Messages

#### GET /api/conversations/[id]/messages
List messages in conversation.
```typescript
// Response 200
{
  messages: [{ id, role, content, parts, metadata, createdAt }]
}
// Ordered by createdAt asc
```

#### POST /api/conversations/[id]/messages
Add message to conversation.
```typescript
// Request
{ role: 'user' | 'assistant' | 'tool', content: string, parts?: any[], metadata?: any }

// Response 201
{ id, role, content, parts, metadata, createdAt }
```

#### DELETE /api/conversations/[id]/messages
Clear all messages in conversation.
```typescript
// Response 200
{ success: true }
```

### MCP Connections

#### GET /api/mcp/connections
List all MCP connections for user.
```typescript
// Response 200
{
  connections: [
    { id, name, serverUrl, authType, isActive, status, availableTools, lastConnectedAt }
  ]
}
```

#### POST /api/mcp/connections
Create new MCP connection.
```typescript
// Request
{
  name: string,
  serverUrl: string,
  authType: 'none' | 'api_key' | 'oauth',
  authCredentials?: string  // Will be encrypted
}

// Response 201
{ id, name, serverUrl, authType, isActive, status, availableTools }
```

#### GET /api/mcp/connections/[id]
Get single connection.

#### PATCH /api/mcp/connections/[id]
Update connection.
```typescript
// Request (all optional)
{ name?, serverUrl?, authType?, authCredentials?, isActive?, status? }
```

#### DELETE /api/mcp/connections/[id]
Delete connection.

#### POST /api/mcp/connections/[id]/discover
Discover available tools on MCP server.
```typescript
// Response 200
{ tools: [{ name: string, description: string, inputSchema: object }] }
```

#### POST /api/mcp/connections/[id]/test
Test connection to MCP server.
```typescript
// Response 200
{ success: true, message: "Connection successful" }

// Response 400
{ success: false, error: "Connection failed: ..." }
```

### User Settings

#### GET /api/user/settings
Get user preferences.
```typescript
// Response 200
{
  theme: 'light' | 'dark' | 'system',
  fontSize: number,
  codeTheme: string,
  messageDensity: 'compact' | 'comfortable' | 'spacious',
  // ... other preferences
}
```

#### PATCH /api/user/settings
Update user preferences.
```typescript
// Request (all optional)
{ theme?, fontSize?, codeTheme?, messageDensity?, ... }

// Response 200
{ ...updated preferences }
```

#### GET /api/user/aws
Get user AWS credentials (decrypted).
```typescript
// Response 200
{
  accessKeyId: string,
  secretAccessKey: string,
  region: string
}

// Response 404 if not configured
```

#### POST /api/user/aws
Store AWS credentials (encrypted).
```typescript
// Request
{
  accessKeyId: string,
  secretAccessKey: string,
  region?: string
}

// Response 200
{ success: true }
```

#### POST /api/user/aws/test
Test AWS Bedrock connection.
```typescript
// Response 200
{ success: true, message: "AWS credentials are valid" }

// Response 400
{ success: false, error: "Invalid credentials" }
```

### Artifacts

#### POST /api/artifacts
Create new artifact.
```typescript
// Request
{
  conversationId: string,
  messageId: string,
  type: 'html' | 'code',
  title: string,
  content: string
}

// Response 201
{ id, type, title, content, createdAt }
```

#### GET /api/artifacts/[id]
Get single artifact.

#### PATCH /api/artifacts/[id]
Update artifact.
```typescript
// Request (all optional)
{ title?, content? }
```

#### DELETE /api/artifacts/[id]
Delete artifact.

### Message Feedback

#### POST /api/messages/feedback
Record user feedback on message.
```typescript
// Request
{
  messageId: string,
  feedback: 'positive' | 'negative',
  comment?: string
}

// Response 200
{ success: true }
```

## Database Operations (`lib/storage.ts`)

### User Operations
```typescript
createUser(email, passwordHash, name?)
getUserByEmail(email)
getUserById(id)
updateUser(id, data)
deleteUser(id)
```

### Session Operations
```typescript
createSession(userId, token, expiresAt)
getSessionByToken(token)
deleteSession(token)
deleteUserSessions(userId)
cleanupExpiredSessions()
```

### Conversation Operations
```typescript
createConversation(userId, { title, model, solutionType })
getConversation(id)
getAllConversations(userId)
getConversationsBySolution(userId, solutionType)
updateConversation(id, data)
deleteConversation(id)
```

### Message Operations
```typescript
addMessage(conversationId, { role, content, parts, metadata })
getMessages(conversationId)
clearMessages(conversationId)
updateMessage(id, data)
deleteMessage(id)
```

### Artifact Operations
```typescript
createArtifact({ conversationId, messageId, userId, type, title, content })
getArtifact(id)
getConversationArtifacts(conversationId)
updateArtifact(id, data)
deleteArtifact(id)
```

### MCP Operations
```typescript
createMcpConnection(userId, { name, serverUrl, authType, authCredentials })
getMcpConnection(id)
getUserMcpConnections(userId)
updateMcpConnection(id, data)
deleteMcpConnection(id)
```

### Helper Functions
```typescript
toUIMessage(message)           // Convert DB message to frontend format
toConversationResponse(conv)   // Format conversation for API response
```

## Validation Schemas (`lib/validation.ts`)

### Authentication
```typescript
RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional()
})

LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8)
})
```

### Chat
```typescript
ChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  model: z.string(),
  conversationId: z.string().uuid().optional(),
  webSearch: z.boolean().optional(),
  enableReasoning: z.boolean().optional(),
  activeMcpIds: z.array(z.string()).optional()
})
```

### Conversations
```typescript
CreateConversationSchema = z.object({
  title: z.string().optional(),
  model: z.string().optional(),
  solutionType: z.string().optional()
})

UpdateConversationSchema = z.object({
  title: z.string().optional(),
  isPinned: z.boolean().optional(),
  isShared: z.boolean().optional(),
  model: z.string().optional(),
  solutionType: z.string().optional()
})
```

### Usage
```typescript
import { validate, RegisterSchema } from '@/lib/validation'

const { data, error } = validate(RegisterSchema, requestBody)
if (error) {
  return NextResponse.json({ error: formatValidationErrors(error) }, { status: 400 })
}
```

## System Prompts (`lib/system-prompts.ts`)

### Solution Types
```typescript
type SolutionType =
  | 'manufacturing'
  | 'maintenance'
  | 'support'
  | 'change-management'
  | 'impact-analysis'
  | 'requirements'
```

### Building System Prompt
```typescript
import { buildSystemPromptWithTools, SOLUTION_PROMPTS } from '@/lib/system-prompts'

// Get solution-specific system prompt
const systemPrompt = SOLUTION_PROMPTS[solutionType] || BASE_PROMPT

// Or build with tool descriptions
const systemPrompt = buildSystemPromptWithTools(solutionType, availableTools)
```

### Prompt Structure
Each solution prompt includes:
1. Base assistant capabilities
2. Domain-specific expertise
3. Communication style guidelines
4. Artifact creation instructions
5. Tool usage guidance (if MCP tools available)

## AWS Bedrock Integration (`lib/bedrock.ts`)

```typescript
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'

// Creates Bedrock provider
// - Uses IAM role in AWS (App Runner, Lambda, EC2)
// - Falls back to env vars locally (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
export const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || 'us-west-2'
})

// Usage in chat route
import { bedrock } from '@/lib/bedrock'
import { streamText } from 'ai'

const result = await streamText({
  model: bedrock(modelId),
  system: systemPrompt,
  messages,
  tools,
  maxTokens: 4096,
})
```

## MCP Tool Execution (`lib/mcp-client.ts`)

```typescript
import { executeMcpTool } from '@/lib/mcp-client'

// Execute tool on MCP server
const result = await executeMcpTool({
  serverUrl: 'https://mcp-server.example.com',
  toolName: 'search_documents',
  arguments: { query: 'test' },
  authType: 'api_key',
  authCredentialsEncrypted: '...'  // Will be decrypted
})
// Returns: { content: [...] } or throws error
```

### Protocol
- JSON-RPC 2.0 over HTTP
- 30-second timeout
- Supports api_key and oauth auth types
- Auth credentials decrypted at execution time

## Artifact Handling (`lib/artifacts.ts`)

```typescript
import { extractArtifacts, hasArtifacts, parseArtifacts } from '@/lib/artifacts'

// Check if content has artifacts
if (hasArtifacts(content)) {
  const artifacts = extractArtifacts(content)
  // artifacts: [{ type, title, content }]
}

// Parse artifact blocks from content
const { cleanContent, artifacts } = parseArtifacts(content)
```

### Artifact Format
```xml
<artifact type="html" title="Dashboard">
  <html>...</html>
</artifact>
```

## Error Handling (`lib/api-utils.ts`)

```typescript
import { ApiRequestError, withRetry, fetchWithTimeout } from '@/lib/api-utils'

// Custom error class
throw new ApiRequestError('Not found', 404)

// Fetch with timeout
const response = await fetchWithTimeout(url, options, 10000)

// Retry with exponential backoff
const result = await withRetry(
  async () => await fetchData(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    shouldRetry: (error) => error.status >= 500
  }
)
```

## Creating New Endpoints

### Basic Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { validate, MySchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) return authResult
  const { user } = authResult

  // 2. Parse and validate body
  const body = await request.json()
  const { data, error } = validate(MySchema, body)
  if (error) {
    return NextResponse.json({ error }, { status: 400 })
  }

  // 3. Business logic
  try {
    const result = await doSomething(user.id, data)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    console.error('Error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Adding New Solution Type
1. Create route file: `app/api/chat/[solution-name]/route.ts`
2. Add system prompt in `lib/system-prompts.ts`
3. Update `SolutionType` type
4. Copy structure from existing solution route

```typescript
// app/api/chat/my-solution/route.ts
import { POST as basePost, GET } from '../route'
import { MY_SOLUTION_PROMPT } from '@/lib/system-prompts'

export { GET }

export async function POST(request: NextRequest) {
  // Add solution-specific context
  return basePost(request, { solutionType: 'my-solution' })
}
```

## Performance Considerations

### Database
- Use indexes on frequently queried fields
- Batch operations when possible
- Use `select` to limit returned fields

### Streaming
- Chat responses use Server-Sent Events
- `maxDuration: 60` for long-running streams
- Stream chunks sent as they arrive

### Caching
- Consider caching user preferences
- Cache MCP tool schemas (refresh on discover)

## Security Checklist

- [x] All routes require Bearer token authentication
- [x] Passwords hashed with scrypt (not plain text)
- [x] AWS/MCP credentials encrypted with AES-256-GCM
- [x] Session tokens are cryptographically random
- [x] Input validation with Zod schemas
- [x] Cascade deletes for referential integrity
- [x] Timing-safe password comparison
- [ ] Rate limiting (TODO)
- [ ] CORS configuration (TODO)
- [ ] CSP headers (TODO)

## External Resources

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [AWS Bedrock](https://docs.aws.amazon.com/bedrock)
- [Prisma](https://www.prisma.io/docs)
- [Zod](https://zod.dev)
