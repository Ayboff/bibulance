"use client";

import { useCallback, useMemo, useState } from "react";

import { MissionSourceChips } from "@/components/missions/mission-source-chips";
import { StatusBadge } from "@/components/missions/status-badge";
import {
  formatDateKeyLong,
  isConfirmedMission,
  toDateKey,
  todayKey,
} from "@/lib/missions/dates";
import { formatTime } from "@/lib/missions/format";
import { useCompanyMissionsRealtime } from "@/lib/missions/realtime";
import type { Mission } from "@/types/database";

type ViewMode = "upcoming" | "history";

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

function matchesQuery(m: Mission, query: string) {
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
}

function groupByDate(
  rows: Mission[],
  order: "asc" | "desc",
): Array<[string, Mission[]]> {
  const map = new Map<string, Mission[]>();
  for (const m of rows) {
    const key = toDateKey(m.rdv_time);
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.rdv_time.localeCompare(b.rdv_time));
  }
  return Array.from(map.entries()).sort(([a], [b]) =>
    order === "asc" ? a.localeCompare(b) : b.localeCompare(a),
  );
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
  const [view, setView] = useState<ViewMode>("upcoming");
  const today = todayKey();

  const onRealtime = useCallback(
    ({ eventType, mission }: { eventType: string; mission: Mission }) => {
      setMissions((prev) => mergeMission(prev, mission, eventType));
    },
    [],
  );
  useCompanyMissionsRealtime(companyId, onRealtime);

  const { upcomingCount, historyCount, groups } = useMemo(() => {
    const query = q.trim().toLowerCase();
    const confirmed = missions.filter(isConfirmedMission).filter((m) =>
      matchesQuery(m, query),
    );

    const upcoming = confirmed.filter((m) => toDateKey(m.rdv_time) >= today);
    const history = confirmed.filter((m) => toDateKey(m.rdv_time) < today);

    return {
      upcomingCount: upcoming.length,
      historyCount: history.length,
      groups:
        view === "upcoming"
          ? groupByDate(upcoming, "asc")
          : groupByDate(history, "desc"),
    };
  }, [missions, q, today, view]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex w-full max-w-md rounded-xl border border-border bg-card p-1 shadow-[0_8px_24px_-20px_rgb(26_35_50_/_0.4)]"
          role="tablist"
          aria-label="Périmètre du planning confirmé"
        >
          <ViewTab
            active={view === "upcoming"}
            onClick={() => setView("upcoming")}
            label="À venir"
            count={upcomingCount}
            hint="Aujourd’hui et jours suivants"
          />
          <ViewTab
            active={view === "history"}
            onClick={() => setView("history")}
            label="Historique"
            count={historyCount}
            hint="Dates passées"
          />
        </div>

        <input
          className="min-h-11 w-full max-w-md rounded-lg border border-border bg-card px-3 text-base sm:ml-auto"
          placeholder={
            view === "upcoming"
              ? "Rechercher dans le planning…"
              : "Rechercher dans l’historique…"
          }
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Recherche missions confirmées"
        />
      </div>

      <p className="text-sm text-muted">
        {view === "upcoming"
          ? "Seules les missions d’aujourd’hui et à venir apparaissent ici. Les journées terminées passent automatiquement dans l’historique."
          : "Missions confirmées des jours passés — consultation uniquement, hors planning du jour."}
      </p>

      {groups.length === 0 ? (
        <EmptyState view={view} hasQuery={q.trim().length > 0} />
      ) : (
        groups.map(([dateKey, rows]) => {
          const isToday = dateKey === today;
          return (
            <section key={dateKey} className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-semibold capitalize text-ink">
                  {formatDateKeyLong(dateKey)}
                </h2>
                {isToday && view === "upcoming" ? (
                  <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-accent">
                    Aujourd’hui
                  </span>
                ) : null}
                <span className="text-sm text-muted">
                  {rows.length} mission{rows.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_10px_30px_-22px_rgb(26_35_50_/_0.35)]">
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
                          {m.destination_address ??
                            m.destination_facility ??
                            "—"}
                        </p>
                        <MissionSourceChips mission={m} />
                      </div>
                      <div className="text-sm text-muted sm:text-right">
                        <p className="font-medium text-foreground">
                          {m.assigned_vehicle_id
                            ? (vehicleLabels[m.assigned_vehicle_id] ??
                              "Véhicule")
                            : "Non affectée"}
                        </p>
                        <p>{m.vehicle_type}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  label,
  count,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      title={hint}
      onClick={onClick}
      className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
        active
          ? "bg-accent text-accent-foreground shadow-sm"
          : "text-muted hover:bg-background hover:text-ink"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${
          active ? "bg-white/20" : "bg-background text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({
  view,
  hasQuery,
}: {
  view: ViewMode;
  hasQuery: boolean;
}) {
  if (hasQuery) {
    return (
      <p className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-muted">
        Aucun résultat pour cette recherche.
      </p>
    );
  }

  if (view === "upcoming") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-12 text-center">
        <p className="text-lg font-semibold text-ink">
          Aucune mission confirmée à venir
        </p>
        <p className="mt-2 text-sm text-muted">
          Le planning du jour et des prochains jours apparaîtra ici dès
          validation.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-12 text-center">
      <p className="text-lg font-semibold text-ink">Historique vide</p>
      <p className="mt-2 text-sm text-muted">
        Les journées passées rejoindront automatiquement cet historique.
      </p>
    </div>
  );
}
