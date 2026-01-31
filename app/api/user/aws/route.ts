import { NextRequest, NextResponse } from 'next/server';
import { updateUser, getUserById } from '@/lib/storage';
import { encrypt, decrypt } from '@/lib/encryption';

// Default user ID for demo mode
const DEMO_USER_ID = 'demo-user-id';

// GET /api/user/aws - Get AWS configuration (masked)
export async function GET() {
  try {
    const user = await getUserById(DEMO_USER_ID);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

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

    // Update user record
    await updateUser(DEMO_USER_ID, {
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
