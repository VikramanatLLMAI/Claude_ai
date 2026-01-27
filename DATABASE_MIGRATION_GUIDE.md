# Database Migration Guide - Solution Type & Analytics

## Overview

The database has been updated to support **solution-specific tracking** and **scale-level analytics**. This enables:

1. **Solution Type Tracking**: Each conversation is tagged with its solution (manufacturing, maintenance, support, etc.)
2. **Analytics Events**: Comprehensive tracking of all user actions for scale-level products
3. **Usage Metrics**: Track which solutions are most popular
4. **Cost Analysis**: Monitor AWS Bedrock costs per solution
5. **Performance Monitoring**: API response times, token usage, error rates

---

## What Changed?

### 1. Conversation Model - Added `solutionType` Field

```prisma
model Conversation {
  id           String    @id @default(cuid())
  title        String
  isPinned     Boolean   @default(false)
  isShared     Boolean   @default(false)
  model        String    @default("us.anthropic.claude-sonnet-4-5-20250929-v1:0")
  solutionType String?   // NEW: manufacturing, maintenance, support, etc.
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  messages     Message[]

  @@index([solutionType])  // NEW: Index for efficient queries
  @@map("conversations")
}
```

**Purpose**: Track which solution each conversation belongs to for analytics and filtering.

---

### 2. Message Model - Added Indexes

```prisma
model Message {
  id             String       @id @default(cuid())
  role           String
  content        String
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())

  @@index([conversationId])  // NEW: Faster queries by conversation
  @@index([createdAt])       // NEW: Faster time-based queries
  @@map("messages")
}
```

**Purpose**: Improve query performance for message retrieval.

---

### 3. NEW: AnalyticsEvent Model

```prisma
model AnalyticsEvent {
  id           String   @id @default(cuid())
  eventType    String   // "api_call", "conversation_created", "message_sent", "error"
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

**Purpose**: Track all user actions and system events for analytics, monitoring, and cost analysis.

---

## How to Apply the Migration

### Step 1: Run Prisma Migration

Open a terminal and run:

```bash
cd C:\Python_project\Athena_project\athena_mcp
npx prisma migrate dev --name add_solution_type_and_analytics
```

This will:
- Create a new migration file
- Update the SQLite database schema
- Add the new `solutionType` column to `conversations` table
- Create the new `analytics_events` table
- Add indexes for performance

### Step 2: Verify Migration

Check that the migration was successful:

```bash
npx prisma studio
```

Open Prisma Studio and verify:
1. `conversations` table has `solutionType` column
2. `analytics_events` table exists with all fields
3. Indexes are created

### Step 3: Test the Application

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Test solution selection**:
   - Go to http://localhost:3000/solutions
   - Click "Open in Chatbot" on any solution card
   - Verify the URL has `?solution=manufacturing` (or other solution type)

3. **Test conversation creation**:
   - Send a message in the chat
   - Check the database to verify `solutionType` is saved
   - Check `analytics_events` table for `conversation_created` event

4. **Test existing conversations**:
   - Existing conversations will have `solutionType = null` (backward compatible)
   - New conversations will have the correct solution type

---

## Data Flow

### When User Selects a Solution:

```
1. User clicks "Open in Chatbot" on Manufacturing card
   ↓
2. Frontend redirects to: /chat?solution=manufacturing
   ↓
3. Frontend stores solution type in sessionStorage
   ↓
4. User sends first message
   ↓
5. Frontend creates conversation with solutionType="manufacturing"
   POST /api/conversations { solutionType: "manufacturing" }
   ↓
6. Backend saves conversation with solutionType
   ↓
7. Backend creates analytics event:
   {
     eventType: "conversation_created",
     solutionType: "manufacturing",
     conversationId: "clx123abc",
     model: "claude-sonnet-4-5",
     timestamp: now()
   }
   ↓
8. Messages use solution-specific API: /api/chat/manufacturing
   ↓
9. Claude responds with manufacturing-specific expertise
```

---

## Analytics Queries

### Most Popular Solutions

```typescript
const stats = await prisma.analyticsEvent.groupBy({
  by: ['solutionType'],
  where: { eventType: 'conversation_created' },
  _count: true,
  orderBy: { _count: { solutionType: 'desc' } }
})
```

### Conversations by Solution Type

```typescript
const manufacturingConvos = await prisma.conversation.findMany({
  where: { solutionType: 'manufacturing' },
  include: { messages: true }
})
```

### Daily Active Users per Solution

```typescript
const dailyActive = await prisma.analyticsEvent.groupBy({
  by: ['solutionType', 'userId'],
  where: {
    eventType: 'message_sent',
    timestamp: { gte: today }
  },
  _count: true
})
```

---

## Backward Compatibility

- **Existing Conversations**: Will have `solutionType = null`
- **General Chat**: Conversations created without a solution will have `solutionType = null`
- **Filtering**: You can filter by `solutionType: null` to find general conversations
- **Analytics**: Events without a solution type will have `solutionType = null`

---

## Future Enhancements

1. **User Association**: When authentication is added, link events to `userId`
2. **Cost Tracking**: Store token usage in `metadata` for cost analysis
3. **Performance Metrics**: Track API response times in `metadata`
4. **Error Details**: Store full error context in `metadata` for debugging
5. **A/B Testing**: Use `metadata` to track experiment variants

---

## Rollback (If Needed)

If you need to rollback the migration:

```bash
# View migration history
npx prisma migrate status

# Rollback to previous migration
npx prisma migrate resolve --rolled-back add_solution_type_and_analytics

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

---

## Production Deployment

### Before Deploying:

1. **Backup Database**: Always backup before running migrations
2. **Test Migration**: Run migration in staging environment first
3. **Monitor Performance**: Watch for slow queries after adding indexes
4. **Update Environment**: Ensure production has updated Prisma Client

### Deployment Steps:

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Deploy migrations
npx prisma migrate deploy

# 3. Verify
npx prisma studio
```

---

## Support

If you encounter issues:

1. **Check Prisma Schema**: Ensure `prisma/schema.prisma` matches this guide
2. **Regenerate Client**: Run `npx prisma generate`
3. **Check Migration Files**: Look in `prisma/migrations/` for generated SQL
4. **View Logs**: Check console for migration errors
5. **Prisma Docs**: https://www.prisma.io/docs/concepts/components/prisma-migrate

---

## Summary

✅ **Database Updated**: `solutionType` field added to conversations
✅ **Analytics Enabled**: New `analytics_events` table for tracking
✅ **Indexes Added**: Performance optimizations for queries
✅ **Backward Compatible**: Existing data continues to work
✅ **Scale Ready**: Infrastructure for product-level analytics

**Next Steps**: Run the migration and start tracking solution-specific usage!
