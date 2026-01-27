# Frontend Documentation - Athena MCP

## Overview

The frontend of Athena MCP is built with Next.js 16 App Router, React 19, and TailwindCSS v4. It provides a modern, responsive chat interface with conversation management, real-time AI streaming, and a polished user experience with solution-specific AI agents.

## Technology Stack

### Core Libraries
- **Next.js 16.1.4** - App Router for file-based routing
- **React 19.2.3** - UI library with latest features
- **TypeScript 5** - Type safety throughout the application
- **TailwindCSS v4** - Utility-first styling with custom theme

### UI Components
- **Radix UI** - Accessible component primitives
  - `@radix-ui/react-avatar v1.1.2` - Avatar component
  - `@radix-ui/react-dialog v1.1.4` - Modal dialogs
  - `@radix-ui/react-dropdown-menu v2.1.16` - Dropdown menus
  - `@radix-ui/react-scroll-area v1.2.2` - Custom scrollbars
  - `@radix-ui/react-separator v1.1.1` - Dividers
  - `@radix-ui/react-slot v1.1.1` - Component composition
  - `@radix-ui/react-tooltip v1.1.6` - Tooltips
- **Lucide React v0.473.0** - Icon library with 1000+ icons
- **Class Variance Authority v0.7.1** - Component variant management
- **clsx v2.1.1 & tailwind-merge v2.6.0** - Conditional className utilities
- **tailwindcss-animate v1.0.7** - Animation utilities

### AI Integration
- **Vercel AI SDK (@ai-sdk/react v3.0.50)** - React hooks for AI chat
  - `useChat` hook for message streaming
  - Real-time message updates
  - Loading states and error handling

### Content Rendering
- **react-markdown v10.1.0** - Markdown rendering
- **remark-gfm v4.0.1** - GitHub Flavored Markdown support

## Directory Structure

```
app/
├── layout.tsx                    # Root layout with fonts & metadata
├── page.tsx                      # Login page (entry point)
├── globals.css                   # Global styles & CSS variables
├── favicon.ico                   # Site favicon
├── chat/
│   └── page.tsx                 # Chat application page (session-protected)
├── solutions/
│   └── page.tsx                 # Solutions showcase page
└── api/                         # Backend API routes (see backend docs)

components/
├── login-page.tsx               # Authentication UI component
├── full-chat-app.tsx            # Main chat application component
├── prompt-kit/                  # Custom chat UI components
│   ├── chat-container.tsx      # Layout wrapper for chat interface
│   ├── message.tsx             # Message display with actions
│   ├── prompt-input.tsx        # Input textarea with keyboard handling
│   ├── scroll-button.tsx       # Scroll-to-bottom button
│   ├── code-block.tsx          # Code syntax highlighting
│   └── markdown.tsx            # Markdown content renderer
└── ui/                          # Radix UI wrapper components (shadcn-style)
    ├── button.tsx
    ├── card.tsx
    ├── badge.tsx
    ├── input.tsx
    ├── dropdown-menu.tsx
    ├── separator.tsx
    ├── sheet.tsx
    ├── sidebar.tsx              # Complex sidebar with collapsible state
    ├── skeleton.tsx
    └── tooltip.tsx

hooks/
└── use-mobile.tsx               # Hook to detect mobile viewport (<768px)

lib/
├── db.ts                        # Prisma client singleton (backend)
└── utils.ts                     # Utility functions (cn for className merging)
```

## Key Components

### 1. Root Layout (`app/layout.tsx`)

**Location**: `app/layout.tsx:1`

The root layout sets up the application shell:
- Geist font family (Sans and Mono variants)
- Global CSS variables and TailwindCSS
- HTML lang attribute and body classes
- Metadata (title, description)

```tsx
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

### 2. Login Page (`components/login-page.tsx`)

**Location**: `components/login-page.tsx:1`

Simple authentication UI with localStorage-based session:
- Sign-in and sign-up forms
- Email and password validation
- Session stored in localStorage (`athena_auth_session`)
- Redirects to chat page after successful auth
- Note: Not production-grade, suitable for demo/development

**Features**:
- Form validation (email format, password length)
- Toggle between sign-in and sign-up modes
- User data stored in localStorage
- Session management with expiry

### 3. Chat Page (`app/chat/page.tsx`)

**Location**: `app/chat/page.tsx:1`

Session-protected chat page:
- Checks for valid session on mount
- Redirects to login if no session
- Renders `FullChatApp` component
- Client-side component (`"use client"`)
- Supports solution-specific chat via URL params

### 4. Solutions Page (`app/solutions/page.tsx`)

**Location**: `app/solutions/page.tsx:1`

Showcase page for AI solution use cases:
- Grid of solution cards with badges
- Solution categories:
  - Manufacturing (MES + Engineering)
  - Maintenance (MTBF / MTTR)
  - Support (Tickets + RCA + Ops)
  - Change Management (ECOs + Process Changes)
  - Impact Analysis (Yield + Cost + Delivery)
  - Requirements (Engineering + IT)
- Each card has:
  - Title and description
  - Badge (category label)
  - "Learn More" button that navigates to chat with solution context
- Responsive grid layout

### 5. Full Chat App (`components/full-chat-app.tsx`)

**Location**: `components/full-chat-app.tsx:1`

Main chat application with two primary sections:

#### a) ChatSidebar Component

**Features**:
- Collapsible sidebar with icon-only mode
- New chat button (creates new conversation)
- Projects and Artifacts buttons (UI ready)
- Pinned conversations section
- Recent conversations section
- Solution type badges on conversations
- Conversation actions dropdown:
  - Pin/Unpin
  - Share (copies share link to clipboard)
  - Delete
- User account dropdown in footer
- Responsive design (collapses on mobile)

**Props**:
```tsx
{
  conversations: Conversation[]          // List of conversations
  selectedId: string | null              // Currently selected conversation
  onSelectConversation: (id: string)     // Callback when conversation selected
  onNewChat: ()                          // Callback for new chat
  onDeleteConversation: (id: string)     // Callback to delete conversation
  onPinConversation: (id: string, isPinned: boolean)  // Callback to pin/unpin
  onShareConversation: (id: string)      // Callback to share
}
```

#### b) ChatContent Component

**Features**:
- Message display with streaming support
- Real-time AI responses via `useChat` hook
- Model selection dropdown (Claude 4.5 Sonnet, Haiku, Opus, 4 Sonnet)
- Solution type indicator (Manufacturing, Maintenance, Support, etc.)
- Web search toggle button
- Voice input button (UI ready)
- Message actions (copy, edit, upvote, downvote)
- Auto-scrolling during message streaming
- Empty state with welcome message
- Loading state while fetching messages
- Markdown rendering with syntax highlighting
- Code block support with copy functionality

**Props**:
```tsx
{
  conversationId: string | null          // Current conversation ID
  selectedModel: ClaudeModelId           // Selected Claude model
  setSelectedModel: (model: ClaudeModelId)  // Callback to change model
  solutionType: string | null            // Current solution type
  setSolutionType: (type: string | null)  // Callback to change solution type
  onConversationCreated: (id: string)    // Callback when new conversation created
}
```

**useChat Hook Integration**:
```tsx
const {
  messages,        // Array of chat messages
  input,           // Current input value
  handleSubmit,    // Form submit handler
  isLoading,       // Is AI responding
  stop,            // Stop AI generation
  setInput,        // Set input value
  setMessages,     // Set messages array
} = useChat({
  api: `/api/chat/${solutionType || ''}`,  // Solution-specific endpoint
  body: {
    model: selectedModel,
    webSearch: webSearchEnabled,
    conversationId,
  },
  initialMessages,
  onFinish: () => scrollToBottom(),
})
```

### 6. Prompt Kit Components (`components/prompt-kit/`)

Custom chat UI components for consistent styling:

#### ChatContainer (`chat-container.tsx`)
- `ChatContainerRoot` - Main container with scroll area
- `ChatContainerContent` - Content wrapper with padding

#### Message (`message.tsx`)
- `Message` - Message wrapper component
- `MessageContent` - Content with markdown support
- `MessageActions` - Actions container (copy, upvote, etc.)
- `MessageAction` - Individual action with tooltip

#### PromptInput (`prompt-input.tsx`)
- `PromptInput` - Input form wrapper
- `PromptInputTextarea` - Auto-resizing textarea
- `PromptInputActions` - Actions container (send, attachments)
- `PromptInputAction` - Individual action with tooltip

#### ScrollButton (`scroll-button.tsx`)
- Scroll-to-bottom button
- Auto-hides when at bottom
- Shows when user scrolls up

#### CodeBlock (`code-block.tsx`)
- Syntax-highlighted code display
- Language detection
- Copy to clipboard button
- Line numbers (optional)

#### Markdown (`markdown.tsx`)
- Markdown content renderer
- Uses react-markdown with remark-gfm
- Custom styling for code, links, lists, etc.

### 7. UI Components (`components/ui/`)

Reusable Radix UI-based components following shadcn patterns:

#### Button (`ui/button.tsx`)
Variants: default, destructive, outline, secondary, ghost, link
Sizes: default, sm, lg, icon

#### Badge (`ui/badge.tsx`)
Variants: default, secondary, destructive, outline
Used for solution type indicators

#### Card (`ui/card.tsx`)
- `Card` - Card container
- `CardHeader` - Header section
- `CardTitle` - Title text
- `CardDescription` - Description text
- `CardContent` - Main content
- `CardFooter` - Footer section

#### Dropdown Menu (`ui/dropdown-menu.tsx`)
- `DropdownMenu` - Menu container
- `DropdownMenuTrigger` - Trigger button
- `DropdownMenuContent` - Menu content
- `DropdownMenuItem` - Menu item
- `DropdownMenuLabel` - Menu label
- `DropdownMenuSeparator` - Divider

#### Sidebar (`ui/sidebar.tsx`)
Complex sidebar component with:
- `SidebarProvider` - Context provider
- `Sidebar` - Main sidebar container
- `SidebarHeader` - Header section
- `SidebarContent` - Scrollable content
- `SidebarFooter` - Footer section
- `SidebarGroup` - Group of items
- `SidebarGroupLabel` - Group label
- `SidebarMenu` - Menu container
- `SidebarMenuItem` - Menu item
- `SidebarMenuButton` - Menu button
- `SidebarInset` - Main content area
- `SidebarTrigger` - Toggle button
- Collapsible state (icon-only mode)

## State Management

### Local State (React useState)
Used for:
- Conversation list
- Selected conversation ID
- Selected Claude model
- Selected solution type
- Web search toggle
- Loading states
- Message input value

### Server State (React useEffect + fetch)
Used for:
- Fetching conversations on mount
- Loading messages when conversation changes
- Creating/updating/deleting conversations
- Saving messages to database

### AI SDK State (useChat hook)
Managed by Vercel AI SDK:
- Messages array (user and assistant messages)
- Input value (current message being typed)
- Loading state (is AI responding)
- Stream handling (real-time message updates)

## Solution-Specific Chat Flow

### URL-Based Solution Selection
1. User clicks solution card on `/solutions` page
2. Navigates to `/chat?solution=manufacturing` (example)
3. Frontend reads `solution` query parameter
4. Sets `solutionType` state in `FullChatApp`
5. useChat hook uses solution-specific API endpoint: `/api/chat/manufacturing`
6. Backend adds domain-specific system prompt
7. AI responds with specialized knowledge

### Available Solutions
- `manufacturing` - Manufacturing Reports & Insights
- `maintenance` - Maintenance & Reliability
- `support` - Support & Incident Management
- `change-management` - Change Management
- `impact-analysis` - Impact Analysis
- `requirements` - Requirements Management
- `null` (default) - General purpose chat

## Styling & Theming

### CSS Variables (app/globals.css)

```css
@theme {
  /* Light theme */
  --color-background: oklch(100% 0 0);
  --color-foreground: oklch(11.11% 0 0);
  --color-primary: oklch(25.56% 0 0);
  --color-secondary: oklch(96.44% 0 0);
  /* ... more colors */

  /* Sidebar colors */
  --color-sidebar-background: oklch(98% 0 0);
  --color-sidebar-foreground: oklch(14.22% 0 0);
  /* ... more sidebar colors */
}

.dark {
  /* Dark theme overrides */
  --color-background: oklch(11.11% 0 0);
  --color-foreground: oklch(97.78% 0 0);
  /* ... more colors */
}
```

### TailwindCSS Utilities
- Use `cn()` utility from `lib/utils.ts` to merge classNames
- Responsive breakpoints: sm (640px), md (768px), lg (1024px)
- Custom animations: tailwindcss-animate plugin

### Component Styling Patterns
- Base styles + variants (Class Variance Authority)
- Conditional classes with clsx
- Merge conflicts with tailwind-merge
- Radix UI data attributes for state styling

## Data Flow

### Message Sending Flow
1. User types message in `PromptInputTextarea`
2. User clicks send or presses Enter
3. `onSubmit` handler is called
4. If no conversation exists:
   - Create new conversation via `POST /api/conversations` with `solutionType`
   - Get conversation ID from response
   - Set as selected conversation
5. `handleSubmit` from `useChat` hook is called
6. Hook sends `POST /api/chat/{solution}` with:
   - messages array
   - conversationId
   - model selection
   - webSearch flag
7. Backend adds solution-specific system prompt
8. Backend streams AI response
9. Hook updates messages array in real-time
10. Message component renders streaming text with markdown
11. On finish, message saved to database
12. Conversation list refreshed

### Conversation Management Flow
1. On mount, fetch conversations via `GET /api/conversations`
2. Display in sidebar (pinned first, then recent)
3. Show solution type badges on conversations
4. User selects conversation → load messages via `GET /api/conversations/[id]`
5. User pins conversation → `PATCH /api/conversations/[id]` with `isPinned: true`
6. User deletes conversation → `DELETE /api/conversations/[id]`
7. Conversation list updated in local state

## Claude Models

Available models (defined in `components/full-chat-app.tsx`):

```tsx
const CLAUDE_MODELS = [
  {
    id: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    name: "Claude 4.5 Sonnet",
    description: "Most intelligent model, best for complex tasks",
  },
  {
    id: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    name: "Claude 4.5 Haiku",
    description: "Fast and efficient for simple tasks",
  },
  {
    id: "us.anthropic.claude-opus-4-5-20251101-v1:0",
    name: "Claude 4.5 Opus",
    description: "Best for complex reasoning and analysis",
  },
  {
    id: "us.anthropic.claude-sonnet-4-20250514-v1:0",
    name: "Claude 4 Sonnet",
    description: "Balanced performance and speed",
  },
]
```

## Responsive Design

### Mobile Breakpoints
- **Mobile**: < 768px (md breakpoint)
  - Sidebar collapses to icon-only mode
  - Reduced padding and margins
  - Stacked layout for cards
- **Tablet**: 768px - 1024px
  - Full sidebar visible
  - Adjusted spacing
- **Desktop**: > 1024px
  - Full layout with sidebar
  - Maximum content width: 48rem (768px)

### Mobile Optimizations
- Touch-friendly button sizes (min 44x44px)
- Swipe gestures for sidebar (via Radix UI)
- Reduced animations on mobile
- Optimized font sizes for readability

## Accessibility

### ARIA Labels
- Semantic HTML elements (button, nav, main, aside)
- ARIA labels for icon buttons
- Screen reader announcements for dynamic content

### Keyboard Navigation
- Tab order follows visual flow
- Enter key submits messages
- Escape closes dropdowns and dialogs
- Arrow keys navigate menus

### Focus Management
- Visible focus indicators
- Focus trap in modals
- Auto-focus on message input when conversation selected

### Color Contrast
- WCAG AA compliant color ratios
- Sufficient contrast in light and dark themes
- Text on background: 4.5:1 minimum ratio

## Performance Optimizations

### React Optimizations
- `useCallback` for event handlers to prevent re-renders
- `useMemo` for expensive computations (if needed)
- Lazy loading for routes (built-in with App Router)
- Code splitting by page

### Bundle Optimization
- Tree-shaking unused code
- Vercel AI SDK uses streaming (no large JSON payloads)
- TailwindCSS purges unused styles in production
- Next.js optimizes images automatically

### Rendering Performance
- Virtualized lists for long conversation history (if needed)
- Debounced scroll events
- Optimized re-renders with React.memo (where beneficial)
- Streaming messages prevent blocking UI
- Markdown rendering optimized with memoization

## Development Tips

### Adding New Components
1. Create component in `components/` or `components/ui/`
2. Use TypeScript for props interface
3. Follow existing naming conventions
4. Use `cn()` for className merging
5. Add accessibility attributes
6. Test in light and dark themes

### Modifying Styles
1. Use TailwindCSS utilities first
2. Add custom CSS variables for theme colors
3. Follow existing spacing scale
4. Test responsive breakpoints
5. Ensure WCAG compliance

### Working with AI SDK
1. Use `useChat` hook for chat interfaces
2. Configure API endpoint and body
3. Handle loading and error states
4. Use `onFinish` callback for post-processing
5. Stream responses for better UX

### Adding New Solution Types
1. Add solution card to `/solutions` page
2. Create corresponding API route (see backend docs)
3. Update TypeScript types for solutionType
4. Test navigation from solution card to chat
5. Verify solution-specific system prompt works

## Testing (Future)

### Unit Tests
- Component rendering tests (Jest + React Testing Library)
- Hook behavior tests
- Utility function tests

### Integration Tests
- User flow tests (login → chat → send message)
- API integration tests
- Conversation management tests
- Solution-specific chat tests

### E2E Tests
- Playwright for full user journeys
- Test critical paths (auth, chat, conversation management)
- Visual regression testing

## Production Checklist

- [ ] Remove console.log statements
- [ ] Add error boundaries for graceful error handling
- [ ] Implement proper authentication (replace localStorage)
- [ ] Add loading skeletons for better UX
- [ ] Optimize images and assets
- [ ] Add meta tags for SEO
- [ ] Configure CSP headers
- [ ] Add analytics tracking
- [ ] Set up error monitoring (Sentry)
- [ ] Test on multiple browsers and devices
- [ ] Add PWA support (service worker, manifest)
- [ ] Implement offline support (where applicable)
- [ ] Test all solution-specific chat flows

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **Radix UI**: https://www.radix-ui.com/primitives
- **TailwindCSS**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev
- **React Markdown**: https://github.com/remarkjs/react-markdown
- **Remark GFM**: https://github.com/remarkjs/remark-gfm
