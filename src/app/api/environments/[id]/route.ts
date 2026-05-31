import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { db } from "@/lib/db";
import { environmentUpdateSchema } from "@/lib/validators/schemas";
import { slugify } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const environment = await db.environment.findUnique({ where: { id } });
  if (!environment) return fail("NOT_FOUND", "Environment not found", 404);
  return ok(environment);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await db.environment.findUnique({ where: { id } });
  if (!existing) return fail("NOT_FOUND", "Environment not found", 404);

  const body = await request.json();
  const parsed = parseBody(environmentUpdateSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const data = parsed.data;
  if (data.isDefault) {
    await db.environment.updateMany({ data: { isDefault: false } });
  }

  const environment = await db.environment.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.name !== undefined && data.slug === undefined && { slug: slugify(data.name) }),
      ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  return ok(environment);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await db.environment.findUnique({ where: { id } });
  if (!existing) return fail("NOT_FOUND", "Environment not found", 404);

  const runCount = await db.testRun.count({ where: { environmentId: id } });
  if (runCount > 0) {
    return fail("CONFLICT", "Cannot delete environment with existing test runs", 409);
  }

  await db.environment.delete({ where: { id } });
  return ok({ deleted: true });
}
