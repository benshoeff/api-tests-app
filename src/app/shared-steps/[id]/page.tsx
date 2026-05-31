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
  const [itemsJson, setItemsJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setDescription(data.description ?? "");
      setItemsJson(JSON.stringify(data.items.map((i) => ({ type: i.type, config: i.config })), null, 2));
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    let items;
    try {
      items = JSON.parse(itemsJson);
    } catch {
      setError("Invalid JSON");
      setSaving(false);
      return;
    }
    const result = await apiPatch(`/api/shared-steps/${id}`, {
      name,
      description: description || null,
      items,
    });
    setSaving(false);
    if (result.error) setError(result.error);
    else refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete?")) return;
    await apiDelete(`/api/shared-steps/${id}`);
    router.push("/shared-steps");
  };

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={name}
        actions={
          <>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" /> Save
            </Button>
            <Button variant="ghost" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
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
          <CardHeader><CardTitle>Steps</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={itemsJson} onChange={(e) => setItemsJson(e.target.value)} className="min-h-[280px] font-mono text-xs" />
          </CardContent>
        </Card>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
