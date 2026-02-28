/**
 * User Sessions API
 *
 * GET /api/org/[slug]/sessions - List all active sessions for the current user
 *
 * Returns session list enriched with parsed user agent info (browser, OS, device)
 * and marks the current session. Sessions are NOT org-scoped but can be filtered
 * by organization context.
 *
 * Protected by requireOrgAuth middleware (any org member).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { listUserSessions } from '@/lib/services/session-service';
import { parseUserAgent } from '@/lib/user-agent';
import prisma from '@/lib/db';

/**
 * GET /api/org/[slug]/sessions
 * Returns enriched session list with device info and current session flag.
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // Extract current session token from Authorization header
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.slice(7); // Remove "Bearer "

    // Find the current session by token to get its ID
    const currentSession = await prisma.session.findUnique({
      where: { token },
      select: { id: true },
    });

    if (!currentSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 401 }
      );
    }

    // List sessions with org filter
    const sessions = await listUserSessions(
      auth.user.id,
      currentSession.id,
      auth.organization.id
    );

    // Enrich with parsed user agent
    const enrichedSessions = sessions.map((session) => {
      const parsed = parseUserAgent(session.userAgent);
      return {
        id: session.id,
        browser: parsed.browser,
        os: parsed.os,
        device: parsed.device,
        ipAddress: session.ipAddress,
        lastUsedAt: session.lastUsedAt,
        createdAt: session.createdAt,
        isCurrent: session.isCurrent,
      };
    });

    return NextResponse.json({ sessions: enrichedSessions });
  } catch (error) {
    console.error('Failed to list sessions:', error);
    return NextResponse.json(
      { error: 'Failed to load sessions' },
      { status: 500 }
    );
  }
}
