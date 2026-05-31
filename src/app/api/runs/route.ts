import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get("environmentId");
  const testId = searchParams.get("testId");
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const runs = await db.testRun.findMany({
    where: {
      ...(environmentId && { environmentId }),
      ...(testId && { testId }),
      ...(status === "failed" && { status: { in: ["failed", "timeout"] } }),
      ...(status && status !== "failed" && { status }),
    },
    include: {
      test: { select: { id: true, name: true } },
      environment: { select: { id: true, name: true, color: true } },
      stepResults: { orderBy: { stepIndex: "asc" } },
    },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return ok(runs);
}
