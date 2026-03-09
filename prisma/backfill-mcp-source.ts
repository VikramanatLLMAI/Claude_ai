/**
 * Backfill script for McpConnection.source field.
 *
 * Derives the correct McpSource enum value from existing userId/roleId columns:
 *   - userId=null, roleId=null  -> ORG
 *   - userId=null, roleId!=null -> ROLE
 *   - userId!=null              -> PERSONAL (already default, but confirmed)
 *
 * Usage: npx tsx prisma/backfill-mcp-source.ts
 */

import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
  console.log('[Backfill] Starting MCP source backfill...');

  // Fetch all connections
  const connections = await prisma.mcpConnection.findMany({
    select: { id: true, userId: true, roleId: true, source: true },
  });

  console.log(`[Backfill] Found ${connections.length} MCP connections`);

  let orgCount = 0;
  let roleCount = 0;
  let personalCount = 0;

  const updates: Array<{ id: string; source: 'ORG' | 'ROLE' | 'PERSONAL' }> = [];

  for (const conn of connections) {
    let expectedSource: 'ORG' | 'ROLE' | 'PERSONAL';

    if (conn.userId === null && conn.roleId === null) {
      expectedSource = 'ORG';
      orgCount++;
    } else if (conn.userId === null && conn.roleId !== null) {
      expectedSource = 'ROLE';
      roleCount++;
    } else {
      expectedSource = 'PERSONAL';
      personalCount++;
    }

    // Only update if source differs
    if (conn.source !== expectedSource) {
      updates.push({ id: conn.id, source: expectedSource });
    }
  }

  if (updates.length > 0) {
    // Batch update inside a transaction
    await prisma.$transaction(
      updates.map((u) =>
        prisma.mcpConnection.update({
          where: { id: u.id },
          data: { source: u.source },
        })
      )
    );
    console.log(`[Backfill] Updated ${updates.length} connections`);
  } else {
    console.log('[Backfill] All connections already have correct source values');
  }

  console.log(`[Backfill] Results: ${orgCount} ORG, ${roleCount} ROLE, ${personalCount} PERSONAL`);
  console.log('[Backfill] Done.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[Backfill] Error:', err);
  process.exit(1);
});
