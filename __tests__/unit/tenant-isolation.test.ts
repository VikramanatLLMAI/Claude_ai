/**
 * Unit tests for tenant isolation (tenantPrisma)
 *
 * Tests verify that tenantPrisma correctly injects organizationId into:
 * - WHERE clauses for read operations (findMany, findFirst, etc.)
 * - DATA objects for create operations
 * - Both WHERE and CREATE for upsert operations
 * - Each item in createMany with array data
 * - Passthrough for non-scoped models (User, Session, etc.)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock @/lib/db differently from mock-db.ts -- we want to
// capture the $extends callback and test it directly
const mockQuery = vi.fn(async (args: unknown) => ({ result: 'mocked', args }));
const capturedExtensions: any[] = [];

vi.mock('@/lib/db', () => {
  return {
    __esModule: true,
    default: {
      $extends: vi.fn((config: any) => {
        capturedExtensions.push(config);
        return {}; // Return mock extended client
      }),
    },
  };
});

import { tenantPrisma } from '@/lib/tenant';

describe('tenantPrisma', () => {
  let allOperations: (params: {
    model?: string;
    operation: string;
    args: any;
    query: typeof mockQuery;
  }) => Promise<any>;

  beforeEach(() => {
    capturedExtensions.length = 0;
    mockQuery.mockClear();

    // Call tenantPrisma to capture the extension
    tenantPrisma('org-123');

    // Extract the $allOperations callback
    const ext = capturedExtensions[0];
    allOperations = ext.query.$allModels.$allOperations;
  });

  describe('tenant-scoped models', () => {
    it('injects organizationId into WHERE for findMany', async () => {
      const args = { where: { userId: 'user-1' } };
      await allOperations({
        model: 'Conversation',
        operation: 'findMany',
        args,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            organizationId: 'org-123',
          }),
        })
      );
    });

    it('injects organizationId into WHERE for findFirst', async () => {
      const args = { where: { title: 'test' } };
      await allOperations({
        model: 'Message',
        operation: 'findFirst',
        args,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: 'test',
            organizationId: 'org-123',
          }),
        })
      );
    });

    it('injects organizationId into WHERE for aggregate', async () => {
      const args = { where: { userId: 'user-1' }, _count: { id: true } };
      await allOperations({
        model: 'UsageRecord',
        operation: 'aggregate',
        args,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-123',
          }),
        })
      );
    });

    it('injects organizationId into DATA for create', async () => {
      const args = { data: { title: 'New Convo', userId: 'user-1' } };
      await allOperations({
        model: 'Conversation',
        operation: 'create',
        args,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'New Convo',
            userId: 'user-1',
            organizationId: 'org-123',
          }),
        })
      );
    });

    it('injects organizationId into both WHERE and CREATE for upsert', async () => {
      const args = {
        where: { id: 'convo-1' },
        create: { title: 'New', userId: 'user-1' },
        update: { title: 'Updated' },
      };
      await allOperations({
        model: 'Conversation',
        operation: 'upsert',
        args,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'convo-1',
            organizationId: 'org-123',
          }),
          create: expect.objectContaining({
            title: 'New',
            userId: 'user-1',
            organizationId: 'org-123',
          }),
        })
      );
    });

    it('injects organizationId into each item for createMany with array data', async () => {
      const args = {
        data: [
          { content: 'msg1', role: 'user' },
          { content: 'msg2', role: 'assistant' },
        ],
      };
      await allOperations({
        model: 'Message',
        operation: 'createMany',
        args,
        query: mockQuery,
      });

      const calledArgs = mockQuery.mock.calls[0][0] as any;
      expect(calledArgs.data).toHaveLength(2);
      expect(calledArgs.data[0].organizationId).toBe('org-123');
      expect(calledArgs.data[1].organizationId).toBe('org-123');
    });

    it('injects organizationId into WHERE for update', async () => {
      const args = { where: { id: 'convo-1' }, data: { title: 'Updated' } };
      await allOperations({
        model: 'Conversation',
        operation: 'update',
        args,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'convo-1',
            organizationId: 'org-123',
          }),
        })
      );
    });

    it('injects organizationId into WHERE for delete', async () => {
      const args = { where: { id: 'convo-1' } };
      await allOperations({
        model: 'Conversation',
        operation: 'delete',
        args,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'convo-1',
            organizationId: 'org-123',
          }),
        })
      );
    });
  });

  describe('non-scoped models', () => {
    it('passes through unmodified for User model', async () => {
      const args = { where: { email: 'test@example.com' } };
      await allOperations({
        model: 'User',
        operation: 'findMany',
        args,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledWith(args);
      // Verify organizationId was NOT added
      expect(args.where).not.toHaveProperty('organizationId');
    });

    it('passes through unmodified for Session model', async () => {
      const args = { where: { token: 'abc' } };
      await allOperations({
        model: 'Session',
        operation: 'findFirst',
        args,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledWith(args);
      expect(args.where).not.toHaveProperty('organizationId');
    });

    it('passes through when model is undefined', async () => {
      const args = { where: {} };
      await allOperations({
        model: undefined,
        operation: 'findMany',
        args,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledWith(args);
    });
  });
});
