export type VariableContext = Record<string, string>;

const VAR_PATTERN = /\{\{([^}]+)\}\}/g;

export function interpolate(template: string, context: VariableContext): string {
  return template.replace(VAR_PATTERN, (_, key: string) => {
    const trimmed = key.trim();
    return context[trimmed] ?? `{{${trimmed}}}`;
  });
}

export function interpolateRecord(
  record: Record<string, string> | undefined,
  context: VariableContext
): Record<string, string> {
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).map(([k, v]) => [k, interpolate(v, context)])
  );
}

export function extractJsonPath(obj: unknown, path: string): unknown {
  if (!path.startsWith("$")) return undefined;
  
  let current: unknown = obj;
  let remainingPath = path.slice(1);

  if (remainingPath.startsWith(".")) {
    remainingPath = remainingPath.slice(1);
  }

  const parts = remainingPath.split(".");
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    const bracketMatch = part.match(/^\[(\d+)\]$/);
    if (bracketMatch) {
      const index = parseInt(bracketMatch[1], 10);
      if (!Array.isArray(current)) return undefined;
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }
  return current;
}

import { generateRandomValues } from "@/lib/random";

export function buildVariableContext(params: {
  environment: { name: string; baseUrl: string | null };
  runId: string;
  globalValues: Record<string, string>;
  local?: Record<string, string>;
  secretKeys?: Set<string>;
}): VariableContext {
  const ctx: VariableContext = {
    "env.name": params.environment.name,
    "env.baseUrl": params.environment.baseUrl ?? "",
    "run.id": params.runId,
    ...params.globalValues,
    ...generateRandomValues(),
    ...(params.local ?? {}),
  };
  return ctx;
}

export function redactSecrets(
  obj: unknown,
  secretKeys: Set<string>
): unknown {
  if (typeof obj === "string") {
    for (const key of secretKeys) {
      if (obj.includes(key)) return "[REDACTED]";
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map((v) => redactSecrets(v, secretKeys));
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k,
        secretKeys.has(k) ? "[REDACTED]" : redactSecrets(v, secretKeys),
      ])
    );
  }
  return obj;
}
