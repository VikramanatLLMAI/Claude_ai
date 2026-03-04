---
phase: 05-super-admin-dashboard
plan: 01
subsystem: super-admin-routing
tags: [routing, schema, tanstack-table, super-admin, route-restructure]
dependency_graph:
  requires: []
  provides:
    - app/super-admin/* pages at new paths
    - app/api/super-admin/* API routes at new paths
    - PlatformSettings model in database
    - PlatformApiKeyAssignment junction table in database
    - TanStack Table installed
  affects:
    - All Phase 5 plans (depend on /super-admin/* paths)
    - proxy.ts (subdomain routing)
    - find-my-org.tsx (SA redirect)
    - components/admin/admin-sidebar.tsx (nav hrefs)
tech_stack:
  added:
    - "@tanstack/react-table (data table library)"
  patterns:
    - "Route restructure: mechanical move + find-replace pattern"
    - "Schema: junction table for many-to-many API key assignment"
    - "Schema: singleton model pattern for platform settings"
key_files:
  created:
    - app/super-admin/layout.tsx
    - app/super-admin/page.tsx
    - app/super-admin/login/page.tsx
    - app/super-admin/models/page.tsx
    - app/super-admin/[...catchAll]/page.tsx
    - app/api/super-admin/organizations/route.ts
    - app/api/super-admin/organizations/[id]/route.ts
    - app/api/super-admin/organizations/[id]/suspend/route.ts
    - app/api/super-admin/organizations/[id]/activate/route.ts
    - app/api/super-admin/organizations/[id]/restore/route.ts
    - app/api/super-admin/organizations/[id]/logo/route.ts
    - app/api/super-admin/super-admins/route.ts
    - app/api/super-admin/super-admins/[id]/route.ts
    - app/api/super-admin/models/route.ts
    - app/api/super-admin/models/[id]/route.ts
    - app/api/super-admin/role-templates/route.ts
    - app/api/super-admin/role-templates/[id]/route.ts
  modified:
    - prisma/schema.prisma (added PlatformSettings, PlatformApiKeyAssignment models)
    - proxy.ts (super-admin subdomain mapping)
    - lib/resolve-org.ts (isSuperAdminContext path check, PLATFORM_SUBDOMAINS set)
    - components/find-my-org.tsx (SA redirect to /super-admin and /super-admin/login)
    - components/admin/admin-sidebar.tsx (nav hrefs to /super-admin/*, sign-out redirect)
  deleted:
    - app/admin/* (all files)
    - app/api/admin/* (all files)
decisions:
  - "[05-01]: app/api/org/[slug]/admin/models/route.ts already calls getAllModels() directly via service layer -- no HTTP fetch to /api/admin/models, so no update needed"
  - "[05-01]: super-admin subdomain added to PLATFORM_SUBDOMAINS in resolve-org.ts alongside existing admin entry for backward compat"
  - "[05-01]: PlatformSettings uses id=singleton pattern -- only one row ever exists, query by primary key"
metrics:
  duration: "~15 min"
  completed: "2026-03-04T15:13:00Z"
  tasks_completed: 2
  files_changed: 23
---

# Phase 05 Plan 01: Route Restructure and Schema Foundation Summary

Route restructure moving all Super Admin functionality from `/admin/*` to `/super-admin/*`, install TanStack Table, and add new Prisma schema models for Phase 5 features.

## What Was Built

**Task 1: TanStack Table + Schema**
- Installed `@tanstack/react-table` (data table library used in subsequent Phase 5 plans)
- Added `PlatformSettings` singleton model to Prisma schema (platform-level configuration)
- Added `PlatformApiKeyAssignment` junction table (many-to-many between PlatformApiKey and Organization)
- Added `assignments` relation on `PlatformApiKey` and `apiKeyAssignments` back-relation on `Organization`
- Ran `prisma db push` and `prisma generate` to sync database and regenerate client

**Task 2: Route Restructure /admin/* to /super-admin/***
- Moved all 5 page files from `app/admin/` to `app/super-admin/` with updated path references
- Moved all 12 API route files from `app/api/admin/` to `app/api/super-admin/`
- Updated `proxy.ts`: `super-admin` subdomain now maps to `/super-admin/*` (was `admin` -> `/admin/*`)
- Updated `lib/resolve-org.ts`: `isSuperAdminContext` checks `/super-admin` path; `super-admin` added to `PLATFORM_SUBDOMAINS`
- Updated `components/find-my-org.tsx`: SA session redirects to `/super-admin`, find-org redirects to `/super-admin/login`
- Updated `components/admin/admin-sidebar.tsx`: all nav hrefs point to `/super-admin/*`, sign-out redirects to `/super-admin/login`
- Deleted old `app/admin/` and `app/api/admin/` directories entirely

## Verification

- TanStack Table importable: confirmed
- PlatformSettings and PlatformApiKeyAssignment in database: confirmed (db push succeeded)
- New files exist at `/super-admin/*` paths: confirmed
- Old `/admin/` directories removed: confirmed
- Zero straggler `/admin/` references (excluding org admin routes): confirmed
- `app/api/org/[slug]/admin/models/route.ts` already calls service layer directly, no HTTP fetch to update

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `app/super-admin/layout.tsx` exists
- [x] `app/super-admin/login/page.tsx` exists
- [x] `app/super-admin/models/page.tsx` exists
- [x] `app/api/super-admin/organizations/route.ts` exists
- [x] `app/api/super-admin/models/route.ts` exists
- [x] Commits 284d649 and 624acb2 exist in git log
- [x] `app/admin/` directory removed
- [x] Database in sync with schema (prisma db push succeeded)

## Self-Check: PASSED
