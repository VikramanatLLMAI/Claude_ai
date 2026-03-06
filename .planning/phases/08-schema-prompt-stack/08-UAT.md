---
status: complete
phase: 08-schema-prompt-stack
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md
started: 2026-03-06T07:10:00Z
updated: 2026-03-06T07:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Org Restriction Textarea Visible
expected: Navigate to Org Admin > Instructions page. Below the org-wide system instructions editor, a collapsible "Restrictions" section exists. Expanding it reveals a textarea with a character counter showing /2000.
result: pass

### 2. Per-Role Restriction Textareas
expected: On the same Instructions page, each role section has its own collapsible restriction textarea with a character counter showing /1000.
result: pass

### 3. Save Restriction Instructions
expected: Type restriction text into the org-wide restriction textarea, click Save. Page confirms save succeeded. Reload the page -- the restriction text persists and the section auto-expands because content exists.
result: pass

### 4. Character Limit Enforcement
expected: In a restriction textarea, type text approaching/exceeding the character limit. The character counter changes color (warning near limit). Text beyond the limit is either blocked or the counter turns red.
result: pass

### 5. Enhance Button on Instructions
expected: Next to the org-wide system instructions editor, an "Enhance" button is visible. Clicking it shows a loading overlay on the textarea, then replaces the text with an AI-improved version. A "Revert" button appears to restore the original.
result: pass

### 6. Enhance Button on Restrictions
expected: The restriction textarea also has an Enhance button. Clicking it triggers the same loading overlay + AI enhancement flow. Revert restores original restriction text.
result: pass

### 7. Platform System Prompt Enhance
expected: Navigate to Super Admin > System Prompt page. The system prompt editor has an Enhance button that triggers AI enhancement with loading overlay and Revert capability.
result: pass

### 8. Dirty State Warning
expected: On the Instructions page, modify a restriction field without saving. Try to navigate away -- a browser warning ("unsaved changes") should appear.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
