"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HeaderEntry {
  key: string;
  value: string;
}

export function HeadersEditor({
  headers,
  onChange,
}: {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}) {
  const entries: HeaderEntry[] = Object.entries(headers).map(([key, value]) => ({ key, value }));

  const update = (entryIndex: number, field: "key" | "value", val: string) => {
    const next = [...entries];
    next[entryIndex] = { ...next[entryIndex], [field]: val };
    toRecord(next);
  };

  const remove = (entryIndex: number) => {
    toRecord(entries.filter((_, i) => i !== entryIndex));
  };

  const add = () => {
    toRecord([...entries, { key: "", value: "" }]);
  };

  const toRecord = (list: HeaderEntry[]) => {
    const record: Record<string, string> = {};
    for (const e of list) {
      if (e.key) record[e.key] = e.value;
    }
    onChange(record);
  };

  return (
    <div className="space-y-1.5">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Header name"
            value={entry.key}
            onChange={(e) => update(i, "key", e.target.value)}
            className="h-8 font-mono text-xs"
          />
          <Input
            placeholder="Value"
            value={entry.value}
            onChange={(e) => update(i, "value", e.target.value)}
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
        Add Header
      </Button>
    </div>
  );
}
