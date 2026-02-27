/**
 * Model Registry Service
 *
 * CRUD operations for the platform-level Model registry.
 * All mutations are wrapped in prisma.$transaction() for atomicity
 * with audit logging co-located in the same transaction.
 *
 * The Model table is NOT org-scoped (platform-level, like User and Session).
 * Uses raw `prisma` client, NOT tenantDb.
 *
 * Covers: MODL-01 through MODL-06, SAFE-07
 */

import prisma from '@/lib/db';
import { auditLog, type PrismaTransactionClient } from './audit-service';
import type { Model } from '@/lib/generated/prisma/client';

// ============================================
// Types
// ============================================

export interface CreateModelInput {
  modelId: string;
  displayName: string;
  generationGroup: string;
  inputPricePerToken: number;
  outputPricePerToken: number;
  thinkingPricePerToken: number;
  cacheWritePricePerToken: number;
  cacheReadPricePerToken: number;
  supportsThinking?: boolean;
  supportsVision?: boolean;
  supportsTools?: boolean;
  thinkingType?: string | null;
  maxOutputTokens: number;
  contextWindow: number;
  status?: string;
  sortOrder?: number;
}

export interface UpdateModelInput {
  modelId?: string;
  displayName?: string;
  generationGroup?: string;
  inputPricePerToken?: number;
  outputPricePerToken?: number;
  thinkingPricePerToken?: number;
  cacheWritePricePerToken?: number;
  cacheReadPricePerToken?: number;
  supportsThinking?: boolean;
  supportsVision?: boolean;
  supportsTools?: boolean;
  thinkingType?: string | null;
  maxOutputTokens?: number;
  contextWindow?: number;
  status?: string;
  sortOrder?: number;
}

// ============================================
// Read Operations
// ============================================

/**
 * Get all models, optionally filtered by status.
 * Returns models ordered by sortOrder ascending.
 */
export async function getAllModels(status?: 'ACTIVE' | 'DEPRECATED'): Promise<Model[]> {
  return prisma.model.findMany({
    where: status ? { status } : undefined,
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Get active models matching the given Anthropic model ID strings.
 * Used for resolving role allowedModels arrays to full model objects.
 * Returns only ACTIVE models, ordered by sortOrder.
 */
export async function getModelsByIds(modelIds: string[]): Promise<Model[]> {
  return prisma.model.findMany({
    where: {
      modelId: { in: modelIds },
      status: 'ACTIVE',
    },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Get all active models grouped by generationGroup.
 * Returns Record<string, Model[]> for UI display (e.g., "Claude 4.6" -> [...models]).
 */
export async function getModelsGroupedByGeneration(): Promise<Record<string, Model[]>> {
  const models = await prisma.model.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sortOrder: 'asc' },
  });

  const grouped: Record<string, Model[]> = {};
  for (const model of models) {
    const group = model.generationGroup;
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(model);
  }

  return grouped;
}

/**
 * Get a single model by its internal UUID.
 */
export async function getModelById(id: string): Promise<Model | null> {
  return prisma.model.findUnique({
    where: { id },
  });
}

/**
 * Get a single model by its Anthropic model ID string.
 */
export async function getModelByModelId(modelId: string): Promise<Model | null> {
  return prisma.model.findUnique({
    where: { modelId },
  });
}

// ============================================
// Write Operations (with audit logging)
// ============================================

/**
 * Create a new model in the registry with audit logging.
 * Action: 'model.created'
 */
export async function createModel(
  data: CreateModelInput,
  actorId: string,
  ipAddress: string | null
): Promise<Model> {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const model = await tx.model.create({
      data: {
        modelId: data.modelId,
        displayName: data.displayName,
        generationGroup: data.generationGroup,
        inputPricePerToken: data.inputPricePerToken,
        outputPricePerToken: data.outputPricePerToken,
        thinkingPricePerToken: data.thinkingPricePerToken,
        cacheWritePricePerToken: data.cacheWritePricePerToken,
        cacheReadPricePerToken: data.cacheReadPricePerToken,
        supportsThinking: data.supportsThinking ?? false,
        supportsVision: data.supportsVision ?? true,
        supportsTools: data.supportsTools ?? true,
        thinkingType: data.thinkingType ?? null,
        maxOutputTokens: data.maxOutputTokens,
        contextWindow: data.contextWindow,
        status: data.status ?? 'ACTIVE',
        sortOrder: data.sortOrder ?? 0,
      },
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'model.created',
      targetType: 'Model',
      targetId: model.id,
      ipAddress,
      metadata: {
        modelId: model.modelId,
        displayName: model.displayName,
        generationGroup: model.generationGroup,
        status: model.status,
      },
    });

    return model;
  });
}

/**
 * Update an existing model with audit logging.
 * Action: 'model.updated'
 *
 * If setting status to DEPRECATED, validates that no active roles rely exclusively
 * on this model (at least one other model must be active in their allowedModels).
 */
export async function updateModel(
  id: string,
  data: UpdateModelInput,
  actorId: string,
  ipAddress: string | null
): Promise<Model> {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const before = await tx.model.findUnique({ where: { id } });
    if (!before) {
      throw new Error('Model not found');
    }

    // If deprecating, check that no roles rely exclusively on this model
    if (data.status === 'DEPRECATED' && before.status === 'ACTIVE') {
      await validateDeprecation(tx, before.modelId);
    }

    // Build update data, only including provided fields
    const updateData: Record<string, unknown> = {};
    if (data.modelId !== undefined) updateData.modelId = data.modelId;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.generationGroup !== undefined) updateData.generationGroup = data.generationGroup;
    if (data.inputPricePerToken !== undefined) updateData.inputPricePerToken = data.inputPricePerToken;
    if (data.outputPricePerToken !== undefined) updateData.outputPricePerToken = data.outputPricePerToken;
    if (data.thinkingPricePerToken !== undefined) updateData.thinkingPricePerToken = data.thinkingPricePerToken;
    if (data.cacheWritePricePerToken !== undefined) updateData.cacheWritePricePerToken = data.cacheWritePricePerToken;
    if (data.cacheReadPricePerToken !== undefined) updateData.cacheReadPricePerToken = data.cacheReadPricePerToken;
    if (data.supportsThinking !== undefined) updateData.supportsThinking = data.supportsThinking;
    if (data.supportsVision !== undefined) updateData.supportsVision = data.supportsVision;
    if (data.supportsTools !== undefined) updateData.supportsTools = data.supportsTools;
    if (data.thinkingType !== undefined) updateData.thinkingType = data.thinkingType;
    if (data.maxOutputTokens !== undefined) updateData.maxOutputTokens = data.maxOutputTokens;
    if (data.contextWindow !== undefined) updateData.contextWindow = data.contextWindow;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const updated = await tx.model.update({
      where: { id },
      data: updateData,
    });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'model.updated',
      targetType: 'Model',
      targetId: id,
      ipAddress,
      metadata: {
        before: {
          modelId: before.modelId,
          displayName: before.displayName,
          status: before.status,
        },
        after: {
          modelId: updated.modelId,
          displayName: updated.displayName,
          status: updated.status,
        },
        changes: Object.keys(updateData),
      },
    });

    return updated;
  });
}

/**
 * Hard-delete a model with audit logging.
 * Action: 'model.deleted'
 *
 * Only allows deletion if no roles reference this model in their allowedModels.
 * If roles reference it, throws an error suggesting deprecation instead.
 */
export async function deleteModel(
  id: string,
  actorId: string,
  ipAddress: string | null
): Promise<void> {
  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const model = await tx.model.findUnique({ where: { id } });
    if (!model) {
      throw new Error('Model not found');
    }

    // Check if any roles reference this model in allowedModels
    const referencingRoles = await findRolesReferencingModel(tx, model.modelId);
    if (referencingRoles.length > 0) {
      const roleNames = referencingRoles.map((r) => r.name).join(', ');
      throw new Error(
        `Cannot delete model "${model.displayName}": referenced by ${referencingRoles.length} role(s) (${roleNames}). ` +
        'Consider deprecating instead of deleting.'
      );
    }

    await tx.model.delete({ where: { id } });

    await auditLog.record(tx, {
      userId: actorId,
      action: 'model.deleted',
      targetType: 'Model',
      targetId: id,
      ipAddress,
      metadata: {
        modelId: model.modelId,
        displayName: model.displayName,
      },
    });
  });
}

// ============================================
// Internal Helpers
// ============================================

/**
 * Find all roles that reference a given model ID in their allowedModels JSON array.
 */
async function findRolesReferencingModel(
  tx: PrismaTransactionClient,
  modelId: string
) {
  const allRoles = await tx.role.findMany({
    select: { id: true, name: true, organizationId: true, allowedModels: true },
  });

  return allRoles.filter((role) => {
    const allowed = Array.isArray(role.allowedModels) ? role.allowedModels : [];
    return allowed.includes(modelId);
  });
}

/**
 * Validate that deprecating a model won't leave any role with zero active models.
 * Throws if any role would be left with no active models after deprecation.
 */
async function validateDeprecation(
  tx: PrismaTransactionClient,
  modelIdBeingDeprecated: string
) {
  // Get all currently active model IDs
  const activeModels = await tx.model.findMany({
    where: { status: 'ACTIVE' },
    select: { modelId: true },
  });
  const activeModelIds = new Set(activeModels.map((m) => m.modelId));

  // After deprecation, this model will no longer be active
  activeModelIds.delete(modelIdBeingDeprecated);

  // Find roles that reference the model being deprecated
  const rolesWithModel = await findRolesReferencingModel(tx, modelIdBeingDeprecated);

  for (const role of rolesWithModel) {
    const allowed = Array.isArray(role.allowedModels) ? (role.allowedModels as string[]) : [];
    // Check if this role has at least one other active model
    const remainingActive = allowed.filter((m) => activeModelIds.has(m));
    if (remainingActive.length === 0) {
      throw new Error(
        `Cannot deprecate model: role "${role.name}" (org: ${role.organizationId}) would have no active models remaining. ` +
        'Update the role\'s allowed models first, or assign additional models.'
      );
    }
  }
}
