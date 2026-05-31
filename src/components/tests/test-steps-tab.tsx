"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Lock,
  Pencil,
  Play,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getStepName,
  METHOD_COLORS,
  type StepDraft,
  type StepConfigWithMeta,
} from "@/lib/step-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useFetch } from "@/hooks/use-fetch";

type SubTab = "configuration" | "assertions" | "extracted";

interface SharedStepOption {
  id: string;
  name: string;
}

export function TestStepsTab({
  steps,
  onChange,
}: {
  steps: StepDraft[];
  onChange: (steps: StepDraft[]) => void;
}) {
  const { data: sharedSteps } = useFetch<SharedStepOption[]>("/api/shared-steps");
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [subTabs, setSubTabs] = useState<Record<number, SubTab>>({});

  const toggleExpand = (i: number) => {
    const next = new Set(expanded);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setExpanded(next);
  };

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
    const next = [...steps];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const duplicateStep = (index: number) => {
    const copy = { ...steps[index], config: { ...steps[index].config }, id: undefined };
    const next = [...steps];
    next.splice(index + 1, 0, copy);
    onChange(next);
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const addStep = (type: StepDraft["type"] = "http") => {
    const defaults: Record<StepDraft["type"], StepConfigWithMeta> = {
      http: { name: "New request", method: "GET", url: "/", headers: { Accept: "application/json" } },
      assert: { name: "Assertions", assertions: [{ type: "status", expected: 200 }] },
      delay: { name: "Wait", ms: 1000 },
      shared_ref: { name: "Shared step", sharedStepId: sharedSteps?.[0]?.id ?? "" },
    };
    onChange([...steps, { type, config: defaults[type] }]);
    setExpanded(new Set([steps.length]));
  };

  const getSubTab = (i: number): SubTab => subTabs[i] ?? "configuration";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Test Steps</h2>
        <Button onClick={() => addStep("http")}>
          <Plus className="h-4 w-4" />
          Add Step
        </Button>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const config = step.config;
          const isOpen = expanded.has(index);
          const name = getStepName(step.type, config, index);
          const isShared = step.type === "shared_ref";
          const assertionCount = Array.isArray(config.assertions) ? config.assertions.length : 0;
          const extractCount = config.captureVariables
            ? Object.keys(config.captureVariables).length
            : 0;

          return (
            <Card key={index} className="overflow-hidden shadow-sm">
              <div
                className="flex cursor-pointer items-center gap-3 border-b border-border bg-card px-4 py-3"
                onClick={() => toggleExpand(index)}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{name}</span>
                    {step.type === "http" && config.method && (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          METHOD_COLORS[config.method] ?? METHOD_COLORS.GET
                        )}
                      >
                        {config.method}
                      </span>
                    )}
                    {isShared && (
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                        Shared Step
                      </span>
                    )}
                  </div>
                  {config.url && (
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {config.url}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <IconBtn onClick={() => moveStep(index, -1)} disabled={index === 0} aria-label="Move up">
                    <ChevronUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1} aria-label="Move down">
                    <ChevronDown className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn onClick={() => duplicateStep(index)} aria-label="Duplicate">
                    <Copy className="h-4 w-4" />
                  </IconBtn>
                  {isShared ? (
                    <Link
                      href={`/shared-steps/${config.sharedStepId}`}
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                    >
                      <Lock className="h-4 w-4" />
                    </Link>
                  ) : (
                    <IconBtn onClick={() => toggleExpand(index)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </IconBtn>
                  )}
                  <IconBtn onClick={() => removeStep(index)} aria-label="Delete" danger>
                    <X className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>

              {isOpen && !isShared && (
                <div className="bg-card p-4">
                  {step.type === "http" && (
                    <>
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex gap-1">
                          {(
                            [
                              ["configuration", "Configuration"],
                              ["assertions", `Assertions (${assertionCount})`],
                              ["extracted", `Extracted Variables (${extractCount})`],
                            ] as const
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setSubTabs({ ...subTabs, [index]: key })}
                              className={cn(
                                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                                getSubTab(index) === key
                                  ? "bg-accent/10 text-accent"
                                  : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <Button size="sm" className="bg-success text-white hover:opacity-90" disabled>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          Run Step
                        </Button>
                      </div>

                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Step name</label>
                        <Input
                          value={config.name ?? ""}
                          onChange={(e) => updateStep(index, { ...config, name: e.target.value })}
                        />
                      </div>

                      {getSubTab(index) === "configuration" && (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                            <Select
                              value={config.method ?? "GET"}
                              onChange={(e) =>
                                updateStep(index, { ...config, method: e.target.value as StepConfigWithMeta["method"] })
                              }
                            >
                              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </Select>
                            <Input
                              placeholder="URL — supports {{variables}}"
                              value={config.url ?? ""}
                              onChange={(e) => updateStep(index, { ...config, url: e.target.value })}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Headers</label>
                            <Textarea
                              className="font-mono text-xs"
                              rows={4}
                              value={JSON.stringify(config.headers ?? {}, null, 2)}
                              onChange={(e) => {
                                try {
                                  updateStep(index, { ...config, headers: JSON.parse(e.target.value) });
                                } catch { /* ignore */ }
                              }}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Body</label>
                            <Textarea
                              className="font-mono text-xs"
                              rows={4}
                              value={config.body ?? ""}
                              onChange={(e) => updateStep(index, { ...config, body: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {getSubTab(index) === "assertions" && (
                        <Textarea
                          className="font-mono text-xs"
                          rows={8}
                          value={JSON.stringify(config.assertions ?? [], null, 2)}
                          onChange={(e) => {
                            try {
                              updateStep(index, { ...config, assertions: JSON.parse(e.target.value) });
                            } catch { /* ignore */ }
                          }}
                        />
                      )}

                      {getSubTab(index) === "extracted" && (
                        <Textarea
                          className="font-mono text-xs"
                          rows={6}
                          placeholder='{"token": "$.access_token"}'
                          value={JSON.stringify(config.captureVariables ?? {}, null, 2)}
                          onChange={(e) => {
                            try {
                              updateStep(index, { ...config, captureVariables: JSON.parse(e.target.value) });
                            } catch { /* ignore */ }
                          }}
                        />
                      )}
                    </>
                  )}

                  {step.type === "assert" && (
                    <Textarea
                      className="font-mono text-xs"
                      rows={8}
                      value={JSON.stringify(config.assertions ?? [], null, 2)}
                      onChange={(e) => {
                        try {
                          updateStep(index, { ...config, assertions: JSON.parse(e.target.value) });
                        } catch { /* ignore */ }
                      }}
                    />
                  )}

                  {step.type === "delay" && (
                    <Input
                      type="number"
                      value={config.ms ?? 1000}
                      onChange={(e) => updateStep(index, { ...config, ms: Number(e.target.value) })}
                    />
                  )}

                  {step.type === "shared_ref" && (
                    <Select
                      value={config.sharedStepId ?? ""}
                      onChange={(e) =>
                        updateStep(index, {
                          ...config,
                          sharedStepId: e.target.value,
                          name: sharedSteps?.find((s) => s.id === e.target.value)?.name,
                        })
                      }
                    >
                      <option value="">Select shared step…</option>
                      {sharedSteps?.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Select>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Select
                      value={step.type}
                      onChange={(e) => updateType(index, e.target.value as StepDraft["type"])}
                      className="max-w-[160px]"
                    >
                      <option value="http">HTTP</option>
                      <option value="assert">Assert</option>
                      <option value="delay">Delay</option>
                      <option value="shared_ref">Shared Step</option>
                    </Select>
                  </div>
                </div>
              )}

              {isOpen && isShared && (
                <div className="bg-muted/30 p-4 text-sm text-muted-foreground">
                  This step references a shared step group.{" "}
                  <Link href={`/shared-steps/${config.sharedStepId}`} className="text-accent hover:underline">
                    Edit in Shared Steps →
                  </Link>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {steps.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">No steps yet</p>
          <Button className="mt-3" variant="secondary" onClick={() => addStep()}>
            <Plus className="h-4 w-4" /> Add Step
          </Button>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  danger,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded p-1.5 transition-colors disabled:opacity-30",
        danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
