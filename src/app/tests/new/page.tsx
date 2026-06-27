"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPost } from "@/hooks/use-fetch";
import { SplitStepEditor } from "@/components/tests/split-step-editor";
import { type StepDraft } from "@/lib/step-utils";

const defaultHttp: StepDraft = {
  type: "http",
  config: { method: "GET", url: "/", headers: { Accept: "application/json" } },
};

export default function NewTestPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(30000);
  const [steps, setSteps] = useState<StepDraft[]>([defaultHttp]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await apiPost<{ id: string }>("/api/tests", {
      name,
      description: description || null,
      timeoutMs,
      steps: steps.map((s, i) => ({ ...s, sortOrder: i })),
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data) router.push(`/tests/${result.data!.id}?tab=steps`);
  };

  return (
    <div className="max-w-5xl">
      <PageHeader title="New Test" description="Create a new API test with steps" />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Test name" value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="font-sans"
            />
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Timeout (ms)</label>
              <Input
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <SplitStepEditor steps={steps} onChange={setSteps} />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!name || saving}>
            {saving ? "Saving…" : "Create Test"}
          </Button>
          <Button variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
