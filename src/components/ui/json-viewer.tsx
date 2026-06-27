"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: unknown;
  path?: string;
  collapsedDepth?: number;
  onAssert?: (path: string, value: unknown) => void;
}

export function JsonViewer({ data, path = "$", collapsedDepth = 3, onAssert }: JsonViewerProps) {
  if (data === null) return <span className="text-red-400">null</span>;
  if (typeof data === "boolean")
    return <ValueLeaf path={path} value={data} onAssert={onAssert}><span className="text-blue-500">{String(data)}</span></ValueLeaf>;
  if (typeof data === "number")
    return <ValueLeaf path={path} value={data} onAssert={onAssert}><span className="text-emerald-500">{String(data)}</span></ValueLeaf>;
  if (typeof data === "string")
    return (
      <ValueLeaf path={path} value={data} onAssert={onAssert}>
        <span className="text-amber-600 dark:text-amber-400">
          <span className="select-none">{'"'}</span>{data}<span className="select-none">{'"'}</span>
        </span>
      </ValueLeaf>
    );

  if (Array.isArray(data))
    return <CollapsibleBlock label={`Array(${data.length})`} depth={0} collapsedDepth={collapsedDepth}>
      {data.map((item, i) => (
        <div key={i} className="flex">
          <span className="mr-2 shrink-0 text-muted-foreground">{i}:</span>
          <JsonViewer data={item} path={`${path}[${i}]`} collapsedDepth={collapsedDepth - 1} onAssert={onAssert} />
        </div>
      ))}
    </CollapsibleBlock>;

  if (typeof data === "object")
    return (
      <CollapsibleBlock label={`Object(${Object.keys(data as Record<string, unknown>).length})`} depth={0} collapsedDepth={collapsedDepth}>
        {Object.entries(data as Record<string, unknown>).map(([key, val]) => (
          <div key={key} className="flex">
            <span className="mr-2 shrink-0 text-violet-500 dark:text-violet-400">{'"'}{key}{'"'}:</span>
            <JsonViewer data={val} path={`${path}.${key}`} collapsedDepth={collapsedDepth - 1} onAssert={onAssert} />
          </div>
        ))}
      </CollapsibleBlock>
    );

  return <span className="text-muted-foreground">{String(data)}</span>;
}

/* Value leaf — shows Assert button on hover */
function ValueLeaf({
  path,
  value,
  onAssert,
  children,
}: {
  path: string;
  value: unknown;
  onAssert?: (path: string, value: unknown) => void;
  children: React.ReactNode;
}) {
  const [showAssert, setShowAssert] = useState(false);

  return (
    <span
      className="group relative"
      onMouseEnter={() => setShowAssert(true)}
      onMouseLeave={() => setShowAssert(false)}
    >
      {children}
      {onAssert && showAssert && (
        <button
          type="button"
          onClick={() => onAssert(path, value)}
          className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-accent/10 px-1 py-0.5 text-[10px] font-medium text-accent opacity-0 transition-opacity hover:bg-accent/20 group-hover:opacity-100"
          title={`Assert on ${path}`}
        >
          <Target className="h-2.5 w-2.5" />
          Assert
        </button>
      )}
    </span>
  );
}

/* Collapsible block for objects/arrays */
function CollapsibleBlock({
  label,
  depth,
  collapsedDepth,
  children,
}: {
  label: string;
  depth: number;
  collapsedDepth: number;
  children: React.ReactNode;
}) {
  const shouldCollapse = depth >= collapsedDepth;
  const [collapsed, setCollapsed] = useState(shouldCollapse);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </button>
      {!collapsed && <div className="ml-3 border-l border-border pl-3">{children}</div>}
    </div>
  );
}

/* Parse raw body string into JSON if possible */
export function parseResponseBody(body: string): { parsed: unknown; raw: string } {
  try {
    return { parsed: JSON.parse(body), raw: body };
  } catch {
    return { parsed: body, raw: body };
  }
}

/* Render response body with tabs for parsed vs raw */
export function ResponseBodyViewer({
  body,
  truncated,
  onAssert,
  jsonPathPrefix = "$",
}: {
  body: string;
  truncated?: boolean;
  onAssert?: (path: string, value: unknown) => void;
  jsonPathPrefix?: string;
}) {
  const { parsed, raw } = parseResponseBody(body);
  const isJson = parsed !== raw;
  const [tab, setTab] = useState<"parsed" | "raw">(isJson ? "parsed" : "raw");

  if (!isJson) {
    return <RawBody text={raw} truncated={truncated} />;
  }

  return (
    <div>
      <div className="mb-2 flex gap-2 border-b border-border">
        <TabBtn active={tab === "parsed"} onClick={() => setTab("parsed")}>
          JSON
        </TabBtn>
        <TabBtn active={tab === "raw"} onClick={() => setTab("raw")}>
          Raw
        </TabBtn>
      </div>
      {tab === "parsed" ? (
        <div className="overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">
          <JsonViewer data={parsed} path={jsonPathPrefix} collapsedDepth={3} onAssert={onAssert} />
        </div>
      ) : (
        <RawBody text={raw} truncated={truncated} />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "text-accent"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function RawBody({ text, truncated }: { text: string; truncated?: boolean }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">
        {text || <span className="italic text-muted-foreground">(empty)</span>}
      </pre>
      {truncated && (
        <span className="absolute right-2 top-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          Truncated
        </span>
      )}
    </div>
  );
}
