"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
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

  const [localValues, setLocalValues] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (variables) {
      const initial: Record<string, Record<string, string>> = {};
      variables.forEach((v) => {
        initial[v.id] = {};
        v.values.forEach((val) => {
          initial[v.id][val.environmentId] = val.value;
        });
      });
      setLocalValues(initial);
    }
  }, [variables]);

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

  const handleValueChange = (varId: string, envId: string, value: string) => {
    setLocalValues((prev) => ({
      ...prev,
      [varId]: { ...(prev[varId] ?? {}), [envId]: value },
    }));
  };

  const handleSave = async () => {
    try {
      const updates = await Promise.all(
        Object.entries(localValues).map(async ([varId, envs]) => {
          const variable = variables?.find((v) => v.id === varId);
          if (!variable) return;

          const values = environments.map((e) => ({
            environmentId: e.id,
            value: envs[e.id] ?? (variable.values.find((v) => v.environmentId === e.id)?.value ?? ""),
          }));

          return apiPatch(`/api/variables/${varId}`, { values });
        })
      );
      
      const errors = updates.filter((r) => r?.error);
      if (errors.length > 0) {
        setError("Some variables failed to save");
      } else {
        setError(null);
        refresh();
      }
    } catch (err) {
      setError("Failed to save changes");
    }
  };

  const handleReset = () => {
    if (variables) {
      const reset: Record<string, Record<string, string>> = {};
      variables.forEach((v) => {
        reset[v.id] = {};
        v.values.forEach((val) => {
          reset[v.id][val.environmentId] = val.value;
        });
      });
      setLocalValues(reset);
    }
  };

  return (
    <div>
      <PageHeader
        title="Global Variables"
        description="Variables with per-environment values · use {{key}} in tests"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleReset} disabled={!variables}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={!variables}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4" />
              New Variable
            </Button>
          </div>
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
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
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
                    const val = localValues[v.id]?.[env.id] ?? v.values.find((x) => x.environmentId === env.id)?.value ?? "";
                    return (
                      <td key={env.id} className="px-4 py-3">
                        <Input
                          type={v.isSecret ? "password" : "text"}
                          value={val}
                          onChange={(e) => handleValueChange(v.id, env.id, e.target.value)}
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
