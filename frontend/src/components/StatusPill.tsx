import clsx from "clsx";

const STYLES: Record<string, string> = {
  queued: "bg-slate-500/20 text-slate-200",
  running: "bg-amber-500/20 text-amber-200",
  success: "bg-emerald-500/20 text-emerald-200",
  failed: "bg-red-500/20 text-red-200",
  cancelled: "bg-slate-500/20 text-slate-300",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
        STYLES[status] ?? "bg-muted/40 text-foreground/60",
      )}
    >
      {status}
    </span>
  );
}
