"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useEnvironment } from "@/components/layout/environment-provider";
import { useFetch, apiPost, apiDelete, apiPatch } from "@/hooks/use-fetch";
import { PageHeader, EmptyState } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface EnvValue {
  id: string;
  value: string;
  environmentId: string;
  environment: { id: string; name: string; color: string };
}

interface Variable {
  id: string;
  key: string;
  description: string | null;
  isSecret: boolean;
  values: EnvValue[];
}

export default function VariablesPage() {
  const { environments } = useEnvironment();
  const { data: variables, loading, refresh } = useFetch<Variable[]>("/api/variables");
  const [showForm, setShowForm] = useState(false);
  const [key, setKey] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const values = environments.map((e) => ({ environmentId: e.id, value: "" }));
    const result = await apiPost("/api/variables", { key, isSecret, values });
    if (result.error) setError(result.error);
    else {
      setShowForm(false);
      setKey("");
      refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete variable?")) return;
    await apiDelete(`/api/variables/${id}`);
    refresh();
  };

  const updateValue = async (variable: Variable, environmentId: string, value: string) => {
    const values = environments.map((e) => ({
      environmentId: e.id,
      value: e.id === environmentId ? value : (variable.values.find((v) => v.environmentId === e.id)?.value ?? ""),
    }));
    await apiPatch(`/api/variables/${variable.id}`, { values });
    refresh();
  };

  return (
    <div>
      <PageHeader
        title="Global Variables"
        description="Variables with per-environment values · use {{key}} in tests"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />
            New Variable
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-end gap-3 pt-5">
            <Input placeholder="Variable key" value={key} onChange={(e) => setKey(e.target.value)} className="max-w-xs" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} />
              Secret
            </label>
            {error && <p className="w-full text-sm text-destructive">{error}</p>}
            <Button onClick={handleCreate} disabled={!key}>Create</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      ) : !variables?.length ? (
        <EmptyState title="No variables" description="Define global variables for your tests." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Variable</th>
                {environments.map((env) => (
                  <th key={env.id} className="px-4 py-3 text-left font-medium">
                    {env.name}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {variables.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{`{{${v.key}}}`}</code>
                    {v.isSecret && (
                      <span className="ml-2 text-xs text-muted-foreground">secret</span>
                    )}
                  </td>
                  {environments.map((env) => {
                    const val = v.values.find((x) => x.environmentId === env.id)?.value ?? "";
                    return (
                      <td key={env.id} className="px-4 py-3">
                        <Input
                          type={v.isSecret ? "password" : "text"}
                          value={val}
                          onChange={(e) => updateValue(v, env.id, e.target.value)}
                          className="h-8 font-mono text-xs"
                        />
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
