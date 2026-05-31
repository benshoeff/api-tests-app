import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api-response";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const run = await db.testRun.findUnique({
    where: { id },
    include: {
      test: true,
      environment: true,
      stepResults: { orderBy: { stepIndex: "asc" } },
    },
  });
  if (!run) return fail("NOT_FOUND", "Run not found", 404);
  return ok(run);
}
