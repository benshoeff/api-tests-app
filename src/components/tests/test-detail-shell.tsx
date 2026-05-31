"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  GitBranch,
  LayoutList,
  Save,
  Play,
  Variable,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEnvironment } from "@/components/layout/environment-provider";

export type TestTab = "overview" | "steps" | "variables" | "runs" | "schedule";

const TABS: { id: TestTab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: GitBranch },
  { id: "steps", label: "Steps", icon: LayoutList },
  { id: "variables", label: "Variables", icon: Variable },
  { id: "runs", label: "Test Runs", icon: Clock },
  { id: "schedule", label: "Schedule", icon: Calendar },
];

export function TestDetailShell({
  testId,
  testName,
  stepCount,
  saving,
  running,
  onSave,
  onExecute,
  children,
}: {
  testId: string;
  testName: string;
  stepCount: number;
  saving?: boolean;
  running?: boolean;
  onSave?: () => void;
  onExecute?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TestTab) || "overview";
  const { activeEnvironment } = useEnvironment();

  const displayTitle = activeEnvironment
    ? `${testName} - ${activeEnvironment.name}`
    : testName;

  const setTab = (t: TestTab) => {
    router.push(`/tests/${testId}?tab=${t}`);
  };

  return (
    <div className="-m-6 flex min-h-[calc(100vh-3.5rem)] flex-col bg-muted/30">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/tests"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to tests"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">{displayTitle}</h1>
        </div>

        <nav className="mt-4 flex gap-1 border-b border-transparent">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === id
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === "steps" && stepCount > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    tab === id ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                  )}
                >
                  {stepCount}
                </span>
              )}
              {tab === id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-6">{children}</div>

      {(tab === "overview" || tab === "steps") && (onSave || onExecute) && (
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-4">
          {onSave && (
            <Button onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Test"}
            </Button>
          )}
          {onExecute && (
            <Button
              className="bg-success text-white hover:opacity-90"
              disabled={running || !activeEnvironment}
              onClick={onExecute}
            >
              <Play className="h-4 w-4 fill-current" />
              {running ? "Running…" : "Execute"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function useTestTab(): TestTab {
  const searchParams = useSearchParams();
  return (searchParams.get("tab") as TestTab) || "overview";
}
