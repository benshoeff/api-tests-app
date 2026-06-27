import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, parseBody } from "@/lib/api-response";
import { runSingleStep } from "@/lib/executor/run-step";

const schema = z.object({
  environmentId: z.string().min(1),
  stepIndex: z.number().int().min(0),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = parseBody(schema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  try {
    const result = await runSingleStep(id, parsed.data.environmentId, parsed.data.stepIndex);
    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Step run failed";
    return fail("RUN_FAILED", message, 500);
  }
}
