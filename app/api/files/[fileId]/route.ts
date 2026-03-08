import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAuth } from '@/lib/auth-middleware';
import { getAnthropicFilesClient } from '@/lib/anthropic-files';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter';
import { validateOrigin, originDeniedResponse } from '@/lib/origin-validator';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const auth = await requireOrgAuth(req);
  if (auth instanceof NextResponse) return auth;

  // Rate limiting: 60 requests per minute per user (api tier)
  const rlGet = checkRateLimit(`api:${auth.user.id}`, RATE_LIMITS.api);
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterSeconds);

  const { fileId } = await params;

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return NextResponse.json({ error: 'Invalid file ID format' }, { status: 400 });
  }

  try {
    const client = getAnthropicFilesClient();
    const metadata = await client.beta.files.retrieveMetadata(fileId);

    return NextResponse.json({
      id: metadata.id,
      filename: metadata.filename,
      mime_type: metadata.mime_type,
      size_bytes: metadata.size_bytes,
    });
  } catch (error: unknown) {
    console.error('[Files] Metadata error:', error);
    const status = (error as { status?: number })?.status;
    if (status === 404) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    if (status === 410) {
      return NextResponse.json({ error: 'File has expired' }, { status: 410 });
    }
    return NextResponse.json({ error: 'Failed to retrieve file metadata' }, { status: 500 });
  }
}
