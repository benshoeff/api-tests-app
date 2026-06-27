"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Copy, X, Lock, Play, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStepName, METHOD_COLORS, type StepDraft, type StepConfigWithMeta } from "@/lib/step-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFetch, apiPost, apiPatch } from "@/hooks/use-fetch";
import { normalizeStepsForSave } from "@/lib/step-utils";
import type { Assertion } from "@/types";
import { useEnvironment } from "@/components/layout/environment-provider";
import { HeadersEditor } from "@/components/tests/headers-editor";
import { ExtractVariablesEditor } from "@/components/tests/extract-variables-editor";
import {
  AssertionsEditor,
  collectExtractedVariables,
  parseAssertions,
} from "@/components/tests/assertions-editor";
import { ResponseBodyViewer } from "@/components/ui/json-viewer";
import { AssertionResultList } from "@/components/runs/assertion-result";
import { VariablePicker } from "@/components/tests/variable-picker";

interface StepRunResult {
  status: string;
  stepType: string;
  durationMs: number;
  request?: unknown;
  response?: { status?: number; headers?: Record<string, string>; body?: string; truncated?: boolean };
  errorMessage?: string;
  assertions?: Assertion[];
}

type SubTab = "configuration" | "assertions" | "extracted";

interface SharedStepOption {
  id: string;
  name: string;
}

export function SplitStepEditor({
  steps,
  onChange,
  testId,
}: {
  steps: StepDraft[];
  onChange: (steps: StepDraft[]) => void;
  testId?: string;
}) {
  const { data: sharedSteps } = useFetch<SharedStepOption[]>("/api/shared-steps");
  const [selectedIndex, setSelectedIndex] = useState<number>(steps.length > 0 ? 0 : -1);
  const [subTabs, setSubTabs] = useState<Record<number, SubTab>>({});
  const [stepResults, setStepResults] = useState<Partial<Record<number, StepRunResult>>>({});
  const [runningSteps, setRunningSteps] = useState<Set<number>>(new Set());
  const { activeEnvironment } = useEnvironment();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = steps.findIndex((_, i) => String(i) === active.id);
      const newIndex = steps.findIndex((_, i) => String(i) === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(steps, oldIndex, newIndex);
      onChange(reordered);
      setSelectedIndex(newIndex);
    },
    [steps, onChange]
  );

  const updateStep = (index: number, config: StepConfigWithMeta) => {
    onChange(steps.map((s, i) => (i === index ? { ...s, config } : s)));
  };

  const updateType = (index: number, type: StepDraft["type"]) => {
    const defaults: Record<StepDraft["type"], StepConfigWithMeta> = {
      http: { name: "New request", method: "GET", url: "/", headers: {} },
      assert: { name: "Assertions", assertions: [{ type: "status", expected: 200 }] },
      delay: { name: "Wait", ms: 1000 },
      shared_ref: { name: "Shared step", sharedStepId: "" },
    };
    onChange(steps.map((s, i) => (i === index ? { type, config: defaults[type] } : s)));
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const reordered = arrayMove(steps, index, target);
    onChange(reordered);
    setSelectedIndex(target);
  };

  const duplicateStep = (index: number) => {
    const copy = { ...steps[index], config: { ...steps[index].config } };
    const next = [...steps];
    next.splice(index + 1, 0, copy);
    onChange(next);
    setSelectedIndex(index + 1);
  };

  const removeStep = (index: number) => {
    const next = steps.filter((_, i) => i !== index);
    onChange(next);
    if (selectedIndex >= next.length) setSelectedIndex(next.length - 1);
    else if (selectedIndex === index && next.length > 0) setSelectedIndex(Math.min(index, next.length - 1));
  };

  const runStep = async (stepIndex: number) => {
    if (!activeEnvironment || !testId) return;
    setRunningSteps((prev) => new Set(prev).add(stepIndex));
    setStepResults((prev) => {
      const next: Partial<Record<number, StepRunResult>> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (Number(k) !== stepIndex) next[Number(k)] = v;
      }
      return next;
    });

    const res = await apiPost<StepRunResult>(`/api/tests/${testId}/run-step`, {
      environmentId: activeEnvironment.id,
      stepIndex,
    });
    if (res.data) {
      setStepResults((prev) => ({ ...prev, [stepIndex]: res.data }));
    } else {
      setStepResults((prev) => ({
        ...prev,
        [stepIndex]: { status: "error", stepType: "", durationMs: 0, errorMessage: res.error ?? "Request failed" },
      }));
    }
    setRunningSteps((prev) => {
      const next = new Set(prev);
      next.delete(stepIndex);
      return next;
    });
  };

  const addStep = (type: StepDraft["type"] = "http", afterIndex?: number) => {
    const defaults: Record<StepDraft["type"], StepConfigWithMeta> = {
      http: { name: "New request", method: "GET", url: "/", headers: { Accept: "application/json" } },
      assert: { name: "Assertions", assertions: [{ type: "status", expected: 200 }] },
      delay: { name: "Wait", ms: 1000 },
      shared_ref: { name: "Shared step", sharedStepId: sharedSteps?.[0]?.id ?? "" },
    };
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : steps.length;
    const next = [...steps];
    next.splice(insertAt, 0, { type, config: defaults[type] });
    onChange(next);
    setSelectedIndex(insertAt);
  };

  const selected = selectedIndex >= 0 && selectedIndex < steps.length ? steps[selectedIndex] : null;
  const getSubTab = (i: number): SubTab => subTabs[i] ?? "configuration";

  return (
    <div className="flex min-h-[400px] gap-0 overflow-hidden rounded-xl border border-border">
      {/* Left: Step List */}
      <div className="flex w-80 shrink-0 flex-col border-r border-border bg-muted/20">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Steps ({steps.length})
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addStep("http")}
            className="h-7 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={steps.map((_, i) => String(i))}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {steps.map((step, i) => (
                  <SortableStepCard
                    key={i}
                    index={i}
                    step={step}
                    isSelected={selectedIndex === i}
                    onSelect={() => setSelectedIndex(i)}
                    onMoveUp={() => moveStep(i, -1)}
                    onMoveDown={() => moveStep(i, 1)}
                    onDuplicate={() => duplicateStep(i)}
                    onRemove={() => removeStep(i)}
                    canMoveUp={i > 0}
                    canMoveDown={i < steps.length - 1}
                    onAddAfter={() => addStep("http", i)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {steps.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No steps</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => addStep()}>
                <Plus className="h-3.5 w-3.5" />
                Add first step
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Step Detail */}
      <div className="flex-1 overflow-y-auto bg-card">
        {selected ? (
          <StepDetailPanel
            step={selected}
            index={selectedIndex}
            testId={testId}
            steps={steps}
            sharedSteps={sharedSteps ?? []}
            subTab={getSubTab(selectedIndex)}
            onSubTabChange={(tab) => setSubTabs({ ...subTabs, [selectedIndex]: tab })}
            onConfigChange={(config) => updateStep(selectedIndex, config)}
            onTypeChange={(type) => updateType(selectedIndex, type)}
            runResult={stepResults[selectedIndex]}
            isRunning={runningSteps.has(selectedIndex)}
            onRunStep={() => runStep(selectedIndex)}
            hasEnvironment={!!activeEnvironment}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a step to edit</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sortable Step Card ─── */

function SortableStepCard({
  index,
  step,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  canMoveUp,
  canMoveDown,
  onAddAfter,
}: {
  index: number;
  step: StepDraft;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onAddAfter: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(index) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = step.config;
  const name = getStepName(step.type, config, index);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border transition-colors",
        isSelected
          ? "border-accent bg-accent/5"
          : "border-transparent hover:border-border hover:bg-muted/50",
        isDragging && "z-10 border-accent bg-accent/10 shadow-lg opacity-90"
      )}
    >
      <div className="flex items-center gap-1.5 px-2 py-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={onSelect}
        >
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
              isSelected
                ? "bg-accent text-white"
                : "bg-muted-foreground/20 text-muted-foreground"
            )}
          >
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {step.type === "http" && config.method && (
                <span
                  className={cn(
                    "rounded px-1 py-0.5 text-[9px] font-bold uppercase leading-none",
                    METHOD_COLORS[config.method] ?? METHOD_COLORS.GET
                  )}
                >
                  {config.method}
                </span>
              )}
              {step.type === "shared_ref" && (
                <span className="rounded bg-violet-100 px-1 py-0.5 text-[9px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  REF
                </span>
              )}
              {step.type === "assert" && (
                <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  ASSERT
                </span>
              )}
              {step.type === "delay" && (
                <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  WAIT
                </span>
              )}
              <span className="truncate text-sm font-medium">{name}</span>
            </div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <MiniBtn onClick={onMoveUp} disabled={!canMoveUp} label="Move up">
            <ChevronUp className="h-3 w-3" />
          </MiniBtn>
          <MiniBtn onClick={onMoveDown} disabled={!canMoveDown} label="Move down">
            <ChevronDown className="h-3 w-3" />
          </MiniBtn>
          <MiniBtn onClick={onDuplicate} label="Duplicate">
            <Copy className="h-3 w-3" />
          </MiniBtn>
          <MiniBtn onClick={onRemove} label="Delete" danger>
            <X className="h-3 w-3" />
          </MiniBtn>
        </div>
      </div>

      {/* Insert step divider */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddAfter();
        }}
        className="absolute -bottom-2 left-1/2 z-10 flex h-4 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 transition-opacity hover:border-accent hover:text-accent group-hover:opacity-100"
        aria-label="Insert step after"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

function MiniBtn({
  children,
  onClick,
  disabled,
  danger,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "rounded p-0.5 transition-colors disabled:opacity-20",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/* ─── Step Detail Panel ─── */

function StepDetailPanel({
  step,
  index,
  testId,
  steps,
  sharedSteps,
  subTab,
  onSubTabChange,
  onConfigChange,
  onTypeChange,
  runResult,
  isRunning,
  onRunStep,
  hasEnvironment,
}: {
  step: StepDraft;
  index: number;
  testId?: string;
  steps: StepDraft[];
  sharedSteps: SharedStepOption[];
  subTab: SubTab;
  onSubTabChange: (tab: SubTab) => void;
  onConfigChange: (config: StepConfigWithMeta) => void;
  onTypeChange: (type: StepDraft["type"]) => void;
  runResult?: StepRunResult;
  isRunning?: boolean;
  onRunStep?: () => void;
  hasEnvironment?: boolean;
}) {
  const config = step.config;
  const urlRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [focusedField, setFocusedField] = useState<"url" | "body" | null>(null);
  const extractedVariables = collectExtractedVariables(steps, index);

  const insertVariable = (token: string) => {
    const wrapped = token.startsWith("{{") ? token : `{{${token}}}`;
    const target = focusedField ?? "url";
    const el = target === "url" ? urlRef.current : bodyRef.current;
    const current = target === "url" ? (config.url ?? "") : (config.body ?? "");

    if (el) {
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? start;
      const next = current.slice(0, start) + wrapped + current.slice(end);
      onConfigChange({ ...config, [target]: next });
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + wrapped.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      onConfigChange({ ...config, [target]: current + wrapped });
    }
  };

  const assertionCount = Array.isArray(config.assertions) ? config.assertions.length : 0;
  const extractCount = config.captureVariables ? Object.keys(config.captureVariables).length : 0;

  const handleAssertFromResponse = (path: string, value: unknown) => {
    const newAssertion: Assertion = {
      type: "jsonPath",
      target: path,
      expected: String(value),
      operator: "is",
      elementSelector: "body",
    };
    const existing = Array.isArray(config.assertions) ? config.assertions : [];
    const updatedConfig = { ...config, assertions: [...existing, newAssertion] };
    onConfigChange(updatedConfig);

    if (testId) {
      const updatedSteps = steps.map((s, i) =>
        i === index ? { ...s, config: updatedConfig } : s
      );
      apiPatch(`/api/tests/${testId}`, {
        steps: normalizeStepsForSave(updatedSteps),
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
            {index + 1}
          </span>
          <h3 className="text-sm font-semibold">
            {step.type === "http" && "HTTP Request"}
            {step.type === "assert" && "Assertions"}
            {step.type === "delay" && "Delay"}
            {step.type === "shared_ref" && "Shared Step"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {runResult && (
            <Badge status={runResult.status === "passed" ? "passed" : "failed"}>
              {runResult.status}
            </Badge>
          )}
          <Button
            size="sm"
            variant={runResult ? "secondary" : "ghost"}
            className="text-xs"
            disabled={isRunning || !hasEnvironment}
            onClick={onRunStep}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {isRunning ? "Running…" : "Run Step"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-6 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Step Name</label>
          <Input
            placeholder="Enter step name..."
            value={config.name ?? ""}
            onChange={(e) => onConfigChange({ ...config, name: e.target.value })}
            className="h-9"
          />
        </div>

        {step.type === "http" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Select
                value={config.method ?? "GET"}
                onChange={(e) =>
                  onConfigChange({ ...config, method: e.target.value as StepConfigWithMeta["method"] })
                }
                className="w-28"
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
              <Input
                ref={urlRef}
                placeholder="URL — supports {{variables}}"
                value={config.url ?? ""}
                onChange={(e) => onConfigChange({ ...config, url: e.target.value })}
                onFocus={() => setFocusedField("url")}
                className="flex-1 font-mono text-sm"
              />
            </div>

            {/* Sub-tabs */}
            <div className="mb-4 flex gap-1 border-b border-border">
              {(
                [
                  ["configuration", "Configuration"],
                  ["assertions", `Assertions (${assertionCount})`],
                  ["extracted", `Extract (${extractCount})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSubTabChange(key as SubTab)}
                  className={cn(
                    "relative px-3 py-2 text-xs font-medium transition-colors",
                    subTab === key
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                  {subTab === key && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-accent" />
                  )}
                </button>
              ))}
            </div>

            {subTab === "configuration" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Headers
                  </label>
                  <HeadersEditor
                    headers={(config.headers as Record<string, string>) ?? {}}
                    onChange={(headers) => onConfigChange({ ...config, headers })}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Body
                  </label>
                  <Textarea
                    ref={bodyRef}
                    className="min-h-[120px] font-mono text-xs"
                    placeholder='{"key": "value"}'
                    value={config.body ?? ""}
                    onChange={(e) => onConfigChange({ ...config, body: e.target.value })}
                    onFocus={() => setFocusedField("body")}
                  />
                </div>

                <div className="pt-2">
                  <VariablePicker
                    testId={testId}
                    extractedVariables={extractedVariables}
                    onInsert={insertVariable}
                  />
                </div>
              </div>
            )}

            {subTab === "assertions" && (
              <AssertionsEditor
                assertions={parseAssertions(config.assertions)}
                onChange={(assertions) => onConfigChange({ ...config, assertions })}
                testId={testId}
                extractedVariables={collectExtractedVariables(steps, index)}
              />
            )}

            {subTab === "extracted" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Capture response values as variables for later steps
                </label>
                <ExtractVariablesEditor
                  variables={(config.captureVariables as Record<string, string>) ?? {}}
                  onChange={(captureVariables) => onConfigChange({ ...config, captureVariables })}
                />
              </div>
            )}
          </>
        )}

        {step.type === "assert" && (
          <AssertionsEditor
            assertions={parseAssertions(config.assertions)}
            onChange={(assertions) => onConfigChange({ ...config, assertions })}
            testId={testId}
            extractedVariables={collectExtractedVariables(steps, index)}
          />
        )}

        {step.type === "delay" && (
          <div className="max-w-xs">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Delay duration (ms)
            </label>
            <Input
              type="number"
              value={config.ms ?? 1000}
              onChange={(e) => onConfigChange({ ...config, ms: Number(e.target.value) })}
            />
          </div>
        )}

        {step.type === "shared_ref" && (
          <div className="space-y-3">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Shared Step Group
            </label>
            <Select
              value={config.sharedStepId ?? ""}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  sharedStepId: e.target.value,
                  name: sharedSteps?.find((s) => s.id === e.target.value)?.name,
                })
              }
              className="max-w-xs"
            >
              <option value="">Select shared step…</option>
              {sharedSteps?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            {config.sharedStepId && (
              <Link
                href={`/shared-steps/${config.sharedStepId}`}
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <Lock className="h-3 w-3" />
                Edit in Shared Steps →
              </Link>
            )}
          </div>
        )}

        {/* Run result */}
        {runResult && (
          <div className="mt-4 rounded-lg border border-border bg-muted/20">
            <div className="border-b border-border px-3 py-2">
              <span className="text-xs font-semibold">
                {runResult.errorMessage ? "Error" : "Response"}
              </span>
              <span className="ml-2 text-[10px] text-muted-foreground">
                {runResult.durationMs}ms
              </span>
            </div>
            <div className="space-y-2 p-3">
              {runResult.errorMessage && (
                <p className="text-xs text-destructive">{runResult.errorMessage}</p>
              )}
              {runResult.response && (
                <>
                  <div className="text-xs text-muted-foreground">
                    Status: <span className="font-semibold text-foreground">{runResult.response.status}</span>
                  </div>
                  {runResult.response.body != null && (
                    <ResponseBodyViewer body={runResult.response.body} jsonPathPrefix="$" onAssert={handleAssertFromResponse} />
                  )}
                </>
              )}
              {runResult.assertions && runResult.assertions.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Assertions ({(runResult.assertions as Assertion[]).filter((a) => a.passed).length}/{runResult.assertions.length} passed)
                  </span>
                  <div className="mt-1.5">
                    <AssertionResultList assertions={runResult.assertions as Assertion[]} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step type changer */}
        <div className="mt-6 border-t border-border pt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Step Type
          </label>
          <Select
            value={step.type}
            onChange={(e) => onTypeChange(e.target.value as StepDraft["type"])}
            className="max-w-[180px]"
          >
            <option value="http">HTTP Request</option>
            <option value="assert">Assertion</option>
            <option value="delay">Delay</option>
            <option value="shared_ref">Shared Step</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
