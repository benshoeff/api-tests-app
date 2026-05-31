"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { apiPost } from "@/hooks/use-fetch";
import { Plus, Trash2 } from "lucide-react";

type StepDraft = {
  type: "http" | "assert" | "delay" | "shared_ref";
  config: Record<string, unknown>;
};

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

  const addStep = (type: StepDraft["type"]) => {
    const configs: Record<StepDraft["type"], Record<string, unknown>> = {
      http: { method: "GET", url: "/", headers: {} },
      assert: { assertions: [{ type: "status", expected: 200 }] },
      delay: { ms: 1000 },
      shared_ref: { sharedStepId: "" },
    };
    setSteps([...steps, { type, config: configs[type] }]);
  };

  const updateStep = (index: number, config: Record<string, unknown>) => {
    setSteps(steps.map((s, i) => (i === index ? { ...s, config } : s)));
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

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
    if (result.data) router.push(`/tests/${result.data!.id}?tab=overview`);
  };

  return (
    <div className="max-w-3xl">
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Steps</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => addStep("http")}>
                + HTTP
              </Button>
              <Button variant="ghost" size="sm" onClick={() => addStep("assert")}>
                + Assert
              </Button>
              <Button variant="ghost" size="sm" onClick={() => addStep("delay")}>
                + Delay
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, i) => (
              <StepEditor
                key={i}
                index={i}
                step={step}
                onChange={(config) => updateStep(i, config)}
                onRemove={() => removeStep(i)}
              />
            ))}
            {steps.length === 0 && (
              <Button variant="secondary" onClick={() => addStep("http")}>
                <Plus className="h-4 w-4" /> Add first step
              </Button>
            )}
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

function StepEditor({
  index,
  step,
  onChange,
  onRemove,
}: {
  index: number;
  step: StepDraft;
  onChange: (config: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">
          Step {index + 1} · {step.type}
        </span>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {step.type === "http" && (
        <div className="space-y-2">
          <Select
            value={(step.config.method as string) ?? "GET"}
            onChange={(e) => onChange({ ...step.config, method: e.target.value })}
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
          <Input
            placeholder="URL (supports {{variables}})"
            value={(step.config.url as string) ?? ""}
            onChange={(e) => onChange({ ...step.config, url: e.target.value })}
          />
          <Textarea
            placeholder='Headers JSON e.g. {"Accept":"application/json"}'
            value={JSON.stringify(step.config.headers ?? {}, null, 2)}
            onChange={(e) => {
              try {
                onChange({ ...step.config, headers: JSON.parse(e.target.value) });
              } catch { /* ignore invalid json while typing */ }
            }}
          />
          <Textarea
            placeholder="Request body (optional)"
            value={(step.config.body as string) ?? ""}
            onChange={(e) => onChange({ ...step.config, body: e.target.value })}
            className="font-sans"
          />
        </div>
      )}

      {step.type === "assert" && (
        <Textarea
          value={JSON.stringify(step.config.assertions ?? [], null, 2)}
          onChange={(e) => {
            try {
              onChange({ assertions: JSON.parse(e.target.value) });
            } catch { /* ignore */ }
          }}
        />
      )}

      {step.type === "delay" && (
        <Input
          type="number"
          placeholder="Delay in ms"
          value={(step.config.ms as number) ?? 1000}
          onChange={(e) => onChange({ ms: Number(e.target.value) })}
        />
      )}
    </div>
  );
}
