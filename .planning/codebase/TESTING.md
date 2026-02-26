# Testing Patterns

**Analysis Date:** 2026-02-26

## Test Framework

### Current State

**Status:** No testing framework configured

- **package.json** does not include test runners (Jest, Vitest, etc.)
- No test files exist in source code (`src/`, `app/`, `components/`)
- No test configuration files (`jest.config.js`, `vitest.config.ts`, etc.)
- ESLint + TypeScript provide some code quality coverage

### Recommended Framework (Not Yet Implemented)

For implementing tests in the future:
- **Unit/Integration:** Vitest (lighter than Jest, good TypeScript support)
- **Component Testing:** React Testing Library + Vitest
- **E2E Testing:** Playwright or Cypress

## What Needs Testing

### Critical Paths

**Authentication Flow:**
- User registration validation
- Login with password verification
- Session token generation and validation
- Password reset flow
- Session expiry checking

**Database Operations (`lib/storage.ts`):**
- User CRUD operations
- Session creation and retrieval
- Conversation CRUD (with ownership verification)
- Message operations
- Artifact operations with authorization checks

**API Routes:**
- Authorization checks on protected endpoints
- Input validation with Zod schemas
- Error handling with proper HTTP status codes
- Response serialization (dates to ISO strings, etc.)

**Encryption:**
- AES-256-GCM encryption/decryption round-trip
- Password hashing and verification
- Encrypted credential storage and retrieval

**Component Logic:**
- LoginPage form submission and error handling
- Session check on protected routes (FullChatApp)
- Keyboard shortcuts (Cmd+K, Cmd+Enter)
- Mobile viewport detection

### Areas NOT Requiring Tests

- UI snapshot testing (changes frequently with design updates)
- Component visual rendering (covered by manual QA)
- External API mocking (Anthropic API calls tested manually)

## Test File Organization

### Structure (If Implemented)

**Co-located with source (Recommended):**
```
lib/
├── storage.ts
├── storage.test.ts           # Tests for storage layer
├── auth-middleware.ts
├── auth-middleware.test.ts
├── encryption.ts
├── encryption.test.ts
└── validation.ts
    └── validation.test.ts

components/
├── login-page.tsx
├── login-page.test.tsx
└── full-chat-app.tsx
    └── full-chat-app.test.tsx
```

**Naming Convention:**
- Test files: `[module].test.ts` or `[module].test.tsx`
- Tests live in same directory as source code
- Easy to find tests for any module

### Setup Files

**If Testing is Added:**
```
__tests__/
├── setup.ts              # Global test setup
├── mocks/
│   ├── db.ts            # Mock Prisma client
│   ├── anthropic.ts     # Mock Anthropic API
│   └── storage.ts       # Mock storage functions
└── fixtures/
    ├── users.json       # Test user data
    ├── conversations.json
    └── messages.json
```

## Suggested Test Structure

### Unit Test Pattern

**For Library Functions (`lib/encryption.ts`):**
```typescript
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, hashPassword, verifyPassword } from '@/lib/encryption'

describe('Encryption', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'sensitive data'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'test'
      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should throw on invalid encrypted format', () => {
      expect(() => decrypt('invalid')).toThrow()
    })
  })

  describe('password hashing', () => {
    it('should hash and verify a password', async () => {
      const password = 'MyPassword123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'MyPassword123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword('WrongPassword123', hash)
      expect(isValid).toBe(false)
    })

    it('should produce different hashes for same password', async () => {
      const password = 'test'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      expect(hash1).not.toBe(hash2)
    })
  })
})
```

### Validation Test Pattern

**For Zod Schemas (`lib/validation.ts`):**
```typescript
import { describe, it, expect } from 'vitest'
import { validate, RegisterSchema, LoginSchema, PasswordSchema } from '@/lib/validation'

describe('Validation Schemas', () => {
  describe('PasswordSchema', () => {
    it('should accept valid password', () => {
      const { success, data } = validate(PasswordSchema, 'MyPassword123')
      expect(success).toBe(true)
      expect(data).toBe('MyPassword123')
    })

    it('should reject password shorter than 8 chars', () => {
      const { success, errors } = validate(PasswordSchema, 'Pass1')
      expect(success).toBe(false)
      expect(errors?.[0]?.message).toContain('at least 8 characters')
    })

    it('should reject password without uppercase', () => {
      const { success } = validate(PasswordSchema, 'password123')
      expect(success).toBe(false)
    })

    it('should reject password without lowercase', () => {
      const { success } = validate(PasswordSchema, 'PASSWORD123')
      expect(success).toBe(false)
    })

    it('should reject password without number', () => {
      const { success } = validate(PasswordSchema, 'Password')
      expect(success).toBe(false)
    })
  })

  describe('RegisterSchema', () => {
    it('should validate complete registration data', () => {
      const { success, data } = validate(RegisterSchema, {
        email: 'user@example.com',
        password: 'MyPassword123',
        name: 'John Doe',
      })
      expect(success).toBe(true)
      expect(data?.email).toBe('user@example.com')
      expect(data?.name).toBe('John Doe')
    })

    it('should allow optional name field', () => {
      const { success } = validate(RegisterSchema, {
        email: 'user@example.com',
        password: 'MyPassword123',
      })
      expect(success).toBe(true)
    })

    it('should reject invalid email', () => {
      const { success } = validate(RegisterSchema, {
        email: 'not-an-email',
        password: 'MyPassword123',
      })
      expect(success).toBe(false)
    })
  })
})
```

### Database Test Pattern

**For Storage Functions (`lib/storage.ts`) with mocked Prisma:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createUser, getUserByEmail, deleteUser } from '@/lib/storage'
import prisma from '@/lib/db'

// Mock the db
vi.mock('@/lib/db', () => ({
  default: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('Storage - User Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createUser', () => {
    it('should create a new user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hash123',
        name: 'John',
        createdAt: new Date(),
      }

      vi.mocked(prisma.user.create).mockResolvedValue(mockUser)

      const result = await createUser({
        email: 'user@example.com',
        passwordHash: 'hash123',
        name: 'John',
      })

      expect(result).toEqual(mockUser)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'user@example.com',
          passwordHash: 'hash123',
          name: 'John',
        },
      })
    })
  })

  describe('getUserByEmail', () => {
    it('should return user if found', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' }
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      const result = await getUserByEmail('user@example.com')

      expect(result).toEqual(mockUser)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      })
    })

    it('should return null if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await getUserByEmail('nonexistent@example.com')

      expect(result).toBeNull()
    })
  })

  describe('deleteUser', () => {
    it('should return true on successful deletion', async () => {
      vi.mocked(prisma.user.delete).mockResolvedValue({})

      const result = await deleteUser('user-1')

      expect(result).toBe(true)
    })

    it('should return false on deletion error', async () => {
      vi.mocked(prisma.user.delete).mockRejectedValue(new Error('Not found'))

      const result = await deleteUser('user-1')

      expect(result).toBe(false)
    })
  })
})
```

### API Route Test Pattern

**For Route Handlers (`app/api/auth/login/route.ts`):**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/auth/login/route'
import { getUserByEmail, createSession } from '@/lib/storage'
import { verifyPassword, generateToken } from '@/lib/encryption'

vi.mock('@/lib/storage')
vi.mock('@/lib/encryption')

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 if email or password missing', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('required')
  })

  it('should return 401 if user not found', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null)

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'unknown@example.com',
        password: 'Password123',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('Invalid')
  })

  it('should return 401 if password incorrect', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash123',
    }

    vi.mocked(getUserByEmail).mockResolvedValue(mockUser)
    vi.mocked(verifyPassword).mockResolvedValue(false)

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'WrongPassword123',
      }),
    })

    const response = await POST(req)

    expect(response.status).toBe(401)
  })

  it('should return 200 and session token on success', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash123',
      name: 'John',
    }

    vi.mocked(getUserByEmail).mockResolvedValue(mockUser)
    vi.mocked(verifyPassword).mockResolvedValue(true)
    vi.mocked(generateToken).mockReturnValue('token-123')
    vi.mocked(createSession).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      token: 'token-123',
      expiresAt: new Date(),
    })

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'MyPassword123',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.token).toBe('token-123')
    expect(data.user.id).toBe('user-1')
    expect(data.user.email).toBe('user@example.com')
  })
})
```

### Authorization Test Pattern

**For Protected Routes with User Ownership:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from '@/app/api/conversations/[id]/route'
import { requireAuth } from '@/lib/auth-middleware'
import { getConversation, deleteConversation } from '@/lib/storage'

vi.mock('@/lib/auth-middleware')
vi.mock('@/lib/storage')

describe('DELETE /api/conversations/[id]', () => {
  it('should return 401 if not authenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse('Unauthorized', { status: 401 })
    )

    const req = new Request('http://localhost/api/conversations/conv-1', {
      method: 'DELETE',
    })

    const response = await DELETE(req, { params: { id: 'conv-1' } })

    expect(response.status).toBe(401)
  })

  it('should return 403 if user does not own conversation', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      authenticated: true,
      user: { id: 'user-1', email: 'user1@example.com' },
    })

    vi.mocked(getConversation).mockResolvedValue({
      id: 'conv-1',
      userId: 'user-2',  // Different user
      title: 'Conversation',
      createdAt: new Date(),
    })

    const req = new Request('http://localhost/api/conversations/conv-1', {
      method: 'DELETE',
    })

    const response = await DELETE(req, { params: { id: 'conv-1' } })

    expect(response.status).toBe(403)
  })

  it('should delete conversation if user owns it', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      authenticated: true,
      user: { id: 'user-1', email: 'user@example.com' },
    })

    vi.mocked(getConversation).mockResolvedValue({
      id: 'conv-1',
      userId: 'user-1',  // Same user
      title: 'Conversation',
      createdAt: new Date(),
    })

    vi.mocked(deleteConversation).mockResolvedValue({
      id: 'conv-1',
      userId: 'user-1',
      title: 'Conversation',
    })

    const req = new Request('http://localhost/api/conversations/conv-1', {
      method: 'DELETE',
    })

    const response = await DELETE(req, { params: { id: 'conv-1' } })

    expect(response.status).toBe(200)
    expect(deleteConversation).toHaveBeenCalledWith('conv-1')
  })
})
```

## Mocking

### Mocking Framework

**If Using Vitest:**
- `vi.mock()` for module mocking
- `vi.fn()` for function mocks
- `vi.mocked()` for type-safe mock access
- `vi.clearAllMocks()` between tests

### What to Mock

**Always Mock:**
- Database (`@/lib/db` - Prisma client)
- External APIs (Anthropic API)
- Authentication (`@/lib/auth-middleware` in route tests)
- Encryption functions in database tests (keep encryption tests isolated)

**What NOT to Mock:**
- Validation functions (test them directly)
- Encryption/hashing (test with real crypto - deterministic tests only for hashing)
- Storage layer helpers (test with mocked DB)

### Mock Patterns

**Function Mock:**
```typescript
vi.mock('@/lib/encryption', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}))
```

**Default Export Mock:**
```typescript
vi.mock('@/lib/db', () => ({
  default: {
    user: { create: vi.fn(), findUnique: vi.fn() },
    conversation: { findUnique: vi.fn() },
  },
}))
```

**Type-Safe Mock Access:**
```typescript
import { vi } from 'vitest'
import { createUser } from '@/lib/storage'

// This gives TypeScript support
vi.mocked(createUser).mockResolvedValue(mockUser)
```

## Fixtures and Test Data

### Test Data Pattern (If Implemented)

**Fixture Objects:**
```typescript
// __tests__/fixtures/users.ts
export const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  passwordHash: 'hash123',
  name: 'John Doe',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

export const mockUsers = {
  regular: mockUser,
  admin: { ...mockUser, id: 'user-2', email: 'admin@example.com' },
}

// __tests__/fixtures/conversations.ts
export const mockConversation = {
  id: 'conv-1',
  userId: 'user-1',
  title: 'Test Conversation',
  isPinned: false,
  isShared: false,
  model: 'claude-opus-4-6',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}
```

**Usage in Tests:**
```typescript
import { mockUser, mockConversation } from '__tests__/fixtures'

it('should delete user conversation', async () => {
  vi.mocked(getConversation).mockResolvedValue(mockConversation)
  vi.mocked(requireAuth).mockResolvedValue({
    authenticated: true,
    user: mockUser,  // Reuse fixture
  })
  // ...
})
```

## Coverage

### Current Coverage
**Status:** Not measured - no test framework configured

### Recommended Coverage Targets (If Implemented)

| Area | Target | Priority |
|------|--------|----------|
| `lib/storage.ts` | 80%+ | Critical |
| `lib/encryption.ts` | 95%+ | Critical |
| `lib/auth-middleware.ts` | 85%+ | Critical |
| `lib/validation.ts` | 75%+ | High |
| `app/api/*` routes | 75%+ | High |
| `components/` | 50%+ | Low |

### View Coverage (If Implemented)

```bash
npm run test:coverage
# Generates coverage report in coverage/ directory
# View: open coverage/index.html
```

## Test Types

### Unit Tests

**Scope:** Individual functions in isolation

**Examples:**
- Encryption round-trip testing
- Validation schema testing
- Error handling in utility functions
- Type guard testing

**Location:** `lib/*.test.ts`, `hooks/*.test.ts`

### Integration Tests

**Scope:** Functions working together (with mocked external dependencies)

**Examples:**
- Complete auth flow (validation → password hash → session creation)
- Conversation CRUD with authorization
- Artifact creation with message validation

**Location:** `app/api/*.test.ts` (route handlers)

**Run:** Same as unit tests (Vitest runs both)

### E2E Tests (Not Yet Implemented)

**Scope:** Full user flows through browser

**Tools:** Playwright or Cypress (not configured)

**Would Test:**
- Login → Create conversation → Send message → Receive response
- Settings modal open/close
- File upload flow
- Keyboard shortcuts

**Location:** `__tests__/e2e/*.spec.ts`

## Common Patterns

### Testing Async/Await Functions

**Pattern: Mock resolve/reject**
```typescript
it('should handle async operation', async () => {
  vi.mocked(getUserByEmail).mockResolvedValue(mockUser)

  const result = await getUserByEmail('user@example.com')

  expect(result).toEqual(mockUser)
})

it('should handle async errors', async () => {
  vi.mocked(getUserByEmail).mockRejectedValue(new Error('DB error'))

  await expect(getUserByEmail('user@example.com')).rejects.toThrow('DB error')
})
```

### Testing Error Responses

**Pattern: Verify error object structure**
```typescript
it('should return validation error', async () => {
  const { success, errors } = validate(PasswordSchema, 'short')

  expect(success).toBe(false)
  expect(errors).toHaveLength(1)
  expect(errors?.[0]?.message).toContain('at least 8')
})
```

### Testing Side Effects

**Pattern: Verify function calls**
```typescript
it('should call createSession on successful login', async () => {
  // Setup mocks and execute
  const response = await POST(req)

  // Verify side effect
  expect(createSession).toHaveBeenCalledWith({
    userId: 'user-1',
    token: expect.any(String),
    expiresAt: expect.any(Date),
  })
})
```

### Testing Query Parameters

**Pattern: Create Request with searchParams**
```typescript
it('should filter by conversationId', async () => {
  const url = new URL('http://localhost/api/artifacts?conversationId=conv-1')
  const req = new NextRequest(url)

  const response = await GET(req)

  expect(getConversationArtifacts).toHaveBeenCalledWith('conv-1')
})
```

### Testing Request Bodies

**Pattern: Create Request with JSON body**
```typescript
it('should validate required fields', async () => {
  const req = new Request('http://localhost/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title: 'New Chat' }),
    // Missing model field
  })

  const response = await POST(req)

  expect(response.status).toBe(400)
})
```

## Test Execution

### Setup (When Testing is Implemented)

**package.json scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage"
  }
}
```

### Run Commands (Future)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- lib/encryption.test.ts

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Security Testing Patterns

### Password Verification Timing Safety

**Pattern: Verify function is timing-safe**
```typescript
it('should use timing-safe password comparison', async () => {
  // Test assumes verifyPassword implementation uses timing-safe comparison
  // This is documented in lib/encryption.ts comments
  const hash = await hashPassword('MyPassword123')

  // Both should take approximately same time
  const start1 = performance.now()
  await verifyPassword('WrongPassword1', hash)
  const time1 = performance.now() - start1

  const start2 = performance.now()
  await verifyPassword('WrongPassword2', hash)
  const time2 = performance.now() - start2

  // Times should be similar (within margin of error)
  expect(Math.abs(time1 - time2)).toBeLessThan(100) // 100ms tolerance
})
```

### Authorization Boundary Testing

**Pattern: Test ownership verification**
```typescript
describe('Authorization', () => {
  it('should not allow user to access other user conversions', async () => {
    // User 1 tries to access User 2's conversation
    const conversation = { id: 'conv-1', userId: 'user-2' }

    vi.mocked(requireAuth).mockResolvedValue({
      authenticated: true,
      user: { id: 'user-1' },
    })
    vi.mocked(getConversation).mockResolvedValue(conversation)

    const response = await GET(req)

    expect(response.status).toBe(403)
  })
})
```

---

*Testing analysis: 2026-02-26*
