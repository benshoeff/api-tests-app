"use client";

import { useState } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useFetch, apiPost, apiPatch, apiDelete } from "@/hooks/use-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/badge";

interface TestVariable {
  id: string;
  key: string;
  value: string;
}

export function TestVariablesTab({ testId }: { testId: string }) {
  const { data: variables, loading, refresh } = useFetch<TestVariable[]>(
    `/api/tests/${testId}/variables`,
    [testId]
  );
  const [showForm, setShowForm] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = async () => {
    await apiPost(`/api/tests/${testId}/variables`, { key, value });
    setKey("");
    setValue("");
    setShowForm(false);
    refresh();
  };

  const handleUpdate = async (v: TestVariable, newValue: string) => {
    await apiPatch(`/api/tests/${testId}/variables/${v.id}`, { value: newValue });
    setEditingId(null);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete variable?")) return;
    await apiDelete(`/api/tests/${testId}/variables/${id}`);
    refresh();
  };

  return (
    <div>
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Test Variables</h2>
          <p className="text-sm text-muted-foreground">
            Specific to this test — available in all steps via {"{{key}}"}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          New Variable
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4 shadow-sm">
          <CardContent className="flex flex-wrap items-end gap-3 pt-5">
            <div className="flex-1 min-w-[120px]">
              <label className="mb-1 block text-xs font-medium">Key</label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="PROJECT_ID" />
            </div>
            <div className="flex-[2] min-w-[200px]">
              <label className="mb-1 block text-xs font-medium">Value</label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="739 or {{GLOBAL_VAR}}" />
            </div>
            <Button onClick={handleCreate} disabled={!key}>Add</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : !variables?.length ? (
        <EmptyState
          title="No test variables"
          description="Add variables that apply only to this test."
        />
      ) : (
        <div className="space-y-3">
          {variables.map((v) => (
            <Card key={v.id} className="shadow-sm">
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="flex gap-3 min-w-0">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-semibold">{v.key}</p>
                    <p className="mt-1 font-mono text-sm text-muted-foreground">
                      {`{{${v.key}}}`} →{" "}
                      {editingId === v.id ? (
                        <Input
                          className="mt-1 inline h-8 max-w-md font-mono text-xs"
                          defaultValue={v.value}
                          onBlur={(e) => handleUpdate(v, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(v, (e.target as HTMLInputElement).value);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="break-all">{v.value}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                    onClick={() => setEditingId(v.id)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(v.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
