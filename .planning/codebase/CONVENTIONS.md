# Coding Conventions

**Analysis Date:** 2026-02-26

## Naming Patterns

### Files

**Component Files (React):**
- PascalCase: `FullChatApp.tsx`, `LoginPage.tsx`, `Message.tsx`
- Location: `components/` or `components/prompt-kit/` or `components/ui/`
- UI wrapper components: `button.tsx`, `input.tsx`, `dialog.tsx`

**API Route Files:**
- lowercase `route.ts`: `app/api/auth/login/route.ts`, `app/api/chat/route.ts`
- Dynamic routes use `[id]` or `[fileId]`: `app/api/conversations/[id]/route.ts`
- Related routes in subdirectories: `app/api/auth/password-reset/confirm/route.ts`

**Utility/Library Files:**
- camelCase with hyphens: `auth-middleware.ts`, `api-utils.ts`, `file-classifier.ts`
- Location: `lib/`

**Hook Files:**
- Prefix with `use-`: `use-keyboard-shortcuts.tsx`, `use-mobile.tsx`, `use-smooth-streaming.ts`
- Location: `hooks/`

**Database/Schema:**
- `schema.prisma`, `migrations/`
- Config: `db.ts` (Prisma client singleton)

### Functions

**Naming Convention:** camelCase with descriptive verbs

**Async Functions:**
- Database operations: `getUserByEmail()`, `createSession()`, `deleteConversation()`
- API handlers: `POST()`, `GET()`, `PATCH()`, `DELETE()`
- Utilities: `withRetry()`, `fetchWithTimeout()`, `validateSession()`

**Pure Functions:**
- Formatting: `formatValidationErrors()`, `cn()` (className merge)
- Type guards: `isRateLimitError()`, `isTimeoutError()`, `isNetworkError()`
- Converters: `toUIMessage()`, `toConversationResponse()`

**Hook Functions:**
- Prefix with `use`: `useChat()` (Vercel AI SDK), `useMobile()`, `useFileContent()`

**Export Pattern - Storage Layer:**
All database CRUD operations exported as named functions from `lib/storage.ts`:
```typescript
export async function createUser(data: { ... }): Promise<User>
export async function getUserByEmail(email: string): Promise<User | null>
export async function createConversation(data: { ... }): Promise<Conversation>
```

### Variables

**Constants:**
- UPPER_SNAKE_CASE for immutable constants: `IV_LENGTH`, `ALGORITHM`, `MOBILE_BREAKPOINT`
- UPPER_SNAKE_CASE for environment variables: `KEY_ENCRYPTION_SECRET`, `DATABASE_URL`, `ANTHROPIC_API_KEY`
- camelCase for object constants: `buttonVariants`, `capabilitiesContainerVariants`

**State Variables (React):**
- camelCase with descriptive names:
  - Boolean flags with `is` prefix: `isLoading`, `isMobile`, `isSubmitting`, `isOpen`
  - Data variables: `conversations`, `messages`, `selectedId`, `selectedModel`
  - UI state: `mode` (auth mode), `error`, `theme`

**Callback Functions:**
- `handle` prefix for event handlers: `handleSubmit()`, `handleClick()`, `onChange()`
- `on` prefix in interfaces/props: `onFinish()`, `onRetry()`, `onSuccess()`

**Type Annotations:**
- User: singular `user` (from auth context)
- Collections: plural `conversations`, `messages`, `sessions`, `artifacts`

### Types

**Type/Interface Naming:** PascalCase

**Interface Prefixes (Optional):**
- `Props` suffix for component prop types: `ButtonProps`, `CardProps`, `DialogProps`
- No prefix for domain models: `User`, `Conversation`, `Message`, `Artifact`

**Enum Naming:** PascalCase
```typescript
enum AuthMode { SignIn = "signin", SignUp = "signup" }
enum MessageRole { User = "user", Assistant = "assistant", Tool = "tool" }
enum McpAuthType { None = "none", ApiKey = "api_key", OAuth = "oauth" }
```

**Type Unions:**
- Descriptive: `type AuthMode = "signin" | "signup"`
- Related types grouped: `type ArtifactType = "html" | "code"`

### API Routes & Endpoints

**Path Structure:**
- Plural resource names: `POST /api/conversations`, `GET /api/users`
- Nested resources: `POST /api/conversations/[id]/messages`
- Actions on resources: `POST /api/conversations/[id]/title` (update title only)
- Specialized endpoints: `POST /api/user/anthropic/test`, `POST /api/mcp/connections/[id]/discover`

## Code Style

### Formatting

**Tool:** ESLint + Next.js built-in linting

**Config Files:**
- `eslint.config.mjs` - ESLint configuration (extends Next.js core web vitals & TypeScript)
- `tsconfig.json` - TypeScript configuration with path alias `@/*` mapping

**Run Linting:**
```bash
npm run lint
```

**Key Settings:**
- Target: ES2017
- Module: esnext
- Strict mode enabled
- JSX: react-jsx (automatic runtime)

### Import Organization

**Order (within file):**
1. External dependencies: `import React from "react"`
2. Next.js imports: `import { NextRequest } from "next/server"`
3. Internal path alias imports: `import { cn } from "@/lib/utils"`
4. Local relative imports: (rarely used)

**Path Alias:**
- All imports use `@/*` prefix: `@/lib/`, `@/components/`, `@/hooks/`
- Absolute imports preferred over relative imports

**Example:**
```typescript
import * as React from "react"
import { NextRequest, NextResponse } from "next/server"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { validateSession } from "@/lib/auth-middleware"
```

**Barrel Files (Re-exports):**
- Component directory index pattern: `components/ui/index.ts` (not used - direct imports preferred)
- Storage layer exports: `lib/storage.ts` re-exports all types and functions

## Error Handling

### Pattern: Try-Catch with Console Logging

**API Routes:**
```typescript
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { user } = auth

  try {
    const body = await req.json()
    // Business logic
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating artifact:', error)
    return NextResponse.json(
      { error: 'Failed to create artifact' },
      { status: 500 }
    )
  }
}
```

**Key Pattern:**
- `requireAuth()` returns NextResponse on auth failure (instanceof check)
- Broad catch blocks with console.error logging
- Generic error messages in responses (don't expose internals)

### Authentication Errors

**Auth Middleware (`lib/auth-middleware.ts`):**
```typescript
export interface AuthResult {
  authenticated: boolean
  user?: User
  error?: string
  status?: number
}

// Returns error response or success with user
const { authenticated, user, error, status } = await validateSession(req)
```

**API Response on Auth Failure:**
```typescript
return NextResponse.json(
  { error: 'No authorization header provided' },
  { status: 401 }
)
```

### Validation Errors

**Zod Schema Validation:**
```typescript
import { validate, formatValidationErrors } from '@/lib/validation'

const { success, data, errors } = validate(RegisterSchema, body)
if (!success) {
  return NextResponse.json(
    { error: formatValidationErrors(errors) },
    { status: 400 }
  )
}
```

### Custom Error Classes

**API Utils (`lib/api-utils.ts`):**
```typescript
export class ApiRequestError extends Error {
  status: number
  code?: string
  retryAfter?: number

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }

  static isRateLimitError(error: unknown): error is ApiRequestError {
    return error instanceof ApiRequestError && error.status === 429
  }
}
```

**Usage:**
```typescript
throw new ApiRequestError('Not found', 404)
throw new ApiRequestError('Rate limited', 429, 'RATE_LIMIT')
```

### Permission Errors

**Pattern - Check Authorization After Auth:**
```typescript
// After requireAuth succeeds
const conversation = await getConversation(conversationId)
if (!conversation || conversation.userId !== user.id) {
  return NextResponse.json(
    { error: 'Not authorized to access this conversation' },
    { status: 403 }
  )
}
```

## Logging

### Framework
- **Tool:** `console` (built-in)
- **No external logging framework configured**

### Patterns

**When to Log:**
- Error conditions: `console.error('Error creating conversation:', error)`
- Authentication/authorization events: `console.error('Session validation error:', error)`
- No verbose logging in happy path

**Log Format:**
- Descriptive message followed by error object: `console.error('Context:', error)`
- Consistent prefix matching operation: "Error creating X", "Error fetching Y"

**What NOT to Log:**
- Sensitive data (passwords, API keys, tokens)
- Full request bodies containing credentials
- Stack traces to clients (only to console)

## Comments

### When to Comment

**Required Comments:**
- Complex encryption/decryption logic
- Non-obvious business rules
- Algorithm explanations
- Configuration requirements

**Example - Encryption Comment:**
```typescript
// AES-256-GCM encryption for sensitive data (API keys, MCP credentials)
// Encryption key should be stored in environment variable: KEY_ENCRYPTION_SECRET
```

**Example - Configuration Comment:**
```typescript
// Retry on network errors, 5xx errors, and 429 (rate limit)
```

### JSDoc/TSDoc

**Used For:**
- Function documentation with purpose and params
- Interface/type documentation

**Example - Function:**
```typescript
/**
 * Validate session token from Authorization header
 */
export async function validateSession(req: NextRequest): Promise<AuthResult> {
  // Implementation
}
```

**Example - Encryption Function:**
```typescript
/**
 * Encrypts a string using AES-256-GCM
 * Returns: iv:authTag:encryptedData (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  // Implementation
}
```

**Rarely Used:**
- Individual parameter documentation (kept brief)
- React component prop docs (types are often sufficient)

### Code Section Comments

**Horizontal Section Dividers:**
```typescript
// ============================================
// User Operations
// ============================================

export async function createUser(data: {...}): Promise<User> {
```

Used in:
- `lib/storage.ts` - Sections for User, Session, Conversation, Message operations
- `lib/validation.ts` - Sections for Auth, User Settings, Conversations schemas

## Function Design

### Size Guidelines

**API Route Handlers:**
- Typically 30-50 lines
- Heavy lifting delegated to `lib/storage.ts` (database) and utility functions

**Database Functions (`lib/storage.ts`):**
- Single operation per function: one create, one read, one update, one delete
- Typically 10-20 lines (Prisma calls)
- Grouped by entity type with section comments

**Utility Functions:**
- Focused, single responsibility: encryption, validation, formatting
- 5-40 lines depending on complexity

**React Components:**
- Large components (FullChatApp, SettingsModal) can be 500+ lines with complex state
- Small UI components (Button, Badge) are 30-50 lines
- Hooks are typically 20-50 lines

### Parameters

**Function Parameters:**
- Positional parameters for small counts (≤2): `function getUser(id: string)`
- Object destructuring for 3+ parameters:
  ```typescript
  export async function createConversation({
    title,
    model,
    userId,
  }: {
    title?: string
    model?: string
    userId: string
  }): Promise<Conversation>
  ```

**Type Annotations Always Required:**
```typescript
// Required
export async function getUserByEmail(email: string): Promise<User | null>

// Not: function getUserByEmail(email) { ... }
```

**Optional Parameters:**
- Use `?` suffix in interfaces: `email?: string`
- In function params: `name?: string | null`

### Return Values

**Explicit Return Types:**
- Always specify return type: `Promise<User>`, `NextResponse`, `ReactNode`
- Use `| null` for optional returns: `User | null`
- Never infer types

**Promise Return Pattern:**
```typescript
export async function createUser(data: {...}): Promise<User>
export async function getUserByEmail(email: string): Promise<User | null>
export async function deleteUser(id: string): Promise<boolean>
```

**API Route Returns:**
```typescript
// Return NextResponse
return NextResponse.json(data, { status: 200 })
return NextResponse.json({ error: 'message' }, { status: 400 })

// Or Response.json() for simpler routes
return Response.json(data)
```

## Module Design

### Exports

**Named Exports (Preferred):**
```typescript
export function createUser(...) { ... }
export function getUserByEmail(...) { ... }
export async function deleteSession(...) { ... }

// Later in components
import { createUser, getUserByEmail } from '@/lib/storage'
```

**Type Exports:**
```typescript
export type {
  User,
  Conversation,
  Message,
  Artifact,
}
```

**Re-export Pattern:**
```typescript
// In storage.ts
import type { User, Conversation } from './generated/prisma/client'

export type {
  User,
  Conversation,
  Message,
}
```

### Module Organization

**Single Responsibility per File:**
- `lib/storage.ts` - All database CRUD operations
- `lib/auth-middleware.ts` - Session validation utilities
- `lib/encryption.ts` - Password hashing + AES encryption
- `lib/validation.ts` - Zod schemas + validation helper
- `lib/anthropic.ts` - Anthropic API client setup
- `lib/api-utils.ts` - Retry logic, custom errors

**Section Comments Group Related Functions:**
```typescript
// In storage.ts
// ============================================
// User Operations
// ============================================
export async function createUser(...) { ... }
export async function getUserByEmail(...) { ... }
export async function updateUser(...) { ... }
export async function deleteUser(...) { ... }

// ============================================
// Session Operations
// ============================================
export async function createSession(...) { ... }
export async function getSessionByToken(...) { ... }
```

### Files NOT to Create

- **Avoid barrel exports:** Don't create `index.ts` files with re-exports (use direct imports)
- **Avoid util files with mixed concerns:** Keep encryption, validation, API utils separate
- **Avoid large monolithic files:** Split into logical modules

## TypeScript Patterns

### Type Safety

**Strict Mode Enabled:**
- All types must be explicitly specified
- No `any` types (use `unknown` and narrow)

**Type Narrowing Example (Auth):**
```typescript
const auth = await requireAuth(request)
if (auth instanceof NextResponse) return auth
const { user } = auth  // Now guaranteed to be AuthResult with user
```

**Type Guards:**
```typescript
static isRateLimitError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 429
}
```

### Zod for Validation

**All API inputs validated with Zod schemas:**
```typescript
export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().max(100).optional(),
})

// Usage:
const { success, data, errors } = validate(RegisterSchema, body)
```

**Inferred Types from Schemas:**
```typescript
export type RegisterInput = z.infer<typeof RegisterSchema>
```

## Component Patterns (React)

### Client Components

**"use client" Directive:**
- Used at top of interactive components: `LoginPage`, `FullChatApp`
- Enables hooks, event handlers, browser APIs

```typescript
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

export function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = React.useState<AuthMode>("signin")
  // ...
}
```

### Props Pattern

**Spread Props + CVA Variants:**
```typescript
interface MyComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof myComponentVariants> {}

export function MyComponent({
  className,
  variant,
  size,
  ...props
}: MyComponentProps) {
  return (
    <div
      className={cn(myComponentVariants({ variant, size }), className)}
      {...props}
    />
  )
}
```

### Styling with CVA

**Class Variance Authority for variants:**
```typescript
const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    },
    size: {
      sm: "h-7 px-2.5 text-xs",
      lg: "h-9 px-3",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
})
```

### Conditional Rendering

**Short-circuit Operator:**
```typescript
{loading && <LoadingSpinner />}
{error && <ErrorMessage message={error} />}
{!loading && data && <Content data={data} />}
```

**Ternary for Two Branches:**
```typescript
{isSelected ? <Active /> : <Inactive />}
```

## Async/Await Pattern

**All Async Functions Use async/await (not .then()):**
```typescript
// Correct
export async function createUser(data: {...}): Promise<User> {
  const user = await prisma.user.create({ data })
  return user
}

// Not: .then() chains
```

**Error Handling with Try-Catch:**
```typescript
try {
  const session = await getSessionByToken(token)
  if (!session) return { authenticated: false, error: '...' }
} catch (error) {
  console.error('Session validation error:', error)
  return { authenticated: false, error: '...', status: 500 }
}
```

---

*Convention analysis: 2026-02-26*
