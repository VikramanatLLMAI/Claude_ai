# Frontend Documentation - Athena MCP

## Quick Reference

| Item | Value |
|------|-------|
| **UI Framework** | React 19.2.3 |
| **Routing** | Next.js 16 App Router |
| **Styling** | TailwindCSS v4 + CSS Variables |
| **Components** | Radix UI + shadcn patterns |
| **AI Integration** | Vercel AI SDK v6.0.62 (`useChat` hook) |
| **Icons** | Lucide React v0.473.0 |
| **Animations** | Framer Motion (`motion/react`) |

## Directory Structure

```
components/
├── full-chat-app.tsx           # Main chat application (86KB)
├── login-page.tsx              # Authentication UI
├── error-boundary.tsx          # Error handling wrapper
├── prompt-kit/                 # 17 chat-specific components
│   ├── chat-container.tsx     # Layout wrapper with scroll
│   ├── message.tsx            # Message display + actions
│   ├── prompt-input.tsx       # Auto-resizing textarea
│   ├── scroll-button.tsx      # Scroll-to-bottom button
│   ├── code-block.tsx         # Syntax highlighting
│   ├── markdown.tsx           # Markdown renderer
│   ├── tool.tsx               # Tool call visualization
│   ├── tool-card.tsx          # Tool result cards
│   ├── loader.tsx             # Streaming animation
│   ├── reasoning.tsx          # Collapsible thinking blocks
│   ├── streaming-text.tsx     # Real-time text animation
│   ├── feedback-bar.tsx       # Thumbs up/down
│   ├── prompt-suggestion.tsx  # Suggested prompts
│   ├── system-message.tsx     # System notifications
│   ├── source.tsx             # Citation display
│   ├── text-shimmer.tsx       # Loading effect
│   └── welcome-state.tsx      # Initial state UI
└── ui/                         # 16 Radix UI wrappers
    ├── button.tsx             # Variants: default, destructive, outline, ghost, link
    ├── badge.tsx              # Status indicators
    ├── card.tsx               # Card containers
    ├── input.tsx              # Text input
    ├── dropdown-menu.tsx      # Menus with items/separators
    ├── dialog.tsx             # Modal dialogs
    ├── sheet.tsx              # Slide-out panels
    ├── sidebar.tsx            # Complex collapsible sidebar (24KB)
    ├── tabs.tsx               # Tab interface
    ├── switch.tsx             # Toggle switch
    ├── collapsible.tsx        # Expandable sections
    ├── label.tsx              # Form labels
    ├── separator.tsx          # Dividers
    ├── skeleton.tsx           # Loading placeholders
    ├── skeleton-loaders.tsx   # Complex loading states
    └── tooltip.tsx            # Hover tooltips

hooks/
├── use-keyboard-shortcuts.tsx  # Chat shortcuts (Cmd+K, Cmd+Enter)
├── use-mobile.tsx              # Mobile viewport detection (<768px)
└── use-smooth-streaming.ts     # Smooth text streaming animation
```

## Core Components

### FullChatApp (`full-chat-app.tsx`)

The main chat application component (86KB). Contains two primary sections:

#### ChatSidebar
- New chat button
- Pinned conversations section
- Recent conversations list (sorted by updatedAt)
- Solution type badges on conversations
- Conversation actions: Pin, Share, Delete
- User account dropdown (logout, settings)
- Collapsible mode (icon-only on mobile)

#### ChatContent
- Model selection dropdown (4 Claude models)
- Solution type indicator
- Web search toggle
- Voice input button (UI ready)
- Message display with streaming
- Auto-scrolling during generation
- Empty state with welcome message

**Key Props:**
```typescript
interface FullChatAppProps {
  initialSolution?: string | null  // From URL param ?solution=
}
```

**State Management:**
```typescript
// Core state
const [conversations, setConversations] = useState<Conversation[]>([])
const [selectedId, setSelectedId] = useState<string | null>(null)
const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(defaultModel)
const [solutionType, setSolutionType] = useState<string | null>(null)
const [webSearchEnabled, setWebSearchEnabled] = useState(false)

// useChat hook from Vercel AI SDK
const { messages, input, handleSubmit, isLoading, stop, setInput, setMessages } = useChat({
  api: `/api/chat/${solutionType || ''}`,
  body: { model: selectedModel, webSearch: webSearchEnabled, conversationId },
  onFinish: () => scrollToBottom()
})
```

### LoginPage (`login-page.tsx`)

Authentication UI with sign-in/sign-up modes:
- Email/password validation with Zod
- Session stored in localStorage (`athena_auth_token`)
- 30-day session expiry validation
- Redirects to `/solutions` on success

### Prompt Kit Components

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| `ChatContainer` | Layout wrapper | ScrollArea, auto-scroll |
| `Message` | Message display | Avatar, content, actions |
| `PromptInput` | Input area | Auto-resize, keyboard handlers |
| `ScrollButton` | Scroll control | Auto-hide, smooth scroll |
| `CodeBlock` | Code display | Syntax highlighting, copy button |
| `Markdown` | Content render | GFM, math (KaTeX), custom styles |
| `Tool` | Tool calls | Collapsible results |
| `Reasoning` | Thinking blocks | Collapsible, formatted |
| `Loader` | Loading state | Animated dots |
| `FeedbackBar` | Message feedback | Thumbs up/down |

### UI Components (shadcn-style)

All components use:
- **Class Variance Authority (CVA)** for variants
- **clsx** for conditional classes
- **tailwind-merge** for conflict resolution
- **Radix UI** primitives for accessibility

**Button Variants:**
```typescript
const buttonVariants = cva("...", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      destructive: "bg-destructive text-destructive-foreground",
      outline: "border border-input bg-background",
      secondary: "bg-secondary text-secondary-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-8",
      icon: "h-9 w-9",
    },
  },
})
```

**Sidebar Component:**
Complex sidebar (24KB) with context provider:
- `SidebarProvider` - State management
- `Sidebar` - Main container
- `SidebarHeader/Content/Footer` - Sections
- `SidebarGroup/Menu/MenuItem` - Navigation
- `SidebarTrigger` - Collapse toggle
- `SidebarInset` - Main content area

## Custom Hooks

### useKeyboardShortcuts
```typescript
// Chat keyboard shortcuts
useKeyboardShortcuts({
  'Cmd+K': () => openSearch(),
  'Cmd+Enter': () => sendMessage(),
  'Escape': () => closePanel(),
})
```

### useMobile
```typescript
// Returns true if viewport < 768px
const isMobile = useMobile()
```

### useSmoothStreaming
```typescript
// Smooth text animation for streaming
const displayText = useSmoothStreaming(streamingText, {
  speed: 50,  // chars per second
  enabled: isStreaming,
})
```

## Styling System

### CSS Variables (`app/globals.css`)

```css
@theme {
  /* Light theme */
  --color-background: oklch(100% 0 0);
  --color-foreground: oklch(11.11% 0 0);
  --color-primary: oklch(25.56% 0 0);
  --color-secondary: oklch(96.44% 0 0);
  --color-muted: oklch(96.44% 0 0);
  --color-accent: oklch(96.44% 0 0);
  --color-destructive: oklch(57.59% 0.214 27.33);
  --color-border: oklch(91.33% 0 0);
  --color-input: oklch(91.33% 0 0);
  --color-ring: oklch(70.78% 0 0);

  /* Sidebar specific */
  --color-sidebar-background: oklch(98% 0 0);
  --color-sidebar-foreground: oklch(14.22% 0 0);
  --color-sidebar-primary: oklch(25.56% 0 0);
  --color-sidebar-accent: oklch(96.44% 0 0);
  --color-sidebar-border: oklch(91.33% 0 0);
  --color-sidebar-ring: oklch(70.78% 0 0);

  /* Font families */
  --font-geist-sans: var(--font-geist-sans);
  --font-geist-mono: var(--font-geist-mono);
}

.dark {
  --color-background: oklch(11.11% 0 0);
  --color-foreground: oklch(97.78% 0 0);
  /* ... dark overrides */
}
```

### Using the cn() Utility

```typescript
import { cn } from "@/lib/utils"

// Merge classes with conflict resolution
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className
)} />
```

### Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Mobile cutoff |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

## Data Flow

### Message Sending
1. User types in `PromptInput`
2. Submit via Enter or click
3. If no conversation: `POST /api/conversations` with solutionType
4. `useChat.handleSubmit()` called
5. `POST /api/chat/{solution}` with streaming
6. Backend streams response
7. `useChat` updates messages in real-time
8. On finish, conversation list refreshed

### Conversation Management
1. Mount: `GET /api/conversations`
2. Select: `GET /api/conversations/[id]` loads messages
3. Pin: `PATCH /api/conversations/[id]` with `isPinned`
4. Share: `PATCH /api/conversations/[id]` with `isShared`
5. Delete: `DELETE /api/conversations/[id]`

## Claude Models

```typescript
const CLAUDE_MODELS = [
  { id: "us.anthropic.claude-sonnet-4-5-20250929-v1:0", name: "Claude 4.5 Sonnet" },
  { id: "us.anthropic.claude-haiku-4-5-20251001-v1:0", name: "Claude 4.5 Haiku" },
  { id: "us.anthropic.claude-opus-4-5-20251101-v1:0", name: "Claude 4.5 Opus" },
  { id: "us.anthropic.claude-sonnet-4-20250514-v1:0", name: "Claude 4 Sonnet" },
]
```

## Solution Types

| Solution | URL Param | Badge Color |
|----------|-----------|-------------|
| Manufacturing | `?solution=manufacturing` | Blue |
| Maintenance | `?solution=maintenance` | Green |
| Support | `?solution=support` | Orange |
| Change Management | `?solution=change-management` | Purple |
| Impact Analysis | `?solution=impact-analysis` | Red |
| Requirements | `?solution=requirements` | Cyan |

## Accessibility

### Keyboard Navigation
- `Tab` - Navigate focusable elements
- `Enter` - Submit message, activate buttons
- `Escape` - Close dropdowns/dialogs
- `Arrow keys` - Navigate menus
- `Home/End` - Jump to first/last item

### Screen Reader Support
- Semantic HTML (`button`, `nav`, `main`, `aside`)
- ARIA labels on icon buttons
- Live regions for dynamic content
- Focus management in modals

### Focus Management
```typescript
import { trapFocus, focusFirstFocusable } from "@/lib/accessibility"

// Trap focus in modal
useEffect(() => {
  if (isOpen) return trapFocus(modalRef.current)
}, [isOpen])
```

## Performance Patterns

### React Optimizations
```typescript
// Memoize callbacks
const handleSubmit = useCallback((e) => { ... }, [deps])

// Memoize expensive computations
const filteredMessages = useMemo(() =>
  messages.filter(m => m.role !== 'system'),
  [messages]
)
```

### Debouncing
```typescript
import { useDebouncedCallback } from "@/lib/performance"

// Debounce search input
const debouncedSearch = useDebouncedCallback(
  (value) => searchConversations(value),
  300
)
```

## Adding New Components

1. Create file in `components/` or `components/ui/`
2. Use TypeScript with proper interfaces
3. Follow CVA pattern for variants
4. Use `cn()` for className merging
5. Add accessibility attributes
6. Test light/dark themes
7. Test responsive breakpoints

```typescript
// Example component template
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const myComponentVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", secondary: "..." },
    size: { sm: "...", md: "...", lg: "..." },
  },
  defaultVariants: { variant: "default", size: "md" },
})

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

## Adding New Solution Types

1. Add solution card to `app/solutions/page.tsx`
2. Create API route `app/api/chat/[solution]/route.ts`
3. Add system prompt in `lib/system-prompts.ts`
4. Update TypeScript types if needed
5. Test navigation flow: Solutions → Chat → Messages

## External Resources

- [React Docs](https://react.dev)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [TailwindCSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)
- [Framer Motion](https://www.framer.com/motion)
