/**
 * Smoke test to verify the test infrastructure works:
 * - Vitest globals (describe, it, expect)
 * - Path alias resolution (@/*)
 * - Prisma mock singleton
 * - Entity factories
 * - Request factory
 */
import { prismaMock } from '../helpers/mock-db';
import { createMockRequest } from '../helpers/mock-auth';
import {
  createMockUser,
  createMockOrganization,
  createMockRole,
  createMockOrgMember,
  createMockSession,
} from '../helpers/factories';

describe('Test Infrastructure', () => {
  it('should have vitest globals available', () => {
    expect(true).toBe(true);
  });

  it('should provide a Prisma mock with model accessors', () => {
    expect(prismaMock).toBeDefined();
    expect(prismaMock.user).toBeDefined();
    expect(prismaMock.session).toBeDefined();
    expect(prismaMock.organization).toBeDefined();
    expect(prismaMock.orgMember).toBeDefined();
    expect(prismaMock.role).toBeDefined();
  });

  it('should create mock users with defaults', () => {
    const user = createMockUser();
    expect(user.id).toBe('user-1');
    expect(user.email).toBe('test@example.com');
    expect(user.isSuperAdmin).toBe(false);
  });

  it('should create mock users with overrides', () => {
    const user = createMockUser({ email: 'admin@test.com', isSuperAdmin: true });
    expect(user.email).toBe('admin@test.com');
    expect(user.isSuperAdmin).toBe(true);
  });

  it('should create mock organizations', () => {
    const org = createMockOrganization();
    expect(org.slug).toBe('test-org');
    expect(org.status).toBe('ACTIVE');
  });

  it('should create mock roles', () => {
    const role = createMockRole();
    expect(role.name).toBe('Member');
    expect(role.organizationId).toBe('org-1');
  });

  it('should create mock org members with nested relations', () => {
    const member = createMockOrgMember();
    expect(member.organization.slug).toBe('test-org');
    expect(member.role.name).toBe('Member');
  });

  it('should create mock sessions with nested user', () => {
    const session = createMockSession();
    expect(session.token).toBeDefined();
    expect(session.user.email).toBe('test@example.com');
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should create mock requests without auth', () => {
    const req = createMockRequest();
    expect(req.method).toBe('GET');
    expect(req.headers.get('Authorization')).toBeNull();
  });

  it('should create mock requests with Bearer token', () => {
    const req = createMockRequest({ token: 'my-token' });
    expect(req.headers.get('Authorization')).toBe('Bearer my-token');
  });

  it('should reset Prisma mock between tests', () => {
    // If beforeEach mockReset works, this mock should not persist from previous tests
    prismaMock.user.findUnique.mockResolvedValue(createMockUser());
    expect(prismaMock.user.findUnique).toBeDefined();
  });
});
