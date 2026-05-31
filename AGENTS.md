# API Tests App — Agent Guide

This file defines how Cursor agents should work on this repository.

## Project summary

Local-first API testing app. English UI. Next.js 15 (App Router) + TypeScript + Prisma + SQLite + shadcn/ui.

Read [docs/PLAN.md](docs/PLAN.md) before making architectural decisions.

## Agent roles

Use the role that matches the task. Combine roles when a feature spans layers.

### 1. Architect Agent

**When:** New features, schema changes, cross-cutting concerns.

**Responsibilities:**
- Keep data model aligned with `docs/PLAN.md`
- Prefer minimal, incremental schema migrations
- Document breaking changes in `docs/`

**Constraints:**
- Local-first: no auth, no external DB in MVP
- Single workspace; no multi-tenancy

---

### 2. Backend Agent

**When:** API routes, Prisma, test execution engine, variable interpolation.

**Responsibilities:**
- Implement route handlers under `src/app/api/`
- Zod validation on all inputs
- Executor in `src/lib/executor/`
- Variable resolver in `src/lib/variables.ts`

**Conventions:**
- Return `{ data }` on success, `{ error: { code, message } }` on failure
- Use Prisma transactions for multi-table writes
- Never log secret variable values

**Key files:**
- `prisma/schema.prisma`
- `src/lib/db.ts`
- `src/lib/executor/run-test.ts`

---

### 3. Frontend Agent

**When:** Pages, components, forms, dashboard, UX polish.

**Responsibilities:**
- App Router pages under `src/app/`
- Reusable components under `src/components/`
- Environment selector in root layout (global context)
- 2026 UX: clean, minimal, accessible

**Conventions:**
- shadcn/ui for primitives; extend, don't fork
- TanStack Query for server state
- React Hook Form + Zod for forms
- English copy only in UI strings

**Design tokens:**
- Geist font family
- 8px spacing grid
- Environment colors as pills, not page backgrounds

---

### 4. Test Runner Agent

**When:** Execution logic, assertions, timeouts, shared step expansion.

**Responsibilities:**
- Sequential step execution with abort on timeout
- HTTP via native `fetch`
- Assertion types: status, header, jsonPath, contains, responseTime
- Expand `shared_ref` steps before execution

**Rules:**
- Resolve `{{variables}}` before each step
- Persist full request/response snapshots (truncate bodies > 256KB)
- Mark run `failed` on first step failure (MVP)

---

### 5. QA / Review Agent

**When:** Before merging significant features.

**Checklist:**
- [ ] CRUD works for affected entity
- [ ] Environment filter respected
- [ ] Variables interpolate correctly per env
- [ ] Run produces persisted StepResults
- [ ] No secrets in client bundles or logs
- [ ] Loading and error states present

---

## Workflow for new features

1. Read `docs/PLAN.md` — confirm feature fits phase
2. **Architect:** schema change if needed → migrate
3. **Backend:** API + lib logic
4. **Frontend:** UI wired to API
5. **QA:** manual test path documented in PR

## Commands

```bash
npm run dev          # Start dev server
npm run db:migrate   # Prisma migrate dev
npm run db:seed      # Seed sample data
npm run db:studio    # Prisma Studio
npm run lint         # ESLint
npm run build        # Production build
```

## Skills (project)

| Skill | Use when |
|-------|----------|
| `api-tests-domain` | Domain models, variable syntax, step types |
| `test-execution` | Building or debugging the run engine |

## Rules (project)

| Rule | Scope |
|------|-------|
| `project-core.mdc` | Always |
| `frontend-ui.mdc` | `**/*.tsx` |
| `backend-api.mdc` | `src/app/api/**`, `src/lib/**` |
