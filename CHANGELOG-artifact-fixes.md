# Artifact System Bug Fixes & Optimizations

**Date:** 2026-02-19
**Scope:** Artifact detection, rendering, and iframe layout
**Files Modified:** `lib/artifacts.ts`, `components/full-chat-app.tsx`, `components/artifact-preview.tsx`

---

## Issue 1: Artifact Detection Failure on Non-Space Whitespace

**Problem:** Artifact content leaked into the chat window as raw text instead of rendering in the artifact panel. This happened because the detection pipeline used `indexOf('<artifact ')` (trailing **space**) as a fast-path check. When the LLM formatted the tag with a newline or tab after `<artifact` (e.g., `<artifact\nid="x"...`), the fast-path missed it entirely.

For **completed (non-streaming) messages**, this was critical: the gate check `messageText.includes('<artifact ')` was the only path — if it returned `false`, the entire artifact detection block was skipped and raw `<artifact>` tags rendered as text.

**Root Cause:** Three locations used space-only matching:
- `full-chat-app.tsx:1531` — gate check: `messageText.includes('<artifact ')`
- `lib/artifacts.ts:238` — `getTextBeforeArtifact()`: `indexOf('<artifact ')`
- `lib/artifacts.ts:280` — `isArtifactStreaming()`: `indexOf('<artifact ', pos)` loop

### Changes

#### `lib/artifacts.ts` — `getTextBeforeArtifact()` (line 238)

```typescript
// BEFORE:
const artifactStart = content.indexOf('<artifact ');
if (artifactStart !== -1) {
  return content.substring(0, artifactStart).trim();
}

// AFTER:
const artifactMatch = content.match(/<artifact[\s>]/i);
if (artifactMatch && artifactMatch.index !== undefined) {
  return content.substring(0, artifactMatch.index).trim();
}
```

Regex `/<artifact[\s>]/i` matches `<artifact` followed by any whitespace character (`\s` = space, tab, newline, carriage return) or `>` for self-closing style tags.

#### `lib/artifacts.ts` — `isArtifactStreaming()` (line 280)

```typescript
// BEFORE:
let pos = 0;
while ((pos = content.indexOf('<artifact ', pos)) !== -1) {
  const closePos = content.indexOf('>', pos);
  if (closePos !== -1) { openCount++; pos = closePos + 1; }
  else { return true; }
}

// AFTER:
const openTagRegex = /<artifact\s/gi;
let openMatch;
while ((openMatch = openTagRegex.exec(content)) !== null) {
  const closePos = content.indexOf('>', openMatch.index);
  if (closePos !== -1) { openCount++; openTagRegex.lastIndex = closePos + 1; }
  else { return true; }
}
```

Replaced `indexOf` loop with regex exec loop using `/<artifact\s/gi` for consistent whitespace handling.

#### `components/full-chat-app.tsx` — Gate check (line 1531)

```typescript
// BEFORE:
const hasArtifactTag = messageText.includes('<artifact ')

// AFTER:
const hasArtifactTag = /<artifact[\s>]/i.test(messageText)
```

This is the most critical fix — it's the entry gate for the entire artifact detection pipeline.

---

## Issue 2: Partial Closing Tag Not Detected During Streaming

**Problem:** `hasPartialArtifactTag()` only checked for `<artifact` prefix. During streaming, partial closing tags like `</artif` were not recognized, potentially causing false-positive matches or missed detections.

### Changes

#### `lib/artifacts.ts` — `hasPartialArtifactTag()` (line 222)

```typescript
// BEFORE:
const artifactPrefix = '<artifact';
// ...
return artifactPrefix.startsWith(partialTag);

// AFTER:
const artifactPrefix = '<artifact';
const closePrefix = '</artifact';
// ...
return artifactPrefix.startsWith(partialTag) || closePrefix.startsWith(partialTag);
```

Now recognizes both opening (`<artif...`) and closing (`</artif...`) partial tags during streaming.

---

## Issue 3: Artifact Card Positioned After All Text in Branch A (Tool + Artifact Messages)

**Problem:** In messages with both tool calls and artifacts, the artifact card appeared at the very bottom of the message instead of between the introductory text and the description text that follows the artifact.

**Root Cause:** Branch A renders in two phases: (1) all text segments in a loop, (2) artifact cards after the loop. We initially changed text segments from `getTextBeforeArtifact(rawText)` to `getMessageWithoutArtifacts(rawText)`, which preserved text on both sides of the artifact. Since artifact cards are appended after all segments, the "after" text appeared above the card.

**Example of the bug:**
```
Here is your chart:           ← text before artifact
Hope you like it!             ← text after artifact (should be BELOW card)
[Chart Card]                  ← card pushed to bottom
```

### Changes

#### `components/full-chat-app.tsx` — Branch A text segment (line 1663)

Kept `getTextBeforeArtifact` for text segments (only shows text before the artifact tag).

#### `components/full-chat-app.tsx` — Branch A after artifact cards (line 1696)

Added a dedicated "text after artifact" block after the artifact cards, matching Branch B's existing pattern:

```tsx
{/* Text AFTER artifact tag - render after artifact cards */}
{messageHasArtifacts && !hasStreamingArtifactFlag && getTextAfterArtifact(messageText) && (
  <MessageContent role="assistant" className="mt-3">
    <Markdown>{getTextAfterArtifact(messageText)}</Markdown>
  </MessageContent>
)}
```

**Result:** Correct ordering restored:
```
Here is your chart:           ← text before (from segment)
[Chart Card]                  ← artifact card
Hope you like it!             ← text after (new block)
```

---

## Issue 4: Artifact Tags Flash in Chat During Streaming (Branch C)

**Problem:** During streaming, before `messageHasArtifacts` flips to `true`, Branch C (plain message display) passes the full `messageText` to `StreamingText`. If artifact tags have already arrived in the stream but detection hasn't triggered yet, raw `<artifact>` tags briefly flash in the chat.

### Changes

#### `components/full-chat-app.tsx` — Branch C StreamingText content (line 1735)

```typescript
// BEFORE:
<StreamingText content={messageText || "Thinking..."} ... />

// AFTER:
<StreamingText content={getMessageWithoutArtifacts(messageText) || messageText || "Thinking..."} ... />
```

Added `getMessageWithoutArtifacts` import to the file's import statement.

---

## Issue 5: Iframe Auto-Expands Beyond Panel Viewport

**Problem:** The artifact preview panel's iframe expanded to match the full natural height of the HTML content (e.g., 2000+ pixels for a dashboard with charts and tables). This made the panel extremely tall with a tiny scroll thumb.

**Root Cause:** The content container used `flex-1 overflow-hidden` with children using `h-full` (height: 100%). However, `flex-1` computes height via `flex-grow`, not an explicit `height` property. CSS percentage heights (`h-full`) cannot resolve against a flex-computed parent — the browser falls back to content height, letting the iframe expand to its full natural size.

### Changes

#### `components/artifact-preview.tsx` — Content container (line 303)

```typescript
// BEFORE:
<div className="flex-1 overflow-hidden">

// AFTER:
<div className="relative flex-1 min-h-0">
```

- `relative` — establishes positioning context for absolute children
- `min-h-0` — overrides flexbox default `min-height: auto`, allowing the item to shrink below its content size
- Removed `overflow-hidden` — children handle their own overflow

#### `components/artifact-preview.tsx` — Code view (line 313)

```typescript
// BEFORE:
className="h-full overflow-auto bg-muted/30"

// AFTER:
className="absolute inset-0 overflow-auto bg-muted/30"
```

Absolute positioning guarantees the code view is exactly the size of the content container.

#### `components/artifact-preview.tsx` — Preview view (line 369)

```typescript
// BEFORE:
className="flex h-full items-start justify-center overflow-auto bg-white"

// AFTER:
className="absolute inset-0 flex items-center justify-center overflow-hidden bg-white"
```

- `absolute inset-0` — iframe constrained to panel viewport, cannot expand
- `overflow-hidden` instead of `overflow-auto` — iframe handles its own internal scrolling
- `items-center` instead of `items-start` — centers content vertically

---

## Issue 6: LLM-Generated HTML Not Iframe-Friendly

**Problem:** Even with the iframe properly constrained, LLM-generated dashboards had no viewport height awareness. HTML like `body { padding: 20px }` with 2000px of content doesn't scroll properly inside a fixed-height iframe because the body expands infinitely.

### Changes

#### `lib/artifacts.ts` — `createArtifactPrompt()` (line 318)

Added iframe layout rules to the system prompt sent to the LLM:

```
**CRITICAL iframe layout rules** (artifacts render inside a fixed-size iframe panel):
- Always set `html, body { margin: 0; height: 100vh; overflow-y: auto; }`
  so the page scrolls inside the iframe
- Use a single scrollable wrapper div (e.g. `<div style="padding:20px; min-height:100vh;">`)
  instead of setting padding on body
- Never rely on the page expanding infinitely — the iframe has a fixed viewport height
- For dashboards with many sections, use `overflow-y: auto` on the main container
- Charts: use `maintainAspectRatio: true` and reasonable max-heights (200-300px)
  so they don't dominate the viewport
- Tables: wrap in a container with `overflow-x: auto` for horizontal scroll
  on narrow viewports
- Test assumption: the iframe viewport is roughly 600-800px tall — design content
  to be scannable within that height with scrolling for overflow
```

Removed the generic "Ensure the HTML is self-contained and can be rendered in an iframe" guideline and replaced it with specific, actionable rules.

---

## Summary of All Files Changed

| File | Changes |
|------|---------|
| `lib/artifacts.ts` | Fixed whitespace matching in `getTextBeforeArtifact`, `isArtifactStreaming`, `hasPartialArtifactTag`. Updated `createArtifactPrompt` with iframe layout rules. |
| `components/full-chat-app.tsx` | Fixed artifact gate check, added `getMessageWithoutArtifacts` import, added text-after-artifact block in Branch A, added artifact stripping in Branch C streaming. |
| `components/artifact-preview.tsx` | Fixed iframe auto-expansion with absolute positioning, `min-h-0`, and `overflow-hidden`. |

## Known Remaining Issues (Not Fixed)

| Priority | Issue | Description |
|----------|-------|-------------|
| Critical | Regex recompilation | 8+ regex patterns created fresh on every function call during streaming |
| High | Iframe sandbox permissive | `allow-same-origin` lets malicious artifact HTML access parent cookies |
| High | Code view no virtualization | 1000+ line artifacts create 1000+ DOM elements |
| High | Code scroll jank | Auto-scroll fires every streaming chunk with no debounce |
| High | Artifact ID collision | `Date.now()` fallback IDs can collide in same millisecond |
| Medium | Partial tag false positive | `<art` in normal text matches both open and close prefixes |
| Medium | Duplicate artifact replace bug | `parseArtifacts()` `.replace()` replaces all identical content matches |
| Medium | No artifact content size limit | No max-length check before database insert |
| Medium | No CSP on artifact content | `srcDoc` bypasses Content Security Policy |
| Low | Accessibility gaps | Missing `aria-label` on device mode buttons, iframe `role` attribute |
| Low | No error boundary | Malformed HTML renders blank iframe with no error message |
| Low | Preview disabled during streaming | User forced to wait for completion before seeing preview |
