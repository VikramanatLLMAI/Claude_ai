/**
 * POST /api/auth/find-org
 *
 * Email-first org finder endpoint ("find my org" helper).
 * Looks up a user by email and returns their org type and slug.
 *
 * Security:
 * - Returns a generic "not_found" for unknown emails (no info leakage)
 * - Uses constant-time response pattern to prevent timing attacks
 * - Does NOT require authentication (public endpoint)
 *
 * Rate limiting: TODO - Add rate limiting in production to prevent enumeration
 */

import { z } from 'zod';
import { prisma } from '@/lib/db';

const FindOrgSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate email
    const parsed = FindOrgSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Record start time for constant-time response
    const startTime = Date.now();

    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        isSuperAdmin: true,
        orgMemberships: {
          select: {
            organization: {
              select: {
                slug: true,
                status: true,
                deletedAt: true,
              },
            },
          },
          take: 1, // One user = one org
        },
      },
    });

    // Build response based on user lookup result
    let responseBody: { type: string; slug?: string };

    if (!user) {
      // User not found -- return generic not_found
      responseBody = { type: 'not_found' };
    } else if (user.isSuperAdmin) {
      // Super Admin -- redirect to admin login
      responseBody = { type: 'super_admin' };
    } else if (user.orgMemberships.length > 0) {
      const membership = user.orgMemberships[0];
      const org = membership.organization;

      // Check org is active and not soft-deleted
      if (org.status === 'ACTIVE' && !org.deletedAt) {
        responseBody = { type: 'org', slug: org.slug };
      } else {
        // Org is suspended or deleted -- return not_found (no leakage)
        responseBody = { type: 'not_found' };
      }
    } else {
      // User exists but has no org membership
      responseBody = { type: 'not_found' };
    }

    // Constant-time response: ensure minimum response time of ~200ms
    // to prevent timing attacks that could reveal whether an email exists.
    const elapsed = Date.now() - startTime;
    const minResponseTime = 200;
    if (elapsed < minResponseTime) {
      await new Promise((resolve) =>
        setTimeout(resolve, minResponseTime - elapsed)
      );
    }

    return Response.json(responseBody, { status: 200 });
  } catch (error) {
    console.error('Find org error:', error);
    return Response.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
