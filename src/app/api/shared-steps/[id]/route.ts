import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { db } from "@/lib/db";
import { sharedStepUpdateSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sharedStep = await db.sharedStep.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!sharedStep) return fail("NOT_FOUND", "Shared step not found", 404);
  return ok(sharedStep);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await db.sharedStep.findUnique({ where: { id } });
  if (!existing) return fail("NOT_FOUND", "Shared step not found", 404);

  const body = await request.json();
  const parsed = parseBody(sharedStepUpdateSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const { name, description, items } = parsed.data;

  if (items) {
    await db.sharedStepItem.deleteMany({ where: { sharedStepId: id } });
    await db.sharedStepItem.createMany({
      data: items.map((item, i) => ({
        sharedStepId: id,
        sortOrder: item.sortOrder ?? i,
        type: item.type,
        config: item.config as Prisma.InputJsonValue,
      })),
    });
  }

  const sharedStep = await db.sharedStep.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return ok(sharedStep);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await db.sharedStep.findUnique({ where: { id } });
  if (!existing) return fail("NOT_FOUND", "Shared step not found", 404);

  await db.sharedStep.delete({ where: { id } });
  return ok({ deleted: true });
}
