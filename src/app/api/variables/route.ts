import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { db } from "@/lib/db";
import { variableSchema } from "@/lib/validators/schemas";

export async function GET() {
  const variables = await db.globalVariable.findMany({
    include: {
      values: { include: { environment: true } },
    },
    orderBy: { key: "asc" },
  });
  return ok(variables);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = parseBody(variableSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const { key, description, isSecret, values } = parsed.data;

  const existing = await db.globalVariable.findUnique({ where: { key } });
  if (existing) return fail("CONFLICT", "Variable key already exists", 409);

  const variable = await db.globalVariable.create({
    data: {
      key,
      description: description ?? null,
      isSecret: isSecret ?? false,
      values: values?.length
        ? { create: values.map((v) => ({ environmentId: v.environmentId, value: v.value })) }
        : undefined,
    },
    include: { values: true },
  });

  return ok(variable, 201);
}
