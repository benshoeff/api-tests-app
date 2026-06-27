"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEnvironment } from "@/components/layout/environment-provider";
import { useFetch, apiPatch, apiPost } from "@/hooks/use-fetch";
import { TestDetailShell, useTestTab } from "@/components/tests/test-detail-shell";
import { TestOverviewTab } from "@/components/tests/test-overview-tab";
import { SplitStepEditor } from "@/components/tests/split-step-editor";
import { TestVariablesTab } from "@/components/tests/test-variables-tab";
import { TestRunsTab } from "@/components/tests/test-runs-tab";
import { TestScheduleTab } from "@/components/tests/test-schedule-tab";
import { normalizeStepsForSave, stepsFromApi, type StepDraft } from "@/lib/step-utils";
import type { Assertion } from "@/types";

interface TestDetail {
  id: string;
  name: string;
  description: string | null;
  timeoutMs: number;
  steps: { id: string; type: string; config: unknown }[];
}

function TestEditorContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const tab = useTestTab();
  const searchParams = useSearchParams();
  const { activeEnvironment } = useEnvironment();
  const { data: test, loading, refresh } = useFetch<TestDetail>(`/api/tests/${id}`, [id]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(30000);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assertProps = useMemo(() => {
    const ap = searchParams.get("assertPath");
    const av = searchParams.get("assertValue");
    const as = searchParams.get("assertStep");
    if (ap && av && as !== null) {
      return { path: ap, value: av, stepIndex: Number(as) };
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    if (test) {
      setName(test.name);
      setDescription(test.description ?? "");
      setTimeoutMs(test.timeoutMs);
      let loaded = stepsFromApi(test.steps);

      if (assertProps) {
        const { path, value, stepIndex } = assertProps;
        const target = loaded[stepIndex];
        if (target) {
          const newAssertion: Assertion = {
            type: "jsonPath",
            target: path,
            expected: value,
            operator: "is",
            elementSelector: "body",
          };
          const existing = Array.isArray(target.config.assertions) ? target.config.assertions : [];
          loaded = loaded.map((s, i) =>
            i === stepIndex
              ? { ...s, config: { ...s.config, assertions: [...existing, newAssertion] } }
              : s
          );

          apiPatch(`/api/tests/${id}`, {
            name: test.name,
            description: test.description,
            timeoutMs: test.timeoutMs,
            steps: loaded.map((s, i) => ({ type: s.type, sortOrder: i, config: s.config })),
          });

          const params = new URLSearchParams(searchParams.toString());
          params.delete("assertPath");
          params.delete("assertValue");
          params.delete("assertStep");
          router.replace(`/tests/${id}?${params.toString()}`, { scroll: false });
        }
      }

      setSteps(loaded);
    }
  }, [test, assertProps, id, router, searchParams]);

  const saveTest = async () => {
    setSaving(true);
    setError(null);
    const result = await apiPatch(`/api/tests/${id}`, {
      name,
      description: description || null,
      timeoutMs,
      steps: normalizeStepsForSave(steps),
    });
    setSaving(false);
    if (result.error) setError(result.error);
    else refresh();
  };

  const executeTest = async () => {
    if (!activeEnvironment) return;
    setRunning(true);
    await saveTest();
    const result = await apiPost(`/api/tests/${id}/run`, {
      environmentId: activeEnvironment.id,
    });
    setRunning(false);
    if (result.data) router.push(`/runs/${(result.data as { runId: string }).runId}`);
    else if (result.error) setError(result.error);
  };

  if (loading || !test) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <TestDetailShell
      testId={id}
      testName={name}
      stepCount={steps.length}
      saving={saving}
      running={running}
      onSave={tab === "overview" || tab === "steps" ? saveTest : undefined}
      onExecute={tab === "overview" || tab === "steps" ? executeTest : undefined}
    >
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {tab === "overview" && (
        <TestOverviewTab
          name={name}
          description={description}
          timeoutMs={timeoutMs}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onTimeoutChange={setTimeoutMs}
        />
      )}
      {tab === "steps" && <SplitStepEditor steps={steps} onChange={setSteps} testId={id} />}
      {tab === "variables" && <TestVariablesTab testId={id} />}
      {tab === "runs" && <TestRunsTab testId={id} />}
      {tab === "schedule" && <TestScheduleTab testId={id} />}
    </TestDetailShell>
  );
}

export default function TestEditorPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
      <TestEditorContent />
    </Suspense>
  );
}
