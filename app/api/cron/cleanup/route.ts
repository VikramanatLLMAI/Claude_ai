/**
 * Cron Cleanup Route
 *
 * GET /api/cron/cleanup - Run all scheduled cleanup tasks
 *
 * Authentication: Bearer token matching CRON_SECRET env var (not session-based).
 * In production, configure via vercel.json cron:
 *
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 *
 * In development, trigger manually:
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cleanup
 *
 * Covers: CRON-01, CRON-02, CRON-03
 */

import { NextRequest, NextResponse } from 'next/server';
import { runScheduledCleanup } from '@/lib/services/cleanup-service';

/**
 * GET /api/cron/cleanup
 * Authenticate via CRON_SECRET bearer token and run all cleanup tasks.
 */
export async function GET(req: NextRequest) {
  // Authenticate via CRON_SECRET
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json(
      { error: 'Cron not configured' },
      { status: 500 }
    );
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  if (token !== cronSecret) {
    return NextResponse.json(
      { error: 'Invalid cron secret' },
      { status: 403 }
    );
  }

  try {
    const result = await runScheduledCleanup();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
