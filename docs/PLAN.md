# API Tests App — Product & Architecture Plan

> **Language:** English UI · **Deployment:** Local-first · **Stack:** Next.js full-stack + Prisma + SQLite

---

## 1. Vision

A modern, local-first API testing platform (2026 UX) that lets developers define tests once, reuse steps across tests, parameterize requests with environment-scoped variables, and track run history through a clean dashboard.

Inspired by tools like Postman Collections + Insomnia + lightweight CI runners — but focused on **structured test suites**, **shared steps**, and **environment-aware execution**.

---

## 2. Core Features (MVP → V1)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Tests CRUD** | Create, edit, duplicate, delete API tests | P0 |
| **Unlimited steps** | Each test has ordered steps (HTTP, assert, delay, shared-step ref) | P0 |
| **Timeout per test** | Configurable max runtime (ms) with hard stop | P0 |
| **Environments CRUD** | Named environments (Dev, Staging, Prod, …) | P0 |
| **Global variables** | Key/value pairs with **per-environment overrides** | P0 |
| **Shared steps** | Reusable step groups referenced by multiple tests | P0 |
| **Environment filter** | Global env selector filters tests, vars, and run context | P0 |
| **Run execution** | Run single test, suite, or all visible tests | P0 |
| **Run results** | Per-step request/response, assertions, timing, status | P0 |
| **Dashboard** | Pass/fail trends, recent runs, env breakdown | P1 |
| **Import/Export** | JSON export of tests, envs, vars (V1.1) | P2 |

---

## 3. Data Model

```
Workspace (single local workspace in MVP)
├── Environment
│   ├── id, name, slug, color, isDefault, sortOrder
│   └── baseUrl (optional default host prefix)
├── GlobalVariable
│   ├── id, key, description, isSecret
│   └── EnvironmentValue (envId + value) — one row per env override
├── SharedStep
│   ├── id, name, description
│   └── SharedStepItem[] (ordered steps, same schema as TestStep)
├── Test
│   ├── id, name, description, timeoutMs, tags[]
│   ├── environmentIds[] (empty = all environments)
│   └── TestStep[] (ordered)
│       ├── type: http | assert | delay | shared_ref
│       └── config JSON (method, url, headers, body, assertions…)
└── TestRun
    ├── id, testId, environmentId, status, startedAt, finishedAt, durationMs
    └── StepResult[]
        ├── stepIndex, status, request/response snapshot, assertion results
        └── errorMessage, durationMs
```

### Variable resolution order (highest wins)

1. Step-local variables (if defined on a step)
2. Test-level variables (optional, V1.1)
3. Global variable value for **active environment**
4. Built-in: `{{env.baseUrl}}`, `{{env.name}}`, `{{run.id}}`

Syntax: `{{variableName}}` in URL, headers, body, and assertion values.

---

## 4. Step Types

| Type | Purpose |
|------|---------|
| **HTTP** | Send request (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS). Capture response to named variables. |
| **Assert** | JSON path / status code / header / body contains / response time checks |
| **Delay** | Wait N ms between steps |
| **Shared ref** | Inline-expand a SharedStep group at runtime |

---

## 5. Application Structure

```
api-tests-app/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Shell + env selector
│   │   ├── page.tsx            # Dashboard
│   │   ├── tests/
│   │   │   ├── page.tsx        # Test list (env-filtered)
│   │   │   ├── [id]/page.tsx   # Test editor
│   │   │   └── new/page.tsx
│   │   ├── shared-steps/
│   │   ├── environments/
│   │   ├── variables/
│   │   ├── runs/
│   │   │   └── [id]/page.tsx   # Run detail
│   │   └── api/                # Route handlers
│   ├── components/
│   │   ├── ui/                 # shadcn primitives
│   │   ├── layout/             # Sidebar, top bar, env picker
│   │   ├── tests/              # Step builder, run panel
│   │   └── dashboard/          # Charts, stats
│   ├── lib/
│   │   ├── db.ts               # Prisma client
│   │   ├── executor/           # Test run engine
│   │   ├── variables.ts        # {{var}} interpolation
│   │   └── validators/         # Zod schemas
│   └── types/
├── docs/
└── .cursor/
    ├── rules/
    └── skills/
```

---

## 6. UI / UX — 2026 Design Language

### Layout

- **Left sidebar:** Dashboard, Tests, Shared Steps, Variables, Environments, Run History
- **Top bar:** Active environment pill (color-coded), global search, Run All (filtered)
- **Content:** Generous whitespace, 14px base, 8px grid

### Visual system

- **Framework:** Tailwind CSS 4 + shadcn/ui (New York variant)
- **Theme:** System light/dark with subtle borders, no heavy shadows
- **Typography:** Geist Sans + Geist Mono for request bodies
- **Colors:** Neutral zinc base; environment colors as accent chips (blue/green/amber/violet)
- **Motion:** 150ms transitions; skeleton loaders; optimistic UI on CRUD

### Key screens

1. **Dashboard** — stat cards (total runs, pass rate 7d, avg duration), line chart of runs over time, recent failures table
2. **Tests list** — env filter tabs, status badges, last run, quick-run button
3. **Test editor** — split view: step list (drag-reorder) + step detail panel; timeout field in header; "Run" sticky footer
4. **Shared steps** — same step builder, usage count ("used in 3 tests")
5. **Variables** — matrix table: Variable × Environment columns
6. **Environments** — card grid with color picker, base URL, delete guard if in use
7. **Run detail** — timeline of steps, expandable request/response, assertion pass/fail

---

## 7. Execution Engine

```
RunTest(testId, environmentId)
  1. Load test + steps + shared step refs
  2. Build variable context from GlobalVariable × EnvironmentValue
  3. Start timeout timer (AbortController)
  4. For each step (sequential):
     a. Resolve variables in step config
     b. Execute step type
     c. Store StepResult
     d. Stop on first failure (configurable later: continue on fail)
  5. Persist TestRun + StepResults
  6. Return summary
```

- Runs execute **server-side** via API route (Node fetch)
- Secrets masked in UI; stored in SQLite locally
- Concurrent runs: queue with max 3 parallel (V1.1)

---

## 8. API Routes (REST)

| Method | Path | Action |
|--------|------|--------|
| GET/POST | `/api/environments` | List / create |
| GET/PATCH/DELETE | `/api/environments/[id]` | Read / update / delete |
| GET/POST | `/api/variables` | List / create |
| GET/PATCH/DELETE | `/api/variables/[id]` | CRUD + env values |
| GET/POST | `/api/shared-steps` | List / create |
| GET/PATCH/DELETE | `/api/shared-steps/[id]` | CRUD |
| GET/POST | `/api/tests` | List (query: `?environmentId=`) / create |
| GET/PATCH/DELETE | `/api/tests/[id]` | CRUD |
| POST | `/api/tests/[id]/run` | Execute test |
| GET | `/api/runs` | List runs (filters: env, test, status, date) |
| GET | `/api/runs/[id]` | Run detail |
| GET | `/api/dashboard/stats` | Aggregated metrics |

---

## 9. Implementation Phases

### Phase 0 — Scaffold (Week 1)
- [ ] Next.js 15 + TypeScript + Tailwind + shadcn init
- [ ] Prisma + SQLite schema + seed (2 envs, sample test)
- [ ] App shell (sidebar, env selector, theme toggle)

### Phase 1 — Core CRUD (Week 2)
- [ ] Environments CRUD
- [ ] Global variables with env matrix
- [ ] Tests + step builder (HTTP + assert)
- [ ] Shared steps

### Phase 2 — Execution (Week 3)
- [ ] Variable interpolation engine
- [ ] Test runner + timeout
- [ ] Run results storage + detail view

### Phase 3 — Dashboard & Polish (Week 4)
- [ ] Dashboard charts and filters
- [ ] Environment filter on test list
- [ ] Drag-reorder steps, duplicate test, empty states
- [ ] Error handling, loading states, keyboard shortcuts

---

## 10. Non-Goals (MVP)

- Multi-user auth / cloud sync
- OAuth flows in test steps
- GraphQL-specific UI (HTTP body is enough)
- CI/CD integration (future: export + CLI)

---

## 11. Open Questions

- [ ] Continue on step failure vs stop on first failure? → **Default: stop on first failure**
- [ ] Should tests without `environmentIds` show in all envs? → **Yes**
- [ ] Max response body stored in DB? → **256 KB per step, truncate with flag**

---

## 12. Reference Screens

> Add screenshots to `docs/reference/` when available. The UI should align with:
> - Clean list + detail patterns (Linear-style)
> - Environment switcher always visible (Vercel-style)
> - Step builder similar to Insomnia/Bruno request chains
