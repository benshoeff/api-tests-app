"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useEnvironment } from "@/components/layout/environment-provider";
import { useFetch } from "@/hooks/use-fetch";
import { PageHeader, Badge, EmptyState } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";

interface RunItem {
  id: string;
  status: string;
  startedAt: string;
  durationMs: number | null;
  test: { id: string; name: string };
  environment: { name: string; color: string };
}

export default function RunsPage() {
  const { activeEnvironment } = useEnvironment();
  const url = activeEnvironment
    ? `/api/runs?environmentId=${activeEnvironment.id}`
    : "/api/runs";
  const { data: runs, loading } = useFetch<RunItem[]>(url, [activeEnvironment?.id]);

  return (
    <div>
      <PageHeader
        title="Run History"
        description={
          activeEnvironment
            ? `Runs in ${activeEnvironment.name}`
            : "All test runs"
        }
      />

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !runs?.length ? (
        <EmptyState title="No runs yet" description="Run a test to see results here." />
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <Link key={run.id} href={`/runs/${run.id}`}>
              <Card className="transition-colors hover:border-accent/30">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{run.test.name}</p>
                    <p className="text-xs text-muted-foreground">{run.environment.name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <Badge status={run.status}>{run.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(run.durationMs)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
