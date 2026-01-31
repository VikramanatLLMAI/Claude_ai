import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { updateUser } from '@/lib/storage';
import { encrypt, decrypt } from '@/lib/encryption';

// GET /api/user/aws - Get AWS configuration (masked)
export async function GET(req: NextRequest) {
  // Require authentication
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    // Return masked credentials for security
    const hasAccessKey = !!user.awsAccessKeyEncrypted;
    const hasSecretKey = !!user.awsSecretKeyEncrypted;

    let maskedAccessKey = '';
    if (hasAccessKey && user.awsAccessKeyEncrypted) {
      try {
        const accessKey = decrypt(user.awsAccessKeyEncrypted);
        maskedAccessKey = accessKey.slice(0, 4) + '****' + accessKey.slice(-4);
      } catch {
        maskedAccessKey = '****';
      }
    }

    return NextResponse.json({
      hasCredentials: hasAccessKey && hasSecretKey,
      accessKeyId: maskedAccessKey,
      region: user.awsRegion || 'us-east-1',
    });
  } catch (error) {
    console.error('Error fetching AWS configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AWS configuration' },
      { status: 500 }
    );
  }
}

// POST /api/user/aws - Save AWS credentials
export async function POST(req: NextRequest) {
  // Require authentication
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const { accessKeyId, secretAccessKey, region } = await req.json();

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: 'Access key ID and secret access key are required' },
        { status: 400 }
      );
    }

    // Validate AWS access key format (starts with AKIA or ASIA for temporary)
    if (!accessKeyId.match(/^(AKIA|ASIA)[A-Z0-9]{16}$/)) {
      return NextResponse.json(
        { error: 'Invalid AWS access key format' },
        { status: 400 }
      );
    }

    // Encrypt credentials
    const encryptedAccessKey = encrypt(accessKeyId);
    const encryptedSecretKey = encrypt(secretAccessKey);

    // Update authenticated user's record
    await updateUser(user.id, {
      awsAccessKeyEncrypted: encryptedAccessKey,
      awsSecretKeyEncrypted: encryptedSecretKey,
      awsRegion: region || 'us-east-1',
    });

    return NextResponse.json({
      success: true,
      message: 'AWS credentials saved successfully',
    });
  } catch (error) {
    console.error('Error saving AWS credentials:', error);
    return NextResponse.json(
      { error: 'Failed to save AWS credentials' },
      { status: 500 }
    );
  }
}
