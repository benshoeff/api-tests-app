import { db } from "@/lib/db";
import {
  buildVariableContext,
  interpolate,
  interpolateRecord,
  redactSecrets,
  type VariableContext,
} from "@/lib/variables";
import { truncate } from "@/lib/utils";
import { evaluateAssertions, expandTestSteps } from "@/lib/executor/expand-steps";
import type { HttpStepConfig, StepResultStatus } from "@/types";

const MAX_BODY = 256000;

export interface SingleStepResult {
  stepIndex: number;
  stepType: string;
  status: StepResultStatus;
  durationMs: number;
  request?: unknown;
  response?: unknown;
  assertions?: unknown;
  errorMessage?: string;
}

export async function runSingleStep(
  testId: string,
  environmentId: string,
  stepIndex: number
): Promise<SingleStepResult> {
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

  const ctx: VariableContext = buildVariableContext({
    environment,
    runId: "step-run",
    globalValues,
    secretKeys,
  });

  // Expand all steps and pick the one at stepIndex
  const allSteps = await expandTestSteps(testId);
  const step = allSteps[stepIndex];
  if (!step) throw new Error(`Step ${stepIndex} not found`);

  const stepStart = Date.now();

  try {
    if (step.type === "delay") {
      const ms = Math.min((step.config as { ms?: number }).ms ?? 1000, 60000);
      await new Promise((r) => setTimeout(r, ms));
      return {
        stepIndex,
        stepType: step.type,
        status: "passed",
        durationMs: Date.now() - stepStart,
      };
    }

    if (step.type === "http") {
      const config = step.config as HttpStepConfig;
      const url = resolveUrl(interpolate(config.url, ctx), environment.baseUrl);
      const headers: Record<string, string> = interpolateRecord(config.headers, ctx);
      const body = config.body ? interpolate(config.body, ctx) : undefined;

      const finalBody = body && config.method !== "GET" && config.method !== "HEAD" ? body : undefined;
      if (finalBody && !headers["content-type"]) {
        const trimmed = finalBody.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          headers["content-type"] = "application/json";
        }
      }

      const response = await fetch(url, {
        method: config.method ?? "GET",
        headers,
        body: finalBody,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => {
        responseHeaders[k.toLowerCase()] = v;
      });

      const rawBody = await response.text();
      const { text: bodyText } = truncate(rawBody, MAX_BODY);

      const durationMs = Date.now() - stepStart;

      const requestSnapshot = redactSecrets(
        { method: config.method, url, headers, body },
        secretKeys
      );
      const responseSnapshot = redactSecrets(
        { status: response.status, headers: responseHeaders, body: bodyText },
        secretKeys
      );

      if (config.assertions?.length) {
        let parsedBody: unknown = null;
        try {
          parsedBody = JSON.parse(bodyText);
        } catch {
          parsedBody = bodyText;
        }

        const { passed, results } = evaluateAssertions(config.assertions, {
          status: response.status,
          headers: responseHeaders,
          body: bodyText,
          parsedBody,
          durationMs,
        }, ctx);

        return {
          stepIndex,
          stepType: step.type,
          status: passed ? "passed" : "failed",
          durationMs,
          request: requestSnapshot,
          response: responseSnapshot,
          assertions: results,
          errorMessage: passed ? undefined : "Inline assertions failed",
        };
      }

      return {
        stepIndex,
        stepType: step.type,
        status: "passed",
        durationMs,
        request: requestSnapshot,
        response: responseSnapshot,
      };
    }

    if (step.type === "assert") {
      return {
        stepIndex,
        stepType: step.type,
        status: "error",
        durationMs: Date.now() - stepStart,
        errorMessage: "Assert steps cannot be run in isolation. Run the full test.",
      };
    }

    return {
      stepIndex,
      stepType: step.type,
      status: "error",
      durationMs: Date.now() - stepStart,
      errorMessage: `Cannot run ${step.type} steps in isolation`,
    };
  } catch (err) {
    return {
      stepIndex,
      stepType: step.type,
      status: "failed",
      durationMs: Date.now() - stepStart,
      errorMessage: err instanceof Error ? err.message : "Step execution failed",
    };
  }
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
