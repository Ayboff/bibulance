"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { MissionSourceChips } from "@/components/missions/mission-source-chips";
import { StatusBadge } from "@/components/missions/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { vehicleBusyLabel } from "@/lib/fleet/availability";
import { getMissionBookingMeta } from "@/lib/missions/booking-meta";
import {
  formatDateKeyLong,
  isConfirmedMission,
  toDateKey,
  todayKey,
} from "@/lib/missions/dates";
import {
  formatDateTime,
  formatTime,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/missions/format";
import { useCompanyMissionsRealtime } from "@/lib/missions/realtime";
import type { Mission, VehicleType } from "@/types/database";

type ViewMode = "upcoming" | "history";

type Vehicle = {
  id: string;
  code: string;
  vehicle_type: VehicleType;
};

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
  const meta = getMissionBookingMeta(m);
  const hay = [
    m.patient_first_name,
    m.patient_last_name,
    m.emitter_address,
    m.destination_address,
    m.source_platform,
    meta.phone,
    meta.relative_phone,
    meta.relative_firstname,
    meta.relative_lastname,
    meta.patient_social_security,
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

function formatBirthdateFr(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function vehicleLabelOf(vehicles: Vehicle[], id: string | null | undefined) {
  if (!id) return null;
  const v = vehicles.find((x) => x.id === id);
  return v ? `${v.code} (${v.vehicle_type})` : "Véhicule";
}

export function ConfirmedMissionsBoard({
  companyId,
  initialMissions,
  vehicles,
}: {
  companyId: string;
  initialMissions: Mission[];
  vehicles: Vehicle[];
}) {
  const [missions, setMissions] = useState(initialMissions);
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewMode>("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const today = todayKey();

  const onRealtime = useCallback(
    ({ eventType, mission }: { eventType: string; mission: Mission }) => {
      setMissions((prev) => mergeMission(prev, mission, eventType));
    },
    [],
  );
  useCompanyMissionsRealtime(companyId, onRealtime);

  async function patchMission(id: string, body: Record<string, unknown>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/missions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Mise à jour impossible");
      setMissions((prev) => mergeMission(prev, json.mission, "UPDATE"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function patchPec(id: string, pecLocal: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/missions/${id}/pec`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pec_estimated_time: fromDatetimeLocalValue(pecLocal),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Échec PEC");
      setMissions((prev) => mergeMission(prev, json.mission, "UPDATE"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const { upcomingCount, historyCount, groups, flatVisible } = useMemo(() => {
    const query = q.trim().toLowerCase();
    const confirmed = missions.filter(isConfirmedMission).filter((m) =>
      matchesQuery(m, query),
    );

    const upcoming = confirmed.filter((m) => toDateKey(m.rdv_time) >= today);
    const history = confirmed.filter((m) => toDateKey(m.rdv_time) < today);
    const visible = view === "upcoming" ? upcoming : history;
    const groupsBuilt =
      view === "upcoming"
        ? groupByDate(upcoming, "asc")
        : groupByDate(history, "desc");

    return {
      upcomingCount: upcoming.length,
      historyCount: history.length,
      groups: groupsBuilt,
      flatVisible: visible,
    };
  }, [missions, q, today, view]);

  const selected =
    flatVisible.find((m) => m.id === selectedId) ??
    missions.find((m) => m.id === selectedId) ??
    null;

  useEffect(() => {
    if (selectedId && !flatVisible.some((m) => m.id === selectedId)) {
      setSelectedId(null);
    }
  }, [flatVisible, selectedId]);

  const editable =
    view === "upcoming" &&
    selected != null &&
    selected.status !== "cancelled" &&
    selected.status !== "refused" &&
    selected.status !== "done";

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
            onClick={() => {
              setView("upcoming");
              setSelectedId(null);
            }}
            label="À venir"
            count={upcomingCount}
            hint="Aujourd’hui et jours suivants"
          />
          <ViewTab
            active={view === "history"}
            onClick={() => {
              setView("history");
              setSelectedId(null);
            }}
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
          ? "Cliquez une mission pour modifier véhicule, PEC ou statut."
          : "Missions confirmées des jours passés — consultation."}
      </p>

      {error ? (
        <p
          className="rounded-xl border border-[var(--danger)]/30 bg-[#fee2e2] px-3 py-2 text-sm font-semibold text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {groups.length === 0 ? (
        <EmptyState view={view} hasQuery={q.trim().length > 0} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
          <div className="space-y-5">
            {groups.map(([dateKey, rows]) => {
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
                      {rows.map((m) => {
                        const active = selectedId === m.id;
                        return (
                          <li key={m.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(m.id)}
                              className={`flex w-full flex-col gap-2 px-4 py-4 text-left transition sm:flex-row sm:items-center sm:justify-between ${
                                active
                                  ? "bg-accent-soft/80"
                                  : "hover:bg-background"
                              }`}
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
                                  {m.emitter_address ??
                                    m.emitter_facility ??
                                    "—"}{" "}
                                  →{" "}
                                  {m.destination_address ??
                                    m.destination_facility ??
                                    "—"}
                                </p>
                                <MissionSourceChips mission={m} />
                              </div>
                              <div className="text-sm text-muted sm:text-right">
                                <p className="font-medium text-foreground">
                                  {vehicleLabelOf(vehicles, m.assigned_vehicle_id) ??
                                    "Non affectée"}
                                </p>
                                <p>{m.vehicle_type}</p>
                                <p className="mt-1 text-xs font-semibold text-accent">
                                  {view === "upcoming"
                                    ? "Modifier →"
                                    : "Voir le détail →"}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </section>
              );
            })}
          </div>

          <aside
            className="h-fit space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-[0_10px_30px_-22px_rgb(26_35_50_/_0.35)] xl:sticky xl:top-4"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                Détail mission
              </h2>
              {selected ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-muted hover:text-ink"
                  onClick={() => setSelectedId(null)}
                >
                  Fermer
                </button>
              ) : null}
            </div>
            {!selected ? (
              <p className="text-sm text-muted">
                Sélectionnez une mission pour voir et modifier l’affectation.
              </p>
            ) : (
              <ConfirmedMissionDetail
                mission={selected}
                vehicles={vehicles}
                missions={missions}
                editable={editable}
                busy={busy}
                onPatch={(body) => void patchMission(selected.id, body)}
                onPec={(local) => void patchPec(selected.id, local)}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function ConfirmedMissionDetail({
  mission,
  vehicles,
  missions,
  editable,
  busy,
  onPatch,
  onPec,
}: {
  mission: Mission;
  vehicles: Vehicle[];
  missions: Mission[];
  editable: boolean;
  busy: boolean;
  onPatch: (body: Record<string, unknown>) => void;
  onPec: (pecLocal: string) => void;
}) {
  const meta = getMissionBookingMeta(mission);
  const birth = formatBirthdateFr(meta.patient_birthdate);
  const tripLabel =
    mission.trip_type === "aller_retour"
      ? "Aller-retour"
      : mission.trip_type === "retour"
        ? "Retour"
        : "Aller";

  const [pecLocal, setPecLocal] = useState(
    toDatetimeLocalValue(mission.pec_estimated_time),
  );
  const [notes, setNotes] = useState(mission.notes ?? "");

  useEffect(() => {
    setPecLocal(toDatetimeLocalValue(mission.pec_estimated_time));
    setNotes(mission.notes ?? "");
  }, [mission.id, mission.pec_estimated_time, mission.notes]);

  const vehicleOptions = useMemo(() => {
    return vehicles
      .filter((v) =>
        mission.vehicle_type ? v.vehicle_type === mission.vehicle_type : true,
      )
      .map((v) => {
        const busyLabel =
          mission.assigned_vehicle_id === v.id
            ? null
            : vehicleBusyLabel(v.id, mission, missions);
        return { ...v, busyLabel };
      });
  }, [vehicles, missions, mission]);

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-2xl font-semibold tabular-nums text-ink">
          {formatTime(mission.rdv_time)}
        </p>
        <p className="mt-1 text-lg font-semibold">
          {mission.patient_last_name} {mission.patient_first_name}
        </p>
        <p className="text-muted">RDV {formatDateTime(mission.rdv_time)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={mission.status} />
          <MissionSourceChips mission={mission} />
        </div>
      </div>

      <DetailBlock title="Trajet">
        <DetailRow
          label="Départ"
          value={mission.emitter_address ?? mission.emitter_facility ?? "—"}
        />
        <DetailRow
          label="Arrivée"
          value={
            mission.destination_address ?? mission.destination_facility ?? "—"
          }
        />
        <DetailRow label="Type de trajet" value={tripLabel} />
        <DetailRow
          label="Véhicule demandé"
          value={mission.vehicle_type === "AMB" ? "Ambulance" : "VSL"}
        />
        {editable ? (
          <div className="space-y-2 pt-1">
            <Label htmlFor="pec-edit">Prise en charge (PEC)</Label>
            <input
              id="pec-edit"
              type="datetime-local"
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
              value={pecLocal}
              disabled={busy}
              onChange={(e) => setPecLocal(e.target.value)}
            />
            <Button
              variant="secondary"
              disabled={busy || !pecLocal}
              onClick={() => onPec(pecLocal)}
            >
              Enregistrer la PEC
            </Button>
          </div>
        ) : (
          <DetailRow
            label="Prise en charge (PEC)"
            value={formatDateTime(mission.pec_estimated_time)}
          />
        )}
      </DetailBlock>

      <DetailBlock title="Patient">
        <DetailRow
          label="Nom"
          value={`${mission.patient_last_name ?? ""} ${mission.patient_first_name ?? ""}`.trim() || "—"}
        />
        {birth ? <DetailRow label="Date de naissance" value={birth} /> : null}
        {meta.phone ? (
          <DetailRow
            label="Téléphone"
            value={
              <a
                href={`tel:${meta.phone.replace(/\s/g, "")}`}
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                {meta.phone}
              </a>
            }
          />
        ) : (
          <DetailRow label="Téléphone" value="Non renseigné" muted />
        )}
        {meta.patient_social_security ? (
          <DetailRow
            label="N° sécu."
            value={
              <span className="font-semibold tabular-nums">
                {meta.patient_social_security}
              </span>
            }
          />
        ) : (
          <DetailRow label="N° sécu." value="Non renseigné" muted />
        )}
      </DetailBlock>

      {meta.ordered_for_someone ? (
        <DetailBlock title="Commandé pour un proche">
          <DetailRow
            label="Demandeur"
            value={
              [meta.relative_firstname, meta.relative_lastname]
                .filter(Boolean)
                .join(" ") || "—"
            }
          />
          {meta.relative_relation ? (
            <DetailRow label="Lien" value={meta.relative_relation} />
          ) : null}
          {meta.relative_phone ? (
            <DetailRow
              label="Tél. demandeur"
              value={
                <a
                  href={`tel:${meta.relative_phone.replace(/\s/g, "")}`}
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  {meta.relative_phone}
                </a>
              }
            />
          ) : (
            <DetailRow label="Tél. demandeur" value="Non renseigné" muted />
          )}
        </DetailBlock>
      ) : null}

      <DetailBlock title="Affectation">
        {editable ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="vehicle-edit">Véhicule</Label>
              <select
                id="vehicle-edit"
                className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
                value={mission.assigned_vehicle_id ?? ""}
                disabled={busy}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    onPatch({
                      assigned_vehicle_id: null,
                      assigned_driver_id: null,
                    });
                    return;
                  }
                  const option = vehicleOptions.find((v) => v.id === value);
                  if (option?.busyLabel) {
                    window.alert(
                      `${option.code} : ${option.busyLabel}. Choisissez un autre véhicule.`,
                    );
                    e.target.value = mission.assigned_vehicle_id ?? "";
                    return;
                  }
                  onPatch({ assigned_vehicle_id: value });
                }}
              >
                <option value="">Non affectée…</option>
                {vehicleOptions.map((v) => (
                  <option
                    key={v.id}
                    value={v.id}
                    disabled={Boolean(v.busyLabel)}
                  >
                    {v.code} ({v.vehicle_type})
                    {v.busyLabel ? ` — ${v.busyLabel}` : " — libre"}
                  </option>
                ))}
              </select>
              {mission.assigned_vehicle_id ? (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    onPatch({
                      assigned_vehicle_id: null,
                      assigned_driver_id: null,
                    })
                  }
                >
                  Désaffecter
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes-edit">Notes (régulation)</Label>
              <textarea
                id="notes-edit"
                className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
                value={notes}
                disabled={busy}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button
                variant="secondary"
                disabled={busy || notes === (mission.notes ?? "")}
                onClick={() => onPatch({ notes: notes.trim() || null })}
              >
                Enregistrer les notes
              </Button>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              {mission.status === "confirmed" || mission.status === "assigned" ? (
                <Button
                  disabled={busy || !mission.assigned_vehicle_id}
                  onClick={() => onPatch({ status: "in_progress" })}
                >
                  Marquer en trajet
                </Button>
              ) : null}
              {mission.status === "in_progress" ? (
                <Button
                  disabled={busy}
                  onClick={() => onPatch({ status: "done" })}
                >
                  Marquer terminée
                </Button>
              ) : null}
              {!mission.assigned_vehicle_id ? (
                <p className="text-xs text-muted">
                  Affectez un véhicule avant de passer « en trajet ».
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <DetailRow
              label="Véhicule"
              value={
                vehicleLabelOf(vehicles, mission.assigned_vehicle_id) ??
                "Non affectée"
              }
            />
            {mission.notes ? (
              <DetailRow label="Notes" value={mission.notes} />
            ) : null}
          </>
        )}
        {mission.care_type ? (
          <DetailRow label="Motif / soin" value={mission.care_type} />
        ) : null}
      </DetailBlock>
    </div>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-background/70 px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: ReactNode;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-0.5 leading-snug ${muted ? "text-muted" : "text-ink"}`}>
        {value}
      </p>
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
