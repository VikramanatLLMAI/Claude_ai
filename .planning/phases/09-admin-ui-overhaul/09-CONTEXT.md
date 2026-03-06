# Phase 9: Admin UI Overhaul - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Both admin dashboards (Super Admin and Org Admin) get a collapsible sidebar, improved navigation flow, and Vercel-level visual polish across every page. User settings modal gets UI/UX improvements. This is a frontend-only phase -- no schema changes, no new backend endpoints.

</domain>

<decisions>
## Implementation Decisions

### Sidebar Collapse Behavior
- Collapse trigger is a chevron/arrow icon inside the sidebar header (right side, next to branding)
- Collapsed state is icons-only with subtle separator lines between groups (no text, no group labels)
- Click trigger to expand back (no hover-to-expand behavior)
- Keyboard shortcut 'b' toggles collapse (already in sidebar.tsx infrastructure)
- Smooth width transition animation ~200ms (sidebar shrinks from 16rem to 3rem, text fades out)
- Collapse state persists across navigations via cookie (already supported by SidebarProvider)
- Tooltips on hover for each icon in collapsed mode (already supported by SidebarMenuButton)
- Works identically in both Super Admin and Org Admin dashboards

### Navigation Rework
- **Org Admin sidebar profile expander:** Expandable footer section at sidebar bottom. Shows avatar + name (collapsed). Click to expand and reveal: email, Settings link, Back to Chat link, Log Out. Replaces current bare Sign Out button
- **Back to Chat placement:** Inside the profile expander only (not in the page header area)
- **Sign Out removal from admin sidebar:** Sign Out moves into the profile expander (not a standalone button in the footer)
- **Admin Console link in chat UI:** Org admins see an "Admin Console" link in the chat sidebar profile section (footer), alongside Settings and Log Out. Non-admins don't see this link
- **Super Admin profile expander:** Same pattern as Org Admin but without "Back to Chat" (Super Admins have no chat context). Shows: email, Log Out
- **Admin page headers cleanup:** Remove clutter from main content area headers. Clean, consistent headers across all admin pages

### Visual Polish Standard
- **Design reference:** Vercel Dashboard -- clean, minimal, lots of whitespace, monochrome with subtle borders, simple typography hierarchy
- **Page headers:** Title + short description + action buttons on the right. Consistent across all admin pages
- **Data-heavy pages (users, audit logs, models):** Flat layout with subtle dividers, no card borders around tables
- **Settings-style pages (Instructions, Settings, Security):** Single column centered with max-width ~720px, sections stacked vertically with clear headings
- **Scrolling:** All admin pages scroll properly when content overflows, no unwanted borders or visual artifacts
- **Consistency:** Same spacing, typography, and visual hierarchy in both Super Admin and Org Admin
- **Component library:** Use existing shadcn/Radix UI components. Reference shadcn dashboard examples for patterns
- **Remove visual noise:** Eliminate unwanted borders, lines, boxes, and inconsistent styling

### User Settings Modal Improvements
- Keep as modal (not a full page)
- Keep existing tab structure (Profile, General, Appearance, API Keys, MCP, Instructions, Sessions, Advanced) -- no consolidation
- Improve: consistent spacing and typography across all tabs
- Improve: better form controls -- consistent sizing, labels, helper text
- Improve: visual hierarchy with clear section headings, subtle separators, proper grouping
- Improve: responsive modal sizing, no overflow issues, proper scrolling within tabs
- Production-ready SaaS-quality UI/UX

### Claude's Discretion
- Exact spacing values and typography scale
- Specific animation easing curves for sidebar collapse
- Loading skeleton designs for admin pages
- Error state handling and empty state designs
- Color palette adjustments within existing theme system
- Whether to add breadcrumbs above page titles (not required but allowed)

</decisions>

<specifics>
## Specific Ideas

- "We are building production ready SaaS application" -- the bar is high, every detail matters
- Vercel Dashboard is the design reference -- clean, minimal, whitespace-forward
- Use shadcn components and reference shadcn dashboard examples for patterns
- Same design quality and patterns applied to both Super Admin and Org Admin dashboards
- Admin Console link in chat sidebar mirrors the Back to Chat link in admin sidebar -- bidirectional navigation

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/sidebar.tsx` (24KB): Full collapsible sidebar infrastructure already exists -- SidebarProvider, expanded/collapsed state, cookie persistence via SIDEBAR_COOKIE_NAME, SIDEBAR_WIDTH/SIDEBAR_WIDTH_ICON constants, keyboard shortcut 'b', tooltip support, useSidebar hook
- `components/admin/admin-sidebar.tsx`: Current admin sidebar using Sidebar components. Has nav groups for both Super Admin and Org Admin variants. Footer has user info + Sign Out + Back to Chat (Org Admin only)
- `components/admin/admin-breadcrumb.tsx`: Breadcrumb component for Org Admin pages
- `components/ui/collapsible.tsx`: Radix Collapsible for profile expander
- `components/ui/tooltip.tsx`: Tooltip for collapsed icon labels
- `components/ui/dropdown-menu.tsx`: Could be used for profile menu alternative
- `components/admin/data-table.tsx` + pagination + column header: TanStack Table infrastructure
- `components/admin/kpi-card.tsx`: Reusable KPI card
- `components/settings-modal.tsx` (67KB): Current settings modal with 8 tabs
- `components/ui/tabs.tsx`: Radix Tabs for settings modal tabs
- Full shadcn component library in `components/ui/`

### Established Patterns
- CVA (Class Variance Authority) for component variants
- `cn()` utility for className merging
- CSS variables in `globals.css` for theming (light/dark)
- Sidebar-specific CSS variables (--color-sidebar-*)
- SidebarProvider + SidebarInset layout pattern in both admin layouts
- TanStack Table for data tables with sorting, filtering, pagination
- Framer Motion for animations (`motion/react`)

### Integration Points
- `app/super-admin/layout.tsx`: Wraps children in SidebarProvider + AdminSidebar + SidebarInset
- `app/org/[slug]/admin/layout.tsx`: Same pattern + AdminBreadcrumb
- `components/full-chat-app.tsx`: Chat sidebar footer needs Admin Console link (for org admins)
- All admin page files in `app/super-admin/*/page.tsx` and `app/org/[slug]/admin/*/page.tsx` need header cleanup
- `SidebarTrigger` already imported in some admin pages (e.g., models page)

</code_context>

<deferred>
## Deferred Ideas

- Resizable sidebar (drag to resize) -- v1.2 UIE-01
- Keyboard-driven admin navigation (Linear-style) -- v1.2 UIE-02

</deferred>

---

*Phase: 09-admin-ui-overhaul*
*Context gathered: 2026-03-06*
