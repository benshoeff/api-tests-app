export type StepType = "http" | "assert" | "delay" | "shared_ref";

export type RunStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "timeout"
  | "cancelled";

export type StepResultStatus = "passed" | "failed" | "skipped" | "error";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface HttpStepConfig {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  captureVariables?: Record<string, string>;
  assertions?: Assertion[];
}

export type AssertionOperator =
  | "is"
  | "is_not"
  | "contains"
  | "not_contains"
  | "gt"
  | "lt"
  | "regex"
  | "not_regex"
  | "undefined"
  | "is_not_empty";

export type ElementSelector = "body" | "any" | "first" | "every";

export interface Assertion {
  type: "status" | "header" | "jsonPath" | "contains" | "responseTime";
  target?: string;
  expected: string | number;
  operator?: AssertionOperator;
  elementSelector?: ElementSelector;
  actual?: string | number;
  passed?: boolean;
}

export interface AssertStepConfig {
  assertions: Assertion[];
}

export interface DelayStepConfig {
  ms: number;
}

export interface SharedRefStepConfig {
  sharedStepId: string;
}

export type StepConfig =
  | HttpStepConfig
  | AssertStepConfig
  | DelayStepConfig
  | SharedRefStepConfig;

export interface ExpandedStep {
  type: StepType;
  config: StepConfig;
  source?: "test" | "shared";
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export const ENV_COLORS = [
  "blue",
  "green",
  "amber",
  "violet",
  "red",
  "pink",
  "cyan",
] as const;

export type EnvColor = (typeof ENV_COLORS)[number];

export const ENV_COLOR_CLASSES: Record<
  EnvColor,
  { bg: string; text: string; dot: string }
> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  green: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", dot: "bg-green-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  red: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", dot: "bg-pink-500" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500" },
};
