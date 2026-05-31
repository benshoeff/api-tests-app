"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useEnvironment } from "@/components/layout/environment-provider";
import { useFetch } from "@/hooks/use-fetch";
import { PageHeader } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatPercent } from "@/lib/utils";
import { Activity, CheckCircle2, Clock, FlaskConical, XCircle } from "lucide-react";

interface DashboardStats {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  passRate: number;
  avgDuration: number;
  testCount: number;
  environmentCount: number;
  chartData: { date: string; passed: number; failed: number; total: number }[];
  recentFailures: {
    id: string;
    status: string;
    startedAt: string;
    test: { name: string };
    environment: { name: string; color: string };
  }[];
}

export default function DashboardPage() {
  const { activeEnvironment } = useEnvironment();
  const url = activeEnvironment
    ? `/api/dashboard/stats?environmentId=${activeEnvironment.id}`
    : "/api/dashboard/stats";
  const { data, loading } = useFetch<DashboardStats>(url, [activeEnvironment?.id]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" description="Test run analytics and overview" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const maxTotal = Math.max(...data.chartData.map((d) => d.total), 1);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          activeEnvironment
            ? `Overview for ${activeEnvironment.name} · last 7 days`
            : "Overview · last 7 days"
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-4 w-4 text-accent" />}
          label="Total Runs"
          value={String(data.totalRuns)}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          label="Pass Rate"
          value={formatPercent(data.passRate)}
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          label="Avg Duration"
          value={formatDuration(data.avgDuration)}
        />
        <StatCard
          icon={<FlaskConical className="h-4 w-4 text-muted-foreground" />}
          label="Tests"
          value={String(data.testCount)}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Runs over time</CardTitle>
          </CardHeader>
          <CardContent>
            {data.chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No runs yet</p>
            ) : (
              <div className="flex h-40 items-end gap-2">
                {data.chartData.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-col justify-end gap-0.5" style={{ height: 120 }}>
                      <div
                        className="w-full rounded-t bg-success/70"
                        style={{ height: `${(d.passed / maxTotal) * 100}%`, minHeight: d.passed ? 4 : 0 }}
                      />
                      <div
                        className="w-full rounded-t bg-destructive/70"
                        style={{ height: `${(d.failed / maxTotal) * 100}%`, minHeight: d.failed ? 4 : 0 }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success" /> Passed
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-destructive" /> Failed
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent failures</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentFailures.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No failures — looking good!</p>
            ) : (
              <ul className="space-y-3">
                {data.recentFailures.map((run) => (
                  <li key={run.id}>
                    <Link
                      href={`/runs/${run.id}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <div>
                          <p className="text-sm font-medium">{run.test.name}</p>
                          <p className="text-xs text-muted-foreground">{run.environment.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge status={run.status}>{run.status}</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
