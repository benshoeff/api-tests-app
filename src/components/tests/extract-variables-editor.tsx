"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ExtractEntry {
  key: string;
  path: string;
}

export function ExtractVariablesEditor({
  variables,
  onChange,
}: {
  variables: Record<string, string>;
  onChange: (variables: Record<string, string>) => void;
}) {
  const entries: ExtractEntry[] = Object.entries(variables).map(([key, path]) => ({ key, path }));

  const update = (i: number, field: "key" | "path", val: string) => {
    const next = [...entries];
    next[i] = { ...next[i], [field]: val };
    toRecord(next);
  };

  const remove = (i: number) => {
    toRecord(entries.filter((_, idx) => idx !== i));
  };

  const add = () => {
    toRecord([...entries, { key: "", path: "" }]);
  };

  const toRecord = (list: ExtractEntry[]) => {
    const record: Record<string, string> = {};
    for (const e of list) {
      if (e.key) record[e.key] = e.path;
    }
    onChange(record);
  };

  return (
    <div className="space-y-1.5">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Variable name"
            value={entry.key}
            onChange={(e) => update(i, "key", e.target.value)}
            className="h-8 font-mono text-xs"
          />
          <Input
            placeholder="$.json.path"
            value={entry.path}
            onChange={(e) => update(i, "path", e.target.value)}
            className="h-8 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={add} className="text-xs">
        <Plus className="h-3.5 w-3.5" />
        Add Extraction
      </Button>
    </div>
  );
}
