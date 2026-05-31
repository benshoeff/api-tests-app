"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export function TestOverviewTab({
  name,
  description,
  timeoutMs,
  onNameChange,
  onDescriptionChange,
  onTimeoutChange,
}: {
  name: string;
  description: string;
  timeoutMs: number;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onTimeoutChange: (v: number) => void;
}) {
  return (
    <Card className="max-w-2xl shadow-sm">
      <CardContent className="space-y-5 pt-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Test Name</label>
          <Input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Test name" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Enter test description (optional)"
            className="min-h-[100px] font-sans"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Timeout (ms)</label>
          <Input
            type="number"
            value={timeoutMs}
            onChange={(e) => onTimeoutChange(Number(e.target.value))}
            className="max-w-xs"
          />
        </div>
      </CardContent>
    </Card>
  );
}
