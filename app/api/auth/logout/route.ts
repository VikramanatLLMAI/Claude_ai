import { NextRequest } from 'next/server';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';
import { deleteSession, getSessionByToken } from '@/lib/storage';

export async function POST(req: NextRequest) {
  // Origin validation for mutation requests
  if (!validateOrigin(req)) return originDeniedResponse();

  // Rate limiting: 60 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const rl = checkRateLimit(`api:${ip}`, RATE_LIMITS.api);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Delete the session
    const deleted = await deleteSession(token);

    if (!deleted) {
      return Response.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return Response.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
