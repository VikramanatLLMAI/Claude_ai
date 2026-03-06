# Phase 9: Admin UI Overhaul - Research

**Researched:** 2026-03-06
**Domain:** Frontend UI/UX -- sidebar collapse, navigation rework, visual polish
**Confidence:** HIGH

## Summary

Phase 9 is a frontend-only phase that enhances both admin dashboards (Super Admin and Org Admin) with collapsible sidebars, improved navigation patterns, and Vercel-level visual polish. The existing codebase already has substantial infrastructure in place: `sidebar.tsx` (24KB) provides full collapse/expand mechanics with cookie persistence, keyboard shortcuts, and tooltip support. The `AdminSidebar` component uses this infrastructure but does not currently pass `collapsible="icon"` to enable icon-only collapse mode.

The navigation rework centers on replacing the current bare footer (user info + buttons) with a profile expander pattern using Radix Collapsible, and adding bidirectional navigation between chat and admin consoles. The visual polish work requires auditing all ~22 admin pages across both dashboards to standardize headers, spacing, and layout patterns to match Vercel's clean, minimal aesthetic.

**Primary recommendation:** Use the existing shadcn sidebar infrastructure with `collapsible="icon"` prop, Radix Collapsible for profile expanders, and create a shared `AdminPageHeader` component to enforce consistent page headers across all admin pages.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Collapse trigger is a chevron/arrow icon inside the sidebar header (right side, next to branding)
- Collapsed state is icons-only with subtle separator lines between groups (no text, no group labels)
- Click trigger to expand back (no hover-to-expand behavior)
- Keyboard shortcut 'b' toggles collapse (already in sidebar.tsx infrastructure)
- Smooth width transition animation ~200ms (sidebar shrinks from 16rem to 3rem, text fades out)
- Collapse state persists across navigations via cookie (already supported by SidebarProvider)
- Tooltips on hover for each icon in collapsed mode (already supported by SidebarMenuButton)
- Works identically in both Super Admin and Org Admin dashboards
- Org Admin sidebar profile expander: Expandable footer section at sidebar bottom. Shows avatar + name (collapsed). Click to expand and reveal: email, Settings link, Back to Chat link, Log Out
- Back to Chat placement: Inside the profile expander only (not in the page header area)
- Sign Out removal from admin sidebar: Sign Out moves into the profile expander
- Admin Console link in chat UI: Org admins see an "Admin Console" link in the chat sidebar profile section (footer), alongside Settings and Log Out
- Super Admin profile expander: Same pattern as Org Admin but without "Back to Chat"
- Admin page headers cleanup: Remove clutter from main content area headers
- Design reference: Vercel Dashboard -- clean, minimal, lots of whitespace, monochrome with subtle borders
- Page headers: Title + short description + action buttons on the right
- Data-heavy pages: Flat layout with subtle dividers, no card borders around tables
- Settings-style pages: Single column centered with max-width ~720px, sections stacked vertically
- Scrolling: All admin pages scroll properly when content overflows
- Component library: Use existing shadcn/Radix UI components
- Settings modal: Keep as modal, keep existing 8 tabs, improve spacing/typography/hierarchy/responsive sizing

### Claude's Discretion
- Exact spacing values and typography scale
- Specific animation easing curves for sidebar collapse
- Loading skeleton designs for admin pages
- Error state handling and empty state designs
- Color palette adjustments within existing theme system
- Whether to add breadcrumbs above page titles (not required but allowed)

### Deferred Ideas (OUT OF SCOPE)
- Resizable sidebar (drag to resize) -- v1.2 UIE-01
- Keyboard-driven admin navigation (Linear-style) -- v1.2 UIE-02
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SIDE-01 | Admin sidebar collapses to icons-only mode with smooth animation | sidebar.tsx already has `collapsible="icon"` mode with CSS transitions; AdminSidebar needs to pass this prop |
| SIDE-02 | Collapse trigger button inside sidebar (right side, near branding) | SidebarTrigger component exists; needs placement in SidebarHeader next to branding |
| SIDE-03 | Sidebar collapse state persists across page navigations (cookie-based) | SidebarProvider already handles cookie persistence via SIDEBAR_COOKIE_NAME |
| SIDE-04 | Collapsed sidebar shows tooltips on hover for each icon | SidebarMenuButton already supports `tooltip` prop, already passed in AdminSidebar |
| SIDE-05 | Sidebar collapse works consistently in both dashboards | Same AdminSidebar component used in both layouts; single change applies to both |
| NAV-01 | Org Admin sidebar has profile expander with Logout, Settings, Back to Chat | Replace current SidebarFooter content with Radix Collapsible-based expander |
| NAV-02 | Admin Console has "Back to Chat" in top-left header area | CONTEXT.md overrides: Back to Chat is inside profile expander only, NOT in header |
| NAV-03 | Sign Out removed from Org Admin console (available via chat interface profile) | CONTEXT.md clarifies: Sign Out moves INTO the profile expander, not removed entirely |
| NAV-04 | Chat interface profile expander includes "Admin Console" link for org admins | full-chat-app.tsx already has Admin Console link in SidebarFooter; verify placement in dropdown |
| POLISH-01 | All admin pages have proper scrollbars when content overflows | Audit all admin page containers for overflow handling |
| POLISH-02 | Unwanted borders, lines, and boxes removed across all admin pages | Audit border classes, remove Card wrappers around tables |
| POLISH-03 | Consistent spacing, typography, and visual hierarchy | Create shared AdminPageHeader component; standardize spacing tokens |
| POLISH-04 | Admin pages match Vercel-level clean, minimal design aesthetic | Apply Vercel patterns: monochrome, whitespace, subtle borders |
| POLISH-05 | Instructions, MCP, Settings pages have improved layouts | Single-column centered layout with max-width ~720px |
| POLISH-06 | All admin data tables, forms, and modals have consistent styling | Standardize table containers, form spacing, modal layouts |
| POLISH-07 | User settings modal has improved UI/UX design | Improve spacing, typography, form controls across all 8 tabs |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Radix UI Collapsible | latest | Profile expander sections | Already in components/ui/collapsible.tsx |
| shadcn Sidebar | custom | Collapsible sidebar infrastructure | Already in components/ui/sidebar.tsx (24KB) |
| Radix UI Tooltip | latest | Collapsed mode icon tooltips | Already in components/ui/tooltip.tsx |
| Lucide React | 0.473.0 | Icons for sidebar and navigation | Already used throughout project |
| TailwindCSS | v4 | Styling and responsive design | Project standard |
| CVA | latest | Component variants | Project standard |
| Framer Motion | latest | Smooth animations | Already used via motion/react |

### No New Dependencies
This phase requires zero new npm packages. Everything needed is already installed.

## Architecture Patterns

### Recommended Changes Structure
```
components/
  admin/
    admin-sidebar.tsx          # MODIFY: Add collapsible="icon", profile expander, collapse trigger
    admin-page-header.tsx      # NEW: Shared page header component
    admin-breadcrumb.tsx       # MODIFY or REMOVE: May be replaced by page headers
  ui/
    sidebar.tsx                # NO CHANGE: Infrastructure already complete
    collapsible.tsx            # NO CHANGE: Used for profile expander
  full-chat-app.tsx            # MODIFY: Admin Console link in chat sidebar dropdown
  settings-modal.tsx           # MODIFY: Visual polish across all 8 tabs

app/
  super-admin/
    layout.tsx                 # MINOR: No structural changes needed
    models/page.tsx            # MODIFY: Use AdminPageHeader, remove SidebarTrigger from page
    organizations/page.tsx     # MODIFY: Same pattern
    settings/page.tsx          # MODIFY: Single-column centered layout
    system-prompt/page.tsx     # MODIFY: Single-column centered layout
    ... (all pages)            # MODIFY: Consistent headers and layouts
  org/[slug]/admin/
    layout.tsx                 # MODIFY: Remove AdminBreadcrumb (replaced by page headers)
    instructions/page.tsx      # MODIFY: Single-column layout, visual polish
    roles/page.tsx             # MODIFY: Consistent header
    ... (all pages)            # MODIFY: Consistent headers and layouts
```

### Pattern 1: Collapsible Sidebar with Icon Mode

**What:** Pass `collapsible="icon"` to the Sidebar component to enable icon-only collapse.
**When to use:** Both admin layouts.

The existing sidebar.tsx handles everything when `collapsible="icon"` is set:
- Gap div transitions width from `--sidebar-width` (16rem) to `--sidebar-width-icon` (3rem)
- Container div transitions width accordingly
- `group-data-[collapsible=icon]` CSS selectors hide text, labels, badges
- `SidebarMenuButton` forces `size-8 p-2` in collapsed mode
- `SidebarGroupLabel` gets `-mt-8 opacity-0` transition

```typescript
// In AdminSidebar - change from:
<Sidebar>
// To:
<Sidebar collapsible="icon">
```

The collapse trigger should be placed in the SidebarHeader:
```typescript
<SidebarHeader className="border-b border-sidebar-border px-4 py-4">
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
      {/* icon */}
    </div>
    <div className="flex flex-col group-data-[collapsible=icon]:hidden">
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-sidebar-foreground/60">{subtitle}</span>
    </div>
    <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
  </div>
</SidebarHeader>
```

**Key detail:** The `SidebarTrigger` already uses `useSidebar().toggleSidebar()` and renders a `PanelLeftIcon`. The CONTEXT.md specifies a chevron/arrow icon instead. Override the icon:
```typescript
<Button variant="ghost" size="icon-sm" onClick={toggleSidebar}>
  <ChevronLeft className="h-4 w-4 transition-transform group-data-[state=collapsed]:rotate-180" />
</Button>
```

### Pattern 2: Profile Expander (Radix Collapsible)

**What:** Replace the current footer with a collapsible profile section.
**When to use:** Both admin sidebar footers.

```typescript
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

<SidebarFooter className="border-t border-sidebar-border">
  <Collapsible>
    <CollapsibleTrigger asChild>
      <SidebarMenuButton size="lg" className="w-full">
        {/* Avatar circle */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
          {initials}
        </div>
        <div className="flex flex-col text-left group-data-[collapsible=icon]:hidden">
          <span className="truncate text-sm font-medium">{name}</span>
        </div>
        <ChevronUp className="ml-auto size-4 transition-transform group-data-[collapsible=icon]:hidden" />
      </SidebarMenuButton>
    </CollapsibleTrigger>
    <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
      <div className="px-3 py-2 space-y-1">
        <p className="text-xs text-muted-foreground truncate">{email}</p>
        {/* Links: Settings, Back to Chat (org only), Log Out */}
      </div>
    </CollapsibleContent>
  </Collapsible>
</SidebarFooter>
```

**Important:** In collapsed sidebar mode, the profile expander content must be hidden. The `group-data-[collapsible=icon]:hidden` class handles this. In collapsed mode, clicking the avatar could show a tooltip or do nothing -- the tooltip prop on SidebarMenuButton will show the user's name.

### Pattern 3: Shared AdminPageHeader Component

**What:** A reusable header component for all admin pages.
**When to use:** Every admin page replaces its custom header with this.

```typescript
interface AdminPageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
```

**Key design choice:** The SidebarTrigger should NOT be in each page header. Instead, the collapse trigger is inside the sidebar header itself (per CONTEXT.md). Pages should not render SidebarTrigger at all -- it creates visual clutter.

### Pattern 4: Page Layout Categories

**Data-heavy pages** (users, audit logs, models, conversations, invitations, API keys, organizations, super admins):
```typescript
<div className="flex h-screen flex-col">
  <AdminPageHeader title="..." description="..." actions={...} />
  <div className="flex-1 overflow-auto p-6">
    {/* Table without Card wrapper, flat layout */}
  </div>
</div>
```

**Settings-style pages** (instructions, settings, security, system prompt, MCP):
```typescript
<div className="flex h-screen flex-col">
  <AdminPageHeader title="..." description="..." />
  <div className="flex-1 overflow-auto">
    <div className="mx-auto max-w-3xl px-6 py-6 space-y-8">
      {/* Sections stacked vertically */}
    </div>
  </div>
</div>
```

**Dashboard pages** (analytics, org admin overview):
```typescript
<div className="flex h-screen flex-col">
  <AdminPageHeader title="..." description="..." actions={...} />
  <div className="flex-1 overflow-auto p-6 space-y-6">
    {/* KPI cards + charts */}
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Wrapping tables in Card components:** Creates unnecessary visual noise. Use flat tables with subtle border-bottom on rows instead.
- **Icons in page headers:** The CONTEXT.md says "clean headers" -- no decorative icons next to page titles (the models page currently has a CPU icon).
- **SidebarTrigger in page content:** The trigger belongs in the sidebar header, not scattered across page headers.
- **Inconsistent max-widths:** Settings pages should all use the same max-width (~720px / max-w-3xl).
- **Nested scrolling containers:** Each page should have one scrollable area, not nested scroll containers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sidebar collapse | Custom collapse logic | `Sidebar collapsible="icon"` from sidebar.tsx | Already handles transitions, cookies, keyboard shortcuts, responsive |
| Profile expander | Custom toggle state | Radix Collapsible (collapsible.tsx) | Handles aria attributes, animation, accessibility |
| Tooltips on icons | Custom hover labels | SidebarMenuButton `tooltip` prop | Already wired up, shows only in collapsed mode |
| Keyboard shortcut | Custom key listener | SidebarProvider's built-in 'b' shortcut | Already implemented with Ctrl+B |
| Cookie persistence | Custom cookie logic | SidebarProvider's built-in cookie management | Already writes/reads SIDEBAR_COOKIE_NAME |

## Common Pitfalls

### Pitfall 1: SidebarTrigger Icon Override
**What goes wrong:** The default SidebarTrigger uses `PanelLeftIcon`, but CONTEXT.md specifies a chevron/arrow icon.
**Why it happens:** Using SidebarTrigger directly without customizing the icon.
**How to avoid:** Create a custom trigger button that calls `useSidebar().toggleSidebar()` with a ChevronLeft icon that rotates 180 degrees when collapsed.
**Warning signs:** The toggle button looks inconsistent with the rest of the sidebar design.

### Pitfall 2: Collapsed Mode Content Overflow
**What goes wrong:** Text content leaks outside the 3rem collapsed sidebar.
**Why it happens:** Not all text elements have `group-data-[collapsible=icon]:hidden` or proper overflow handling.
**How to avoid:** The existing sidebar.tsx handles most cases via `group-data-[collapsible=icon]:overflow-hidden` on SidebarContent. But custom elements in SidebarHeader and SidebarFooter need explicit hiding.
**Warning signs:** Text visible behind the collapsed sidebar or wrapping oddly.

### Pitfall 3: Profile Expander in Collapsed Mode
**What goes wrong:** The profile expander trigger area looks broken or the collapsible content shows in collapsed mode.
**Why it happens:** Collapsible content not hidden when sidebar is in icon mode.
**How to avoid:** Add `group-data-[collapsible=icon]:hidden` to CollapsibleContent and to the name/chevron elements in the trigger.
**Warning signs:** Extra content visible in the narrow 3rem sidebar.

### Pitfall 4: Page Scroll Interference
**What goes wrong:** Admin pages don't scroll properly, or the sidebar scrolls with the page.
**Why it happens:** The sidebar uses `fixed` positioning (`inset-y-0`), so it already doesn't scroll with the page. But page content inside SidebarInset needs proper `overflow-auto` and `h-screen` / `flex-1` structure.
**How to avoid:** Use `flex h-screen flex-col` on the page root, put the header as a fixed-height element, and put content in a `flex-1 overflow-auto` container.
**Warning signs:** Page content cut off at the bottom, no scrollbar visible, or entire page scrolling including the header.

### Pitfall 5: Settings Modal Overflow
**What goes wrong:** Settings modal content overflows on smaller screens or tabs with lots of content.
**Why it happens:** Fixed modal height without proper internal scrolling per tab.
**How to avoid:** Set a max-height on the modal content area and add `overflow-y-auto` to each tab's content panel.
**Warning signs:** Modal content getting cut off, form fields not reachable.

### Pitfall 6: Admin Console Link Visibility
**What goes wrong:** Non-admin users see the Admin Console link in the chat sidebar.
**Why it happens:** Missing permission check.
**How to avoid:** The existing code already checks `isOrgAdmin && orgSlug` -- verify this condition is correctly evaluated. The `isOrgAdmin` flag should come from the session data (role permissions check).
**Warning signs:** Regular users seeing Admin Console link.

### Pitfall 7: Inconsistent Dark Mode
**What goes wrong:** Polish changes look good in light mode but break in dark mode.
**Why it happens:** Hardcoding light-mode colors instead of using CSS variables.
**How to avoid:** Always use Tailwind's semantic color classes (`text-foreground`, `bg-background`, `border-border`, etc.) and never hardcode hex/oklch values in component classes.
**Warning signs:** Bright white elements or unreadable text in dark mode.

## Code Examples

### Sidebar Collapse - Enabling Icon Mode
```typescript
// components/admin/admin-sidebar.tsx
// Change the Sidebar component usage:

// BEFORE:
<Sidebar>

// AFTER:
<Sidebar collapsible="icon">
```

This single prop change activates all the built-in collapse behavior in sidebar.tsx:
- Width transitions from 16rem to 3rem
- SidebarGroupLabel gets opacity-0 and negative margin
- SidebarMenuButton forces 8x8 with p-2
- SidebarContent sets overflow-hidden

### Custom Collapse Trigger in Sidebar Header
```typescript
// Inside AdminSidebar component:
import { useSidebar } from "@/components/ui/sidebar"
import { ChevronLeft } from "lucide-react"

function CollapseButton() {
  const { toggleSidebar, state } = useSidebar()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      className="ml-auto h-7 w-7 shrink-0"
      aria-label={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
    >
      <ChevronLeft className={cn(
        "h-4 w-4 transition-transform duration-200",
        state === "collapsed" && "rotate-180"
      )} />
    </Button>
  )
}
```

### Profile Expander Pattern
```typescript
// Inside SidebarFooter of AdminSidebar:
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

<SidebarFooter className="border-t border-sidebar-border p-2">
  <SidebarMenu>
    <SidebarMenuItem>
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton size="lg" tooltip={currentUser?.name || "Account"}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground">
              {(currentUser?.name?.[0] || "A").toUpperCase()}
            </div>
            <span className="truncate text-sm font-medium">{currentUser?.name}</span>
            <ChevronUp className="ml-auto h-4 w-4" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 space-y-0.5 px-2 pb-1">
            <p className="px-2 text-xs text-muted-foreground truncate mb-2">{currentUser?.email}</p>
            {isOrgAdmin && orgSlug && (
              <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-sm" asChild>
                <Link href={`/org/${orgSlug}/chat`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Chat
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-sm text-destructive hover:text-destructive" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarFooter>
```

### Chat Sidebar - Admin Console in Dropdown
```typescript
// In full-chat-app.tsx ChatSidebar, inside the DropdownMenuContent:
<DropdownMenuContent side="top" className="w-[220px] p-1">
  <div className="px-3 py-2.5">
    <p className="text-sm font-medium text-foreground">{userName}</p>
    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
  </div>
  <DropdownMenuSeparator />
  {isOrgAdmin && orgSlug && (
    <DropdownMenuItem onClick={() => router.push(`/org/${orgSlug}/admin`)} className="gap-2.5 px-3 py-2">
      <Shield className="size-4 text-muted-foreground" />
      <span>Admin Console</span>
    </DropdownMenuItem>
  )}
  <DropdownMenuItem onClick={onOpenSettings} className="gap-2.5 px-3 py-2">
    <Settings className="size-4 text-muted-foreground" />
    <span>Settings</span>
  </DropdownMenuItem>
  <DropdownMenuItem onClick={handleSignOut} className="gap-2.5 px-3 py-2">
    <LogOut className="size-4 text-muted-foreground" />
    <span>Log out</span>
  </DropdownMenuItem>
</DropdownMenuContent>
```

**Note:** The existing code already has an Admin Console link as a standalone SidebarMenuItem before the dropdown. The decision says it should be in the chat sidebar profile section (footer), alongside Settings and Log Out. Moving it INTO the dropdown menu is the correct interpretation -- it becomes part of the account menu.

### Vercel-Style Page Header
```typescript
// components/admin/admin-page-header.tsx
interface AdminPageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border px-6 py-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SidebarTrigger in page headers | Collapse trigger in sidebar header | This phase | Removes clutter from page content area |
| Bare Sign Out button in sidebar footer | Profile expander with account actions | This phase | Cleaner sidebar, better UX |
| Card-wrapped tables | Flat tables with subtle dividers | This phase | Matches Vercel aesthetic |
| Per-page custom headers | Shared AdminPageHeader component | This phase | Enforces consistency |
| AdminBreadcrumb bar | Optional -- can be removed or integrated into page header | This phase | Reduces vertical space usage |

## Admin Pages Inventory

### Super Admin Pages (10 pages to polish)
| Page | Path | Category | Current Issues |
|------|------|----------|----------------|
| Models | `/super-admin/models` | Data-heavy | Has CPU icon in header, SidebarTrigger in header |
| Organizations | `/super-admin/organizations` | Data-heavy | Likely same header pattern |
| Super Admins | `/super-admin/super-admins` | Data-heavy | Likely same header pattern |
| Users | `/super-admin/users` | Data-heavy | Likely same header pattern |
| API Keys | `/super-admin/api-keys` | Data-heavy | Likely same header pattern |
| Analytics | `/super-admin/analytics` | Dashboard | KPI cards + charts |
| Audit Logs | `/super-admin/audit-logs` | Data-heavy | Likely same header pattern |
| Settings | `/super-admin/settings` | Settings | Needs single-column centered layout |
| System Prompt | `/super-admin/system-prompt` | Settings | Needs single-column centered layout |
| Dashboard redirect | `/super-admin` | N/A | Just redirects, no changes needed |

### Org Admin Pages (12 pages to polish)
| Page | Path | Category | Current Issues |
|------|------|----------|----------------|
| Dashboard | `admin/` | Dashboard | Quick links overview |
| Instructions | `admin/instructions` | Settings | Complex layout with restrictions, needs centering |
| Roles | `admin/roles` | Data-heavy | Role cards layout |
| MCP | `admin/mcp` | Settings | Connection cards + assignment |
| Users | `admin/users` | Data-heavy | DataTable with user detail panel |
| Invitations | `admin/invitations` | Data-heavy | Invitation management |
| Security | `admin/security` | Settings | Password policy form |
| Settings | `admin/settings` | Settings | Multi-section settings |
| Analytics | `admin/analytics` | Dashboard | KPI cards + charts |
| Audit Logs | `admin/audit-logs` | Data-heavy | Log viewer + export |
| Conversations | `admin/conversations` | Data-heavy | Conversation list + viewer |
| Usage | `admin/usage` | N/A | Redirects to analytics |

### Other Components
| Component | Changes Needed |
|-----------|---------------|
| settings-modal.tsx (67KB) | Spacing, typography, form controls across 8 tabs |
| full-chat-app.tsx ChatSidebar | Move Admin Console into dropdown, remove standalone button |
| admin-breadcrumb.tsx | Evaluate removal or integration into page headers |

## Open Questions

1. **AdminBreadcrumb disposition**
   - What we know: Currently rendered in org admin layout for all pages. Only maps 3 segments (instructions, roles, mcp).
   - What's unclear: Whether to keep it, extend it to all pages, or remove it in favor of clean page headers.
   - Recommendation: Remove it. The Vercel Dashboard does not use breadcrumbs -- page headers are self-explanatory. The sidebar already shows where you are via the active item highlight. This reduces vertical clutter.

2. **NAV-02 requirement vs CONTEXT.md decision conflict**
   - What we know: REQUIREMENTS.md says NAV-02 is "Back to Chat button in top-left header area". CONTEXT.md says "Back to Chat placement: Inside the profile expander only."
   - What's unclear: Nothing -- CONTEXT.md represents the user's final decision and overrides the original requirement.
   - Recommendation: Follow CONTEXT.md. Back to Chat goes in the profile expander only.

3. **Admin Console link: standalone vs dropdown**
   - What we know: The current code has Admin Console as a standalone SidebarMenuItem in full-chat-app.tsx (line 610-620). CONTEXT.md says it should be "in the chat sidebar profile section (footer), alongside Settings and Log Out."
   - What's unclear: Whether to keep the standalone AND add to dropdown, or move it entirely into the dropdown.
   - Recommendation: Move it into the dropdown menu only. The standalone item is redundant once it's in the profile dropdown where users expect account-level navigation.

## Sources

### Primary (HIGH confidence)
- `components/ui/sidebar.tsx` - Full source code reviewed, all collapse mechanics verified
- `components/admin/admin-sidebar.tsx` - Current implementation reviewed
- `components/ui/collapsible.tsx` - Radix Collapsible wrapper verified
- `components/full-chat-app.tsx` - Chat sidebar footer and dropdown structure reviewed
- `app/super-admin/layout.tsx` and `app/org/[slug]/admin/layout.tsx` - Layout patterns reviewed
- `app/super-admin/models/page.tsx` - Representative page header pattern reviewed
- `09-CONTEXT.md` - User decisions and constraints (authoritative)

### Secondary (MEDIUM confidence)
- Vercel Dashboard design patterns - Referenced as design target, well-known public reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already exist in the project, no new dependencies
- Architecture: HIGH - sidebar.tsx infrastructure is comprehensive and well-documented
- Pitfalls: HIGH - Based on direct code review of the existing implementation
- Visual polish scope: MEDIUM - Full audit of all ~22 pages needed during implementation; some pages not reviewed in detail

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable -- no external dependencies changing)
