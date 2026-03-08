import type {
  User,
  Session,
  Organization,
  OrgMember,
  Role,
} from '@/lib/generated/prisma/client';

/**
 * Creates a mock User with sensible defaults.
 * All required fields are populated; pass overrides for specific test scenarios.
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    name: 'Test User',
    avatarBase64: null,
    isSuperAdmin: false,
    preferences: { themeMode: 'system' } as any,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastLogin: null,
    passwordChangedAt: null,
    ...overrides,
  };
}

/**
 * Creates a mock Organization with sensible defaults.
 */
export function createMockOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    status: 'ACTIVE',
    logoBase64: null,
    logoDisplayMode: 'PLATFORM_AND_ORG',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    monthlyRequestCeiling: null,
    monthlyTokenCeiling: null,
    ...overrides,
  };
}

/**
 * Creates a mock Role with sensible defaults.
 */
export function createMockRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-1',
    organizationId: 'org-1',
    name: 'Member',
    description: null,
    isSystemRole: false,
    permissions: ['chat'] as any,
    allowedModels: [] as any,
    systemInstructions: null,
    restrictionInstructions: null,
    restrictionInstructionsMaxLength: 1000,
    customInstructionsEnabled: true,
    customInstructionsMaxLength: 1000,
    personalMcpEnabled: false,
    personalMcpMaxCount: 3,
    dailyRequestLimit: null,
    dailyTokenLimit: null,
    promptSuggestions: [] as any,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Creates a mock OrgMember with nested organization and role defaults.
 */
export function createMockOrgMember(
  overrides: Partial<OrgMember & { organization: Organization; role: Role }> = {}
): OrgMember & { organization: Organization; role: Role } {
  const { organization, role, ...memberOverrides } = overrides;
  return {
    id: 'member-1',
    userId: 'user-1',
    organizationId: 'org-1',
    roleId: 'role-1',
    customInstructions: null,
    status: 'ACTIVE',
    joinedAt: new Date('2026-01-01T00:00:00Z'),
    lastActiveAt: null,
    forcePasswordChange: false,
    organization: createMockOrganization(organization),
    role: createMockRole(role),
    ...memberOverrides,
  };
}

/**
 * Creates a mock Session with nested user defaults.
 */
export function createMockSession(
  overrides: Partial<Session & { user: User }> = {}
): Session & { user: User } {
  const { user, ...sessionOverrides } = overrides;
  return {
    id: 'session-1',
    userId: 'user-1',
    token: 'test-session-token-abc123',
    organizationId: 'org-1',
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastUsedAt: null,
    impersonatorId: null,
    impersonationReason: null,
    impersonationExpiresAt: null,
    user: createMockUser(user),
    ...sessionOverrides,
  };
}
