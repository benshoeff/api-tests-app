import { NextResponse } from "next/server";
import type { ApiError } from "@/types";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(code: string, message: string, status = 400) {
  const error: ApiError = { code, message };
  return NextResponse.json({ error }, { status });
}

export function parseBody<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } }, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error?.issues.map((i) => i.message).join(", ") ?? "Validation failed";
    return { ok: false as const, message };
  }
  return { ok: true as const, data: result.data as T };
}
