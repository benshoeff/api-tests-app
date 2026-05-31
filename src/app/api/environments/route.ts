import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { db } from "@/lib/db";
import { environmentSchema } from "@/lib/validators/schemas";
import { slugify } from "@/lib/utils";

export async function GET() {
  const environments = await db.environment.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return ok(environments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = parseBody(environmentSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const { name, slug, baseUrl, color, isDefault, sortOrder } = parsed.data;
  const finalSlug = slug ?? slugify(name);

  const existing = await db.environment.findUnique({ where: { slug: finalSlug } });
  if (existing) return fail("CONFLICT", "Environment slug already exists", 409);

  if (isDefault) {
    await db.environment.updateMany({ data: { isDefault: false } });
  }

  const environment = await db.environment.create({
    data: {
      name,
      slug: finalSlug,
      baseUrl: baseUrl ?? null,
      color: color ?? "blue",
      isDefault: isDefault ?? false,
      sortOrder: sortOrder ?? 0,
    },
  });

  return ok(environment, 201);
}
