/**
 * Resend Email Client - Singleton
 *
 * Provides a singleton Resend client for transactional email delivery.
 * Same singleton pattern as Prisma client in lib/db.ts.
 *
 * Required env vars:
 * RESEND_API_KEY - Resend API key (get from https://resend.com/api-keys)
 * RESEND_FROM_EMAIL - Optional. Defaults to 'LLMatscale.ai <onboarding@resend.dev>' (sandbox)
 */

import { Resend } from 'resend';

// Singleton Resend client (same pattern as Prisma client in lib/db.ts)
const globalForResend = globalThis as unknown as {
  resend: Resend | null | undefined;
};

// If RESEND_API_KEY is not set, resend is null.
// The sendInvitationEmail function checks for null and falls back to console logging.
// Resend constructor throws on empty string, so we only create when key is present.
export const resend: Resend | null =
  globalForResend.resend ?? (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);

if (process.env.NODE_ENV !== 'production' && resend) {
  globalForResend.resend = resend;
}
