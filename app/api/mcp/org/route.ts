import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';

// GET /api/mcp/org - List org-wide MCP connections (sanitized, read-only)
export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user, tenantDb } = auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rl = checkRateLimit(`api:${user.id}`, RATE_LIMITS.api);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  try {
    const connections = await tenantDb.mcpConnection.findMany({
      where: {
        source: 'ORG',
        userId: null,
        roleId: null,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Sanitized response - exclude credentials and sensitive fields
    const response = connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      serverUrl: conn.serverUrl,
      status: conn.status,
      isActive: conn.isActive,
      availableTools: conn.availableTools,
      toolCount: Array.isArray(conn.availableTools) ? (conn.availableTools as unknown[]).length : 0,
      source: 'ORG' as const,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching org MCP connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch org MCP connections' },
      { status: 500 }
    );
  }
}
