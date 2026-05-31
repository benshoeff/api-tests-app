"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPost } from "@/hooks/use-fetch";

export default function NewSharedStepPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [itemsJson, setItemsJson] = useState(
    JSON.stringify(
      [
        {
          type: "http",
          config: { method: "GET", url: "/", headers: { Accept: "application/json" } },
        },
      ],
      null,
      2
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    let items;
    try {
      items = JSON.parse(itemsJson);
    } catch {
      setError("Invalid items JSON");
      setSaving(false);
      return;
    }
    const result = await apiPost<{ id: string }>("/api/shared-steps", {
      name,
      description: description || null,
      items,
    });
    setSaving(false);
    if (result.error) setError(result.error);
    else router.push(`/shared-steps/${result.data!.id}`);
  };

  return (
    <div className="max-w-3xl">
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
            <CardTitle>Steps (JSON)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={itemsJson}
              onChange={(e) => setItemsJson(e.target.value)}
              className="min-h-[280px] font-mono text-xs"
            />
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
