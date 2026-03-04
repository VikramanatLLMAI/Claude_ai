/**
 * API Key Service
 *
 * CRUD operations for platform-level API keys (PlatformApiKey + PlatformApiKeyAssignment).
 * Keys are encrypted at rest using AES-256-GCM (lib/encryption.ts).
 * Multi-org assignment: one key can be assigned to many organizations via junction table.
 *
 * Covers: SKEY-01 through SKEY-04
 */

import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';
import { auditLog, type PrismaTransactionClient } from './audit-service';

// ============================================
// Types
// ============================================

export interface CreateApiKeyInput {
  name: string;
  apiKey: string; // raw key, will be encrypted
  provider?: string;
  organizationIds?: string[];
}

export interface ApiKeyWithAssignments {
  id: string;
  name: string;
  provider: string;
  maskedKey: string; // first 7 + "..." + last 4 chars of decrypted key
  isActive: boolean;
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignments: Array<{
    id: string;
    organizationId: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  _count: {
    assignments: number;
  };
}

// ============================================
// Internal Helpers
// ============================================

/**
 * Decrypt and return the raw API key. NOT exported.
 * Used internally by testApiKey and revealApiKey.
 */
async function getDecryptedKey(id: string): Promise<string> {
  const key = await prisma.platformApiKey.findUnique({
    where: { id },
    select: { encryptedKey: true },
  });

  if (!key) {
    throw new Error('API key not found');
  }

  return decrypt(key.encryptedKey);
}

/**
 * Compute masked key: first 7 chars + "..." + last 4 chars of decrypted key.
 */
function maskKey(rawKey: string): string {
  if (rawKey.length <= 11) {
    return rawKey.slice(0, 4) + '...';
  }
  return rawKey.slice(0, 7) + '...' + rawKey.slice(-4);
}

/**
 * Format a PlatformApiKey record with its assignments for API response.
 */
function formatApiKey(key: {
  id: string;
  name: string;
  provider: string;
  encryptedKey: string;
  isActive: boolean;
  lastTestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignments: Array<{
    id: string;
    organizationId: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  _count: {
    assignments: number;
  };
}): ApiKeyWithAssignments {
  let rawKey = '';
  try {
    rawKey = decrypt(key.encryptedKey);
  } catch {
    rawKey = '(decryption error)';
  }

  return {
    id: key.id,
    name: key.name,
    provider: key.provider,
    maskedKey: maskKey(rawKey),
    isActive: key.isActive,
    lastTestedAt: key.lastTestedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    updatedAt: key.updatedAt.toISOString(),
    assignments: key.assignments,
    _count: key._count,
  };
}

// ============================================
// API Key CRUD
// ============================================

/**
 * List all PlatformApiKey records with assignments and masked keys.
 * Does NOT return encryptedKey in the response.
 * (SKEY-01)
 */
export async function listApiKeys(): Promise<ApiKeyWithAssignments[]> {
  const keys = await prisma.platformApiKey.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      assignments: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
      _count: {
        select: { assignments: true },
      },
    },
  });

  return keys.map(formatApiKey);
}

/**
 * Get a single PlatformApiKey with assignments.
 */
export async function getApiKey(id: string): Promise<ApiKeyWithAssignments | null> {
  const key = await prisma.platformApiKey.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
      _count: {
        select: { assignments: true },
      },
    },
  });

  if (!key) return null;
  return formatApiKey(key);
}

/**
 * Create a new API key with encrypted storage and optional org assignments.
 * All operations wrapped in a transaction with audit logging.
 * (SKEY-01)
 */
export async function createApiKey(
  data: CreateApiKeyInput,
  actorId: string,
  ipAddress: string | null
): Promise<ApiKeyWithAssignments> {
  const encryptedKey = encrypt(data.apiKey);
  const organizationIds = data.organizationIds ?? [];

  const created = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    // Create the platform API key
    const apiKey = await tx.platformApiKey.create({
      data: {
        name: data.name,
        provider: data.provider ?? 'anthropic',
        encryptedKey,
        isActive: true,
      },
    });

    // Create org assignments if provided
    if (organizationIds.length > 0) {
      await tx.platformApiKeyAssignment.createMany({
        data: organizationIds.map((orgId) => ({
          apiKeyId: apiKey.id,
          organizationId: orgId,
        })),
      });
    }

    // Audit log
    await auditLog.record(tx, {
      userId: actorId,
      action: 'api_key.created',
      targetType: 'PlatformApiKey',
      targetId: apiKey.id,
      ipAddress,
      metadata: {
        name: data.name,
        provider: data.provider ?? 'anthropic',
        organizationIds,
      },
    });

    return apiKey;
  });

  // Fetch with full relation data for response
  const result = await getApiKey(created.id);
  if (!result) throw new Error('Failed to fetch created API key');
  return result;
}

/**
 * Delete a PlatformApiKey (cascade deletes assignments via DB constraint).
 * (SKEY-04)
 */
export async function deleteApiKey(
  id: string,
  actorId: string,
  ipAddress: string | null
): Promise<void> {
  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    await tx.platformApiKey.delete({
      where: { id },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'api_key.deleted',
      targetType: 'PlatformApiKey',
      targetId: id,
      ipAddress,
      metadata: { keyId: id },
    });
  });
}

/**
 * Update org assignments for an API key.
 * Replaces all existing assignments atomically.
 * (SKEY-02)
 */
export async function updateApiKeyAssignments(
  id: string,
  organizationIds: string[],
  actorId: string,
  ipAddress: string | null
): Promise<ApiKeyWithAssignments> {
  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    // Delete all existing assignments
    await tx.platformApiKeyAssignment.deleteMany({
      where: { apiKeyId: id },
    });

    // Create new assignments
    if (organizationIds.length > 0) {
      await tx.platformApiKeyAssignment.createMany({
        data: organizationIds.map((orgId) => ({
          apiKeyId: id,
          organizationId: orgId,
        })),
      });
    }

    await auditLog.record(tx, {
      userId: actorId,
      action: 'api_key.assignments_updated',
      targetType: 'PlatformApiKey',
      targetId: id,
      ipAddress,
      metadata: { organizationIds },
    });
  });

  const result = await getApiKey(id);
  if (!result) throw new Error('API key not found after update');
  return result;
}

// ============================================
// Test & Reveal
// ============================================

/**
 * Test an API key's validity by making a minimal Anthropic API call.
 * Updates lastTestedAt on the record regardless of result.
 * (SKEY-03)
 */
export async function testApiKey(
  id: string
): Promise<{ valid: boolean; error?: string; lastTestedAt: string }> {
  let valid = false;
  let error: string | undefined;

  try {
    const rawKey = await getDecryptedKey(id);

    const client = new Anthropic({ apiKey: rawKey });

    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'test' }],
    });

    valid = true;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      error = 'Authentication failed — API key is invalid or revoked';
    } else if (err instanceof Anthropic.PermissionDeniedError) {
      error = 'Permission denied — API key lacks required permissions';
    } else if (err instanceof Error) {
      error = err.message;
    } else {
      error = 'Unknown error during key test';
    }
    valid = false;
  }

  // Update lastTestedAt regardless of result
  const updated = await prisma.platformApiKey.update({
    where: { id },
    data: { lastTestedAt: new Date() },
    select: { lastTestedAt: true },
  });

  return {
    valid,
    ...(error ? { error } : {}),
    lastTestedAt: updated.lastTestedAt!.toISOString(),
  };
}

/**
 * Reveal the full decrypted API key string for click-to-reveal in the UI.
 * Audit-logs the access.
 * (SKEY-01 — click-to-temporarily-reveal)
 */
export async function revealApiKey(
  id: string,
  actorId: string,
  ipAddress: string | null
): Promise<string> {
  const rawKey = await getDecryptedKey(id);

  // Audit-log the reveal access (outside transaction is fine for audit-only operation)
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      action: 'API_KEY_REVEALED',
      targetType: 'PlatformApiKey',
      targetId: id,
      ipAddress,
      metadata: {},
    },
  });

  return rawKey;
}
