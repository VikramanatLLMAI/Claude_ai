# Technology Stack

**Analysis Date:** 2026-02-26

## Languages

**Primary:**
- TypeScript 5 - All source code (`.ts` and `.tsx` files)

**Secondary:**
- JavaScript/ES2017 - Configuration files (Next.js config, ESLint config, PostCSS config)

## Runtime

**Environment:**
- Node.js 20+ (specified in Dockerfile and package.json)

**Package Manager:**
- npm 10+ (package-lock.json present)
- Lockfile: Present (`package-lock.json`)

## Frameworks

**Core:**
- Next.js 16.1.4 - Full-stack framework with App Router
  - API routes (`app/api/`)
  - Server components
  - Streaming responses for chat

**UI Framework:**
- React 19.2.3 - Frontend component library
- Radix UI 1.x - Accessible component primitives
  - Avatar, Dialog, Dropdown Menu, Label, Scroll Area, Separator, Slot, Switch, Tooltip

**Styling:**
- TailwindCSS v4 - Utility-first CSS framework
- PostCSS - CSS preprocessing (via `@tailwindcss/postcss` plugin)
- tailwind-merge 2.6.0 - Merge Tailwind classes safely
- tailwindcss-animate 1.0.7 - Animation utilities
- class-variance-authority 0.7.1 - Component variant management

**AI/LLM:**
- Vercel AI SDK 6.0.97 - Streaming, provider abstraction
  - `@ai-sdk/anthropic` 3.0.46 - Anthropic provider for AI SDK
  - `@anthropic-ai/sdk` 0.78.0 - Direct Anthropic API client for Files API, containers, tools

**Database:**
- Prisma 7.3.0 - ORM and database toolkit
  - `@prisma/client` 7.3.0 - Client library
  - `@prisma/adapter-pg` 7.3.0 - PostgreSQL adapter
  - PostgreSQL - Relational database (`pg` 8.17.2 driver)

**Testing & Linting:**
- ESLint 9 - Code linting with Next.js config
- TypeScript strict mode - Type checking

**Build/Dev:**
- Node.js native modules - Crypto (`crypto`), filesystem operations

## Key Dependencies

**Critical:**
- `@ai-sdk/anthropic` 3.0.46 - Enables streaming chat with Claude models via Vercel AI SDK
- `@anthropic-ai/sdk` 0.78.0 - Required for Anthropic Files API, container skills, direct tool access
- `@prisma/adapter-pg` 7.3.0 - PostgreSQL connection pooling and query execution
- `pg` 8.17.2 - Native PostgreSQL driver for connection pool management

**Document Processing:**
- `mammoth` 1.11.0 - Convert DOCX to HTML
- `jszip` 3.10.1 - Read XLSX and ZIP-based formats
- `xlsx` 0.18.5 - Parse Excel spreadsheets (binary XLSX format)

**Content Rendering:**
- `react-markdown` 10.1.0 - Markdown parsing and rendering
- `react-syntax-highlighter` 15.6.1 - Code block syntax highlighting
- `mermaid` 11.12.3 - Diagram rendering (flowcharts, sequences, etc.)
- `katex` 0.16.11 - LaTeX math formula rendering
- `remark-gfm` 4.0.1 - GitHub Flavored Markdown support
- `remark-math` 6.0.0 - Math block parsing
- `rehype-katex` 7.0.1 - KaTeX integration with rehype

**Live Preview:**
- `@codesandbox/sandpack-react` 2.20.0 - Live React code editor and preview

**UI/UX:**
- `lucide-react` 0.473.0 - Icon library
- `motion` 12.29.2 - Animation library
- `react-resizable-panels` 4.5.3 - Resizable panel layouts
- `use-stick-to-bottom` 1.1.2 - Sticky scroll-to-bottom behavior
- `clsx` 2.1.1 - Conditional className builder

**Validation:**
- `zod` 4.3.6 - TypeScript-first schema validation and type inference

**Development:**
- `dotenv` 17.2.3 - Environment variable loading
- `@types/react` 19 - React type definitions
- `@types/react-dom` 19 - React DOM type definitions
- `@types/node` 20 - Node.js type definitions
- `@types/pg` 8.16.0 - PostgreSQL driver types
- `@types/react-syntax-highlighter` 15.5.13 - Syntax highlighter types

## Configuration

**Environment:**
- `.env` file with secrets (DATABASE_URL, ANTHROPIC_API_KEY, KEY_ENCRYPTION_SECRET)
- Environment variables injected at build/runtime

**Build:**
- `next.config.ts` - Next.js configuration (standalone output mode for Docker)
- `tsconfig.json` - TypeScript configuration with path aliases (`@/*` → root)
- `postcss.config.mjs` - PostCSS pipeline for TailwindCSS v4
- `eslint.config.mjs` - Linting rules (ESLint flat config format)
- `prisma.config.ts` - Prisma configuration

**Path Aliases:**
- `@/*` resolves to project root (enables `@/components`, `@/lib`, etc.)

## Platform Requirements

**Development:**
- Node.js 20+
- npm 10+
- PostgreSQL 12+ (local or remote)
- 64-character hex encryption key (KEY_ENCRYPTION_SECRET)

**Production:**
- Node.js 20+ (Alpine Linux in Docker)
- PostgreSQL 12+ (AWS RDS or similar)
- ANTHROPIC_API_KEY secret
- DATABASE_URL secret
- KEY_ENCRYPTION_SECRET (32 bytes = 64 hex chars)

**Docker:**
- Multi-stage build (dependencies, builder, final runtime)
- Alpine Linux 20 image (`node:20-alpine`)
- Standalone Next.js output for minimal image size

---

*Stack analysis: 2026-02-26*
