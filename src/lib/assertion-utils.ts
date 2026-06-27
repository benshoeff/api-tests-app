import { extractJsonPath } from "@/lib/variables";
import type { Assertion } from "@/types";

export type UiAssertionType = "status" | "body" | "bodyValue" | "header" | "responseTime";

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

export const UI_ASSERTION_TYPES: { value: UiAssertionType; label: string }[] = [
  { value: "status", label: "Status Code" },
  { value: "body", label: "Body" },
  { value: "bodyValue", label: "Body Value" },
  { value: "header", label: "Header" },
  { value: "responseTime", label: "Response Time" },
];

export const OPERATORS: { value: AssertionOperator; label: string }[] = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "gt", label: "is greater than" },
  { value: "lt", label: "is less than" },
  { value: "regex", label: "matches regex" },
  { value: "not_regex", label: "does not match regex" },
  { value: "undefined", label: "is undefined" },
  { value: "is_not_empty", label: "is not empty" },
];

export const ELEMENT_SELECTORS: { value: ElementSelector; label: string }[] = [
  { value: "body", label: "body" },
  { value: "any", label: "at least one element" },
  { value: "first", label: "first element" },
  { value: "every", label: "every element" },
];

export const DYNAMIC_FUNCTIONS = [
  "{{env.name}}",
  "{{env.baseUrl}}",
  "{{run.id}}",
  "{{$timestamp}}",
  "{{$isoTimestamp}}",
  "{{$randomEmail}}",
  "{{$randomUserName}}",
  "{{$randomName}}",
  "{{$randomFirstName}}",
  "{{$randomLastName}}",
  "{{$randomPhone}}",
  "{{$randomUUID}}",
  "{{$randomInt}}",
  "{{$randomBoolean}}",
  "{{$randomWord}}",
];

export function toUiType(assertion: Assertion): UiAssertionType {
  switch (assertion.type) {
    case "status":
      return "status";
    case "responseTime":
      return "responseTime";
    case "header":
      return "header";
    case "jsonPath":
      return "bodyValue";
    case "contains":
      return "body";
    default:
      return "status";
  }
}

export function defaultAssertion(uiType: UiAssertionType): Assertion {
  switch (uiType) {
    case "status":
      return { type: "status", expected: 200, operator: "is" };
    case "body":
      return { type: "contains", expected: "", operator: "contains" };
    case "bodyValue":
      return {
        type: "jsonPath",
        target: "$.data.id",
        expected: "",
        operator: "is",
        elementSelector: "body",
      };
    case "header":
      return { type: "header", target: "content-type", expected: "application/json", operator: "is" };
    case "responseTime":
      return { type: "responseTime", expected: 1000, operator: "lt" };
  }
}

export function normalizeAssertion(raw: unknown): Assertion {
  const a = raw as Assertion;
  const uiType = toUiType(a);
  const base = defaultAssertion(uiType);
  return {
    ...base,
    ...a,
    operator: a.operator ?? base.operator,
    elementSelector: a.elementSelector ?? base.elementSelector,
  };
}

export function formatAssertionSummary(assertion: Assertion): string {
  const uiType = toUiType(assertion);
  const op = OPERATORS.find((o) => o.value === (assertion.operator ?? "is"))?.label ?? "is";
  const expected = String(assertion.expected);
  const isEmptyOp = assertion.operator === "is_not_empty";

  switch (uiType) {
    case "status":
      return `Status code is ${expected}`;
    case "responseTime":
      return `Response time is less than ${expected}ms`;
    case "header":
      return isEmptyOp
        ? `Header "${assertion.target ?? ""}" ${op}`
        : `Header "${assertion.target ?? ""}" ${op} ${quote(expected)}`;
    case "bodyValue": {
      const selector = assertion.elementSelector ?? "body";
      const selectorLabel =
        ELEMENT_SELECTORS.find((s) => s.value === selector)?.label ?? selector;
      return isEmptyOp
        ? `${assertion.target ?? "$."} (${selectorLabel}) ${op}`
        : `${assertion.target ?? "$."} (${selectorLabel}) ${op} ${quote(expected)}`;
    }
    case "body":
      return isEmptyOp ? `Body ${op}` : `Body ${op} ${quote(expected)}`;
  }
}

function quote(value: string): string {
  if (value.length > 40) return `"${value.slice(0, 37)}…"`;
  return value ? `"${value}"` : '""';
}

export function compareValues(
  actual: string,
  expected: string,
  operator: AssertionOperator
): boolean {
  switch (operator) {
    case "is":
      return actual === expected;
    case "is_not":
      return actual !== expected;
    case "contains":
      return actual.includes(expected);
    case "not_contains":
      return !actual.includes(expected);
    case "gt":
      return Number(actual) > Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "regex":
      try {
        return new RegExp(expected).test(actual);
      } catch {
        return false;
      }
    case "not_regex":
      try {
        return !new RegExp(expected).test(actual);
      } catch {
        return true;
      }
    case "undefined":
      return actual === "" || actual === "undefined" || actual === "null";
    case "is_not_empty":
      return actual !== "" && actual !== "undefined" && actual !== "null";
  }
}

export function resolveJsonPathValues(
  parsedBody: unknown,
  path: string,
  elementSelector: ElementSelector
): string[] {
  const val = extractJsonPath(parsedBody, path);

  if (val == null) return [""];

  switch (elementSelector) {
    case "first":
      if (Array.isArray(val)) return [val.length ? String(val[0]) : ""];
      return [String(val)];
    case "any":
    case "every":
      if (Array.isArray(val)) return val.map((v) => (v == null ? "" : String(v)));
      return [String(val)];
    case "body":
    default:
      return [val == null ? "" : String(val)];
  }
}

export function evaluateJsonPathAssertion(
  parsedBody: unknown,
  assertion: Assertion
): { actual: string; passed: boolean } {
  const selector = assertion.elementSelector ?? "body";
  const operator = assertion.operator ?? "is";
  const expected = String(assertion.expected);
  const values = resolveJsonPathValues(parsedBody, assertion.target ?? "$.", selector);

  if (selector === "any") {
    const passed = values.some((v) => compareValues(v, expected, operator));
    return { actual: values.join(", "), passed };
  }
  if (selector === "every") {
    const passed = values.length > 0 && values.every((v) => compareValues(v, expected, operator));
    return { actual: values.join(", "), passed };
  }

  const actual = values[0] ?? "";
  return { actual, passed: compareValues(actual, expected, operator) };
}
