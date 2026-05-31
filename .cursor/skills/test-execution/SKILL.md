---
name: test-execution
description: Implements and debugs the API test execution engine — sequential runs, timeouts, HTTP steps, assertions, shared step expansion, and result persistence. Use when working on src/lib/executor/, run API routes, or StepResult storage.
---

# Test Execution Engine

## Entry point

`runTest({ testId, environmentId })` in `src/lib/executor/run-test.ts`

## Execution flow

```
1. Load test + steps (expand shared_ref inline, preserve order)
2. Build VariableContext from GlobalVariable × EnvironmentValue + env metadata
3. Create TestRun (status: running)
4. Set timeout via AbortSignal (test.timeoutMs)
5. For each step sequentially:
   a. Interpolate config strings with VariableContext
   b. Execute by type
   c. Update context from captureVariables (HTTP steps)
   d. Write StepResult
   e. On failure → mark run failed, stop
6. Mark run passed if all steps pass
7. Handle timeout → status timeout, abort in-flight fetch
```

## HTTP step execution

- Use `fetch()` with resolved URL (prepend `env.baseUrl` if URL is relative)
- Store: method, url, headers, body (request) + status, headers, body (response)
- Truncate response body at 256KB; set `truncated: true` on StepResult

## Shared step expansion

- `shared_ref` steps are replaced with SharedStep items **before** the run loop
- Nested shared refs: expand recursively (max depth 5)
- Circular refs: detect via visited set, throw validation error

## Variable capture (HTTP)

```json
{ "captureVariables": { "authToken": "$.access_token" } }
```

After response, extract via JSONPath and merge into VariableContext for subsequent steps.

## Timeout

- Default: 30_000 ms if test.timeoutMs not set
- Use `AbortController` linked to step fetch and global timer
- On timeout: cancel fetch, set run status `timeout`, record partial StepResults

## Persistence

- Always persist TestRun even on failure
- StepResult stores JSON snapshots, not live references
- Never persist resolved secret values in snapshots — use `[REDACTED]`

## API route

`POST /api/tests/[id]/run` body: `{ environmentId: string }`

Returns: `{ data: { runId, status, durationMs, stepResults } }`
