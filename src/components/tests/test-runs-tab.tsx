"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Play, RefreshCw, XCircle } from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/badge";

interface RunItem {
  id: string;
  status: string;
  runType: string;
  startedAt: string;
  durationMs: number | null;
}

type StatusFilter = "all" | "passed" | "failed";
type TriggerFilter = "all" | "manual" | "scheduled";

export function TestRunsTab({ testId }: { testId: string }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");

  const params = new URLSearchParams({ testId, limit: "20" });
  if (statusFilter === "passed") params.set("status", "passed");
  if (statusFilter === "failed") params.set("status", "failed");

  const { data: runs, loading, refresh } = useFetch<RunItem[]>(
    `/api/runs?${params.toString()}`,
    [testId, statusFilter]
  );

  const filtered =
    runs?.filter((r) => {
      if (triggerFilter === "manual") return r.runType === "manual";
      if (triggerFilter === "scheduled") return r.runType === "scheduled";
      return true;
    }) ?? [];

  const pills = (
    items: { id: string; label: string }[],
    active: string,
    onSelect: (id: string) => void
  ) => (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            active === item.id
              ? "border-accent bg-accent text-white"
              : "border-border bg-card text-muted-foreground hover:border-accent/50"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Test Run History</h2>
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        {pills(
          [
            { id: "all", label: "All" },
            { id: "passed", label: "Passed" },
            { id: "failed", label: "Failed" },
          ],
          statusFilter,
          (id) => setStatusFilter(id as StatusFilter)
        )}
        <span className="hidden h-4 w-px bg-border sm:block" />
        {pills(
          [
            { id: "all", label: "All triggers" },
            { id: "manual", label: "Manually Triggered" },
            { id: "scheduled", label: "Scheduled" },
          ],
          triggerFilter,
          (id) => setTriggerFilter(id as TriggerFilter)
        )}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Showing {filtered.length} test run{filtered.length !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No runs" description="Execute this test to see run history." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Run Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => (
                <tr key={run.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/runs/${run.id}`} className="inline-flex items-center gap-1.5">
                      {run.status === "passed" ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <Badge status={run.status}>{run.status}</Badge>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/runs/${run.id}`}>
                      <p>{format(new Date(run.startedAt), "MMM d, hh:mm a")}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(run.startedAt), "M/d/yyyy, h:mm:ss a")}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDuration(run.durationMs)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 capitalize text-muted-foreground">
                      <Play className="h-3.5 w-3.5" />
                      {run.runType}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
