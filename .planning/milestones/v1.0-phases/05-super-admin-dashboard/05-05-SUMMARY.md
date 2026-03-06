---
phase: 05-super-admin-dashboard
plan: 05
subsystem: super-admin-settings
tags: [platform-settings, system-prompt, feature-toggles, super-admin, configuration]
dependency_graph:
  requires: [05-01]
  provides: [platform-settings-crud, platform-system-prompt-editor]
  affects: [system-prompt-composition]
tech_stack:
  added: []
  patterns:
    - singleton-upsert pattern for PlatformSettings
    - explicit save with dirty state tracking (no auto-save)
    - DB-backed platform prompt with hardcoded fallback
    - audit logging for all settings mutations
key_files:
  created:
    - lib/services/platform-settings-service.ts
    - app/api/super-admin/settings/route.ts
    - app/api/super-admin/system-prompt/route.ts
    - app/super-admin/settings/page.tsx
    - app/super-admin/system-prompt/page.tsx
  modified:
    - lib/validation.ts
    - prisma/schema.prisma
    - lib/system-prompts.ts
    - lib/services/system-prompt-service.ts
decisions:
  - "platformPrompt stored as nullable Text field in PlatformSettings — null means use hardcoded default, avoids storing duplicate default text"
  - "Empty string sent by Reset to Default maps to null in DB via API route — API checks if prompt === DEFAULT_PLATFORM_PROMPT or is empty"
  - "composeSystemPrompt remains synchronous using hardcoded default — async getPlatformPrompt() added separately for callers that need DB-backed prompt"
  - "Feature toggles stored as JSON in featureToggles field — defaults to true for all features if not set"
metrics:
  duration: 5 min
  completed_date: "2026-03-04"
  tasks_completed: 2
  files_changed: 9
---

# Phase 5 Plan 05: Platform Settings and System Prompt Summary

**One-liner:** Platform Settings page (general settings + 5 feature toggles) and Platform System Prompt editor with singleton upsert service, explicit save semantics, and DB-backed prompt with hardcoded fallback.

## What Was Built

### Task 1: Platform Settings service, API, and page

**lib/services/platform-settings-service.ts** — Singleton upsert service for PlatformSettings:
- `getPlatformSettings()`: Upsert singleton (creates with defaults on first call)
- `updatePlatformSettings(data, userId, ip)`: Transactional update with before/after audit log

**app/api/super-admin/settings/route.ts** — REST endpoints:
- `GET /api/super-admin/settings` — Returns current platform settings JSON
- `PATCH /api/super-admin/settings` — Updates settings with Zod validation, requireSuperAdmin auth

**app/super-admin/settings/page.tsx** — Two-section settings page:
- General Settings: platform name input, session expiry (number + "days"), maintenance mode toggle with warning text
- Feature Toggles: card-list grid with 5 switches (web search, file uploads, MCP tools, artifact generation, extended/adaptive thinking)
- Explicit save button with amber "Unsaved changes" indicator, disabled when clean
- Ctrl+S keyboard shortcut
- Skeleton loaders for both sections during initial fetch

**lib/validation.ts** — Added `UpdatePlatformSettingsSchema` and `UpdatePlatformPromptSchema`

**prisma/schema.prisma** — Added `platformPrompt String? @db.Text` field to PlatformSettings model, ran `db push`

### Task 2: Platform System Prompt page and API

**app/api/super-admin/system-prompt/route.ts** — REST endpoints:
- `GET /api/super-admin/system-prompt` — Returns `{ prompt, isCustom }` (uses hardcoded default when no custom prompt)
- `PATCH /api/super-admin/system-prompt` — Saves custom prompt; empty string or default text maps to null (resets to default)

**app/super-admin/system-prompt/page.tsx** — System prompt editor:
- Info panel explaining platform layer and that it's uncapped
- Auto-growing textarea (200–600px range) with monospace font
- Character + token count display (informational only, no limit enforced)
- "Reset to Default" button with AlertDialog confirmation (disabled when already using default)
- Explicit save button with dirty state tracking
- Ctrl+S keyboard shortcut

**lib/system-prompts.ts** — Exported `DEFAULT_PLATFORM_PROMPT` constant as fallback reference

**lib/services/system-prompt-service.ts** — Added async functions:
- `getPlatformPrompt(tools, mcpDescriptions)` — Returns DB-backed prompt or hardcoded default with tools
- `getRawPlatformPrompt()` — Returns raw prompt text (for editor display)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Created Files
- `lib/services/platform-settings-service.ts` — FOUND
- `app/api/super-admin/settings/route.ts` — FOUND
- `app/api/super-admin/system-prompt/route.ts` — FOUND
- `app/super-admin/settings/page.tsx` — FOUND
- `app/super-admin/system-prompt/page.tsx` — FOUND

### Commits
- `5d1e82c` — feat(05-05): Platform Settings service, API, and page
- `c8858e7` — feat(05-05): Platform System Prompt page and API

## Self-Check: PASSED
