/**
 * Password Policy Validation Service
 *
 * Validates passwords against an organization's PasswordPolicy.
 * Used during registration and password changes.
 */

import type { PasswordPolicy } from '@/lib/generated/prisma/client';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a password against an organization's password policy.
 *
 * If no policy is provided, applies sensible defaults (min 8 chars, max 128 chars).
 * Each requirement is checked individually and all failures are returned at once.
 */
export function validatePasswordAgainstPolicy(
  password: string,
  policy: PasswordPolicy | null
): PasswordValidationResult {
  const errors: string[] = [];

  // Default minimum if no policy exists
  const minLength = policy?.minLength ?? 8;

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }

  // Max length always enforced (prevent DoS with huge passwords)
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  if (policy?.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy?.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy?.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (policy?.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get a human-readable description of the password requirements for an org.
 * Used to display requirements in the registration form.
 */
export function getPasswordRequirements(policy: PasswordPolicy | null): string[] {
  const reqs: string[] = [];
  const minLength = policy?.minLength ?? 8;
  reqs.push(`At least ${minLength} characters`);
  if (policy?.requireUppercase) reqs.push('At least one uppercase letter');
  if (policy?.requireLowercase) reqs.push('At least one lowercase letter');
  if (policy?.requireNumbers) reqs.push('At least one number');
  if (policy?.requireSpecialChars) reqs.push('At least one special character');
  return reqs;
}
