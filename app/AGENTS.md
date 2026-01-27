# Athena MCP - Frontend Guide

## Scope
These instructions apply to the `app` tree except where a deeper
`AGENTS.md` (such as `app/api/AGENTS.md`) overrides them.

## Frontend Priorities
- Prefer Server Components by default.
- Add `"use client"` only when you need state, effects, or browser APIs.
- Keep pages thin and move reusable UI into `components`.
- Use semantic, accessible HTML and predictable loading and error states.

## Styling Conventions
- Tailwind utilities are preferred.
- When merging class names, use `cn` from `lib/utils.ts`.
- Reuse existing patterns from nearby routes and components.

## Data and Boundaries
- Fetch data on the server when possible.
- Do not import Prisma or server-only modules into client components.
- Keep props serializable when passing from server to client components.

## Safe Change Checklist
- Preserve route structure and segment conventions.
- Avoid breaking layout contracts in `app/layout.tsx`.
- Update only what is necessary for the requested behavior.

