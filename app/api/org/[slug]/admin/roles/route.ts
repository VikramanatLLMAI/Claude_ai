/**
 * Org Admin Roles API - List and Create Roles
 *
 * GET  /api/org/[slug]/admin/roles - List all roles for the organization
 * POST /api/org/[slug]/admin/roles - Create a new custom role
 *
 * Requires Org Admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import { createRole } from '@/lib/services/role-service';
import { getIpAddress } from '@/lib/services/audit-service';
import { z } from 'zod';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

/**
 * Zod schema for role creation payload.
 * name: required (3-50 chars), description: optional (max 200 chars),
 * allowedModels: string array, limits: positive integers or null,
 * personalMcpMaxCount: nonnegative integer (0 means MCP disabled).
 */
const PromptSuggestionSchema = z.object({
  icon: z.string().max(50),
  label: z.string().max(100),
  prompt: z.string().max(500),
});

const CreateRoleSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must be at most 50 characters'),
  description: z.string().max(200, 'Description must be at most 200 characters').optional(),
  allowedModels: z.array(z.string()).optional(),
  systemInstructions: z.string().optional(),
  customInstructionsEnabled: z.boolean().optional(),
  personalMcpEnabled: z.boolean().optional(),
  personalMcpMaxCount: z.number().int().nonnegative().optional(),
  dailyRequestLimit: z.number().int().positive().nullable().optional(),
  dailyTokenLimit: z.number().int().positive().nullable().optional(),
  promptSuggestions: z.array(PromptSuggestionSchema).max(4, 'Maximum 4 prompt suggestions allowed').optional(),
});

/**
 * GET /api/org/[slug]/admin/roles
 * List all roles for the current organization with all fields
 * including allowedModels, customInstructionsEnabled, personalMcpEnabled, personalMcpMaxCount.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const roles = await authResult.tenantDb.role.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        isSystemRole: true,
        permissions: true,
        allowedModels: true,
        systemInstructions: true,
        customInstructionsEnabled: true,
        customInstructionsMaxLength: true,
        personalMcpEnabled: true,
        personalMcpMaxCount: true,
        dailyRequestLimit: true,
        dailyTokenLimit: true,
        promptSuggestions: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { members: true },
        },
      },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/org/[slug]/admin/roles
 * Create a new custom role for the organization.
 * Returns 201 with created role.
 */
export async function POST(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const authResult = await requireOrgAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const parsed = CreateRoleSchema.safeParse(body);

    if (!parsed.success) {
      const messages = parsed.error.issues.map((e: { message: string }) => e.message).join(', ');
      return NextResponse.json(
        { error: messages },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const ipAddress = getIpAddress(req);

    const role = await createRole(
      authResult.tenantDb,
      authResult.organization.id,
      {
        name: data.name,
        description: data.description,
        allowedModels: data.allowedModels,
        systemInstructions: data.systemInstructions,
        customInstructionsEnabled: data.customInstructionsEnabled,
        personalMcpEnabled: data.personalMcpEnabled,
        personalMcpMaxCount: data.personalMcpMaxCount,
        dailyRequestLimit: data.dailyRequestLimit,
        dailyTokenLimit: data.dailyTokenLimit,
        promptSuggestions: data.promptSuggestions,
      },
      {
        userId: authResult.user.id,
        organizationId: authResult.organization.id,
        ipAddress,
      }
    );

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    // Unique constraint or validation errors from service layer
    if (message.includes('already exists') || message.includes('must be')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
