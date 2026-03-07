# Frontend Documentation - LLMatscale.ai

## Quick Reference

| Item | Value |
|------|-------|
| **UI Framework** | React 19.2.3 |
| **Routing** | Next.js 16 App Router |
| **Styling** | TailwindCSS v4 + CSS Variables |
| **Components** | Radix UI + shadcn patterns |
| **AI Integration** | Vercel AI SDK v6.0.97 (`useChat` hook) |
| **Icons** | Lucide React v0.473.0 |
| **Animations** | Framer Motion (`motion/react`) |
| **Charts** | shadcn/ui Charts (Recharts v3.7.0 wrapper) |
| **Tables** | TanStack Table |

## Directory Structure

```
components/
├── full-chat-app.tsx              # Main chat application (101KB) - largest component
├── settings-modal.tsx             # Settings modal (67KB)
├── artifact-preview.tsx           # Artifact preview panel (34KB)
├── login-page.tsx                 # Authentication UI (28KB)
├── find-my-org.tsx                # "Find My Organization" flow (14KB)
├── register-page.tsx              # Invitation-based registration (14KB)
├── org-login-page.tsx             # Organization-specific login (12KB)
├── onboarding-wizard.tsx          # New user onboarding wizard (11KB)
├── sandpack-preview.tsx           # Live React code preview via Sandpack (7KB)
├── error-boundary.tsx             # Error handling wrapper (6KB)
├── providers.tsx                  # Global providers (theme, motion, error boundary) (4KB)
├── artifact-panel-wrapper.tsx     # Artifact panel animation lifecycle (3KB)
├── org-theme-provider.tsx         # Org theme data-theme attribute manager (1KB)
├── admin/                         # 23 admin panel components
│   ├── admin-sidebar.tsx          # Admin console sidebar navigation (9KB)
│   ├── admin-breadcrumb.tsx       # Breadcrumb navigation for admin pages (2KB)
│   ├── analytics-charts.tsx       # Super Admin analytics charts (28KB)
│   ├── org-analytics-charts.tsx   # Org Admin analytics charts (40KB)
│   ├── kpi-card.tsx               # KPI summary card (2KB)
│   ├── model-registry-form.tsx    # Model registry add/edit dialog (20KB)
│   ├── model-registry-table.tsx   # Model registry data table (20KB)
│   ├── mcp-assignment-panel.tsx   # MCP server assignment to roles (32KB)
│   ├── role-card.tsx              # Role display card (6KB)
│   ├── role-form-modal.tsx        # Role create/edit modal (17KB)
│   ├── role-model-assignment.tsx  # Model checkbox assignment for roles (9KB)
│   ├── instruction-editor.tsx     # System instruction textarea with token counter (5KB)
│   ├── instructions-preview.tsx   # Combined instructions preview panel (4KB)
│   ├── user-detail-panel.tsx      # User detail slide-out panel (18KB)
│   ├── conversation-viewer.tsx    # Read-only conversation viewer dialog (8KB)
│   ├── impersonation-banner.tsx   # Impersonation session banner (5KB)
│   ├── theme-assignment-panel.tsx # Super Admin theme assignment (7KB)
│   ├── theme-selector.tsx         # Org Admin theme selector (6KB)
│   ├── data-table.tsx             # Generic data table with TanStack Table (4KB)
│   ├── data-table-column-header.tsx # Sortable/filterable column header (1KB)
│   └── data-table-pagination.tsx  # Table pagination controls (2KB)
├── chat/                          # Chat-specific components
│   └── usage-banner.tsx           # Usage limit warning/blocked banners (7KB)
├── mcp/                           # MCP connection management
│   ├── mcp-add-dialog.tsx         # Add/edit MCP server dialog (10KB)
│   └── mcp-connection-card.tsx    # MCP connection status card (7KB)
├── prompt-kit/                    # 17 chat-specific UI components
│   ├── chat-container.tsx         # Layout wrapper with scroll
│   ├── message.tsx                # Message display + actions (8KB)
│   ├── prompt-input.tsx           # Auto-resizing textarea
│   ├── scroll-button.tsx          # Scroll-to-bottom button
│   ├── code-block.tsx             # Syntax highlighting + copy
│   ├── markdown.tsx               # Markdown renderer (GFM, KaTeX)
│   ├── tool.tsx                   # Tool call visualization (17KB)
│   ├── tool-card.tsx              # Tool result cards (7KB)
│   ├── tool-timeline.tsx          # Tool execution timeline with disclosure (14KB)
│   ├── artifact-tile.tsx          # Artifact inline tile with preview trigger (9KB)
│   ├── loader.tsx                 # Streaming animation (11KB)
│   ├── reasoning.tsx              # Collapsible thinking blocks
│   ├── streaming-text.tsx         # Real-time text animation (7KB)
│   ├── feedback-bar.tsx           # Thumbs up/down
│   ├── system-message.tsx         # System notifications
│   ├── text-shimmer.tsx           # Loading text effect
│   ├── file-card.tsx              # File upload card display (7KB)
│   └── steps.tsx                  # Collapsible step items
├── viewers/                       # Document viewer components
│   ├── pdf-viewer.tsx             # PDF document preview
│   ├── docx-viewer.tsx            # Word document preview (mammoth)
│   ├── xlsx-viewer.tsx            # Excel spreadsheet preview (xlsx)
│   ├── pptx-viewer.tsx            # PowerPoint presentation preview (22KB)
│   └── mermaid-viewer.tsx         # Mermaid diagram renderer
└── ui/                            # 21 Radix UI wrappers
    ├── button.tsx                 # Variants: default, destructive, outline, ghost, link
    ├── badge.tsx                  # Status indicators
    ├── card.tsx                   # Card containers
    ├── input.tsx                  # Text input
    ├── claude-style-chat-input.tsx # Custom Claude-style chat input (42KB)
    ├── dropdown-menu.tsx          # Menus with items/separators (8KB)
    ├── dialog.tsx                 # Modal dialogs
    ├── alert-dialog.tsx           # Destructive action confirmation dialogs
    ├── confirmation-dialog.tsx    # Reusable confirmation dialog wrapper
    ├── sheet.tsx                  # Slide-out panels
    ├── sidebar.tsx                # Complex collapsible sidebar (24KB)
    ├── switch.tsx                 # Toggle switch
    ├── checkbox.tsx               # Checkbox with indeterminate state
    ├── tabs.tsx                   # Tab navigation (Radix Tabs)
    ├── collapsible.tsx            # Expandable sections
    ├── disclosure.tsx             # Animated expand/collapse with Framer Motion
    ├── label.tsx                  # Form labels
    ├── separator.tsx              # Dividers
    ├── skeleton.tsx               # Loading placeholders
    ├── skeleton-loaders.tsx       # Complex loading states (17KB)
    ├── toast.tsx                  # Toast notifications (sonner)
    └── tooltip.tsx                # Hover tooltips

hooks/
├── use-keyboard-shortcuts.tsx     # Chat shortcuts (Cmd+K, Cmd+Enter)
├── use-mobile.tsx                 # Mobile viewport detection (<768px)
├── use-smooth-streaming.ts        # Smooth text streaming animation
├── use-file-content.ts            # File content caching and fetching hook
└── use-dark-mode.ts               # Dark mode detection via MutationObserver
```

## Core Components

### FullChatApp (`full-chat-app.tsx`) - 101KB

The main chat application component. Contains two primary sections:

#### ChatSidebar
- New chat button
- Pinned conversations section
- Recent conversations list (sorted by updatedAt)
- Conversation actions: Pin, Share, Delete
- User account dropdown (logout, settings)
- Collapsible mode (icon-only on mobile)

#### ChatContent
- Model selection dropdown (7 Claude models)
- Web search toggle
- File upload support
- Document preview (PDF, DOCX, XLSX, PPTX)
- Settings modal (replaces settings page)
- Message display with streaming
- Auto-scrolling during generation
- Empty state with welcome message
- Artifact preview panel (side panel)
- Usage limit banners

**State Management:**
```typescript
// Core state
const [conversations, setConversations] = useState<Conversation[]>([])
const [selectedId, setSelectedId] = useState<string | null>(null)
const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(defaultModel)
const [webSearchEnabled, setWebSearchEnabled] = useState(false)

// useChat hook from Vercel AI SDK
const { messages, input, handleSubmit, isLoading, stop, setInput, setMessages } = useChat({
  api: `/api/chat`,
  body: { model: selectedModel, webSearch: webSearchEnabled, conversationId },
  onFinish: () => scrollToBottom()
})
```

### SettingsModal (`settings-modal.tsx`) - 67KB

Multi-tab settings dialog for user preferences:
- API key management (Anthropic key, encrypted)
- MCP server connections
- Appearance settings (theme, color theme, font size)
- Account settings

### ArtifactPreview (`artifact-preview.tsx`) - 34KB

Side panel for rendering generated artifacts. Supports:
- Sandpack live React preview
- Syntax-highlighted code display
- Markdown rendering
- Document viewers (PDF, DOCX, XLSX, PPTX) via dynamic imports
- Mermaid diagram rendering
- Copy, download, and open-in-new-tab actions
- Code/preview toggle

### ArtifactPanelWrapper (`artifact-panel-wrapper.tsx`) - 3KB

Animation lifecycle wrapper for ArtifactPreview. Manages a 3-phase animation:
entering (250ms) -> visible (steady state) -> exiting (200ms) -> unmount.
Prevents abrupt layout recalculation when the panel opens/closes.

### LoginPage (`login-page.tsx`) - 28KB

Authentication UI with sign-in/sign-up modes:
- Email/password validation with Zod
- Session stored in localStorage (`llmatscale_auth_token`)
- 30-day session expiry validation
- Redirects to `/chat` on success

### FindMyOrg (`find-my-org.tsx`) - 14KB

Slack-like "find your workspace" flow for the bare domain:
- User enters email -> system looks up org -> redirects to org login page
- Auto-redirects if valid session exists
- Super Admin emails redirect to `/admin/login`
- Org user emails redirect to `/org/{slug}/login`
- Unknown emails get generic "not found" message (no info leakage)

### RegisterPage (`register-page.tsx`) - 14KB

Invitation-based registration page:
- Accepts invite token, email, org name, org slug, role name
- Shows org branding (logo or initials placeholder)
- Password creation with requirements display
- Redirects to org chat on success

### OrgLoginPage (`org-login-page.tsx`) - 12KB

Organization-specific login page:
- Displays org name, logo, tagline, and welcome message
- Applies org theme (`activeTheme`)
- Email/password authentication scoped to organization
- Link to "Find My Organization" page

### OnboardingWizard (`onboarding-wizard.tsx`) - 11KB

Multi-step wizard for new user compliance acknowledgment:
- 3 steps: Welcome -> Org Terms -> Confirmation
- Shown on first login to an org
- Blocks access to chat until accepted
- Displays org-specific onboarding text or generic terms
- Notes conversation visibility if enabled

### Providers (`providers.tsx`) - 4KB

Global providers wrapper component:
- Initializes theme from localStorage (light/dark/system)
- Applies color theme via `data-theme` attribute
- Applies saved font size
- Wraps children in ErrorBoundary and MotionConfig

### OrgThemeProvider (`org-theme-provider.tsx`) - 1KB

Client component that applies org theme via `data-theme` attribute on `document.documentElement`. Receives theme from server component to avoid FOUC. Cleans up on unmount.

### SandpackPreview (`sandpack-preview.tsx`) - 7KB

Live React code preview using Sandpack. Renders user-generated React components in an isolated sandbox environment.

### ErrorBoundary (`error-boundary.tsx`) - 6KB

React error boundary with fallback UI. Catches rendering errors and displays a recovery interface.

## Admin Components (`admin/`)

Components for the Super Admin and Org Admin consoles.

### Navigation & Layout

| Component | Size | Purpose |
|-----------|------|---------|
| `admin-sidebar.tsx` | 9KB | Sidebar navigation for admin console with section groups and logout |
| `admin-breadcrumb.tsx` | 2KB | Breadcrumb trail based on current pathname (Instructions, Roles, MCP) |
| `impersonation-banner.tsx` | 5KB | Fixed banner during impersonation sessions with countdown timer and end button |

### Analytics & Dashboard

| Component | Size | Purpose |
|-----------|------|---------|
| `analytics-charts.tsx` | 28KB | Super Admin analytics: usage trends, top orgs, error rates, heatmaps, API key consumption, MCP usage, registrations, feature adoption (shadcn/ui Charts) |
| `org-analytics-charts.tsx` | 40KB | Org Admin analytics: usage trends, per-user/role breakdowns, model distribution, MCP usage, response times, error rates, invitation status, inactive users (shadcn/ui Charts) |
| `kpi-card.tsx` | 2KB | Reusable KPI summary card with icon, value, subtitle, and trend indicator |

### Model Management

| Component | Size | Purpose |
|-----------|------|---------|
| `model-registry-form.tsx` | 20KB | Dialog for adding/editing models in the platform registry (generation, thinking type, status, limits) |
| `model-registry-table.tsx` | 20KB | Sortable/filterable data table for model registry with expandable rows and actions (TanStack Table) |

### Role Management

| Component | Size | Purpose |
|-----------|------|---------|
| `role-card.tsx` | 6KB | Card displaying role details (model count, MCP count, limits) with edit/delete actions |
| `role-form-modal.tsx` | 17KB | Multi-tab modal for creating/editing roles (General, Models, Limits, Guardrails) |
| `role-model-assignment.tsx` | 9KB | Checkbox list for assigning platform models to a role |

### MCP & Instructions

| Component | Size | Purpose |
|-----------|------|---------|
| `mcp-assignment-panel.tsx` | 32KB | Panel for assigning MCP servers to roles with connection management |
| `instruction-editor.tsx` | 5KB | Textarea with live token counter, auto-grow, color-coded progress bar, Ctrl+S save |
| `instructions-preview.tsx` | 4KB | Collapsible panel showing combined org + role instructions with token estimate |

### User & Conversation Management

| Component | Size | Purpose |
|-----------|------|---------|
| `user-detail-panel.tsx` | 18KB | Sheet-based slide-out panel for user details and actions (suspend, activate, delete, change role, promote, edit name) |
| `conversation-viewer.tsx` | 8KB | Read-only conversation viewer dialog with markdown rendering and export |

### Theming

| Component | Size | Purpose |
|-----------|------|---------|
| `theme-assignment-panel.tsx` | 7KB | Super Admin component for assigning themes to orgs with color swatch previews |
| `theme-selector.tsx` | 6KB | Org Admin component for selecting active theme from assigned themes |

### Data Table Infrastructure

| Component | Size | Purpose |
|-----------|------|---------|
| `data-table.tsx` | 4KB | Generic data table wrapper using TanStack Table with search, sort, pagination |
| `data-table-column-header.tsx` | 1KB | Sortable/filterable column header with sort direction icons |
| `data-table-pagination.tsx` | 2KB | Pagination controls with rows-per-page selector and page navigation |

## Chat Components (`chat/`)

| Component | Size | Purpose |
|-----------|------|---------|
| `usage-banner.tsx` | 7KB | Polls usage status every 60s; amber warning at 80-99% daily limit (dismissible), red blocked banner at 100% (disables input) |

## MCP Components (`mcp/`)

| Component | Size | Purpose |
|-----------|------|---------|
| `mcp-add-dialog.tsx` | 10KB | Dialog for adding/editing MCP server connections (name, URL, auth type: none/API key/OAuth) |
| `mcp-connection-card.tsx` | 7KB | Card displaying MCP connection status, available tools, and actions (connect/disconnect/edit/delete/refresh) |

## Prompt Kit Components (`prompt-kit/`)

| Component | Size | Purpose | Key Features |
|-----------|------|---------|--------------|
| `chat-container.tsx` | - | Layout wrapper | ScrollArea, auto-scroll |
| `message.tsx` | 8KB | Message display | Avatar, content, actions |
| `prompt-input.tsx` | - | Input area | Auto-resize, keyboard handlers |
| `scroll-button.tsx` | - | Scroll control | Auto-hide, smooth scroll |
| `code-block.tsx` | - | Code display | Syntax highlighting, copy button |
| `markdown.tsx` | - | Content render | GFM, math (KaTeX), custom styles |
| `tool.tsx` | 17KB | Tool calls | Collapsible results, icon mapping |
| `tool-card.tsx` | 7KB | Tool results | Formatted tool output cards |
| `tool-timeline.tsx` | 14KB | Tool timeline | Disclosure-based timeline of tool executions with status icons |
| `artifact-tile.tsx` | 9KB | Artifact inline tile | Type label, download, preview trigger, streaming indicator |
| `steps.tsx` | - | Step items | Collapsible step display with trigger and content |
| `loader.tsx` | 11KB | Loading state | Animated dots and streaming indicators |
| `reasoning.tsx` | - | Thinking blocks | Collapsible, formatted |
| `streaming-text.tsx` | 7KB | Streaming text | Real-time text animation |
| `feedback-bar.tsx` | - | Message feedback | Thumbs up/down |
| `system-message.tsx` | - | System notifications | Styled system messages |
| `text-shimmer.tsx` | - | Loading effect | Shimmer animation on text |
| `file-card.tsx` | 7KB | File uploads | File type icon, size, preview trigger |

## Viewer Components (`viewers/`)

| Component | Size | Purpose |
|-----------|------|---------|
| `pdf-viewer.tsx` | - | PDF document preview |
| `docx-viewer.tsx` | - | Word document preview (uses mammoth) |
| `xlsx-viewer.tsx` | 7KB | Excel spreadsheet preview (uses xlsx) |
| `pptx-viewer.tsx` | 22KB | PowerPoint presentation preview |
| `mermaid-viewer.tsx` | - | Mermaid diagram renderer (dynamic import, dark mode support) |

## UI Components (`ui/`) - shadcn-style

All components use:
- **Class Variance Authority (CVA)** for variants
- **clsx** for conditional classes
- **tailwind-merge** for conflict resolution
- **Radix UI** primitives for accessibility

| Component | Size | Purpose |
|-----------|------|---------|
| `button.tsx` | - | Variants: default, destructive, outline, secondary, ghost, link; Sizes: default, sm, lg, icon |
| `badge.tsx` | - | Status indicators |
| `card.tsx` | - | Card containers (Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription) |
| `input.tsx` | - | Text input |
| `claude-style-chat-input.tsx` | 42KB | Custom Claude-style chat input with file attachments, model selector, tool indicators |
| `dropdown-menu.tsx` | 8KB | Menus with items, separators, sub-menus, checkboxes, radio groups |
| `dialog.tsx` | - | Modal dialogs (Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter) |
| `alert-dialog.tsx` | - | Destructive action confirmation (AlertDialog, AlertDialogAction, AlertDialogCancel, etc.) |
| `confirmation-dialog.tsx` | - | Reusable confirmation dialog wrapper with loading state |
| `sheet.tsx` | - | Slide-out panels (Sheet, SheetContent, SheetHeader, SheetTitle, etc.) |
| `sidebar.tsx` | 24KB | Complex collapsible sidebar with context provider (SidebarProvider, Sidebar, SidebarHeader/Content/Footer, SidebarGroup/Menu/MenuItem, SidebarTrigger, SidebarInset) |
| `switch.tsx` | - | Toggle switch |
| `checkbox.tsx` | - | Checkbox with checked/unchecked/indeterminate states |
| `tabs.tsx` | - | Tab navigation (Tabs, TabsList, TabsTrigger, TabsContent) |
| `collapsible.tsx` | - | Expandable sections (Radix Collapsible) |
| `disclosure.tsx` | - | Animated expand/collapse with Framer Motion context and variants |
| `label.tsx` | - | Form labels |
| `separator.tsx` | - | Visual dividers |
| `skeleton.tsx` | - | Loading placeholders |
| `skeleton-loaders.tsx` | 17KB | Complex loading states for conversations, messages, sidebars, settings |
| `toast.tsx` | - | Toast notifications using sonner (toast.success, toast.error, toast) |
| `tooltip.tsx` | - | Hover tooltips (TooltipProvider, Tooltip, TooltipTrigger, TooltipContent) |

## Custom Hooks

### useDarkMode
```typescript
// Detects dark mode from <html> class via MutationObserver
const isDarkMode = useDarkMode()
```

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

### useFileContent
```typescript
// Cache and fetch file content from Anthropic Files API
const { content, loading, error } = useFileContent(fileId, mimeType)
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
3. If no conversation: `POST /api/conversations`
4. `useChat.handleSubmit()` called
5. `POST /api/chat` with streaming
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
  { id: "claude-opus-4-6", name: "Claude 4.6 Opus" },
  { id: "claude-sonnet-4-6", name: "Claude 4.6 Sonnet" },
  { id: "claude-sonnet-4-5-20250929", name: "Claude 4.5 Sonnet" },
  { id: "claude-haiku-4-5-20251001", name: "Claude 4.5 Haiku" },
  { id: "claude-opus-4-5-20251101", name: "Claude 4.5 Opus" },
  { id: "claude-opus-4-20250514", name: "Claude 4 Opus" },
  { id: "claude-sonnet-4-20250514", name: "Claude 4 Sonnet" },
]
```

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

1. Create file in `components/` or appropriate subdirectory
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

## External Resources

- [React Docs](https://react.dev)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [TailwindCSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)
- [Framer Motion](https://www.framer.com/motion)
- [shadcn/ui Charts](https://ui.shadcn.com/docs/components/radix/chart)
- [TanStack Table](https://tanstack.com/table)
