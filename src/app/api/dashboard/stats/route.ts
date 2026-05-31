import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { db } from "@/lib/db";
import { subDays } from "date-fns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get("environmentId");
  const days = Number(searchParams.get("days") ?? 7);
  const since = subDays(new Date(), days);

  const where = {
    startedAt: { gte: since },
    ...(environmentId && { environmentId }),
  };

  const [totalRuns, passedRuns, failedRuns, runs, recentRuns] = await Promise.all([
    db.testRun.count({ where }),
    db.testRun.count({ where: { ...where, status: "passed" } }),
    db.testRun.count({
      where: { ...where, status: { in: ["failed", "timeout"] } },
    }),
    db.testRun.findMany({
      where,
      select: { startedAt: true, status: true, durationMs: true },
      orderBy: { startedAt: "asc" },
    }),
    db.testRun.findMany({
      where: { ...where, status: { in: ["failed", "timeout"] } },
      include: {
        test: { select: { name: true } },
        environment: { select: { name: true, color: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);

  const passRate = totalRuns > 0 ? (passedRuns / totalRuns) * 100 : 0;
  const avgDuration =
    runs.length > 0
      ? runs.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / runs.length
      : 0;

  const runsByDay: Record<string, { passed: number; failed: number; total: number }> = {};
  for (const run of runs) {
    const day = run.startedAt.toISOString().slice(0, 10);
    if (!runsByDay[day]) runsByDay[day] = { passed: 0, failed: 0, total: 0 };
    runsByDay[day].total++;
    if (run.status === "passed") runsByDay[day].passed++;
    else if (run.status === "failed" || run.status === "timeout") runsByDay[day].failed++;
  }

  const chartData = Object.entries(runsByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({ date, ...stats }));

  const testCount = await db.test.count();
  const environmentCount = await db.environment.count();

  return ok({
    totalRuns,
    passedRuns,
    failedRuns,
    passRate,
    avgDuration,
    testCount,
    environmentCount,
    chartData,
    recentFailures: recentRuns,
  });
}
