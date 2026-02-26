/**
 * Anthropic API Key Management
 *
 * GET /api/user/anthropic - Get API key status (masked)
 * POST /api/user/anthropic - Save API key
 *
 * Note: In the multi-tenant schema, API keys are stored in the PlatformApiKey model
 * (org-scoped). This route manages the org's Anthropic API key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { encrypt, decrypt } from '@/lib/encryption';

// GET /api/user/anthropic - Get Anthropic API key status (masked)
export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantDb } = auth;

  try {
    // Find the org's active Anthropic API key
    const apiKey = await tenantDb.platformApiKey.findFirst({
      where: {
        provider: 'anthropic',
        isActive: true,
      },
    });

    if (!apiKey) {
      return NextResponse.json({
        hasApiKey: false,
        maskedKey: '',
      });
    }

    let maskedKey = 'sk-ant-****';
    try {
      const decryptedKey = decrypt(apiKey.encryptedKey);
      maskedKey = decryptedKey.slice(0, 7) + '****' + decryptedKey.slice(-4);
    } catch {
      // Use default mask on decrypt failure
    }

    return NextResponse.json({
      hasApiKey: true,
      maskedKey,
    });
  } catch (error) {
    console.error('Error fetching Anthropic API key status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key status' },
      { status: 500 }
    );
  }
}

// POST /api/user/anthropic - Save Anthropic API key
export async function POST(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantDb } = auth;

  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Validate Anthropic API key format
    if (!apiKey.startsWith('sk-ant-')) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key format. Key should start with "sk-ant-"' },
        { status: 400 }
      );
    }

    const encryptedKey = encrypt(apiKey);

    // Upsert the org's Anthropic API key
    const existing = await tenantDb.platformApiKey.findFirst({
      where: {
        provider: 'anthropic',
        isActive: true,
      },
    });

    if (existing) {
      await tenantDb.platformApiKey.update({
        where: { id: existing.id },
        data: {
          encryptedKey,
          lastTestedAt: null,
        },
      });
    } else {
      await tenantDb.platformApiKey.create({
        data: {
          provider: 'anthropic',
          name: 'Default Anthropic Key',
          encryptedKey,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Anthropic API key saved successfully',
    });
  } catch (error) {
    console.error('Error saving Anthropic API key:', error);
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    );
  }
}
