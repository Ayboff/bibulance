"use client";

import { useMemo } from "react";

import {
  buildFleetDayPlan,
  type VehiclePlanStatus,
} from "@/lib/fleet/availability";
import { formatTime } from "@/lib/missions/format";
import type { Mission, VehicleType } from "@/types/database";

type Vehicle = {
  id: string;
  code: string;
  vehicle_type: VehicleType;
  is_active: boolean;
};

const STATUS_STYLE: Record<
  VehiclePlanStatus,
  { badge: string; bar: string }
> = {
  disponible: {
    badge: "border-[#166534] bg-[#dcfce7] text-[#166534]",
    bar: "bg-[#22c55e]",
  },
  reserve: {
    badge: "border-[#9a3412] bg-[#ffedd5] text-[#9a3412]",
    bar: "bg-[#f97316]",
  },
  occupe: {
    badge: "border-[#0c4a6e] bg-[#e0f2fe] text-[#0c4a6e]",
    bar: "bg-[#0ea5e9]",
  },
  en_trajet: {
    badge: "border-[#5b21b6] bg-[#ede9fe] text-[#5b21b6]",
    bar: "bg-[#8b5cf6]",
  },
};

export function FleetPlanning({
  vehicles,
  missions,
}: {
  vehicles: Vehicle[];
  missions: Mission[];
}) {
  const plan = useMemo(
    () => buildFleetDayPlan(vehicles, missions),
    [vehicles, missions],
  );

  const counts = useMemo(() => {
    const c = { disponible: 0, reserve: 0, occupe: 0, en_trajet: 0 };
    for (const row of plan) c[row.status] += 1;
    return c;
  }, [plan]);

  if (vehicles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted">
        Ajoutez d’abord vos véhicules ci-dessous — le planning apparaîtra
        automatiquement.
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink">
            Planning du parc
          </h2>
          <p className="mt-1 text-sm text-muted">
            Vue régulateur : qui est libre, réservé ou en trajet — un coup d’œil
            pour affecter sans double emploi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className={`rounded-lg border px-2.5 py-1 ${STATUS_STYLE.disponible.badge}`}>
            {counts.disponible} dispo
          </span>
          <span className={`rounded-lg border px-2.5 py-1 ${STATUS_STYLE.reserve.badge}`}>
            {counts.reserve} réservé
          </span>
          <span className={`rounded-lg border px-2.5 py-1 ${STATUS_STYLE.occupe.badge}`}>
            {counts.occupe} occupé
          </span>
          <span className={`rounded-lg border px-2.5 py-1 ${STATUS_STYLE.en_trajet.badge}`}>
            {counts.en_trajet} en trajet
          </span>
        </div>
      </div>

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plan.map((row) => {
          const style = STATUS_STYLE[row.status];
          return (
            <li
              key={row.vehicleId}
              className="overflow-hidden rounded-xl border border-border bg-background"
            >
              <div className={`h-1.5 w-full ${style.bar}`} aria-hidden />
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
                      {row.code}
                    </p>
                    <p className="text-xs font-medium text-muted">
                      {row.vehicleType}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg border px-2 py-1 text-xs font-bold ${style.badge}`}
                  >
                    {row.statusLabel}
                  </span>
                </div>

                <p className="text-sm text-muted">{row.statusHint}</p>

                {row.slots.length > 0 ? (
                  <ul className="space-y-2 border-t border-border pt-3">
                    {row.slots.slice(0, 4).map((slot) => (
                      <li key={slot.missionId} className="text-sm">
                        <p className="font-semibold text-ink">
                          {formatTime(slot.rdvTime)}
                          {slot.pecTime
                            ? ` · PEC ${formatTime(slot.pecTime)}`
                            : ""}
                        </p>
                        <p className="truncate text-muted">
                          {slot.patientLabel} → {slot.destination}
                        </p>
                      </li>
                    ))}
                    {row.slots.length > 4 ? (
                      <li className="text-xs text-muted">
                        +{row.slots.length - 4} autre
                        {row.slots.length - 4 > 1 ? "s" : ""} course
                        {row.slots.length - 4 > 1 ? "s" : ""}
                      </li>
                    ) : null}
                  </ul>
                ) : (
                  <p className="border-t border-border pt-3 text-sm font-medium text-[#166534]">
                    Libre pour une nouvelle affectation
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
