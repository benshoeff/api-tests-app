import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { db } from "@/lib/db";
import { testUpdateSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const test = await db.test.findUnique({
    where: { id },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!test) return fail("NOT_FOUND", "Test not found", 404);
  return ok(test);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await db.test.findUnique({ where: { id } });
  if (!existing) return fail("NOT_FOUND", "Test not found", 404);

  const body = await request.json();
  const parsed = parseBody(testUpdateSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const { name, description, timeoutMs, environmentIds, tags, steps } = parsed.data;

  if (steps) {
    await db.testStep.deleteMany({ where: { testId: id } });
    await db.testStep.createMany({
      data: steps.map((step, i) => ({
        testId: id,
        sortOrder: step.sortOrder ?? i,
        type: step.type,
        config: step.config as Prisma.InputJsonValue,
      })),
    });
  }

  const test = await db.test.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(timeoutMs !== undefined && { timeoutMs }),
      ...(environmentIds !== undefined && { environmentIds }),
      ...(tags !== undefined && { tags }),
    },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });

  return ok(test);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await db.test.findUnique({ where: { id } });
  if (!existing) return fail("NOT_FOUND", "Test not found", 404);

  await db.test.delete({ where: { id } });
  return ok({ deleted: true });
}
