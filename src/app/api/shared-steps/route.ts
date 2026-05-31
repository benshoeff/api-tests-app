import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { db } from "@/lib/db";
import { sharedStepSchema } from "@/lib/validators/schemas";

export async function GET() {
  const sharedSteps = await db.sharedStep.findMany({
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  return ok(sharedSteps);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = parseBody(sharedStepSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const { name, description, items } = parsed.data;

  const sharedStep = await db.sharedStep.create({
    data: {
      name,
      description: description ?? null,
      items: items?.length
        ? {
            create: items.map((item, i) => ({
              sortOrder: item.sortOrder ?? i,
              type: item.type,
              config: item.config as Prisma.InputJsonValue,
            })),
          }
        : undefined,
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return ok(sharedStep, 201);
}
