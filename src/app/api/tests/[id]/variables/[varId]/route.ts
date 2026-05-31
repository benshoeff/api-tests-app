import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  key: z.string().min(1).optional(),
  value: z.string().optional(),
});

type Params = { params: Promise<{ id: string; varId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, varId } = await params;
  const body = await request.json();
  const parsed = parseBody(updateSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const variable = await db.testVariable.update({
    where: { id: varId, testId: id },
    data: {
      ...(parsed.data.key !== undefined && { key: parsed.data.key }),
      ...(parsed.data.value !== undefined && { value: parsed.data.value }),
    },
  });
  return ok(variable);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { varId } = await params;
  await db.testVariable.delete({ where: { id: varId } });
  return ok({ deleted: true });
}
