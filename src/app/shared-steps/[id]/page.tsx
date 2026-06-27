"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { useFetch, apiPatch, apiDelete } from "@/hooks/use-fetch";
import { PageHeader } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SplitStepEditor } from "@/components/tests/split-step-editor";
import { stepsFromApi, type StepDraft } from "@/lib/step-utils";

interface SharedStepDetail {
  id: string;
  name: string;
  description: string | null;
  items: { type: string; config: Record<string, unknown> }[];
}

export default function SharedStepEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, refresh } = useFetch<SharedStepDetail>(`/api/shared-steps/${id}`, [id]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setDescription(data.description ?? "");
      setItems(stepsFromApi(data.items));
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await apiPatch(`/api/shared-steps/${id}`, {
      name,
      description: description || null,
      items: items.map((s, i) => ({ type: s.type, config: s.config, sortOrder: i })),
    });
    setSaving(false);
    if (result.error) setError(result.error);
    else refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this shared step group?")) return;
    await apiDelete(`/api/shared-steps/${id}`);
    router.push("/shared-steps");
  };

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={name}
        actions={
          <>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" /> Save
            </Button>
            <Button variant="ghost" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </>
        }
      />
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 pt-5">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="font-sans" />
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
      </div>
    </div>
  );
}
