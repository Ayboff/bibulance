import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/missions/format";

const TONES: Record<string, string> = {
  incoming: "bg-[#f8f1e8] text-[#7a4e1e] border-[#e2c9a4]",
  pending_platform: "bg-accent-soft text-[#2f6d7c] border-ring/35",
  confirmed: "bg-mint-soft text-[#2f6b4f] border-mint/40",
  assigned: "bg-[#f3f0f8] text-[#5a4d7a] border-violet/35",
  in_progress: "bg-accent-soft text-accent border-ring/40",
  done: "bg-background text-muted border-border",
  cancelled: "bg-background text-muted border-border",
  refused: "bg-[#fdf2f4] text-[#8f3d4a] border-danger/35",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-lg border px-2.5 text-xs font-semibold",
        TONES[status] ?? "bg-background text-foreground border-border",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
