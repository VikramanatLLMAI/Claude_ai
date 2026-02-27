/**
 * System Prompt Composition Service
 *
 * Composes the 4-layer system prompt stack with XML delimiters:
 * 1. Platform instructions (hardcoded, not editable via UI)
 * 2. Org instructions (from OrgSettings, sanitized)
 * 3. Role instructions (from Role, sanitized)
 * 4. User context (name, role, custom instructions if enabled, sanitized)
 *
 * Sanitization (PRMT-06): All untrusted layers (org, role, user) are sanitized
 * via sanitizePromptLayer() to strip XML tags and escape special characters.
 *
 * Token budget enforcement (PRMT-05) is at save time (Plans 04/05), NOT here.
 * The composition function does NOT re-check budgets.
 *
 * Covers: PRMT-01, PRMT-02, PRMT-03, PRMT-04, PRMT-06, SAFE-08
 */

import { buildSystemPromptWithTools } from '@/lib/system-prompts';
import { sanitizePromptLayer } from '@/lib/prompt-sanitizer';

// ============================================
// Types
// ============================================

export interface PromptLayers {
  orgInstructions: string | null;       // from OrgSettings.systemInstructions
  roleInstructions: string | null;      // from Role.systemInstructions
  userName: string;                     // from User.name
  roleName: string;                     // from Role.name
  userCustomInstructions: string | null; // from OrgMember.customInstructions
  customInstructionsEnabled: boolean;   // from Role.customInstructionsEnabled
}

// ============================================
// Main Composition Function
// ============================================

/**
 * Compose the 4-layer system prompt with XML delimiters.
 *
 * Layer 1 (PRMT-01): Platform instructions -- hardcoded, wrapped in <platform-instructions>.
 * Layer 2 (PRMT-02): Org instructions -- sanitized, wrapped in <org-instructions>.
 * Layer 3 (PRMT-03): Role instructions -- sanitized, wrapped in <role-instructions>.
 * Layer 4 (PRMT-04): User context -- name, role, and optional custom instructions (SAFE-08).
 *
 * @param availableTools - Tool names available in this chat session
 * @param mcpToolDescriptions - MCP tool name+description pairs for the system prompt
 * @param layers - The prompt layers data from org settings, role, and user
 * @returns The composed system prompt string
 */
export function composeSystemPrompt(
  availableTools: string[],
  mcpToolDescriptions: { name: string; description: string }[],
  layers: PromptLayers
): string {
  const parts: string[] = [];

  // Layer 1: Platform instructions (PRMT-01)
  // The platform prompt is hardcoded and not editable via UI.
  const platformPrompt = buildSystemPromptWithTools(availableTools, mcpToolDescriptions);
  parts.push(`<platform-instructions>\n${platformPrompt}\n</platform-instructions>`);

  // Layer 2: Org instructions (PRMT-02, OINST-03, OINST-04)
  if (layers.orgInstructions && layers.orgInstructions.trim()) {
    const sanitized = sanitizePromptLayer(layers.orgInstructions);
    parts.push(`<org-instructions>\n${sanitized}\n</org-instructions>`);
  }

  // Layer 3: Role instructions (PRMT-03, ORSI-03)
  if (layers.roleInstructions && layers.roleInstructions.trim()) {
    const sanitized = sanitizePromptLayer(layers.roleInstructions);
    parts.push(`<role-instructions>\n${sanitized}\n</role-instructions>`);
  }

  // Layer 4: User context (PRMT-04)
  // Always present -- contains user name and role name.
  // Custom instructions included only if role permits AND they are non-empty (SAFE-08).
  const userContextParts: string[] = [
    `User: ${layers.userName}`,
    `Role: ${layers.roleName}`,
  ];

  if (
    layers.customInstructionsEnabled &&
    layers.userCustomInstructions &&
    layers.userCustomInstructions.trim()
  ) {
    const sanitized = sanitizePromptLayer(layers.userCustomInstructions);
    userContextParts.push(`\nCustom Instructions:\n${sanitized}`);
  }

  parts.push(`<user-context>\n${userContextParts.join('\n')}\n</user-context>`);

  return parts.join('\n\n');
}
