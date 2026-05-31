"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Plus, Trash2 } from "lucide-react";
import { useEnvironment } from "@/components/layout/environment-provider";
import { useFetch, apiPost, apiDelete } from "@/hooks/use-fetch";
import { PageHeader, Badge, EmptyState } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface TestItem {
  id: string;
  name: string;
  description: string | null;
  timeoutMs: number;
  tags: unknown;
  runs: { id: string; status: string; startedAt: string }[];
}

export default function TestsPage() {
  const router = useRouter();
  const { activeEnvironment } = useEnvironment();
  const url = activeEnvironment
    ? `/api/tests?environmentId=${activeEnvironment.id}`
    : "/api/tests";
  const { data: tests, loading, refresh } = useFetch<TestItem[]>(url, [activeEnvironment?.id]);
  const [running, setRunning] = useState<string | null>(null);

  const handleRun = async (testId: string) => {
    if (!activeEnvironment) return;
    setRunning(testId);
    const result = await apiPost(`/api/tests/${testId}/run`, {
      environmentId: activeEnvironment.id,
    });
    setRunning(null);
    if (result.data) {
      router.push(`/runs/${(result.data as { runId: string }).runId}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    await apiDelete(`/api/tests/${id}`);
    refresh();
  };

  return (
    <div>
      <PageHeader
        title="Tests"
        description={
          activeEnvironment
            ? `Showing tests for ${activeEnvironment.name}`
            : "All API tests"
        }
        actions={
          <Link href="/tests/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Test
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !tests?.length ? (
        <EmptyState
          title="No tests yet"
          description="Create your first API test to get started."
          action={
            <Link href="/tests/new">
              <Button>Create Test</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {tests.map((test) => {
            const lastRun = test.runs[0];
            return (
              <Card key={test.id} className="transition-colors hover:border-accent/30">
                <CardContent className="flex items-center justify-between py-4">
                  <Link href={`/tests/${test.id}`} className="flex-1">
                    <p className="font-medium">{test.name}</p>
                    {test.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{test.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {lastRun ? (
                        <Badge status={lastRun.status}>{lastRun.status}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never run</span>
                      )}
                      {lastRun && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(lastRun.startedAt), { addSuffix: true })}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Timeout: {test.timeoutMs / 1000}s
                      </span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!activeEnvironment || running === test.id}
                      onClick={() => handleRun(test.id)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      {running === test.id ? "Running…" : "Run"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(test.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
