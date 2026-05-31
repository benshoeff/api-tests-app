import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { db } from "@/lib/db";
import { variableUpdateSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const variable = await db.globalVariable.findUnique({
    where: { id },
    include: { values: true },
  });
  if (!variable) return fail("NOT_FOUND", "Variable not found", 404);
  return ok(variable);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await db.globalVariable.findUnique({ where: { id } });
  if (!existing) return fail("NOT_FOUND", "Variable not found", 404);

  const body = await request.json();
  const parsed = parseBody(variableUpdateSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const { key, description, isSecret, values } = parsed.data;

  if (key && key !== existing.key) {
    const dup = await db.globalVariable.findUnique({ where: { key } });
    if (dup) return fail("CONFLICT", "Variable key already exists", 409);
  }

  if (values) {
    await db.environmentValue.deleteMany({ where: { variableId: id } });
    await db.environmentValue.createMany({
      data: values.map((v) => ({ variableId: id, environmentId: v.environmentId, value: v.value })),
    });
  }

  const variable = await db.globalVariable.update({
    where: { id },
    data: {
      ...(key !== undefined && { key }),
      ...(description !== undefined && { description }),
      ...(isSecret !== undefined && { isSecret }),
    },
    include: { values: true },
  });

  return ok(variable);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await db.globalVariable.findUnique({ where: { id } });
  if (!existing) return fail("NOT_FOUND", "Variable not found", 404);

  await db.globalVariable.delete({ where: { id } });
  return ok({ deleted: true });
}
