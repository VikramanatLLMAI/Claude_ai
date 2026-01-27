# Claude Theme - Implementation Guide

## Overview

The Athena MCP application now uses the **Claude Theme** from tweakcn.com, implemented at scale-level with production-ready best practices. All theme variables are centralized in `app/globals.css`.

---

## Theme Colors

### Core Colors
```css
--background      /* Main background color */
--foreground      /* Main text color */
--card            /* Card background */
--card-foreground /* Card text */
--popover         /* Popover background */
--popover-foreground /* Popover text */
```

### Brand Colors
```css
--primary         /* Primary brand color (orange) */
--primary-foreground
--secondary       /* Secondary color */
--secondary-foreground
```

### UI Element Colors
```css
--muted           /* Muted backgrounds */
--muted-foreground /* Muted text */
--accent          /* Accent highlights */
--accent-foreground
--destructive     /* Error/delete actions */
--destructive-foreground
```

### Form Colors
```css
--border          /* Border color */
--input           /* Input border color */
--ring            /* Focus ring color */
```

### Chart Colors (5 colors for data visualization)
```css
--chart-1 through --chart-5
```

### Sidebar Colors
```css
--sidebar         /* Sidebar background */
--sidebar-foreground
--sidebar-primary
--sidebar-accent
--sidebar-border
--sidebar-ring
```

---

## Usage in Components

### Using Theme Colors

**Good ✅ (Semantic classes):**
```tsx
<div className="bg-background text-foreground">
  <h1 className="text-card-foreground">Title</h1>
  <p className="text-muted-foreground">Description</p>
  <button className="bg-primary text-primary-foreground">Click Me</button>
</div>
```

**Bad ❌ (Hard-coded colors):**
```tsx
<div className="bg-white text-black">
  <h1 className="text-gray-900">Title</h1>
  <p className="text-gray-600">Description</p>
  <button className="bg-orange-600 text-white">Click Me</button>
</div>
```

---

## Built-in Utility Classes

### Animation Utilities

#### Fade In
```tsx
<div className="animate-fade-in">
  Content that fades in
</div>
```

#### Slide In
```tsx
<div className="animate-slide-in">
  Content that slides in from bottom
</div>
```

#### Transition Base
```tsx
<button className="transition-base hover:bg-primary">
  Smooth color transitions
</button>
```

#### Transition Transform
```tsx
<div className="transition-transform hover:scale-105">
  Smooth transform transitions
</div>
```

---

### Card Hover Effect

Apply to cards for consistent hover behavior:
```tsx
<Card className="card-hover">
  {/* Card content */}
</Card>
```

Effect: Lifts card up 2px and increases shadow on hover.

---

### Glass Morphism

Modern frosted glass effect:
```tsx
<div className="glass p-4 rounded-lg">
  Semi-transparent with backdrop blur
</div>
```

Use for: Overlays, modals, floating panels

---

### Gradient Utilities

#### Primary Gradient
```tsx
<div className="gradient-primary p-8 text-white">
  Primary brand gradient background
</div>
```

#### Accent Gradient
```tsx
<div className="gradient-accent p-8">
  Accent gradient background
</div>
```

---

### Solution-Specific Colors

Each solution has a unique color variable:

```tsx
<div className="solution-manufacturing">
  {/* Use var(--solution-color) */}
  <div style={{ color: 'var(--solution-color)' }}>
    Manufacturing content
  </div>
</div>
```

Available solution classes:
- `.solution-manufacturing`
- `.solution-maintenance`
- `.solution-support`
- `.solution-change-management`
- `.solution-impact-analysis`
- `.solution-requirements`

---

### Loading States

#### Spinner
```tsx
<div className="loading-spinner" />
```

#### Skeleton Loader
```tsx
<div className="skeleton h-8 w-full rounded" />
```

---

### Typography Utilities

#### Text Balance
```tsx
<h1 className="text-balance">
  Long headline that balances nicely
</h1>
```

#### Text Pretty
```tsx
<p className="text-pretty">
  Paragraph with improved line breaks
</p>
```

---

### Accessibility Utilities

#### Screen Reader Only
```tsx
<span className="sr-only">
  This text is only visible to screen readers
</span>
```

---

## Shadow System

Use shadow variables for consistent depth:

```tsx
<Card className="shadow-sm">Subtle shadow</Card>
<Card className="shadow-md">Medium shadow</Card>
<Card className="shadow-lg">Large shadow</Card>
<Card className="shadow-xl">Extra large shadow</Card>
<Card className="shadow-2xl">Dramatic shadow</Card>
```

Available shadows:
- `shadow-2xs`, `shadow-xs` - Very subtle
- `shadow-sm` - Subtle
- `shadow`, `shadow-md` - Default
- `shadow-lg`, `shadow-xl` - Prominent
- `shadow-2xl` - Dramatic

---

## Border Radius

Consistent border radius across the app:

```tsx
<div className="rounded-sm">  {/* calc(var(--radius) - 4px) */}
<div className="rounded-md">  {/* calc(var(--radius) - 2px) */}
<div className="rounded-lg">  {/* var(--radius) = 0.5rem */}
<div className="rounded-xl">  {/* calc(var(--radius) + 4px) */}
```

---

## Typography

### Font Families

```tsx
<div className="font-sans">  {/* System UI font stack */}
<div className="font-mono">  {/* Monospace font stack */}
<div className="font-serif"> {/* Serif font stack */}
```

---

## Dark Mode

Theme automatically supports dark mode. Add `.dark` class to root element to enable:

```tsx
<html className="dark">
```

All colors automatically switch to dark mode values.

### Testing Dark Mode
```tsx
// Toggle dark mode
document.documentElement.classList.toggle('dark')
```

---

## Best Practices

### ✅ DO

1. **Use semantic color classes**
   ```tsx
   <div className="bg-card text-card-foreground">
   ```

2. **Use utility classes from globals.css**
   ```tsx
   <Card className="card-hover glass">
   ```

3. **Use shadow system**
   ```tsx
   <div className="shadow-md">
   ```

4. **Use border radius system**
   ```tsx
   <div className="rounded-lg">
   ```

5. **Use theme transitions**
   ```tsx
   <button className="transition-base hover:bg-primary">
   ```

### ❌ DON'T

1. **Don't use hard-coded colors**
   ```tsx
   {/* Bad */}
   <div className="bg-white text-black">

   {/* Good */}
   <div className="bg-background text-foreground">
   ```

2. **Don't add inline styles for colors**
   ```tsx
   {/* Bad */}
   <div style={{ backgroundColor: '#fff' }}>

   {/* Good */}
   <div className="bg-background">
   ```

3. **Don't create custom animations without checking globals.css first**
   ```tsx
   {/* Bad */}
   <div className="animate-custom-fade">

   {/* Good - use built-in */}
   <div className="animate-fade-in">
   ```

4. **Don't mix Tailwind gray-* colors with theme colors**
   ```tsx
   {/* Bad */}
   <div className="text-gray-600">

   {/* Good */}
   <div className="text-muted-foreground">
   ```

---

## Component Examples

### Card with Theme
```tsx
<Card className="bg-card text-card-foreground card-hover">
  <CardHeader>
    <CardTitle className="text-foreground">Title</CardTitle>
    <CardDescription className="text-muted-foreground">
      Description
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-card-foreground">Content</p>
  </CardContent>
  <CardFooter>
    <Button className="bg-primary text-primary-foreground">
      Action
    </Button>
  </CardFooter>
</Card>
```

### Form with Theme
```tsx
<form className="space-y-4">
  <div>
    <label className="text-foreground font-medium">Name</label>
    <input
      className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 focus:ring-2 focus:ring-ring"
      placeholder="Enter name"
    />
  </div>
  <Button className="bg-primary text-primary-foreground">
    Submit
  </Button>
</form>
```

### Alert/Notification
```tsx
<div className="glass rounded-lg p-4 animate-slide-in">
  <h3 className="text-foreground font-semibold">Success!</h3>
  <p className="text-muted-foreground">Your action was completed.</p>
</div>
```

### Loading State
```tsx
<div className="flex items-center gap-2">
  <div className="loading-spinner" />
  <span className="text-muted-foreground">Loading...</span>
</div>
```

### Skeleton Loading
```tsx
<div className="space-y-3">
  <div className="skeleton h-10 w-full rounded-lg" />
  <div className="skeleton h-10 w-3/4 rounded-lg" />
  <div className="skeleton h-10 w-1/2 rounded-lg" />
</div>
```

---

## Customization

### Adding New Colors

To add new theme colors, edit `app/globals.css`:

```css
:root {
  /* Add new color */
  --success: oklch(0.7 0.15 145);
  --success-foreground: oklch(1.0 0 0);
}

.dark {
  /* Dark mode variant */
  --success: oklch(0.6 0.12 145);
}

@theme inline {
  /* Make available to Tailwind */
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
}
```

Then use: `className="bg-success text-success-foreground"`

---

## Performance

### CSS Variables vs Tailwind Classes

The theme uses CSS variables for:
- **Runtime theme switching** (dark mode)
- **Consistent colors** across the app
- **Smaller bundle size** (variables instead of generated classes)

### Optimizations Included

1. **Font optimization** - `font-feature-settings: "rlig" 1, "calt" 1`
2. **Smooth rendering** - `text-rendering: optimizeLegibility`
3. **Antialiasing** - `-webkit-font-smoothing: antialiased`
4. **Smooth transitions** - `transition: background-color 0.2s ease`

---

## Browser Support

- ✅ Chrome/Edge 111+
- ✅ Firefox 113+
- ✅ Safari 16.4+
- ✅ Opera 98+

**OKLCH color space** provides better color accuracy and smoother gradients than HSL.

---

## Troubleshooting

### Colors not applying?
1. Check if TailwindCSS v4 is installed
2. Verify `@import "tailwindcss"` is at the top of globals.css
3. Restart dev server: `npm run dev`

### Dark mode not working?
1. Ensure `@custom-variant dark` is in globals.css
2. Add `.dark` class to `<html>` element
3. Check if dark mode CSS variables are defined

### Animations not smooth?
1. Check if `@plugin "tailwindcss-animate"` is loaded
2. Use built-in transition classes: `transition-base`, `transition-transform`

---

## Migration from Old Theme

### Before (Old theme):
```tsx
<div className="bg-white text-gray-900">
  <h1 className="text-slate-800">Title</h1>
  <p className="text-gray-600">Description</p>
</div>
```

### After (Claude theme):
```tsx
<div className="bg-background text-foreground">
  <h1 className="text-card-foreground">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Search & Replace Patterns

| Old | New |
|-----|-----|
| `bg-white` | `bg-background` |
| `bg-slate-50` | `bg-muted` |
| `text-gray-900` | `text-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `border-gray-200` | `border-border` |
| `bg-emerald-600` | `bg-primary` |

---

## Resources

- **Theme Source**: https://tweakcn.com/r/themes/claude.json
- **TailwindCSS v4**: https://tailwindcss.com/docs
- **OKLCH Colors**: https://oklch.com
- **Radix UI**: https://www.radix-ui.com

---

## Support

For theme-related issues:
1. Check this guide first
2. Review `app/globals.css` for available utilities
3. Test in both light and dark modes
4. Verify browser supports OKLCH colors

---

**Last Updated**: January 2026
**Version**: 1.0.0
**Theme**: Claude (tweakcn.com)
