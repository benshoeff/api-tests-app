"use client";

import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useFetch } from "@/hooks/use-fetch";
import { PageHeader, Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import type { Assertion } from "@/types";
import { ResponseBodyViewer } from "@/components/ui/json-viewer";
import { AssertionResultList } from "@/components/runs/assertion-result";

interface StepResult {
  id: string;
  stepIndex: number;
  stepType: string;
  status: string;
  durationMs: number | null;
  request: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string;
  } | null;
  response: {
    status?: number;
    headers?: Record<string, string>;
    body?: string;
    truncated?: boolean;
  } | null;
  assertions: unknown;
  errorMessage: string | null;
}

interface RunDetail {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  test: { id: string; name: string };
  environment: { id: string; name: string };
  stepResults: StepResult[];
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: run, loading } = useFetch<RunDetail>(`/api/runs/${id}`, [id]);

  const handleAssert = (testId: string, stepIndex: number, path: string, value: unknown) => {
    const params = new URLSearchParams({
      tab: "steps",
      assertPath: path,
      assertValue: String(value),
      assertStep: String(stepIndex),
    });
    router.push(`/tests/${testId}?${params.toString()}`);
  };

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
                  <summary className="cursor-pointer text-muted-foreground">
                    Request {step.request.method} {step.request.url}
                  </summary>
                  <div className="mt-2 space-y-2">
                    {step.request.headers && Object.keys(step.request.headers).length > 0 && (
                      <div className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">
                        {Object.entries(step.request.headers).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-violet-500">{k}</span>: {v}
                          </div>
                        ))}
                      </div>
                    )}
                    {step.request.body && (
                      <ResponseBodyViewer
                        body={step.request.body}
                        onAssert={(path, value) =>
                          handleAssert(run.test.id, step.stepIndex, path, value)
                        }
                      />
                    )}
                  </div>
                </details>
              )}

              {step.response != null && (
                <details className="text-xs" open>
                  <summary className="cursor-pointer text-muted-foreground">
                    Response {step.response.status}
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="overflow-x-auto rounded-lg bg-muted/30 p-3 font-mono text-xs">
                      {step.response.headers && Object.entries(step.response.headers).slice(0, 10).map(([k, v]) => (
                        <div key={k} className="text-muted-foreground">
                          <span className="text-violet-500">{k}</span>: {v}
                        </div>
                      ))}
                      {step.response.headers && Object.keys(step.response.headers).length > 10 && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          +{Object.keys(step.response.headers).length - 10} more headers
                        </p>
                      )}
                    </div>

                    {step.response.body != null && (
                      <ResponseBodyViewer
                        body={step.response.body}
                        truncated={step.response.truncated}
                        onAssert={(path, value) =>
                          handleAssert(run.test.id, step.stepIndex, path, value)
                        }
                      />
                    )}
                  </div>
                </details>
              )}

              {step.assertions != null && Array.isArray(step.assertions) && (
                <details className="text-xs" open>
                  <summary className="cursor-pointer text-muted-foreground">
                    Assertions ({(step.assertions as Assertion[]).filter((a) => a.passed).length}/{step.assertions.length} passed)
                  </summary>
                  <div className="mt-2">
                    <AssertionResultList assertions={step.assertions as Assertion[]} />
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
