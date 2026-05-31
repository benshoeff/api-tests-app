"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useFetch, apiDelete } from "@/hooks/use-fetch";
import { PageHeader, EmptyState } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SharedStepItem {
  id: string;
  name: string;
  description: string | null;
  items: { id: string; type: string }[];
}

export default function SharedStepsPage() {
  const { data: steps, loading, refresh } = useFetch<SharedStepItem[]>("/api/shared-steps");

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this shared step group?")) return;
    await apiDelete(`/api/shared-steps/${id}`);
    refresh();
  };

  return (
    <div>
      <PageHeader
        title="Shared Steps"
        description="Reusable step groups referenced across tests"
        actions={
          <Link href="/shared-steps/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Shared Step
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !steps?.length ? (
        <EmptyState
          title="No shared steps"
          description="Create reusable step groups to avoid duplication."
          action={
            <Link href="/shared-steps/new">
              <Button>Create Shared Step</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {steps.map((step) => (
            <Card key={step.id}>
              <CardContent className="flex items-center justify-between py-4">
                <Link href={`/shared-steps/${step.id}`} className="flex-1">
                  <p className="font-medium">{step.name}</p>
                  {step.description && (
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {step.items.length} step{step.items.length !== 1 ? "s" : ""}
                  </p>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(step.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
