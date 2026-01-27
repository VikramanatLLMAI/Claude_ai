# Backend Documentation - Athena MCP

## Overview

The backend of Athena MCP is built with Next.js 16 App Router API routes, providing RESTful endpoints for AI chat streaming, conversation management, and message persistence. It integrates with AWS Bedrock for Claude AI models and uses Prisma ORM with SQLite for data storage.

## Technology Stack

### Core Technologies
- **Next.js 16.1.4 API Routes** - File-based API endpoints
- **TypeScript 5** - Type-safe backend code
- **Vercel AI SDK v6.0.48** - AI/LLM integration and streaming
- **AWS Bedrock (@ai-sdk/amazon-bedrock v4.0.29)** - Claude model provider
- **Prisma v5.22.0** - Database ORM
- **SQLite** - Embedded database (dev.db)
- **Zod v4.3.6** - Schema validation and type inference

### AWS Bedrock Models
- Claude 4.5 Sonnet (us.anthropic.claude-sonnet-4-5-20250929-v1:0)
- Claude 4.5 Haiku (us.anthropic.claude-haiku-4-5-20251001-v1:0)
- Claude 4.5 Opus (us.anthropic.claude-opus-4-5-20251101-v1:0)
- Claude 4 Sonnet (us.anthropic.claude-sonnet-4-20250514-v1:0)

## Directory Structure

```
app/api/
├── chat/
│   ├── route.ts                        # General AI chat streaming endpoint
│   │   ├── POST /api/chat             # Stream AI responses (general)
│   │   └── GET /api/chat              # List available models
│   ├── manufacturing/
│   │   └── route.ts                   # Manufacturing-specific chat
│   │       ├── POST /api/chat/manufacturing
│   │       └── GET /api/chat/manufacturing
│   ├── maintenance/
│   │   └── route.ts                   # Maintenance-specific chat
│   │       ├── POST /api/chat/maintenance
│   │       └── GET /api/chat/maintenance
│   ├── support/
│   │   └── route.ts                   # Support-specific chat
│   │       ├── POST /api/chat/support
│   │       └── GET /api/chat/support
│   ├── change-management/
│   │   └── route.ts                   # Change Management-specific chat
│   │       ├── POST /api/chat/change-management
│   │       └── GET /api/chat/change-management
│   ├── impact-analysis/
│   │   └── route.ts                   # Impact Analysis-specific chat
│   │       ├── POST /api/chat/impact-analysis
│   │       └── GET /api/chat/impact-analysis
│   └── requirements/
│       └── route.ts                   # Requirements-specific chat
│           ├── POST /api/chat/requirements
│           └── GET /api/chat/requirements
└── conversations/
    ├── route.ts                # Conversation list/create
    │   ├── GET /api/conversations        # List all conversations
    │   └── POST /api/conversations       # Create new conversation
    └── [id]/
        ├── route.ts            # Single conversation operations
        │   ├── GET /api/conversations/[id]     # Get conversation with messages
        │   ├── PATCH /api/conversations/[id]   # Update conversation
        │   └── DELETE /api/conversations/[id]  # Delete conversation
        └── messages/
            └── route.ts        # Message operations
                ├── GET /api/conversations/[id]/messages      # List messages
                ├── POST /api/conversations/[id]/messages     # Add message
                └── DELETE /api/conversations/[id]/messages   # Clear messages

lib/
├── db.ts                       # Prisma client singleton
└── utils.ts                    # Utility functions

prisma/
├── schema.prisma               # Database schema definition
├── dev.db                      # SQLite database file
└── migrations/                 # Database migration files
```

## API Endpoints

### Overview: Solution-Specific Chat Endpoints

Athena MCP provides **specialized chat endpoints** for each solution type. Each endpoint has domain-specific system prompts and context, making the AI assistant an expert in that particular domain.

#### Available Solution Endpoints:

| Solution | Endpoint | Domain Focus | System Prompt Specialization |
|----------|----------|--------------|------------------------------|
| **Manufacturing** | `/api/chat/manufacturing` | MES + Engineering | Production visibility, traceability, yield analysis, forecasting |
| **Maintenance** | `/api/chat/maintenance` | MTBF / MTTR | Failure prediction, reliability analysis, maintenance optimization |
| **Support** | `/api/chat/support` | Tickets + RCA + Ops | Incident classification, root cause analysis, troubleshooting |
| **Change Management** | `/api/chat/change-management` | ECOs + Process Changes | Impact tracking, change communication, workflow management |
| **Impact Analysis** | `/api/chat/impact-analysis` | Yield + Cost + Delivery | Operational impact, cross-functional insights, ROI analysis |
| **Requirements** | `/api/chat/requirements` | Engineering + IT | Requirements validation, gap detection, dependency analysis |
| **General** | `/api/chat` | General purpose | No domain-specific context (fallback) |

#### How It Works:

1. **User selects a solution card** on `/solutions` page
2. **URL includes solution type**: `/chat?solution=manufacturing`
3. **Frontend routes to specific API**: `/api/chat/manufacturing`
4. **Backend adds domain-specific system prompt** to messages
5. **Claude responds with specialized knowledge** in that domain

#### Key Benefits:

- **Domain Expertise**: Each endpoint has tailored system prompts for its domain
- **Better Accuracy**: AI responses are more relevant and contextual
- **Specialized Tools**: Future ability to add domain-specific tools (e.g., MES integration for manufacturing)
- **Analytics**: Track usage per solution type
- **Easy Extension**: Add new solutions without modifying existing ones

---

### 1. Chat Streaming Endpoints

#### General Chat Endpoint

**Location**: `app/api/chat/route.ts:56`

##### POST /api/chat

Streams AI responses from Claude models via AWS Bedrock (general purpose, no domain-specific context).

**Request Body**:
```json
{
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ],
  "model": "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "conversationId": "clx123abc",
  "webSearch": false
}
```

**Features**:
- Streams text responses in real-time via data stream
- Saves user message to database before streaming
- Saves assistant message to database on completion
- Automatically generates conversation title from first message
- Updates conversation timestamp on each message
- Supports web search tool (placeholder implementation)
- Allows multiple tool calls (maxSteps: 5)

**Response**:
- Data stream response (text/event-stream)
- Real-time message chunks
- Handles errors gracefully

**Implementation Details**:
```typescript
export async function POST(req: Request) {
  const { messages, model, conversationId } = await req.json()

  // Save user message
  if (conversationId && messages.length > 0) {
    const lastUserMessage = messages[messages.length - 1]
    await prisma.message.create({
      data: {
        role: "user",
        content: lastUserMessage.content,
        conversationId,
      },
    })
  }

  // Stream AI response
  const result = streamText({
    model: bedrock(model),
    messages,
    tools: { webSearch: webSearchTool },
    maxSteps: 5,
    onFinish: async ({ text }) => {
      // Save assistant message
      // Update conversation title (first message)
      // Update conversation timestamp
    },
  })

  return result.toDataStreamResponse()
}
```

**Error Handling**:
- Catches database errors
- Handles invalid model IDs
- Returns error stream on failure

#### GET /api/chat

Returns list of available Claude models.

**Location**: `app/api/chat/route.ts:122`

**Response**:
```json
{
  "models": [
    {
      "id": "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
      "name": "Claude 4.5 Sonnet",
      "description": "Most intelligent model, best for complex tasks"
    },
    // ... more models
  ]
}
```

---

#### Solution-Specific Chat Endpoints

Each solution has its own dedicated endpoint with domain-specific system prompts and context.

##### POST /api/chat/manufacturing

**Location**: `app/api/chat/manufacturing/route.ts`

Specialized for Manufacturing Reports & Insights (MES + Engineering).

**System Prompt Focus**:
- Real-time production visibility & traceability
- Natural Language Analytics with drill-down capabilities
- Automated reporting & distribution
- Yield loss identification & trend analysis
- Production forecasting & performance insights
- Genealogy tracking and quality analysis
- Operator and supplier performance evaluation

**GET /api/chat/manufacturing** returns:
```json
{
  "models": [...],
  "solutionType": "manufacturing",
  "capabilities": [...]
}
```

---

##### POST /api/chat/maintenance

**Location**: `app/api/chat/maintenance/route.ts`

Specialized for Maintenance & Reliability (MTBF / MTTR).

**System Prompt Focus**:
- Automatic MTBF calculation and analysis
- MTTR calculation and optimization
- Failure prediction and preventive maintenance
- Recurring failure detection and root cause analysis
- Maintenance dashboards and KPI tracking
- Equipment reliability analysis
- Maintenance scheduling optimization

**GET /api/chat/maintenance** returns solution-specific metadata.

---

##### POST /api/chat/support

**Location**: `app/api/chat/support/route.ts`

Specialized for Support & Incident Management (Tickets + RCA + Ops).

**System Prompt Focus**:
- Intelligent ticket classification & assignment
- Root cause analysis with past incident reference
- AI troubleshooting & resolution prediction
- Self-learning knowledge base & training recommendations
- MES integration actions with approvals
- Incident severity assessment and prioritization
- SLA tracking and management

**GET /api/chat/support** returns solution-specific metadata.

---

##### POST /api/chat/change-management

**Location**: `app/api/chat/change-management/route.ts`

Specialized for Change Management (ECOs + Process Changes).

**System Prompt Focus**:
- Change impact tracking and assessment
- Change communication and stakeholder notification
- ECO workflow management
- Process change documentation
- Risk assessment for proposed changes
- Change approval workflows
- Implementation planning and rollback strategies

**GET /api/chat/change-management** returns solution-specific metadata.

---

##### POST /api/chat/impact-analysis

**Location**: `app/api/chat/impact-analysis/route.ts`

Specialized for Impact Analysis (Yield + Cost + Delivery).

**System Prompt Focus**:
- Operational impact analysis across production, quality, and logistics
- Cross-functional insights connecting manufacturing, supply chain, and finance
- Yield impact assessment and cost implications
- Delivery timeline analysis and risk assessment
- Multi-dimensional impact evaluation (cost, quality, schedule, resources)
- Scenario analysis and what-if modeling

**GET /api/chat/impact-analysis** returns solution-specific metadata.

---

##### POST /api/chat/requirements

**Location**: `app/api/chat/requirements/route.ts`

Specialized for Requirements Management (Engineering + IT).

**System Prompt Focus**:
- Requirements analysis & validation (functional, non-functional, technical)
- Gap and dependency detection across systems and processes
- Requirements traceability and impact analysis
- Stakeholder requirements gathering and clarification
- Technical feasibility assessment
- Requirements documentation and specification writing
- Compliance and regulatory requirements analysis

**GET /api/chat/requirements** returns solution-specific metadata.

---

**All solution-specific endpoints share the same request/response format as the general `/api/chat` endpoint, with the key difference being the specialized system prompt prepended to the messages array.**

**Example Implementation Pattern**:
```typescript
// Manufacturing-specific system prompt
const MANUFACTURING_SYSTEM_PROMPT = `You are an AI assistant specialized in Manufacturing...`

export async function POST(req: Request) {
  const { messages, model, conversationId } = await req.json()

  // Add system prompt to messages
  const messagesWithSystem = [
    { role: "system", content: MANUFACTURING_SYSTEM_PROMPT },
    ...messages,
  ]

  const result = streamText({
    model: bedrock(model),
    messages: messagesWithSystem,
    tools: { webSearch: webSearchTool },
    maxSteps: 5,
    onFinish: async ({ text }) => {
      // Save to database...
    },
  })

  return result.toDataStreamResponse()
}
```

---

### 2. Conversation Management

#### GET /api/conversations

**Location**: `app/api/conversations/route.ts`

Lists all conversations with last message preview.

**Response**:
```json
[
  {
    "id": "clx123abc",
    "title": "How to build a chat app",
    "isPinned": true,
    "isShared": false,
    "model": "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-01-20T10:30:00.000Z",
    "lastMessage": "Here's a step-by-step guide..."
  }
]
```

**Sorting**:
- Pinned conversations first (isPinned DESC)
- Then by most recent (updatedAt DESC)

**Implementation**:
```typescript
export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: [
      { isPinned: 'desc' },
      { updatedAt: 'desc' }
    ],
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true }
      }
    }
  })

  return Response.json(conversations.map(c => ({
    ...c,
    lastMessage: c.messages[0]?.content || null
  })))
}
```

#### POST /api/conversations

**Location**: `app/api/conversations/route.ts`

Creates a new conversation.

**Request Body**:
```json
{
  "title": "New conversation",
  "model": "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
}
```

**Response**:
```json
{
  "id": "clx123abc",
  "title": "New conversation",
  "isPinned": false,
  "isShared": false,
  "model": "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "createdAt": "2025-01-20T10:00:00.000Z",
  "updatedAt": "2025-01-20T10:00:00.000Z"
}
```

**Implementation**:
```typescript
export async function POST(req: Request) {
  const { title, model } = await req.json()

  const conversation = await prisma.conversation.create({
    data: {
      title: title || "New conversation",
      model: model || CLAUDE_MODELS[0].id
    }
  })

  return Response.json(conversation)
}
```

#### GET /api/conversations/[id]

**Location**: `app/api/conversations/[id]/route.ts`

Gets a single conversation with all messages.

**Response**:
```json
{
  "id": "clx123abc",
  "title": "How to build a chat app",
  "isPinned": true,
  "isShared": false,
  "model": "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "createdAt": "2025-01-20T10:00:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z",
  "messages": [
    {
      "id": "clx456def",
      "role": "user",
      "content": "How do I build a chat app?",
      "conversationId": "clx123abc",
      "createdAt": "2025-01-20T10:00:00.000Z"
    },
    {
      "id": "clx789ghi",
      "role": "assistant",
      "content": "Here's a step-by-step guide...",
      "conversationId": "clx123abc",
      "createdAt": "2025-01-20T10:00:30.000Z"
    }
  ]
}
```

**Implementation**:
```typescript
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!conversation) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json(conversation)
}
```

#### PATCH /api/conversations/[id]

**Location**: `app/api/conversations/[id]/route.ts`

Updates conversation metadata.

**Request Body** (all fields optional):
```json
{
  "title": "Updated title",
  "isPinned": true,
  "isShared": true,
  "model": "us.anthropic.claude-haiku-4-5-20251001-v1:0"
}
```

**Response**:
```json
{
  "id": "clx123abc",
  "title": "Updated title",
  "isPinned": true,
  "isShared": true,
  "model": "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  "createdAt": "2025-01-20T10:00:00.000Z",
  "updatedAt": "2025-01-20T10:35:00.000Z"
}
```

**Implementation**:
```typescript
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const data = await req.json()

  const conversation = await prisma.conversation.update({
    where: { id: params.id },
    data
  })

  return Response.json(conversation)
}
```

#### DELETE /api/conversations/[id]

**Location**: `app/api/conversations/[id]/route.ts`

Deletes a conversation (cascades to messages).

**Response**:
```json
{
  "success": true
}
```

**Implementation**:
```typescript
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await prisma.conversation.delete({
    where: { id: params.id }
  })

  return Response.json({ success: true })
}
```

### 3. Message Management

#### GET /api/conversations/[id]/messages

**Location**: `app/api/conversations/[id]/messages/route.ts`

Lists all messages in a conversation.

**Response**:
```json
[
  {
    "id": "clx456def",
    "role": "user",
    "content": "Hello",
    "conversationId": "clx123abc",
    "createdAt": "2025-01-20T10:00:00.000Z"
  },
  {
    "id": "clx789ghi",
    "role": "assistant",
    "content": "Hi there!",
    "conversationId": "clx123abc",
    "createdAt": "2025-01-20T10:00:30.000Z"
  }
]
```

**Implementation**:
```typescript
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: 'asc' }
  })

  return Response.json(messages)
}
```

#### POST /api/conversations/[id]/messages

**Location**: `app/api/conversations/[id]/messages/route.ts`

Adds a message to a conversation.

**Request Body**:
```json
{
  "role": "user",
  "content": "Hello, Claude!"
}
```

**Response**:
```json
{
  "id": "clx456def",
  "role": "user",
  "content": "Hello, Claude!",
  "conversationId": "clx123abc",
  "createdAt": "2025-01-20T10:00:00.000Z"
}
```

**Implementation**:
```typescript
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { role, content } = await req.json()

  const message = await prisma.message.create({
    data: {
      role,
      content,
      conversationId: params.id
    }
  })

  return Response.json(message)
}
```

#### DELETE /api/conversations/[id]/messages

**Location**: `app/api/conversations/[id]/messages/route.ts`

Clears all messages in a conversation.

**Response**:
```json
{
  "success": true,
  "deletedCount": 10
}
```

**Implementation**:
```typescript
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const result = await prisma.message.deleteMany({
    where: { conversationId: params.id }
  })

  return Response.json({
    success: true,
    deletedCount: result.count
  })
}
```

## Database Schema

**Location**: `prisma/schema.prisma:1`

### Conversation Model

```prisma
model Conversation {
  id           String    @id @default(cuid())
  title        String
  isPinned     Boolean   @default(false)
  isShared     Boolean   @default(false)
  model        String    @default("us.anthropic.claude-sonnet-4-5-20250929-v1:0")
  solutionType String?   // Solution type: manufacturing, maintenance, support, etc.
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  messages     Message[]

  @@index([solutionType])
  @@map("conversations")
}
```

**Fields**:
- `id` - CUID primary key (e.g., clx123abc)
- `title` - Conversation title (max 50 chars, auto-generated from first message)
- `isPinned` - Whether conversation is pinned in sidebar
- `isShared` - Whether conversation has been shared
- `model` - Claude model ID used for this conversation
- **`solutionType`** - Solution type identifier (manufacturing, maintenance, support, change-management, impact-analysis, requirements, or null for general)
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp (auto-updated)
- `messages` - One-to-many relation with messages

**Indexes**:
- `solutionType` - For efficient filtering and analytics queries

### Message Model

```prisma
model Message {
  id             String       @id @default(cuid())
  role           String       // "user" or "assistant"
  content        String
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())

  @@index([conversationId])
  @@index([createdAt])
  @@map("messages")
}
```

**Fields**:
- `id` - CUID primary key
- `role` - Message role ("user" or "assistant")
- `content` - Message text content
- `conversationId` - Foreign key to Conversation
- `conversation` - Relation to Conversation (CASCADE delete)
- `createdAt` - Creation timestamp

**Indexes**:
- `conversationId` - For efficient message queries by conversation
- `createdAt` - For efficient time-based queries and ordering

---

### AnalyticsEvent Model (NEW - Scale-Level Tracking)

```prisma
model AnalyticsEvent {
  id           String   @id @default(cuid())
  eventType    String   // "api_call", "conversation_created", "message_sent", "model_switched", "error"
  solutionType String?  // manufacturing, maintenance, support, etc.
  userId       String?  // Future: link to user when auth is implemented
  conversationId String? // Optional: link to conversation
  model        String?  // Claude model used
  metadata     String?  // JSON string for additional data
  timestamp    DateTime @default(now())

  @@index([eventType])
  @@index([solutionType])
  @@index([userId])
  @@index([timestamp])
  @@map("analytics_events")
}
```

**Fields**:
- `id` - CUID primary key
- `eventType` - Type of event: "api_call", "conversation_created", "message_sent", "model_switched", "error", etc.
- `solutionType` - Solution type for the event (manufacturing, maintenance, etc.)
- `userId` - User ID (null for now, will be populated when authentication is added)
- `conversationId` - Optional link to conversation
- `model` - Claude model used for the event
- `metadata` - JSON string for additional event data (error details, performance metrics, custom fields)
- `timestamp` - Event timestamp (auto-set)

**Indexes**:
- `eventType` - For filtering by event type
- `solutionType` - For solution-specific analytics
- `userId` - For per-user analytics (future)
- `timestamp` - For time-series queries

**Use Cases**:
1. **Usage Analytics**: Track which solutions are most used
2. **Performance Monitoring**: Store API response times, token usage
3. **Error Tracking**: Log errors with full context
4. **Cost Analysis**: Track AWS Bedrock costs per solution/user
5. **User Behavior**: Analyze conversation patterns, model preferences
6. **A/B Testing**: Track feature usage and experiment results

**Example Analytics Queries**:

```typescript
// Most popular solutions
const solutionStats = await prisma.analyticsEvent.groupBy({
  by: ['solutionType'],
  where: { eventType: 'conversation_created' },
  _count: true,
  orderBy: { _count: { solutionType: 'desc' } }
})

// API calls per day
const dailyUsage = await prisma.analyticsEvent.groupBy({
  by: ['timestamp'],
  where: {
    eventType: 'api_call',
    timestamp: { gte: last30Days }
  },
  _count: true
})

// Error rate by solution
const errorRate = await prisma.analyticsEvent.findMany({
  where: {
    eventType: 'error',
    timestamp: { gte: last24Hours }
  },
  select: { solutionType: true, metadata: true }
})
```

## Prisma Client

**Location**: `lib/db.ts:1`

Singleton pattern to prevent multiple Prisma instances in development:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Usage**:
```typescript
import { prisma } from '@/lib/db'

const conversations = await prisma.conversation.findMany()
```

## AI Integration

### Vercel AI SDK

**streamText Function**:
```typescript
import { streamText } from 'ai'
import { bedrock } from '@ai-sdk/amazon-bedrock'

const result = streamText({
  model: bedrock('us.anthropic.claude-sonnet-4-5-20250929-v1:0'),
  messages: [
    { role: 'user', content: 'Hello' }
  ],
  tools: {
    webSearch: webSearchTool
  },
  maxSteps: 5,
  onFinish: async ({ text }) => {
    // Save to database
  }
})

return result.toDataStreamResponse()
```

### Web Search Tool

**Location**: `app/api/chat/route.ts:33`

Placeholder implementation for web search functionality:

```typescript
const webSearchTool = tool({
  description: "Search the web for current information",
  parameters: z.object({
    query: z.string().describe("The search query")
  }),
  execute: async ({ query }) => {
    console.log(`Web search for: ${query}`)
    return {
      results: [{
        title: `Search results for: ${query}`,
        snippet: "Placeholder. Integrate with real search API.",
        url: "https://example.com"
      }]
    }
  }
})
```

**To implement real web search**:
1. Sign up for search API (Tavily, Serper, Google Custom Search)
2. Add API key to `.env`
3. Replace `execute` function with real API call
4. Parse and return search results

## Environment Variables

**Required variables** (`.env` or `.env.local`):

```env
# AWS Bedrock Credentials
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1

# Database URL
DATABASE_URL=file:./prisma/dev.db
```

**Access in code**:
```typescript
process.env.AWS_ACCESS_KEY_ID
process.env.DATABASE_URL
```

## Error Handling

### Database Errors
```typescript
try {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id }
  })
  if (!conversation) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  return Response.json(conversation)
} catch (error) {
  console.error('Database error:', error)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}
```

### AI Streaming Errors
```typescript
const result = streamText({
  model: bedrock(model),
  messages,
  onError: (error) => {
    console.error('AI streaming error:', error)
  }
})
```

### Validation Errors
```typescript
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1).max(100),
  model: z.string()
})

try {
  const data = schema.parse(await req.json())
} catch (error) {
  return Response.json({ error: "Validation failed" }, { status: 400 })
}
```

## Security Considerations

### Current Implementation
- **Authentication**: None (uses localStorage in frontend)
- **Authorization**: None (all API routes are public)
- **Input Validation**: Minimal (relies on database constraints)
- **Rate Limiting**: None
- **CORS**: Default Next.js (same-origin)

### Production Security Checklist

#### Authentication & Authorization
- [ ] Implement proper authentication (NextAuth.js, Clerk, Auth0)
- [ ] Add JWT or session-based auth
- [ ] Protect API routes with middleware
- [ ] Add user model to database schema
- [ ] Associate conversations with users (userId foreign key)
- [ ] Validate user ownership before CRUD operations

#### Input Validation
- [ ] Use Zod schemas for all request bodies
- [ ] Sanitize user input (prevent XSS)
- [ ] Validate conversation/message IDs (CUID format)
- [ ] Limit message content length
- [ ] Validate model IDs against whitelist

#### Rate Limiting
- [ ] Add rate limiting per user/IP
- [ ] Implement exponential backoff for failed requests
- [ ] Limit concurrent AI streaming requests
- [ ] Set max messages per conversation

#### Database Security
- [ ] Use prepared statements (Prisma does this by default)
- [ ] Add database-level constraints
- [ ] Implement soft deletes for audit trail
- [ ] Encrypt sensitive data at rest
- [ ] Regular database backups

#### API Security
- [ ] Add CORS headers for production domain
- [ ] Implement CSP headers
- [ ] Use HTTPS only in production
- [ ] Add API versioning (/api/v1/chat)
- [ ] Log and monitor API usage

#### AWS Security
- [ ] Use IAM roles instead of access keys
- [ ] Implement least privilege access
- [ ] Rotate AWS credentials regularly
- [ ] Monitor Bedrock API usage and costs
- [ ] Set up AWS CloudWatch alarms

## Database Migrations

### Creating Migrations

```bash
# Create migration after schema changes
npx prisma migrate dev --name add_user_model

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Migration Files

**Location**: `prisma/migrations/`

Example migration structure:
```
migrations/
└── 20260123074155_init/
    └── migration.sql
```

### Prisma Studio (Database GUI)

```bash
# Open Prisma Studio to view/edit data
npx prisma studio
```

## Performance Optimization

### Database Query Optimization
```typescript
// Bad: N+1 query problem
const conversations = await prisma.conversation.findMany()
for (const c of conversations) {
  const messages = await prisma.message.findMany({
    where: { conversationId: c.id }
  })
}

// Good: Use include to fetch related data
const conversations = await prisma.conversation.findMany({
  include: { messages: true }
})
```

### Indexing
```prisma
model Message {
  // ...
  conversationId String

  @@index([conversationId])
  @@index([createdAt])
}
```

### Caching
```typescript
// Implement caching for conversation list
import { cache } from 'react'

export const getConversations = cache(async () => {
  return prisma.conversation.findMany()
})
```

### Streaming Optimization
- Use `streamText` instead of `generateText` for faster perceived performance
- Implement incremental message updates
- Use Server-Sent Events (SSE) for real-time updates

## Monitoring & Logging

### Logging Best Practices
```typescript
// Use structured logging
console.log({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Conversation created',
  conversationId: conversation.id,
  userId: user.id
})

// Log errors with context
console.error({
  timestamp: new Date().toISOString(),
  level: 'error',
  message: 'Failed to create conversation',
  error: error.message,
  stack: error.stack,
  userId: user.id
})
```

### Monitoring
- Track API response times
- Monitor database query performance
- Track AWS Bedrock API costs
- Set up alerts for error rates
- Monitor memory usage and CPU

## Testing

### Unit Tests
```typescript
// Example: Test conversation creation
import { prisma } from '@/lib/db'

describe('POST /api/conversations', () => {
  it('creates a new conversation', async () => {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', model: 'claude-sonnet' })
    })
    const data = await response.json()
    expect(data.title).toBe('Test')
  })
})
```

### Integration Tests
- Test full conversation flow (create → add messages → delete)
- Test AI streaming with mock responses
- Test error handling and edge cases

### E2E Tests
- Use Playwright to test full user journeys
- Test API endpoints with real database
- Test AWS Bedrock integration (dev environment)

## Analytics & Scale-Level Tracking

### Overview

The AnalyticsEvent model enables comprehensive tracking for scale-level products:

```typescript
interface AnalyticsEvent {
  id: string
  eventType: string
  solutionType: string | null
  userId: string | null
  conversationId: string | null
  model: string | null
  metadata: string | null  // JSON string
  timestamp: Date
}
```

### Tracked Event Types

1. **conversation_created** - When a new conversation is created
2. **message_sent** - When a user sends a message
3. **api_call** - Every API call to solution-specific endpoints
4. **model_switched** - When user changes Claude model
5. **error** - When errors occur (with full context)
6. **performance** - API response times, token usage

### Implementation Example

```typescript
// In your API route
await prisma.analyticsEvent.create({
  data: {
    eventType: "conversation_created",
    solutionType: "manufacturing",
    conversationId: conversation.id,
    model: "claude-sonnet-4-5",
    metadata: JSON.stringify({
      title: conversation.title,
      responseTime: 234, // ms
      tokensUsed: 1250
    })
  }
}).catch(error => {
  // Don't fail the request if analytics fails
  console.error("Analytics error:", error)
})
```

### Analytics Queries

**Most Popular Solutions**:
```typescript
const popularSolutions = await prisma.analyticsEvent.groupBy({
  by: ['solutionType'],
  where: {
    eventType: 'conversation_created',
    timestamp: { gte: last30Days }
  },
  _count: { solutionType: true },
  orderBy: { _count: { solutionType: 'desc' } }
})
```

**Daily Active Conversations**:
```typescript
const dailyStats = await prisma.analyticsEvent.findMany({
  where: {
    eventType: 'message_sent',
    timestamp: {
      gte: startOfDay,
      lt: endOfDay
    }
  },
  select: {
    conversationId: true,
    solutionType: true,
    userId: true
  },
  distinct: ['conversationId']
})
```

**Error Rate by Solution**:
```typescript
const errorStats = await prisma.analyticsEvent.groupBy({
  by: ['solutionType'],
  where: {
    eventType: 'error',
    timestamp: { gte: last24Hours }
  },
  _count: true
})
```

**Cost Tracking** (AWS Bedrock):
```typescript
// Store token usage in metadata
const costAnalysis = await prisma.analyticsEvent.findMany({
  where: {
    eventType: 'api_call',
    timestamp: { gte: startOfMonth }
  },
  select: {
    solutionType: true,
    model: true,
    metadata: true  // Contains tokensUsed
  }
})

// Calculate costs based on model pricing
const totalCost = costAnalysis.reduce((sum, event) => {
  const meta = JSON.parse(event.metadata || '{}')
  const tokens = meta.tokensUsed || 0
  const costPerToken = MODEL_PRICING[event.model]
  return sum + (tokens * costPerToken)
}, 0)
```

### Dashboard Metrics

Build analytics dashboards with these key metrics:

1. **Usage Metrics**:
   - Total conversations by solution
   - Active users per solution
   - Messages per day/week/month
   - Model usage distribution

2. **Performance Metrics**:
   - Average response time per solution
   - API latency percentiles (p50, p95, p99)
   - Token usage per conversation
   - Error rates and types

3. **Business Metrics**:
   - AWS Bedrock costs per solution
   - Cost per conversation
   - User retention by solution
   - Feature adoption rates

4. **Solution-Specific Insights**:
   - Manufacturing: production queries, yield analysis requests
   - Maintenance: failure prediction queries, MTBF calculations
   - Support: ticket classification, RCA requests

### Scaling Considerations

1. **Data Retention**: Archive old analytics events (> 90 days) to separate table
2. **Indexing**: All critical query fields are indexed for fast queries
3. **Async Logging**: Analytics writing doesn't block API responses
4. **Aggregation**: Pre-calculate daily/weekly stats for faster dashboard loads
5. **Partitioning**: Consider time-based partitioning for large datasets

### Privacy & Compliance

- **PII Handling**: Never store sensitive user data in metadata
- **Data Anonymization**: Hash user IDs for long-term storage
- **GDPR Compliance**: Implement data deletion on user request
- **Retention Policies**: Define and enforce data retention periods

## Deployment

### Environment Setup
1. Set up production database (PostgreSQL, MySQL, or PlanetScale)
2. Update `DATABASE_URL` in production environment
3. Run migrations: `npx prisma migrate deploy`
4. Set AWS credentials via IAM roles (not env vars)

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add DATABASE_URL
```

### Database Migration in Production
```bash
# Run migrations before deployment
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## Troubleshooting

### Common Issues

#### "PrismaClient is unable to be run in the browser"
- Ensure Prisma is only imported in server-side code (API routes)
- Don't import `prisma` in client components

#### "AWS credentials not found"
- Check `.env` file exists and has correct variables
- Verify AWS credentials are valid
- Ensure AWS region is set correctly

#### "Conversation not found"
- Verify conversation ID exists in database
- Check if conversation was deleted
- Ensure proper error handling for 404 cases

#### "Message streaming stops mid-response"
- Check AWS Bedrock quotas and limits
- Verify network connection is stable
- Check for timeout issues in API route

#### "Database locked" (SQLite)
- SQLite doesn't support high concurrency
- Use PostgreSQL or MySQL for production
- Increase timeout in Prisma client

## Resources

- **Next.js API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **AWS Bedrock**: https://docs.aws.amazon.com/bedrock
- **Prisma Docs**: https://www.prisma.io/docs
- **Zod Validation**: https://zod.dev

## Future Enhancements

- [ ] Add user authentication and authorization
- [ ] Implement real web search integration
- [ ] Add support for file uploads and attachments
- [ ] Implement conversation folders/tags
- [ ] Add conversation export (JSON, Markdown)
- [ ] Implement message editing and regeneration
- [ ] Add support for multiple AI providers
- [ ] Implement conversation search functionality
- [ ] Add analytics and usage tracking
- [ ] Implement conversation sharing with permissions
- [ ] Add support for conversation templates
- [ ] Implement message reactions and bookmarks
