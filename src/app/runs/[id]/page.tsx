"use client";

import { useParams } from "next/navigation";
import { format } from "date-fns";
import { useFetch } from "@/hooks/use-fetch";
import { PageHeader, Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";

interface StepResult {
  id: string;
  stepIndex: number;
  stepType: string;
  status: string;
  durationMs: number | null;
  request: unknown;
  response: unknown;
  assertions: unknown;
  errorMessage: string | null;
}

interface RunDetail {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  test: { name: string };
  environment: { name: string };
  stepResults: StepResult[];
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: run, loading } = useFetch<RunDetail>(`/api/runs/${id}`, [id]);

  if (loading || !run) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={run.test.name}
        description={`${run.environment.name} · ${format(new Date(run.startedAt), "PPpp")}`}
        actions={<Badge status={run.status}>{run.status}</Badge>}
      />

      <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
        <span>Duration: {formatDuration(run.durationMs)}</span>
        <span>{run.stepResults.length} steps</span>
      </div>

      <div className="space-y-3">
        {run.stepResults.map((step) => (
          <Card key={step.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">
                Step {step.stepIndex + 1} · {step.stepType}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatDuration(step.durationMs)}
                </span>
                <Badge status={step.status}>{step.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {step.errorMessage && (
                <p className="text-sm text-destructive">{step.errorMessage}</p>
              )}
              {step.request != null && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Request</summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono">
                    {JSON.stringify(step.request, null, 2)}
                  </pre>
                </details>
              )}
              {step.response != null && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Response</summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono">
                    {JSON.stringify(step.response, null, 2)}
                  </pre>
                </details>
              )}
              {step.assertions != null && (
                <details className="text-xs" open>
                  <summary className="cursor-pointer text-muted-foreground">Assertions</summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono">
                    {JSON.stringify(step.assertions, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
