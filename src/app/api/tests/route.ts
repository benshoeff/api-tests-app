import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { db } from "@/lib/db";
import { testSchema } from "@/lib/validators/schemas";
import { parseJsonArray } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get("environmentId");

  const tests = await db.test.findMany({
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      runs: {
        take: 1,
        orderBy: { startedAt: "desc" },
        include: { environment: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const filtered = environmentId
    ? tests.filter((t) => {
        const envIds = parseJsonArray(t.environmentIds);
        return envIds.length === 0 || envIds.includes(environmentId);
      })
    : tests;

  return ok(filtered);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = parseBody(testSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const { name, description, timeoutMs, environmentIds, tags, steps } = parsed.data;

  const test = await db.test.create({
    data: {
      name,
      description: description ?? null,
      timeoutMs: timeoutMs ?? 30000,
      environmentIds: environmentIds ?? [],
      tags: tags ?? [],
      steps: steps?.length
        ? {
            create: steps.map((step, i) => ({
              sortOrder: step.sortOrder ?? i,
              type: step.type,
              config: step.config as Prisma.InputJsonValue,
            })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });

  return ok(test, 201);
}
