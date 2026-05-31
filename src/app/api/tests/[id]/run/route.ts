import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { runTest } from "@/lib/executor/run-test";
import { runTestSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = parseBody(runTestSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  try {
    const result = await runTest(id, parsed.data.environmentId);
    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Test run failed";
    return fail("RUN_FAILED", message, 500);
  }
}
