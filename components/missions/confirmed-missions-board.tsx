"use client";

import { useCallback, useMemo, useState } from "react";

import { MissionSourceChips } from "@/components/missions/mission-source-chips";
import { StatusBadge } from "@/components/missions/status-badge";
import {
  formatDateKeyLong,
  isConfirmedMission,
  toDateKey,
} from "@/lib/missions/dates";
import { formatTime } from "@/lib/missions/format";
import { useCompanyMissionsRealtime } from "@/lib/missions/realtime";
import type { Mission } from "@/types/database";

function mergeMission(list: Mission[], mission: Mission, eventType: string) {
  if (eventType === "DELETE" || mission.deleted_at) {
    return list.filter((m) => m.id !== mission.id);
  }
  const idx = list.findIndex((m) => m.id === mission.id);
  if (idx === -1) {
    return [...list, mission].sort((a, b) => a.rdv_time.localeCompare(b.rdv_time));
  }
  const next = [...list];
  next[idx] = mission;
  return next;
}

export function ConfirmedMissionsBoard({
  companyId,
  initialMissions,
  vehicleLabels,
}: {
  companyId: string;
  initialMissions: Mission[];
  vehicleLabels: Record<string, string>;
}) {
  const [missions, setMissions] = useState(initialMissions);
  const [q, setQ] = useState("");

  const onRealtime = useCallback(
    ({ eventType, mission }: { eventType: string; mission: Mission }) => {
      setMissions((prev) => mergeMission(prev, mission, eventType));
    },
    [],
  );
  useCompanyMissionsRealtime(companyId, onRealtime);

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const confirmed = missions
      .filter(isConfirmedMission)
      .filter((m) => {
        if (!query) return true;
        const hay = [
          m.patient_first_name,
          m.patient_last_name,
          m.emitter_address,
          m.destination_address,
          m.source_platform,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => a.rdv_time.localeCompare(b.rdv_time));

    const map = new Map<string, Mission[]>();
    for (const m of confirmed) {
      const key = toDateKey(m.rdv_time);
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [missions, q]);

  return (
    <div className="space-y-6">
      <input
        className="min-h-11 w-full max-w-md rounded-lg border border-border bg-card px-3 text-base"
        placeholder="Rechercher une mission confirmée…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Recherche confirmées"
      />

      {groups.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-muted">
          Aucune mission confirmée.
        </p>
      ) : (
        groups.map(([dateKey, rows]) => (
          <section key={dateKey} className="space-y-3">
            <h2 className="text-lg font-semibold capitalize">
              {formatDateKeyLong(dateKey)}
              <span className="ml-2 text-sm font-normal text-muted">
                ({rows.length})
              </span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <ul className="divide-y divide-border">
                {rows.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-2xl font-semibold tabular-nums text-ink">
                          {formatTime(m.rdv_time)}
                        </span>
                        <StatusBadge status={m.status} />
                        <span className="text-xs font-medium text-muted">
                          PEC {formatTime(m.pec_estimated_time)}
                        </span>
                      </div>
                      <p className="font-semibold">
                        {m.patient_last_name} {m.patient_first_name}
                      </p>
                      <p className="text-sm text-muted">
                        {m.emitter_address ?? m.emitter_facility ?? "—"} →{" "}
                        {m.destination_address ?? m.destination_facility ?? "—"}
                      </p>
                      <MissionSourceChips mission={m} />
                    </div>
                    <div className="text-sm text-muted sm:text-right">
                      <p className="font-medium text-foreground">
                        {m.assigned_vehicle_id
                          ? vehicleLabels[m.assigned_vehicle_id] ?? "Véhicule"
                          : "Non affectée"}
                      </p>
                      <p>{m.vehicle_type}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
