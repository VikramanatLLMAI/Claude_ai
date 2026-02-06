# App Directory - Next.js Pages & Routing

## Quick Reference

| Item | Value |
|------|-------|
| **Framework** | Next.js 16 App Router |
| **Entry Point** | `page.tsx` (Login) |
| **Protected Routes** | `/chat`, `/settings` |
| **Public Routes** | `/`, `/solutions` |

## Directory Structure

```
app/
├── layout.tsx              # Root layout (fonts, metadata)
├── page.tsx                # Login page (entry point)
├── globals.css             # Global styles & CSS variables
├── favicon.ico             # Site favicon
├── chat/
│   └── page.tsx           # Chat application (protected)
├── solutions/
│   └── page.tsx           # Solutions showcase
├── settings/
│   └── page.tsx           # User settings (protected)
├── api/                    # Backend routes (see api/CLAUDE.md)
└── CLAUDE.md              # This file
```

## Pages

### Login Page (`page.tsx`)
**Path:** `/`

Entry point - renders `LoginPage` component.
- Sign-in / sign-up form
- Session stored in localStorage
- Redirects to `/solutions` on success

### Solutions Page (`solutions/page.tsx`)
**Path:** `/solutions`

Showcase of AI solution use cases:
- 6 solution cards in responsive grid
- Each card navigates to `/chat?solution={type}`

| Solution | Query Param |
|----------|-------------|
| Manufacturing | `?solution=manufacturing` |
| Maintenance | `?solution=maintenance` |
| Support | `?solution=support` |
| Change Management | `?solution=change-management` |
| Impact Analysis | `?solution=impact-analysis` |
| Requirements | `?solution=requirements` |

### Chat Page (`chat/page.tsx`)
**Path:** `/chat` or `/chat?solution={type}`

Main chat application (protected):
- Checks session on mount
- Redirects to `/` if no session
- Renders `FullChatApp` component
- Reads `solution` query param for solution-specific chat

```typescript
"use client"

export default function ChatPage() {
  const searchParams = useSearchParams()
  const solution = searchParams.get('solution')

  // Session check...

  return <FullChatApp initialSolution={solution} />
}
```

### Settings Page (`settings/page.tsx`)
**Path:** `/settings`

User settings (protected):
- Theme preferences (light/dark/system)
- Font size
- Code theme selection
- AWS credentials management
- MCP connection management

## Root Layout (`layout.tsx`)

Sets up application shell:
```typescript
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

export const metadata = {
  title: "Athena MCP - AI Chat Application",
  description: "Specialized AI chat application with solution-specific agents",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

## Global Styles (`globals.css`)

### CSS Variables
```css
@theme {
  /* Colors */
  --color-background: oklch(100% 0 0);
  --color-foreground: oklch(11.11% 0 0);
  --color-primary: oklch(25.56% 0 0);
  --color-secondary: oklch(96.44% 0 0);
  --color-destructive: oklch(57.59% 0.214 27.33);
  --color-border: oklch(91.33% 0 0);

  /* Sidebar */
  --color-sidebar-background: oklch(98% 0 0);
  --color-sidebar-foreground: oklch(14.22% 0 0);

  /* Fonts */
  --font-geist-sans: var(--font-geist-sans);
  --font-geist-mono: var(--font-geist-mono);
}

.dark {
  /* Dark theme overrides */
  --color-background: oklch(11.11% 0 0);
  --color-foreground: oklch(97.78% 0 0);
}
```

### Theme Support
- Light theme (default)
- Dark theme via `.dark` class on `<html>`
- System preference detection via `matchMedia`
- Theme stored in localStorage (`athena_theme`)

## Session Management

### Token Storage
```typescript
// Set session
localStorage.setItem('athena_auth_token', token)
localStorage.setItem('athena_user', JSON.stringify(user))

// Get session
const token = localStorage.getItem('athena_auth_token')
const user = JSON.parse(localStorage.getItem('athena_user') || '{}')

// Clear session
localStorage.removeItem('athena_auth_token')
localStorage.removeItem('athena_user')
```

### Route Protection Pattern
```typescript
"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProtectedPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('athena_auth_token')
    if (!token) {
      router.push('/')
      return
    }
    setLoading(false)
  }, [router])

  if (loading) return <LoadingSpinner />
  return <PageContent />
}
```

## Adding New Pages

1. Create directory: `app/my-page/`
2. Create page file: `app/my-page/page.tsx`
3. Add `"use client"` if using hooks/state
4. Add session check if protected
5. Update navigation in components

```typescript
// app/my-page/page.tsx
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MyPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('athena_auth_token')
    if (!token) router.push('/')
  }, [router])

  return <div>My Page Content</div>
}
```

## Related Documentation

- **Components:** `components/CLAUDE.md`
- **Backend API:** `app/api/CLAUDE.md`
- **Project Overview:** `CLAUDE.md` (root)
