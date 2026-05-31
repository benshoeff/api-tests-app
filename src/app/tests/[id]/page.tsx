"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEnvironment } from "@/components/layout/environment-provider";
import { useFetch, apiPatch, apiPost } from "@/hooks/use-fetch";
import { TestDetailShell, useTestTab } from "@/components/tests/test-detail-shell";
import { TestOverviewTab } from "@/components/tests/test-overview-tab";
import { TestStepsTab } from "@/components/tests/test-steps-tab";
import { TestVariablesTab } from "@/components/tests/test-variables-tab";
import { TestRunsTab } from "@/components/tests/test-runs-tab";
import { TestScheduleTab } from "@/components/tests/test-schedule-tab";
import { normalizeStepsForSave, stepsFromApi, type StepDraft } from "@/lib/step-utils";

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
  const { activeEnvironment } = useEnvironment();
  const { data: test, loading, refresh } = useFetch<TestDetail>(`/api/tests/${id}`, [id]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(30000);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (test) {
      setName(test.name);
      setDescription(test.description ?? "");
      setTimeoutMs(test.timeoutMs);
      setSteps(stepsFromApi(test.steps));
    }
  }, [test]);

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
      {tab === "steps" && <TestStepsTab steps={steps} onChange={setSteps} />}
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
