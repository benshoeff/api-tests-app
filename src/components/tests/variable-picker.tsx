"use client";

import { useFetch } from "@/hooks/use-fetch";
import { Wrench, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalVariable {
  id: string;
  key: string;
}

interface TestVariable {
  id: string;
  key: string;
}

const TAG_COLORS: Record<string, string> = {
  violet: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50",
  blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50",
  green: "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/50",
  amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50",
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

export function VariablePicker({
  testId,
  extractedVariables,
  onInsert,
}: {
  testId?: string;
  extractedVariables: string[];
  onInsert: (token: string) => void;
}) {
  const { data: globalVars } = useFetch<GlobalVariable[]>( "/api/variables", []);
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
        items={["{{env.name}}", "{{env.baseUrl}}", "{{run.id}}"]}
        onInsert={onInsert}
      />

      <VariableGroup
        label="Random Data"
        color="amber"
        items={[
          "{{$randomEmail}}",
          "{{$randomUserName}}",
          "{{$randomName}}",
          "{{$randomFirstName}}",
          "{{$randomLastName}}",
          "{{$randomPhone}}",
          "{{$randomUUID}}",
          "{{$randomInt}}",
          "{{$randomBoolean}}",
          "{{$randomWord}}",
          "{{$timestamp}}",
        ]}
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
          Click a variable or function to insert it into the focused field.
        </span>
      </div>
    </div>
  );
}
