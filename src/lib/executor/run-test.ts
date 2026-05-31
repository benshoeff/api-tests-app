import { db } from "@/lib/db";
import {
  buildVariableContext,
  extractJsonPath,
  interpolate,
  interpolateRecord,
  redactSecrets,
  type VariableContext,
} from "@/lib/variables";
import { truncate } from "@/lib/utils";
import { expandTestSteps, evaluateAssertions } from "@/lib/executor/expand-steps";
import type {
  AssertStepConfig,
  DelayStepConfig,
  HttpStepConfig,
  RunStatus,
  StepResultStatus,
} from "@/types";

const MAX_BODY = 256000;

export interface RunTestResult {
  runId: string;
  status: RunStatus;
  durationMs: number;
  stepResults: {
    stepIndex: number;
    stepType: string;
    status: StepResultStatus;
    durationMs: number;
    request?: unknown;
    response?: unknown;
    assertions?: unknown;
    errorMessage?: string;
  }[];
}

export async function runTest(
  testId: string,
  environmentId: string
): Promise<RunTestResult> {
  const test = await db.test.findUnique({ where: { id: testId } });
  if (!test) throw new Error("Test not found");

  const environment = await db.environment.findUnique({ where: { id: environmentId } });
  if (!environment) throw new Error("Environment not found");

  const globalVars = await db.globalVariable.findMany({
    include: { values: { where: { environmentId } } },
  });

  const testVars = await db.testVariable.findMany({ where: { testId } });

  const globalValues: Record<string, string> = {};
  const secretKeys = new Set<string>();
  for (const v of globalVars) {
    const envVal = v.values[0]?.value ?? "";
    globalValues[v.key] = envVal;
    if (v.isSecret) secretKeys.add(v.key);
  }
  for (const v of testVars) {
    globalValues[v.key] = v.value;
  }

  const run = await db.testRun.create({
    data: {
      testId,
      environmentId,
      status: "running",
    },
  });

  const startTime = Date.now();
  const timeoutMs = test.timeoutMs ?? 30000;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  const ctx: VariableContext = buildVariableContext({
    environment,
    runId: run.id,
    globalValues,
    secretKeys,
  });

  let lastResponse: {
    status: number;
    headers: Record<string, string>;
    body: string;
    parsedBody: unknown;
    durationMs: number;
  } | null = null;

  const stepResults: RunTestResult["stepResults"] = [];
  let finalStatus: RunStatus = "passed";

  try {
    const steps = await expandTestSteps(testId);

    for (let i = 0; i < steps.length; i++) {
      if (abortController.signal.aborted) {
        finalStatus = "timeout";
        break;
      }

      const step = steps[i];
      const stepStart = Date.now();

      try {
        if (step.type === "delay") {
          const config = step.config as DelayStepConfig;
          await sleep(Math.min(config.ms, 60000));
          stepResults.push({
            stepIndex: i,
            stepType: step.type,
            status: "passed",
            durationMs: Date.now() - stepStart,
          });
          continue;
        }

        if (step.type === "http") {
          const config = step.config as HttpStepConfig & {
            assertions?: import("@/types").Assertion[];
          };
          const url = resolveUrl(interpolate(config.url, ctx), environment.baseUrl);
          const headers = interpolateRecord(config.headers, ctx);
          const body = config.body ? interpolate(config.body, ctx) : undefined;

          const reqStart = Date.now();
          const response = await fetch(url, {
            method: config.method ?? "GET",
            headers,
            body: body && config.method !== "GET" && config.method !== "HEAD" ? body : undefined,
            signal: abortController.signal,
          });

          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((v, k) => {
            responseHeaders[k.toLowerCase()] = v;
          });

          const rawBody = await response.text();
          const { text: bodyText, truncated } = truncate(rawBody, MAX_BODY);
          let parsedBody: unknown = null;
          try {
            parsedBody = JSON.parse(bodyText);
          } catch {
            parsedBody = bodyText;
          }

          const durationMs = Date.now() - reqStart;
          lastResponse = {
            status: response.status,
            headers: responseHeaders,
            body: bodyText,
            parsedBody,
            durationMs,
          };

          if (config.captureVariables) {
            for (const [varName, jsonPath] of Object.entries(config.captureVariables)) {
              const val = extractJsonPath(parsedBody, jsonPath);
              if (val != null) ctx[varName] = String(val);
            }
          }

          stepResults.push({
            stepIndex: i,
            stepType: step.type,
            status: "passed",
            durationMs: Date.now() - stepStart,
            request: redactSecrets(
              { method: config.method, url, headers, body },
              secretKeys
            ),
            response: redactSecrets(
              { status: response.status, headers: responseHeaders, body: bodyText, truncated },
              secretKeys
            ),
          });

          if (config.assertions?.length) {
            const { passed, results } = evaluateAssertions(config.assertions, lastResponse);
            if (!passed) {
              stepResults.push({
                stepIndex: i,
                stepType: "assert",
                status: "failed",
                durationMs: 0,
                assertions: results,
                errorMessage: "Inline assertions failed",
              });
              finalStatus = "failed";
              break;
            }
          }
          continue;
        }

        if (step.type === "assert") {
          const config = step.config as AssertStepConfig;
          if (!lastResponse) {
            throw new Error("Assert step requires a prior HTTP response");
          }

          const { passed, results } = evaluateAssertions(config.assertions, lastResponse);

          stepResults.push({
            stepIndex: i,
            stepType: step.type,
            status: passed ? "passed" : "failed",
            durationMs: Date.now() - stepStart,
            assertions: results,
            errorMessage: passed ? undefined : "One or more assertions failed",
          });

          if (!passed) {
            finalStatus = "failed";
            break;
          }
          continue;
        }

        stepResults.push({
          stepIndex: i,
          stepType: step.type,
          status: "skipped",
          durationMs: Date.now() - stepStart,
          errorMessage: `Unknown step type: ${step.type}`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Step execution failed";
        const isTimeout = abortController.signal.aborted;
        stepResults.push({
          stepIndex: i,
          stepType: step.type,
          status: isTimeout ? "error" : "failed",
          durationMs: Date.now() - stepStart,
          errorMessage: message,
        });
        finalStatus = isTimeout ? "timeout" : "failed";
        break;
      }
    }

    if (abortController.signal.aborted && finalStatus !== "failed") {
      finalStatus = "timeout";
    }
  } catch {
    finalStatus = "failed";
  } finally {
    clearTimeout(timeoutId);
  }

  const durationMs = Date.now() - startTime;

  await db.stepResult.createMany({
    data: stepResults.map((sr) => ({
      runId: run.id,
      stepIndex: sr.stepIndex,
      stepType: sr.stepType,
      status: sr.status,
      durationMs: sr.durationMs,
      request: sr.request ?? undefined,
      response: sr.response ?? undefined,
      assertions: sr.assertions ?? undefined,
      errorMessage: sr.errorMessage ?? undefined,
    })),
  });

  await db.testRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      finishedAt: new Date(),
      durationMs,
    },
  });

  return { runId: run.id, status: finalStatus, durationMs, stepResults };
}

function resolveUrl(url: string, baseUrl: string | null): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (baseUrl) {
    const base = baseUrl.replace(/\/$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${base}${path}`;
  }
  return url;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
