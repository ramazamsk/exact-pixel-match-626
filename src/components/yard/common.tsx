import { cn } from "@/lib/utils";
import type { OpStatus, Severity } from "@/lib/yard/types";

export const statusLabel: Record<OpStatus, string> = {
  pending: "Ожидает", running: "Выполняется", paused: "Приостановлена", done: "Завершена", blocked: "Заблокирована",
};

const statusCls: Record<OpStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-primary/20 text-primary",
  paused: "bg-warning/15 text-warning",
  done: "bg-success/15 text-success",
  blocked: "bg-destructive/20 text-destructive",
};

export function StatusPill({ status }: { status: OpStatus }) {
  return <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", statusCls[status])}>{statusLabel[status]}</span>;
}

export function SeverityDot({ severity, className }: { severity: Severity | "ok"; className?: string }) {
  return <span className={cn("inline-block size-2 rounded-full", severity === "critical" ? "bg-destructive" : severity === "warning" ? "bg-warning" : "bg-success", className)} />;
}

export const opBarCls: Record<OpStatus, string> = {
  pending: "bg-primary/35 border-primary/60",
  running: "bg-primary border-primary animate-pulse",
  paused: "bg-warning/40 border-warning",
  done: "bg-success/40 border-success/70",
  blocked: "bg-destructive/40 border-destructive",
};

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>
      {right}
    </div>
  );
}
