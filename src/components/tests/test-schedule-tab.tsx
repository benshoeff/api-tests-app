"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useFetch, apiPatch, apiDelete } from "@/hooks/use-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DAYS = [
  { id: "M", label: "M" },
  { id: "T", label: "T" },
  { id: "W", label: "W" },
  { id: "Th", label: "Th" },
  { id: "F", label: "F" },
  { id: "S", label: "S" },
  { id: "Su", label: "Su" },
];

interface Schedule {
  id: string;
  active: boolean;
  interval: number;
  unit: string;
  runAtTime: boolean;
  time: string | null;
  timezone: string;
  days: string[];
}

export function TestScheduleTab({ testId }: { testId: string }) {
  const { data, loading, refresh } = useFetch<Schedule>(`/api/tests/${testId}/schedule`, [testId]);
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState<Partial<Schedule>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        days: Array.isArray(data.days) ? data.days : [],
      });
    }
  }, [data]);

  const toggleDay = (day: string) => {
    const days = form.days ?? [];
    setForm({
      ...form,
      days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await apiPatch(`/api/tests/${testId}/schedule`, form);
    setSaving(false);
    refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete schedule?")) return;
    await apiDelete(`/api/tests/${testId}/schedule`);
    refresh();
  };

  if (loading) return <div className="h-48 animate-pulse rounded-xl bg-muted" />;

  return (
    <Card className="max-w-2xl shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between border-b border-border px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold">Scheduling & Alert Conditions</span>
          {form.active && (
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              Active
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <CardContent className="space-y-5 pt-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active ?? false}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Enable schedule
          </label>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Run your test every</span>
            <Input
              type="number"
              className="h-8 w-16"
              value={form.interval ?? 1}
              onChange={(e) => setForm({ ...form, interval: Number(e.target.value) })}
            />
            <Select
              className="h-8 w-28"
              value={form.unit ?? "days"}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            >
              <option value="hours">hours</option>
              <option value="days">days</option>
              <option value="weeks">weeks</option>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.runAtTime ?? false}
              onChange={(e) => setForm({ ...form, runAtTime: e.target.checked })}
            />
            Run at specific time
          </label>

          {form.runAtTime && (
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
                <Input
                  type="time"
                  className="h-9 w-32"
                  value={form.time ?? "02:00"}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Timezone</label>
                <Select
                  className="h-9 min-w-[180px]"
                  value={form.timezone ?? "UTC"}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                >
                  <option value="UTC">UTC</option>
                  <option value="Asia/Jerusalem">Asia/Jerusalem</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </Select>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">On</label>
            <div className="flex gap-1.5">
              {DAYS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-semibold transition-colors",
                    (form.days ?? []).includes(d.id)
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-card text-muted-foreground hover:border-accent/40"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Scheduled runs require a background worker (coming soon). Settings are saved for when automation is enabled.
          </p>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <button
              type="button"
              className="text-sm text-destructive hover:underline"
              onClick={handleDelete}
            >
              Delete Schedule
            </button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Schedule"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
