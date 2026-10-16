import type { ReactNode } from "react";

import { getMissionBookingMeta } from "@/lib/missions/booking-meta";
import { PLATFORM_LABELS } from "@/lib/missions/format";
import type { Mission } from "@/types/database";

export function MissionSourceChips({
  mission,
  compact,
}: {
  mission: Mission;
  compact?: boolean;
}) {
  const meta = getMissionBookingMeta(mission);
  const platform =
    PLATFORM_LABELS[mission.source_platform] ?? mission.source_platform;

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "mt-1"}`}>
      <Chip tone="neutral">{platform}</Chip>
      {meta.dispatch_mode === "partners" ? (
        <Chip tone="accent">Partenaires</Chip>
      ) : null}
      {meta.booking_mode === "iterative" || meta.series_id ? (
        <Chip tone="mint">Itératif</Chip>
      ) : null}
      {mission.trip_type === "aller_retour" ? (
        <Chip tone="neutral">A/R</Chip>
      ) : null}
    </div>
  );
}

function Chip({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "accent" | "mint";
}) {
  const tones = {
    neutral: "border-border bg-background text-muted",
    accent: "border-[var(--ring)]/40 bg-accent-soft text-accent",
    mint: "border-[var(--mint)]/35 bg-mint-soft text-[var(--mint)]",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
