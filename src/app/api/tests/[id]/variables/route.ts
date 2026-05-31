import { NextRequest } from "next/server";
import { ok, fail, parseBody } from "@/lib/api-response";
import { db } from "@/lib/db";
import { z } from "zod";

const variableSchema = z.object({
  key: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  value: z.string(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const variables = await db.testVariable.findMany({
    where: { testId: id },
    orderBy: { key: "asc" },
  });
  return ok(variables);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = parseBody(variableSchema, body);
  if (!parsed.ok) return fail("VALIDATION", parsed.message);

  const existing = await db.testVariable.findUnique({
    where: { testId_key: { testId: id, key: parsed.data.key } },
  });
  if (existing) return fail("CONFLICT", "Variable key already exists", 409);

  const variable = await db.testVariable.create({
    data: { testId: id, key: parsed.data.key, value: parsed.data.value },
  });
  return ok(variable, 201);
}
