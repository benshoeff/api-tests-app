"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useFetch, apiPost, apiDelete, apiPatch } from "@/hooks/use-fetch";
import { PageHeader, EmptyState } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface Environment {
  id: string;
  name: string;
  slug: string;
  baseUrl: string | null;
  color: string;
  isDefault: boolean;
}

export default function EnvironmentsPage() {
  const { data: environments, loading, refresh } = useFetch<Environment[]>("/api/environments");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [color, setColor] = useState("blue");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBaseUrl, setEditBaseUrl] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreate = async () => {
    const result = await apiPost("/api/environments", {
      name,
      baseUrl: baseUrl || null,
      color,
    });
    if (result.error) setError(result.error);
    else {
      setShowForm(false);
      setName("");
      setBaseUrl("");
      refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete environment?")) return;
    const result = await apiDelete(`/api/environments/${id}`);
    if (result.error) alert(result.error);
    else refresh();
  };

  const setDefault = async (id: string) => {
    await apiPatch(`/api/environments/${id}`, { isDefault: true });
    refresh();
  };

  const startEdit = (env: Environment) => {
    setEditingId(env.id);
    setEditName(env.name);
    setEditBaseUrl(env.baseUrl ?? "");
    setEditColor(env.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (id: string) => {
    await apiPatch(`/api/environments/${id}`, {
      name: editName,
      baseUrl: editBaseUrl || null,
      color: editColor,
    });
    setEditingId(null);
    refresh();
  };

  return (
    <div>
      <PageHeader
        title="Environments"
        description="Manage target environments for test execution"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />
            New Environment
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-4">
          <CardContent className="space-y-3 pt-5">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Base URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            <Input placeholder="Color (blue, green, amber…)" value={color} onChange={(e) => setColor(e.target.value)} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleCreate} disabled={!name}>Create</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      ) : !environments?.length ? (
        <EmptyState title="No environments" description="Create your first environment." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {environments.map((env) => (
            <Card key={env.id}>
              <CardContent className="pt-5">
                {editingId === env.id ? (
                  <div className="space-y-3">
                    <Input
                      placeholder="Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <Input
                      placeholder="Base URL"
                      value={editBaseUrl}
                      onChange={(e) => setEditBaseUrl(e.target.value)}
                    />
                    <Input
                      placeholder="Color (blue, green, amber…)"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(env.id)} disabled={!editName}>
                        <Check className="h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{env.name}</p>
                      <p className="text-xs text-muted-foreground">{env.slug}</p>
                      {env.baseUrl && (
                        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{env.baseUrl}</p>
                      )}
                      {env.isDefault && (
                        <span className="mt-2 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(env)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!env.isDefault && (
                        <Button variant="ghost" size="sm" onClick={() => setDefault(env.id)}>
                          Set default
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(env.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
