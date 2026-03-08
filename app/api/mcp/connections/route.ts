import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/encryption';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

// GET /api/mcp/connections - List all MCP connections for user in current org
export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  try {
    const connections = await tenantDb.mcpConnection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Map to response format (exclude encrypted credentials)
    const response = connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      serverUrl: conn.serverUrl,
      authType: conn.authType,
      status: conn.status,
      lastError: conn.lastError,
      isActive: conn.isActive,
      availableTools: conn.availableTools,
      lastConnectedAt: conn.lastConnectedAt?.toISOString() || null,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching MCP connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP connections' },
      { status: 500 }
    );
  }
}

// POST /api/mcp/connections - Create a new MCP connection
export async function POST(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlPost = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rlPost.allowed) return rateLimitResponse(rlPost.retryAfterSeconds);

  try {
    const body = await req.json();
    const { name, serverUrl, authType, oauthClientId, oauthClientSecret, apiKey } = body;

    // Validate required fields
    if (!name || !serverUrl) {
      return NextResponse.json(
        { error: 'Name and server URL are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(serverUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid server URL format' },
        { status: 400 }
      );
    }

    // Encrypt credentials if provided
    let encryptedCredentials: string | undefined;
    if (authType === 'oauth' && oauthClientId && oauthClientSecret) {
      const credentialsData = JSON.stringify({ clientId: oauthClientId, clientSecret: oauthClientSecret });
      encryptedCredentials = encrypt(credentialsData);
    } else if (authType === 'api_key' && apiKey) {
      const credentialsData = JSON.stringify({ apiKey });
      encryptedCredentials = encrypt(credentialsData);
    }

    // Create connection (tenant-scoped auto-injects organizationId)
    const connection = await tenantDb.mcpConnection.create({
      data: {
        organizationId: '' as string,
        userId: user.id,
        name,
        serverUrl,
        authType: authType || 'none',
        authCredentialsEncrypted: encryptedCredentials,
      },
    });

    return NextResponse.json({
      id: connection.id,
      name: connection.name,
      serverUrl: connection.serverUrl,
      authType: connection.authType,
      status: connection.status,
      isActive: connection.isActive,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating MCP connection:', error);
    return NextResponse.json(
      { error: 'Failed to create MCP connection' },
      { status: 500 }
    );
  }
}
