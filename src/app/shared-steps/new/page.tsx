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

export default function NewSharedStepPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<StepDraft[]>([
    {
      type: "http",
      config: { method: "GET", url: "/", headers: { Accept: "application/json" } },
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await apiPost<{ id: string }>("/api/shared-steps", {
      name,
      description: description || null,
      items: items.map((s, i) => ({ type: s.type, config: s.config, sortOrder: i })),
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data) router.push(`/shared-steps/${result.data!.id}`);
  };

  return (
    <div className="max-w-5xl">
      <PageHeader title="New Shared Step" description="Define a reusable step group" />
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 pt-5">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="font-sans"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <SplitStepEditor steps={items} onChange={setItems} />
          </CardContent>
        </Card>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleSave} disabled={!name || saving}>
          {saving ? "Saving…" : "Create"}
        </Button>
      </div>
    </div>
  );
}
