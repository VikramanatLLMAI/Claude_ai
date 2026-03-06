/**
 * Shared Token Estimation Utility
 *
 * Provides approximate token count estimation using the ~4 chars/token heuristic.
 * Used by both client (instruction editors in Plan 05) and server (validation in Plan 04/05)
 * for consistent token budget enforcement across the 4-layer prompt stack.
 *
 * TOKEN_LIMITS defines the maximum token budgets for each prompt layer:
 * - org: Organization-level system instructions (700 tokens)
 * - role: Role-level system instructions (500 tokens)
 * - user: User-level custom instructions (200 tokens)
 *
 * SERVER_MARGIN allows a 5% buffer on the server side to account for
 * approximation differences between client and server estimation.
 */

/** Maximum token budgets per prompt layer. */
export const TOKEN_LIMITS = { org: 700, role: 500, user: 200 } as const;

/** Maximum character limits for restriction instruction fields. */
export const CHAR_LIMITS = { orgRestrictions: 2000, roleRestrictions: 1000 } as const;

/** Server-side margin multiplier: accept up to 105% to account for approximation error. */
export const SERVER_MARGIN = 1.05;

/**
 * Estimate the token count of a text string.
 *
 * Uses the ~4 English characters per token heuristic, which is a reasonable
 * approximation for English text with Claude's tokenizer. Rounds up to ensure
 * the estimate is conservative (overestimates rather than underestimates).
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count (0 for empty/whitespace-only strings)
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return Math.ceil(text.length / 4);
}
