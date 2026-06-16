import { compareValues, evaluateJsonPathAssertion } from "@/lib/assertion-utils";
import { db } from "@/lib/db";
import type {
  AssertStepConfig,
  Assertion,
  DelayStepConfig,
  ExpandedStep,
  HttpStepConfig,
  SharedRefStepConfig,
  StepConfig,
  StepType,
} from "@/types";

const MAX_SHARED_DEPTH = 5;

export async function expandTestSteps(testId: string): Promise<ExpandedStep[]> {
  const steps = await db.testStep.findMany({
    where: { testId },
    orderBy: { sortOrder: "asc" },
  });

  const expanded: ExpandedStep[] = [];
  for (const step of steps) {
    if (step.type === "shared_ref") {
      const config = step.config as unknown as SharedRefStepConfig;
      const shared = await expandSharedStep(config.sharedStepId, new Set(), 0);
      expanded.push(...shared);
    } else {
      expanded.push({
        type: step.type as StepType,
        config: step.config as unknown as StepConfig,
        source: "test",
      });
    }
  }
  return expanded;
}

async function expandSharedStep(
  sharedStepId: string,
  visited: Set<string>,
  depth: number
): Promise<ExpandedStep[]> {
  if (depth >= MAX_SHARED_DEPTH) {
    throw new Error("Shared step nesting exceeds maximum depth");
  }
  if (visited.has(sharedStepId)) {
    throw new Error("Circular shared step reference detected");
  }
  visited.add(sharedStepId);

  const items = await db.sharedStepItem.findMany({
    where: { sharedStepId },
    orderBy: { sortOrder: "asc" },
  });

  const expanded: ExpandedStep[] = [];
  for (const item of items) {
    expanded.push({
      type: item.type as StepType,
      config: item.config as unknown as StepConfig,
      source: "shared",
    });
  }
  return expanded;
}

export function evaluateAssertions(
  assertions: Assertion[],
  context: {
    status: number;
    headers: Record<string, string>;
    body: string;
    durationMs: number;
    parsedBody: unknown;
  }
): { passed: boolean; results: Assertion[] } {
  const results: Assertion[] = assertions.map((a) => {
    let actual: string | number = "";
    let passed = false;

    switch (a.type) {
      case "status":
        actual = context.status;
        passed = context.status === Number(a.expected);
        break;
      case "header": {
        actual = context.headers[a.target?.toLowerCase() ?? ""] ?? "";
        passed = compareValues(String(actual), String(a.expected), a.operator ?? "is");
        break;
      }
      case "jsonPath": {
        const result = evaluateJsonPathAssertion(context.parsedBody, a);
        actual = result.actual;
        passed = result.passed;
        break;
      }
      case "contains": {
        const op = a.operator ?? "contains";
        actual = context.body;
        passed = compareValues(context.body, String(a.expected), op);
        break;
      }
      case "responseTime":
        actual = context.durationMs;
        passed = context.durationMs <= Number(a.expected);
        break;
    }

    return { ...a, actual, passed };
  });

  return { passed: results.every((r) => r.passed), results };
}

export type { HttpStepConfig, AssertStepConfig, DelayStepConfig };
