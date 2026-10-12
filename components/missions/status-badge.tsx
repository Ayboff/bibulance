import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/missions/format";

const TONES: Record<string, string> = {
  incoming: "bg-[#fff7ed] text-[#9a3412] border-[#fdba74]",
  pending_platform: "bg-accent-soft text-ink border-ring/40",
  confirmed: "bg-mint-soft text-[#166534] border-mint/50",
  assigned: "bg-[#f3e8ff] text-[#6b21a8] border-violet/40",
  in_progress: "bg-[#ecfeff] text-[#0e7490] border-accent/50",
  done: "bg-background text-muted border-border",
  cancelled: "bg-background text-muted border-border",
  refused: "bg-[#fff1f3] text-[#b4233a] border-danger/40",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-lg border px-2.5 text-xs font-bold",
        TONES[status] ?? "bg-background text-foreground border-border",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
