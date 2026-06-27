"use client";

import { useCallback, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Lightbulb,
  Pencil,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Assertion } from "@/types";
import {
  DYNAMIC_FUNCTIONS,
  ELEMENT_SELECTORS,
  OPERATORS,
  UI_ASSERTION_TYPES,
  defaultAssertion,
  formatAssertionSummary,
  normalizeAssertion,
  toUiType,
  type AssertionOperator,
  type ElementSelector,
  type UiAssertionType,
} from "@/lib/assertion-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";

interface GlobalVariable {
  id: string;
  key: string;
}

interface TestVariable {
  id: string;
  key: string;
}

export function AssertionsEditor({
  assertions,
  onChange,
  testId,
  extractedVariables = [],
}: {
  assertions: Assertion[];
  onChange: (assertions: Assertion[]) => void;
  testId?: string;
  extractedVariables?: string[];
}) {
  const normalized = assertions.map(normalizeAssertion);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Assertion | null>(null);
  const [isNew, setIsNew] = useState(false);

  const startNew = () => {
    setDraft(defaultAssertion("status"));
    setEditingIndex(null);
    setIsNew(true);
  };

  const startEdit = (index: number) => {
    setDraft({ ...normalized[index] });
    setEditingIndex(index);
    setIsNew(false);
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditingIndex(null);
    setIsNew(false);
  };

  const saveDraft = () => {
    if (!draft) return;
    const next = [...normalized];
    if (isNew) next.push(draft);
    else if (editingIndex !== null) next[editingIndex] = draft;
    onChange(next);
    cancelEdit();
  };

  const removeAssertion = (index: number) => {
    onChange(normalized.filter((_, i) => i !== index));
    if (editingIndex === index) cancelEdit();
  };

  const duplicateAssertion = (index: number) => {
    const copy = { ...normalized[index] };
    onChange([...normalized.slice(0, index + 1), copy, ...normalized.slice(index + 1)]);
  };

  const updateDraft = (patch: Partial<Assertion>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const changeUiType = (uiType: UiAssertionType) => {
    setDraft(defaultAssertion(uiType));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Code2 className="h-4 w-4 text-accent" />
          Assertions ({normalized.length})
        </div>
        {!draft && (
          <button
            type="button"
            onClick={startNew}
            className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            New Assertion
          </button>
        )}
      </div>

      {draft && (
        <AssertionEditCard
          draft={draft}
          isNew={isNew}
          testId={testId}
          extractedVariables={extractedVariables}
          onChangeUiType={changeUiType}
          onUpdate={updateDraft}
          onSave={saveDraft}
          onCancel={cancelEdit}
        />
      )}

      {normalized.length === 0 && !draft ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No assertions yet</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={startNew}>
            <Plus className="h-3.5 w-3.5" />
            Add first assertion
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {normalized.map((assertion, index) => {
            const isEditingThis = !isNew && editingIndex === index;
            if (isEditingThis) return null;

            return (
              <div
                key={index}
                className="group flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/[0.04] px-3 py-2.5 transition-colors hover:border-accent/30 hover:bg-accent/[0.07]"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                <p className="min-w-0 flex-1 text-sm">{formatAssertionSummary(assertion)}</p>
                <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                  <IconAction label="Duplicate" onClick={() => duplicateAssertion(index)}>
                    <Copy className="h-3.5 w-3.5" />
                  </IconAction>
                  <IconAction label="Edit" onClick={() => startEdit(index)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </IconAction>
                  <IconAction label="Delete" onClick={() => removeAssertion(index)} danger>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconAction>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssertionEditCard({
  draft,
  isNew,
  testId,
  extractedVariables,
  onChangeUiType,
  onUpdate,
  onSave,
  onCancel,
}: {
  draft: Assertion;
  isNew: boolean;
  testId?: string;
  extractedVariables: string[];
  onChangeUiType: (type: UiAssertionType) => void;
  onUpdate: (patch: Partial<Assertion>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const uiType = toUiType(draft);
  const expectedRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = useCallback(
    (token: string) => {
      const el = expectedRef.current;
      const wrapped = token.startsWith("{{") ? token : `{{${token}}}`;
      if (!el) {
        onUpdate({ expected: String(draft.expected) + wrapped });
        return;
      }
      const start = el.selectionStart ?? String(draft.expected).length;
      const end = el.selectionEnd ?? start;
      const current = String(draft.expected);
      const next = current.slice(0, start) + wrapped + current.slice(end);
      onUpdate({ expected: next });
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + wrapped.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [draft.expected, onUpdate]
  );

  const showOperator = uiType !== "status" && uiType !== "responseTime";
  const showExpected = draft.operator !== "undefined" && draft.operator !== "is_not_empty";
  const operatorsForType =
    uiType === "responseTime"
      ? OPERATORS.filter((o) => o.value === "lt")
      : uiType === "body"
        ? OPERATORS.filter((o) =>
            ["is", "is_not", "contains", "not_contains", "regex", "not_regex", "is_not_empty"].includes(o.value)
          )
        : OPERATORS;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <h4 className="text-sm font-semibold">{isNew ? "New Assertion" : "Edit Assertion"}</h4>
        <p className="text-xs text-muted-foreground">Configure what the response should match</p>
      </div>

      <div className="space-y-4 p-4">
        <Field label="Assertion Type">
          <Select
            value={uiType}
            onChange={(e) => onChangeUiType(e.target.value as UiAssertionType)}
          >
            {UI_ASSERTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        {uiType === "bodyValue" && (
          <Field label="JSONPath">
            <Input
              value={draft.target ?? ""}
              onChange={(e) => onUpdate({ target: e.target.value })}
              placeholder="$.data.id"
              className="font-mono text-sm"
            />
          </Field>
        )}

        {uiType === "header" && (
          <Field label="Header Name">
            <Input
              value={draft.target ?? ""}
              onChange={(e) => onUpdate({ target: e.target.value })}
              placeholder="content-type"
              className="font-mono text-sm"
            />
          </Field>
        )}

        {uiType === "bodyValue" && (
          <Field label="Element Selector">
            <Select
              value={draft.elementSelector ?? "body"}
              onChange={(e) => onUpdate({ elementSelector: e.target.value as ElementSelector })}
            >
              {ELEMENT_SELECTORS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className={cn("grid gap-3", showOperator && showExpected && "sm:grid-cols-2")}>
          {showOperator && (
            <Field label="Operator">
              <Select
                value={draft.operator ?? "is"}
                onChange={(e) => onUpdate({ operator: e.target.value as AssertionOperator })}
              >
                {operatorsForType.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {uiType === "status" && (
            <Field label="Expected Status Code">
              <Input
                type="number"
                value={draft.expected}
                onChange={(e) => onUpdate({ expected: Number(e.target.value) })}
              />
            </Field>
          )}

          {uiType === "responseTime" && (
            <Field label="Max Response Time (ms)">
              <Input
                type="number"
                value={draft.expected}
                onChange={(e) => onUpdate({ expected: Number(e.target.value) })}
              />
            </Field>
          )}

          {showExpected && uiType !== "status" && uiType !== "responseTime" && (
            <Field label="Expected Value" className={!showOperator ? "sm:col-span-2" : undefined}>
              <Textarea
                ref={expectedRef}
                rows={2}
                value={String(draft.expected)}
                onChange={(e) => onUpdate({ expected: e.target.value })}
                placeholder='e.g. "active" or {{MY_VAR}}'
                className="font-mono text-sm"
              />
            </Field>
          )}
        </div>

        {showExpected && uiType !== "status" && uiType !== "responseTime" && (
          <VariablePicker
            testId={testId}
            extractedVariables={extractedVariables}
            onInsert={insertVariable}
          />
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave}>
          <Check className="h-3.5 w-3.5" />
          {isNew ? "Add Assertion" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function VariablePicker({
  testId,
  extractedVariables,
  onInsert,
}: {
  testId?: string;
  extractedVariables: string[];
  onInsert: (token: string) => void;
}) {
  const { data: globalVars } = useFetch<GlobalVariable[]>("/api/variables", []);
  const { data: testVars } = useFetch<TestVariable[]>(
    testId ? `/api/tests/${testId}/variables` : null,
    [testId]
  );

  return (
    <div className="rounded-xl border border-accent/15 bg-accent/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-accent">
        <Wrench className="h-3.5 w-3.5" />
        Available Variables &amp; Functions
      </div>

      <VariableGroup
        label="Dynamic Functions"
        color="violet"
        items={DYNAMIC_FUNCTIONS}
        onInsert={onInsert}
      />

      {globalVars && globalVars.length > 0 && (
        <VariableGroup
          label="Global Variables"
          color="blue"
          items={globalVars.map((v) => `{{${v.key}}}`)}
          onInsert={onInsert}
        />
      )}

      {testVars && testVars.length > 0 && (
        <VariableGroup
          label="Test Variables"
          color="green"
          items={testVars.map((v) => `{{${v.key}}}`)}
          onInsert={onInsert}
        />
      )}

      {extractedVariables.length > 0 && (
        <VariableGroup
          label="Extracted from steps"
          color="amber"
          items={extractedVariables.map((v) => `{{${v}}}`)}
          onInsert={onInsert}
        />
      )}

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-background/60 px-3 py-2 text-xs text-muted-foreground">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        <span>
          Click a variable or function to insert it into the expected value field.
        </span>
      </div>
    </div>
  );
}

const TAG_COLORS: Record<string, string> = {
  violet:
    "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50",
  blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50",
  green:
    "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/50",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50",
};

function VariableGroup({
  label,
  color,
  items,
  onInsert,
}: {
  label: string;
  color: keyof typeof TAG_COLORS;
  items: string[];
  onInsert: (token: string) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onInsert(item)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors",
              TAG_COLORS[color]
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function IconAction({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 transition-colors",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function collectExtractedVariables(
  steps: { config: { captureVariables?: Record<string, string> } }[],
  beforeIndex: number
): string[] {
  const vars = new Set<string>();
  for (let i = 0; i < beforeIndex; i++) {
    const cv = steps[i].config.captureVariables;
    if (cv) Object.keys(cv).forEach((k) => vars.add(k));
  }
  return [...vars];
}

export function parseAssertions(raw: unknown): Assertion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeAssertion);
}
