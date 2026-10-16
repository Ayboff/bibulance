"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MissionSourceChips } from "@/components/missions/mission-source-chips";
import { StatusBadge } from "@/components/missions/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMissionBookingMeta } from "@/lib/missions/booking-meta";
import {
  computeMissionKpis,
  formatDateKeyLong,
  isConfirmedMission,
  shiftDateKey,
  toDateKey,
  todayKey,
} from "@/lib/missions/dates";
import {
  formatDateTime,
  formatTime,
  fromDatetimeLocalValue,
  PLATFORM_LABELS,
  toDatetimeLocalValue,
} from "@/lib/missions/format";
import { useCompanyMissionsRealtime } from "@/lib/missions/realtime";
import type { Mission, MissionStatus, SourcePlatform, VehicleType } from "@/types/database";

type Vehicle = {
  id: string;
  code: string;
  vehicle_type: VehicleType;
};

const STATUS_OPTIONS: Array<MissionStatus | "all"> = [
  "all",
  "incoming",
  "pending_platform",
  "confirmed",
  "assigned",
  "refused",
];

const PLATFORM_OPTIONS: Array<SourcePlatform | "all"> = [
  "all",
  "bibulance_web",
  "amblea",
  "sps",
  "scr_urgences",
  "ptah",
  "paramedic",
  "csv",
  "manual",
];

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

export function ProMissionsBoard({
  companyId,
  initialMissions,
  initialVehicles,
}: {
  companyId: string;
  initialMissions: Mission[];
  initialVehicles: Vehicle[];
}) {
  const [missions, setMissions] = useState(initialMissions);
  const [vehicles] = useState(initialVehicles);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dateKey, setDateKey] = useState(todayKey());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<MissionStatus | "all">("all");
  const [platform, setPlatform] = useState<SourcePlatform | "all">("all");
  const [hideConfirmed, setHideConfirmed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pecLocal, setPecLocal] = useState("");

  const onRealtime = useCallback(
    ({ eventType, mission }: { eventType: string; mission: Mission }) => {
      setMissions((prev) => mergeMission(prev, mission, eventType));
    },
    [],
  );

  useCompanyMissionsRealtime(companyId, onRealtime);

  const kpis = useMemo(
    () => computeMissionKpis(missions, dateKey),
    [missions, dateKey],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return missions
      .filter((m) => toDateKey(m.rdv_time) === dateKey)
      .filter((m) => (hideConfirmed ? !isConfirmedMission(m) : true))
      .filter((m) => (status === "all" ? true : m.status === status))
      .filter((m) => (platform === "all" ? true : m.source_platform === platform))
      .filter((m) => {
        if (!query) return true;
        const hay = [
          m.patient_first_name,
          m.patient_last_name,
          m.emitter_address,
          m.destination_address,
          m.emitter_facility,
          m.destination_facility,
          m.source_platform,
          m.care_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => {
        const rank = (m: Mission) => {
          if (!m.accepted_bibulance) return 0;
          if (!m.platform_confirmation) return 1;
          if (!m.assigned_vehicle_id) return 2;
          return 3;
        };
        const d = rank(a) - rank(b);
        return d !== 0 ? d : a.rdv_time.localeCompare(b.rdv_time);
      });
  }, [missions, dateKey, hideConfirmed, status, platform, q]);

  const selected =
    filtered.find((m) => m.id === selectedId) ??
    missions.find((m) => m.id === selectedId) ??
    null;

  useEffect(() => {
    if (selectedId && !filtered.some((m) => m.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    setPecLocal(toDatetimeLocalValue(selected?.pec_estimated_time));
  }, [selected?.id, selected?.pec_estimated_time]);

  async function patchMission(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/missions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Échec mise à jour");
      setMissions((prev) => mergeMission(prev, json.mission, "UPDATE"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function savePec() {
    if (!selected || !pecLocal) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/missions/${selected.id}/pec`, {
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
      setBusy(false);
    }
  }

  const matchingVehicles = vehicles.filter((v) =>
    selected?.vehicle_type ? v.vehicle_type === selected.vehicle_type : true,
  );

  const partnersOfDay = useMemo(
    () =>
      missions.filter(
        (m) =>
          toDateKey(m.rdv_time) === dateKey &&
          getMissionBookingMeta(m).dispatch_mode === "partners",
      ).length,
    [missions, dateKey],
  );

  const iterativeOfDay = useMemo(
    () =>
      missions.filter((m) => {
        if (toDateKey(m.rdv_time) !== dateKey) return false;
        const meta = getMissionBookingMeta(m);
        return meta.booking_mode === "iterative" || !!meta.series_id;
      }).length,
    [missions, dateKey],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Aujourd’hui" value={kpis.ofDay} />
        <Kpi label="Nouvelles" value={kpis.incoming} accent />
        <Kpi label="En attente" value={kpis.pendingPlatform} />
        <Kpi
          label="Confirmées"
          value={kpis.confirmed}
          href="/pro/confirmed"
        />
        <Kpi label="Partenaires" value={partnersOfDay} />
        <Kpi label="Itératifs" value={iterativeOfDay} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[0_10px_30px_-22px_rgb(26_35_50_/_0.35)] backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDateKey((d) => shiftDateKey(d, -1))}
            aria-label="Jour précédent"
          >
            ←
          </Button>
          <Button
            type="button"
            variant={dateKey === todayKey() ? "primary" : "secondary"}
            onClick={() => setDateKey(todayKey())}
          >
            Aujourd’hui
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDateKey(shiftDateKey(todayKey(), 1))}
          >
            Demain
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDateKey((d) => shiftDateKey(d, 1))}
            aria-label="Jour suivant"
          >
            →
          </Button>
          <Input
            type="date"
            className="max-w-[11rem]"
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
            aria-label="Choisir une date"
          />
        </div>
        <p className="text-sm font-medium capitalize text-muted">
          {formatDateKeyLong(dateKey)}
        </p>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label htmlFor="search">Recherche</Label>
            <Input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Patient, adresse, source…"
            />
          </div>
          <div>
            <Label htmlFor="status">Statut</Label>
            <select
              id="status"
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
              value={status}
              onChange={(e) => setStatus(e.target.value as MissionStatus | "all")}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "Tous" : (STATUS_LABELS_SAFE[s] ?? s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="platform">Source</Label>
            <select
              id="platform"
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
              value={platform}
              onChange={(e) =>
                setPlatform(e.target.value as SourcePlatform | "all")
              }
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "Toutes" : (PLATFORM_LABELS[p] ?? p)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 text-sm font-medium">
              <input
                type="checkbox"
                className="size-5 accent-[var(--accent)]"
                checked={hideConfirmed}
                onChange={(e) => setHideConfirmed(e.target.checked)}
              />
              Masquer confirmées
            </label>
          </div>
        </div>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_10px_30px_-22px_rgb(26_35_50_/_0.35)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">
              {filtered.length} mission{filtered.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs font-medium text-muted">
              Cliquez une ligne pour réguler
            </p>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-border md:hidden">
            {filtered.map((m) => {
              const meta = getMissionBookingMeta(m);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full space-y-2.5 px-4 py-4 text-left transition ${
                      selectedId === m.id
                        ? "bg-accent-soft/80"
                        : "hover:bg-background"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">
                          {formatTime(m.rdv_time)}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-muted">
                          PEC {formatTime(m.pec_estimated_time)}
                        </p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-base font-semibold">
                      {m.patient_last_name} {m.patient_first_name}
                    </p>
                    <p className="text-sm leading-snug text-muted">
                      <span className="font-medium text-ink">
                        {m.emitter_address ?? m.emitter_facility ?? "—"}
                      </span>
                      <span className="mx-1.5 text-accent">→</span>
                      {m.destination_address ?? m.destination_facility ?? "—"}
                    </p>
                    <MissionSourceChips mission={m} />
                    {meta.dispatch_mode === "partners" &&
                    !m.accepted_bibulance ? (
                      <p className="text-xs font-semibold text-accent">
                        Ouverte aux partenaires — accepter pour la prendre
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="px-4 py-10 text-center text-muted">
                Aucune mission pour ce filtre.
              </li>
            ) : null}
          </ul>

          {/* Desktop table */}
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="border-b border-border bg-background/80 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Horaires</th>
                <th className="px-4 py-3">Patient & trajet</th>
                <th className="px-4 py-3">État</th>
                <th className="px-4 py-3">Origine</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const meta = getMissionBookingMeta(m);
                return (
                  <tr
                    key={m.id}
                    tabIndex={0}
                    onClick={() => setSelectedId(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(m.id);
                      }
                    }}
                    className={`cursor-pointer border-b border-border transition hover:bg-background focus:bg-accent-soft/70 focus:outline-none ${
                      selectedId === m.id ? "bg-accent-soft/80" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5 align-top">
                      <div className="text-xl font-semibold tabular-nums text-ink">
                        {formatTime(m.rdv_time)}
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-muted">
                        PEC {formatTime(m.pec_estimated_time)}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {m.vehicle_type}
                        {m.trip_type === "aller_retour" ? " · A/R" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-semibold">
                        {m.patient_last_name} {m.patient_first_name}
                      </div>
                      <div className="mt-1 font-medium text-ink">
                        {m.emitter_address ?? m.emitter_facility ?? "—"}
                      </div>
                      <div className="text-muted">
                        → {m.destination_address ?? m.destination_facility ?? "—"}
                      </div>
                      {meta.dispatch_mode === "partners" &&
                      !m.accepted_bibulance ? (
                        <p className="mt-1.5 text-xs font-semibold text-accent">
                          Appel partenaires
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <MissionSourceChips mission={m} />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted">
                    Aucune mission pour ce filtre.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-[0_10px_30px_-22px_rgb(26_35_50_/_0.35)] lg:sticky lg:top-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Action régulateur
          </h2>
          {!selected ? (
            <p className="text-sm text-muted">
              Sélectionnez une mission dans la liste.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="text-2xl font-semibold tabular-nums text-ink">
                  {formatTime(selected.rdv_time)}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {selected.patient_last_name} {selected.patient_first_name}
                </p>
                <p className="text-muted">
                  RDV {formatDateTime(selected.rdv_time)}
                </p>
                <p className="mt-2 leading-snug">
                  <span className="font-medium">
                    {selected.emitter_address ??
                      selected.emitter_facility ??
                      "—"}
                  </span>
                  <span className="mx-1.5 text-accent">→</span>
                  {selected.destination_address ??
                    selected.destination_facility ??
                    "—"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <MissionSourceChips mission={selected} />
                </div>
                {getMissionBookingMeta(selected).dispatch_mode ===
                  "partners" && !selected.accepted_bibulance ? (
                  <p className="mt-3 rounded-lg border border-[var(--ring)]/30 bg-accent-soft px-3 py-2 text-xs font-medium text-ink">
                    Mission ouverte aux partenaires. En acceptant, les autres
                    sociétés voient la demande se fermer.
                  </p>
                ) : null}
                <BookingContactBlock mission={selected} />
              </div>

              <div className="flex flex-col gap-2">
                {!selected.accepted_bibulance && selected.status !== "refused" ? (
                  <>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        patchMission(selected.id, { accepted_bibulance: true })
                      }
                    >
                      Accepter
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={() =>
                        patchMission(selected.id, {
                          accepted_bibulance: false,
                          status: "refused",
                        })
                      }
                    >
                      Refuser
                    </Button>
                  </>
                ) : null}

                {selected.accepted_bibulance && !selected.platform_confirmation ? (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      patchMission(selected.id, { platform_confirmation: true })
                    }
                  >
                    Confirmer plateforme
                  </Button>
                ) : null}

                {selected.accepted_bibulance && selected.platform_confirmation ? (
                  <div className="space-y-2">
                    <Label htmlFor="vehicle">Affecter un véhicule</Label>
                    <select
                      id="vehicle"
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
                      value={selected.assigned_vehicle_id ?? ""}
                      disabled={busy}
                      onChange={(e) => {
                        const value = e.target.value;
                        void patchMission(selected.id, {
                          assigned_vehicle_id: value || null,
                        });
                      }}
                    >
                      <option value="">Choisir…</option>
                      {matchingVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.code} ({v.vehicle_type})
                        </option>
                      ))}
                    </select>
                    {matchingVehicles.length === 0 ? (
                      <p className="text-xs text-muted">
                        Aucun véhicule.{" "}
                        <Link href="/pro/fleet" className="text-accent underline">
                          Gérer le parc
                        </Link>
                      </p>
                    ) : null}
                    {selected.assigned_vehicle_id ? (
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          patchMission(selected.id, {
                            assigned_vehicle_id: null,
                            assigned_driver_id: null,
                          })
                        }
                      >
                        Désaffecter
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <Label htmlFor="pec">Heure de prise en charge (PEC)</Label>
                <Input
                  id="pec"
                  type="datetime-local"
                  value={pecLocal}
                  onChange={(e) => setPecLocal(e.target.value)}
                />
                <Button
                  disabled={busy || !pecLocal}
                  onClick={() => void savePec()}
                >
                  Enregistrer la PEC
                </Button>
                <p className="text-xs text-muted">
                  Synchronisée en temps réel vers le particulier.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

const STATUS_LABELS_SAFE: Record<string, string> = {
  incoming: "Entrante",
  pending_platform: "Attente plateforme",
  confirmed: "Confirmée",
  assigned: "Affectée",
  refused: "Refusée",
};

function Kpi({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href?: string;
  accent?: boolean;
}) {
  const content = (
    <div
      className={`rounded-xl border border-border bg-card px-4 py-3 ${
        accent ? "border-ring/30 bg-accent-soft" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {content}
      </Link>
    );
  }
  return content;
}

function BookingContactBlock({ mission }: { mission: Mission }) {
  const meta = getMissionBookingMeta(mission);

  return (
    <div className="mt-3 space-y-1.5 rounded-lg border border-border/80 bg-background/80 px-3 py-2.5 text-sm">
      {meta.ordered_for_someone ? (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-accent">
            Commandé pour un proche
          </p>
          <p className="font-medium text-ink">
            Demandeur :{" "}
            {[meta.relative_firstname, meta.relative_lastname]
              .filter(Boolean)
              .join(" ") || "—"}
            {meta.relative_relation ? ` (${meta.relative_relation})` : ""}
          </p>
          {meta.relative_phone ? (
            <p className="font-medium">Tél. demandeur : {meta.relative_phone}</p>
          ) : null}
          {meta.phone ? (
            <p className="text-muted">Tél. patient : {meta.phone}</p>
          ) : null}
        </>
      ) : meta.phone ? (
        <p className="font-medium">Tél. {meta.phone}</p>
      ) : null}
      {meta.patient_birthdate ? (
        <p className="text-muted">
          Né(e) le{" "}
          {(() => {
            try {
              return new Date(`${meta.patient_birthdate}T12:00:00`).toLocaleDateString(
                "fr-FR",
              );
            } catch {
              return meta.patient_birthdate;
            }
          })()}
        </p>
      ) : null}
      {meta.patient_social_security ? (
        <p className="font-medium tabular-nums">
          N° sécu. {meta.patient_social_security}
        </p>
      ) : (
        <p className="text-xs text-muted">N° sécu. non renseigné</p>
      )}
    </div>
  );
}
