# Sandpack React Artifact Rendering Optimization

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Overhaul the Sandpack preview to be fast, dependency-aware, Tailwind-enabled, dark-mode synced, error-resilient, and full-container rendered.

**Architecture:** Replace the thin Sandpack wrapper with an optimized component that: (1) detects imports and injects dependencies, (2) injects Tailwind Play CDN into the HTML template, (3) syncs dark/light theme, (4) wraps in an error boundary with retry, (5) auto-detects TypeScript, (6) ensures full-container rendering with proper CSS overrides. The Sandpack provider is kept per-artifact but with aggressive caching of the dynamic import.

**Tech Stack:** @codesandbox/sandpack-react ^2.20.0, Tailwind Play CDN, React 19 error boundaries

---

## Task 1: Create Dependency Detection Utility

**Files:**
- Create: `lib/sandpack-deps.ts`

**Step 1: Create the dependency detection module**

This module parses `import` statements from artifact code and maps them to known npm packages with pinned versions.

```typescript
// lib/sandpack-deps.ts

// Known npm packages that Claude commonly generates in React artifacts
const KNOWN_PACKAGES: Record<string, string> = {
  // Charting
  'recharts': '2.15.3',
  'd3': '7.9.0',
  'chart.js': '4.4.9',
  'react-chartjs-2': '5.3.0',
  // Animation
  'framer-motion': '12.6.5',
  'motion': '12.6.5',
  'motion/react': '12.6.5',
  // State management
  'zustand': '5.0.5',
  'immer': '10.1.1',
  'use-immer': '0.11.0',
  'jotai': '2.12.3',
  // UI libraries
  'lucide-react': '0.473.0',
  'react-icons': '5.5.0',
  '@heroicons/react': '2.2.0',
  // Utilities
  'lodash': '4.17.21',
  'date-fns': '4.1.0',
  'dayjs': '1.11.13',
  'clsx': '2.1.1',
  'uuid': '11.1.0',
  'nanoid': '5.1.5',
  // Forms
  'react-hook-form': '7.55.0',
  'zod': '3.24.4',
  // HTTP
  'axios': '1.9.0',
  // Math / data
  'mathjs': '14.3.1',
  'papaparse': '5.5.2',
  // Markdown
  'react-markdown': '10.1.0',
  'marked': '15.0.7',
  // Syntax highlighting
  'prismjs': '1.30.0',
  'highlight.js': '11.11.1',
  // Maps
  'leaflet': '1.9.4',
  'react-leaflet': '5.0.0',
  // Three.js
  'three': '0.175.0',
  '@react-three/fiber': '9.1.2',
  '@react-three/drei': '10.0.7',
  // Misc
  'react-spring': '9.7.7',
  'react-use': '17.6.0',
  'react-hot-toast': '2.5.2',
  'sonner': '2.0.3',
  'react-confetti': '6.2.2',
  '@dnd-kit/core': '6.3.1',
  '@dnd-kit/sortable': '10.0.0',
  'react-beautiful-dnd': '13.1.1',
}

// Regex to match import statements (handles: import x from 'y', import { x } from 'y', import 'y')
const IMPORT_RE = /import\s+(?:(?:\{[^}]*\}|[^{}\s,]+)(?:\s*,\s*(?:\{[^}]*\}|[^{}\s,]+))*\s+from\s+)?['"]([^'"./][^'"]*)['"]/g

/**
 * Extract npm package names from import statements in source code.
 * Ignores relative imports (starting with . or /).
 */
export function extractImports(code: string): string[] {
  const imports = new Set<string>()
  let match: RegExpExecArray | null
  const re = new RegExp(IMPORT_RE.source, 'g')
  while ((match = re.exec(code)) !== null) {
    const specifier = match[1]
    // Handle scoped packages: @scope/package/subpath -> @scope/package
    // Handle regular packages: package/subpath -> package
    let packageName: string
    if (specifier.startsWith('@')) {
      const parts = specifier.split('/')
      packageName = parts.slice(0, 2).join('/')
    } else {
      packageName = specifier.split('/')[0]
    }
    imports.add(packageName)
  }
  return Array.from(imports)
}

/**
 * Given source code, return a dependencies object for Sandpack's customSetup.
 * Only includes packages we have pinned versions for.
 * Also checks for the full specifier (e.g. 'motion/react') as a known package.
 */
export function detectDependencies(code: string): Record<string, string> {
  const deps: Record<string, string> = {}
  let match: RegExpExecArray | null
  const re = new RegExp(IMPORT_RE.source, 'g')

  while ((match = re.exec(code)) !== null) {
    const specifier = match[1]

    // Check full specifier first (e.g., 'motion/react')
    if (KNOWN_PACKAGES[specifier]) {
      deps[specifier] = KNOWN_PACKAGES[specifier]
      continue
    }

    // Extract package name
    let packageName: string
    if (specifier.startsWith('@')) {
      const parts = specifier.split('/')
      packageName = parts.slice(0, 2).join('/')
    } else {
      packageName = specifier.split('/')[0]
    }

    if (KNOWN_PACKAGES[packageName]) {
      deps[packageName] = KNOWN_PACKAGES[packageName]
    }
  }

  return deps
}

/**
 * Detect if the code uses TypeScript syntax.
 */
export function detectTypeScript(code: string): boolean {
  // Check for common TS patterns
  const tsPatterns = [
    /:\s*(?:string|number|boolean|void|any|never|unknown|null|undefined)\b/,
    /interface\s+\w+/,
    /type\s+\w+\s*=/,
    /<\w+(?:\s*,\s*\w+)*>(?:\s*\(|\s*{)/,
    /as\s+(?:string|number|boolean|const|any)\b/,
    /:\s*React\.\w+/,
    /:\s*(?:FC|FunctionComponent|ComponentProps|PropsWithChildren)\b/,
  ]
  return tsPatterns.some(p => p.test(code))
}
```

**Step 2: Commit**

```bash
git add lib/sandpack-deps.ts
git commit -m "feat: add Sandpack dependency detection utility"
```

---

## Task 2: Rewrite SandpackPreviewWrapper with All Optimizations

**Files:**
- Modify: `components/sandpack-preview.tsx` (full rewrite)

**Step 1: Rewrite the component**

Replace the entire file with an optimized version that includes:
- Auto-dependency detection via `detectDependencies()`
- TypeScript auto-detection via `detectTypeScript()`
- Tailwind Play CDN injection in the HTML template
- Dark/light theme sync
- Error boundary with retry
- Full-container rendering CSS overrides
- Preloaded Sandpack module (eager dynamic import)

```typescript
"use client"

import { useState, useEffect, useCallback, useRef, memo, Component } from "react"
import type { ReactNode } from "react"
import dynamic from "next/dynamic"
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react"
import { detectDependencies, detectTypeScript } from "@/lib/sandpack-deps"

// Eagerly preload the Sandpack module so it's cached for when we need it
let sandpackModulePromise: Promise<typeof import("@codesandbox/sandpack-react")> | null = null

function preloadSandpack() {
  if (!sandpackModulePromise) {
    sandpackModulePromise = import("@codesandbox/sandpack-react")
  }
  return sandpackModulePromise
}

// Start preloading immediately on module load (client-side only)
if (typeof window !== 'undefined') {
  // Delay preload slightly so it doesn't compete with critical page resources
  setTimeout(preloadSandpack, 2000)
}

// Dynamic imports - using the preloaded module
const SandpackProvider = dynamic(
  () => preloadSandpack().then((mod) => mod.SandpackProvider),
  { ssr: false }
)

const SandpackPreview = dynamic(
  () => preloadSandpack().then((mod) => mod.SandpackPreview),
  { ssr: false }
)

// --- Tailwind CDN HTML template ---
// Injected as the custom index.html so all Tailwind classes work in previews
const TAILWIND_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body, #root { margin: 0; padding: 0; height: 100%; width: 100%; }
      body { font-family: system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

// --- Error Boundary ---

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class SandpackErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onRetry: () => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-muted/30 p-6">
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium">Preview failed to render</p>
            <p className="text-xs text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                this.props.onRetry()
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// --- Loading fallback ---

function SandpackLoadingFallback() {
  return (
    <div className="h-full w-full bg-muted/30 p-4 space-y-3 flex flex-col">
      <div className="flex items-center gap-2 border-b pb-2">
        <div className="h-3 w-3 rounded-full bg-muted animate-pulse" />
        <div className="h-3 w-3 rounded-full bg-muted animate-pulse" style={{ animationDelay: "75ms" }} />
        <div className="h-3 w-3 rounded-full bg-muted animate-pulse" style={{ animationDelay: "150ms" }} />
        <div className="h-4 w-32 ml-2 rounded bg-muted animate-pulse" />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading preview...</span>
        </div>
      </div>
    </div>
  )
}

// --- Main component ---

interface SandpackPreviewWrapperProps {
  content: string
  template?: "react" | "react-ts" | "vanilla" | "vanilla-ts"
  theme?: "light" | "dark"
}

export const SandpackPreviewWrapper = memo(function SandpackPreviewWrapper({
  content,
  template = "react",
  theme = "light",
}: SandpackPreviewWrapperProps) {
  const [retryKey, setRetryKey] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-detect TypeScript
  const isTS = template === "react-ts" || (template === "react" && detectTypeScript(content))
  const resolvedTemplate = isTS ? "react-ts" : template

  // Detect entry file based on template
  const entryFile = resolvedTemplate === "react-ts" ? "/App.tsx" : "/App.jsx"

  // Detect external dependencies from imports
  const detectedDeps = detectDependencies(content)
  const hasExternalDeps = Object.keys(detectedDeps).length > 0

  // Build files object
  const files: Record<string, string> = {
    [entryFile]: content,
    "/public/index.html": TAILWIND_INDEX_HTML,
  }

  // Build custom setup with detected dependencies
  const customSetup = hasExternalDeps
    ? { dependencies: detectedDeps }
    : undefined

  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1)
  }, [])

  // Mark ready after mount to avoid flash
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-full w-full sandpack-container"
      style={{ minHeight: 0 }}
    >
      <SandpackErrorBoundary onRetry={handleRetry}>
        {!isReady ? (
          <SandpackLoadingFallback />
        ) : (
          <SandpackProvider
            key={retryKey}
            template={resolvedTemplate}
            files={files}
            customSetup={customSetup}
            theme={theme}
            options={{
              externalResources: [
                "https://cdn.tailwindcss.com",
              ],
              classes: {
                "sp-wrapper": "sandpack-wrapper-full",
                "sp-preview-container": "sandpack-preview-full",
                "sp-preview-iframe": "sandpack-iframe-full",
              },
            }}
          >
            <SandpackPreview
              showNavigator={false}
              showRefreshButton={false}
              style={{
                height: "100%",
                width: "100%",
                minHeight: 0,
                flex: 1,
              }}
            />
          </SandpackProvider>
        )}
      </SandpackErrorBoundary>
    </div>
  )
})

// Re-export loading fallback for use during dynamic loading
SandpackPreviewWrapper.Loading = SandpackLoadingFallback
```

**Step 2: Commit**

```bash
git add components/sandpack-preview.tsx
git commit -m "feat: rewrite Sandpack preview with deps detection, Tailwind CDN, error boundary, dark mode"
```

---

## Task 3: Add Sandpack Full-Container CSS Overrides

**Files:**
- Modify: `app/globals.css`

**Step 1: Add CSS rules for full-container Sandpack rendering**

Append these rules to `globals.css` to ensure the Sandpack iframe fills its container properly:

```css
/* === Sandpack full-container rendering === */
.sandpack-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sandpack-container > div {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Force Sandpack wrapper to fill container */
.sandpack-container .sp-wrapper {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

.sandpack-container .sp-layout {
  height: 100% !important;
  flex: 1 !important;
  min-height: 0 !important;
  border: none !important;
  border-radius: 0 !important;
}

.sandpack-container .sp-stack {
  height: 100% !important;
}

.sandpack-container .sp-preview-container {
  height: 100% !important;
  flex: 1 !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.sandpack-container .sp-preview-iframe {
  height: 100% !important;
  width: 100% !important;
  border: none !important;
}

/* Remove Sandpack's default border/chrome in preview-only mode */
.sandpack-container .sp-preview-actions {
  display: none !important;
}

/* Sandpack loading overlay styling */
.sandpack-container .sp-overlay {
  background: var(--color-muted) !important;
}

.sandpack-container .sp-cube-wrapper {
  color: var(--color-muted-foreground) !important;
}
```

**Step 2: Commit**

```bash
git add app/globals.css
git commit -m "style: add Sandpack full-container CSS overrides for proper iframe sizing"
```

---

## Task 4: Update ArtifactPreview to Pass Dark Mode Theme Properly

**Files:**
- Modify: `components/artifact-preview.tsx` (lines 597-607, the Sandpack rendering section)

**Step 1: Verify the existing theme passing**

The current code at line 603 already passes `theme={isDarkMode ? 'dark' : 'light'}` which is correct. No change needed for basic theme passing.

However, we need to ensure the Sandpack section handles the `displayContent` fallback to `artifact.content` properly and passes the template:

The existing code is:
```tsx
if (strategy === 'sandpack' && displayContent) {
  return (
    <div className="h-full w-full">
      <SandpackPreviewWrapper
        content={displayContent}
        template={artifact.sandpackTemplate || 'react'}
        theme={isDarkMode ? 'dark' : 'light'}
      />
    </div>
  )
}
```

Update it to also use `artifact.content` as fallback (consistent with other strategies), and remove the outer div since the SandpackPreviewWrapper already handles full sizing:

```tsx
if (strategy === 'sandpack') {
  const sandpackContent = displayContent || artifact.content
  if (!sandpackContent) return <SandpackLoadingFallback />
  return (
    <SandpackPreviewWrapper
      content={sandpackContent}
      template={artifact.sandpackTemplate || 'react'}
      theme={isDarkMode ? 'dark' : 'light'}
    />
  )
}
```

Also add the import for `SandpackLoadingFallback` (it's a named static property on the wrapper — we can just render the component's Loading directly, or use the wrapper's Loading export).

**Step 2: Commit**

```bash
git add components/artifact-preview.tsx
git commit -m "fix: improve Sandpack section in artifact preview with content fallback and full sizing"
```

---

## Task 5: Verify and Test

**Step 1: Run lint check**

```bash
npm run lint
```

**Step 2: Run build to catch type errors**

```bash
npm run build
```

**Step 3: Manual verification checklist**
- [ ] Open a conversation, ask Claude to generate a React component using Tailwind classes
- [ ] Verify Tailwind classes render correctly in the preview
- [ ] Ask Claude to generate a Recharts chart component — verify it renders without import errors
- [ ] Toggle dark mode — verify Sandpack theme changes
- [ ] Verify the preview fills the entire artifact panel (no dead space)
- [ ] Close and reopen the artifact panel — verify error boundary doesn't appear unnecessarily
- [ ] Verify streaming → preview transition still works smoothly

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Sandpack optimization with deps, Tailwind, dark mode, error handling"
```
