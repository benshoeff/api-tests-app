import type { Assertion } from "@/types";
import { cn } from "@/lib/utils";

const OP_LABELS: Record<string, string> = {
  is: "is",
  is_not: "is not",
  contains: "contains",
  not_contains: "does not contain",
  gt: ">",
  lt: "<",
  regex: "matches",
  not_regex: "does not match",
  undefined: "is undefined",
  is_not_empty: "is not empty",
};

const TYPE_LABELS: Record<string, string> = {
  status: "Status",
  header: "Header",
  jsonPath: "JSON Path",
  contains: "Body",
  responseTime: "Response Time",
};

function formatOp(a: Assertion): string {
  const op = a.operator ?? (a.type === "responseTime" ? "lt" : "is");
  return OP_LABELS[op] ?? op;
}

function formatTarget(a: Assertion): string {
  if (a.type === "header") return a.target ?? "";
  if (a.type === "jsonPath") return a.target ?? "$.";
  return "";
}

export function AssertionResultItem({
  assertion,
}: {
  assertion: Assertion;
}) {
  const passed = assertion.passed ?? false;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs",
        passed
          ? "border-green-500/20 bg-green-500/5"
          : "border-red-500/20 bg-red-500/5"
      )}
    >
      <span className="mt-0.5 shrink-0 text-sm leading-none">
        {passed ? (
          <span className="text-green-600 dark:text-green-400">PASS</span>
        ) : (
          <span className="text-red-600 dark:text-red-400">FAIL</span>
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium">
          <span className="text-muted-foreground">
            {TYPE_LABELS[assertion.type] ?? assertion.type}
          </span>
          {formatTarget(assertion) && (
            <span className="text-violet-500 dark:text-violet-400">
              {formatTarget(assertion)}
            </span>
          )}
          <span className="text-muted-foreground">{formatOp(assertion)}</span>
          <span className="font-mono text-foreground">
            {String(assertion.expected)}
          </span>
          {assertion.elementSelector && assertion.elementSelector !== "body" && (
            <span className="rounded-md bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
              {assertion.elementSelector}
            </span>
          )}
        </div>

        {assertion.actual !== undefined && (
          <div className="flex items-baseline gap-1.5 text-muted-foreground">
            <span>Actual:</span>
            <span className={cn("font-mono", passed ? "text-foreground" : "text-red-600 dark:text-red-400")}>
              {String(assertion.actual)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function AssertionResultList({
  assertions,
}: {
  assertions: Assertion[];
}) {
  return (
    <div className="space-y-1.5">
      {assertions.map((a, i) => (
        <AssertionResultItem key={i} assertion={a} />
      ))}
    </div>
  );
}
