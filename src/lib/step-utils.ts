import type { HttpMethod } from "@/types";

export interface StepConfigWithMeta {
  name?: string;
  method?: HttpMethod;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
  assertions?: unknown[];
  captureVariables?: Record<string, string>;
  ms?: number;
  sharedStepId?: string;
}

export function getStepName(type: string, config: StepConfigWithMeta, index: number): string {
  if (config.name) return config.name;
  if (type === "http") return `${config.method ?? "GET"} request`;
  if (type === "assert") return "Assertions";
  if (type === "delay") return `Wait ${config.ms ?? 0}ms`;
  if (type === "shared_ref") return "Shared step";
  return `Step ${index + 1}`;
}

export const METHOD_COLORS: Record<string, string> = {
  GET: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  PATCH: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  HEAD: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  OPTIONS: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export type StepDraft = {
  id?: string;
  type: "http" | "assert" | "delay" | "shared_ref";
  config: StepConfigWithMeta;
};

export function normalizeStepsForSave(steps: StepDraft[]) {
  return steps.map((s, i) => ({
    type: s.type,
    sortOrder: i,
    config: s.config,
  }));
}

export function stepsFromApi(
  apiSteps: { id?: string; type: string; config: unknown }[]
): StepDraft[] {
  return apiSteps.map((s) => ({
    id: s.id,
    type: s.type as StepDraft["type"],
    config: (s.config as StepConfigWithMeta) ?? {},
  }));
}
