# Athena MCP - Overall Agent Guide

## Scope
These instructions apply to the entire repository unless a deeper `AGENTS.md`
overrides them.

## Tech Stack Snapshot
- Next.js App Router with TypeScript.
- React 19 components in `app` and `components`.
- Route handlers in `app/api`.
- Prisma client and schema in `lib` and `prisma`.

## Directory Map
- Frontend UI: `app` (non-API routes), `components`, `hooks`, `public`.
- Backend and data: `app/api`, `lib`, `prisma`.

## Global Working Rules
- Follow existing style: TypeScript, double quotes, and no semicolons.
- Prefer small, focused changes that preserve current behavior.
- Avoid editing `.env` and `.env.local` unless explicitly requested.
- Do not add new dependencies without clear need and justification.
- Use the shared Prisma client from `lib/db.ts` instead of creating new ones.
- Keep server-only code out of client components.

## Validation
- Run `npm run lint` after meaningful changes when possible.
- If types are involved, prefer `npx tsc --noEmit` to catch regressions.

