import { cn } from "@/lib/utils";
import type { RunStatus } from "@/types";

const statusStyles: Record<RunStatus | string, string> = {
  passed: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  timeout: "bg-warning/10 text-warning",
  running: "bg-accent/10 text-accent",
  pending: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function Badge({
  status,
  className,
  children,
}: {
  status?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        status && statusStyles[status],
        className
      )}
    >
      {children}
    </span>
  );
}

export function EnvPill({
  name,
  color,
  active,
  onClick,
}: {
  name: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
        active ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : "hover:opacity-80",
        `env-${color}`
      )}
      style={{
        background: `color-mix(in srgb, ${envColorMap[color] ?? envColorMap.blue} 12%, transparent)`,
        color: envColorMap[color] ?? envColorMap.blue,
      } as React.CSSProperties}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: envColorMap[color] ?? envColorMap.blue }}
      />
      {name}
    </button>
  );
}

const envColorMap: Record<string, string> = {
  blue: "#2563eb",
  green: "#16a34a",
  amber: "#d97706",
  violet: "#7c3aed",
  red: "#dc2626",
  pink: "#db2777",
  cyan: "#0891b2",
};

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
      <h3 className="text-base font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
