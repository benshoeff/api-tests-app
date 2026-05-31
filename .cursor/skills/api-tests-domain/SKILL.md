---
name: api-tests-domain
description: Domain knowledge for the API Tests App — entities, variable interpolation, step types, environment scoping, and data model. Use when implementing or discussing tests, environments, global variables, shared steps, or run results in this project.
---

# API Tests Domain

## Entities

| Entity | Purpose |
|--------|---------|
| `Environment` | Named target (Dev, Staging). Has optional `baseUrl`, color, sort order. |
| `GlobalVariable` | Named value with per-environment overrides via `EnvironmentValue`. |
| `SharedStep` | Reusable ordered step group referenced by tests. |
| `Test` | Named suite with `timeoutMs`, optional `environmentIds` filter, ordered steps. |
| `TestRun` | One execution of a test in one environment. |
| `StepResult` | Outcome of a single step within a run. |

## Environment filtering

- Global UI env selector sets **active environment**.
- Tests with empty `environmentIds` → visible in all environments.
- Tests with specific `environmentIds` → only visible when active env matches.
- Runs always execute against the **selected environment**.

## Variable syntax

- Pattern: `{{variableName}}`
- Resolution order: step-local → global env value → built-ins (`{{env.baseUrl}}`, `{{env.name}}`)
- Secrets: `isSecret=true` → mask in UI, never log resolved value.

## Step types

```typescript
type StepType = 'http' | 'assert' | 'delay' | 'shared_ref';

// http: { method, url, headers, body, captureVariables?: Record<string, jsonPath> }
// assert: { assertions: Assertion[] }
// delay: { ms: number }
// shared_ref: { sharedStepId: string }
```

## Assertion types (MVP)

- `status` — expected HTTP status code
- `header` — header name + expected value
- `jsonPath` — JSONPath + expected value
- `contains` — body substring
- `responseTime` — max ms

## Status enums

- TestRun: `pending` | `running` | `passed` | `failed` | `timeout` | `cancelled`
- StepResult: `passed` | `failed` | `skipped` | `error`

## Reference

Full plan: [docs/PLAN.md](../../../docs/PLAN.md)
