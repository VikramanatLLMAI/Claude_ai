# Athena MCP - Backend Guide

## Scope
These instructions apply to route handlers under `app/api`.

## API Design Rules
- Treat each route handler as the public contract for that endpoint.
- Parse input carefully and validate it before running business logic.
- Return explicit status codes and consistent JSON response shapes.
- Prefer early returns for invalid input and missing resources.

## Validation and Safety
- Use `zod` for request validation where practical.
- Avoid returning raw error objects or sensitive details to clients.
- Log server-side errors in a minimal, safe way.

## Data Access
- Use the shared Prisma client from `lib/db.ts`.
- Keep Prisma calls close to the handler unless a clear abstraction exists.
- Avoid unbounded queries; use filters, pagination, or limits when needed.

## Next.js Route Handler Notes
- Prefer `NextResponse.json(...)` for structured responses.
- Keep handlers side-effect aware and idempotent when possible.
- Do not import client-only modules into route handlers.

