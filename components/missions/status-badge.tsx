import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/missions/format";

const TONES: Record<string, string> = {
  incoming: "bg-amber-100 text-amber-900 border-amber-200",
  pending_platform: "bg-sky-100 text-sky-900 border-sky-200",
  confirmed: "bg-emerald-100 text-emerald-900 border-emerald-200",
  assigned: "bg-teal-100 text-teal-900 border-teal-200",
  in_progress: "bg-indigo-100 text-indigo-900 border-indigo-200",
  done: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  refused: "bg-red-100 text-red-800 border-red-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-md border px-2.5 text-xs font-semibold",
        TONES[status] ?? "bg-background text-foreground border-border",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
