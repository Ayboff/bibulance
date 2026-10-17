"use client";

import { useCallback, useMemo, useState } from "react";

import {
  isActiveUpcomingMission,
  patientStatusDetail,
} from "@/lib/patient/status";
import { dedupePatientVisibleMissions } from "@/lib/patient/trips";
import { formatDateTime, formatTime } from "@/lib/missions/format";
import { useMissionsCreatedByRealtime } from "@/lib/missions/realtime";
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

const TONE_CLASS: Record<string, string> = {
  info: "text-[#0c4a6e] border-[#0c4a6e] bg-[#e0f2fe]",
  progress: "text-[#9a3412] border-[#9a3412] bg-[#ffedd5]",
  ok: "text-[#166534] border-[#166534] bg-[#dcfce7]",
  done: "text-[#334155] border-[#334155] bg-[#f1f5f9]",
  bad: "text-[#991b1b] border-[#991b1b] bg-[#fee2e2]",
};

export function PatientTripsList({
  userId,
  initialMissions,
  companyNames = {},
}: {
  userId: string;
  initialMissions: Mission[];
  companyNames?: Record<string, string>;
}) {
  const [missions, setMissions] = useState(initialMissions);
  const [liveMessage, setLiveMessage] = useState("");

  const onChange = useCallback(
    ({ eventType, mission }: { eventType: string; mission: Mission }) => {
      setMissions((prev) => mergeMission(prev, mission, eventType));
      if (eventType === "UPDATE") {
        const st = patientStatusDetail(mission);
        const company = companyNames[mission.company_id];
        const companyBit =
          mission.accepted_bibulance && company
            ? ` Société : ${company}.`
            : "";
        setLiveMessage(
          `Mise à jour : ${st.label}.${companyBit} Heure de prise en charge ${formatTime(mission.pec_estimated_time)}.`,
        );
      }
    },
    [companyNames],
  );

  useMissionsCreatedByRealtime(userId, onChange);

  const { upcoming, history } = useMemo(() => {
    const visible = dedupePatientVisibleMissions(missions);
    const up: Mission[] = [];
    const hist: Mission[] = [];
    for (const m of visible) {
      if (isActiveUpcomingMission(m)) up.push(m);
      else hist.push(m);
    }
    up.sort((a, b) => a.rdv_time.localeCompare(b.rdv_time));
    hist.sort((a, b) => b.rdv_time.localeCompare(a.rdv_time));
    return { upcoming: up, history: hist };
  }, [missions]);

  return (
    <div className="space-y-8">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      <TripSection
        title="À venir"
        empty="Vous n’avez aucun transport à venir."
        missions={upcoming}
        companyNames={companyNames}
      />
      <TripSection
        title="Historique"
        empty="Aucun transport dans l’historique."
        missions={history}
        companyNames={companyNames}
      />
    </div>
  );
}

function TripSection({
  title,
  empty,
  missions,
  companyNames,
}: {
  title: string;
  empty: string;
  missions: Mission[];
  companyNames: Record<string, string>;
}) {
  const headingId = `section-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-3 text-xl font-bold">
        {title}
      </h2>
      {missions.length === 0 ? (
        <p className="patient-card patient-lead">{empty}</p>
      ) : (
        <ul className="space-y-4">
          {missions.map((m) => (
            <TripCard
              key={m.id}
              mission={m}
              companyName={companyNames[m.company_id] ?? null}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TripCard({
  mission,
  companyName,
}: {
  mission: Mission;
  companyName: string | null;
}) {
  const st = patientStatusDetail(mission);
  const isClosed =
    mission.status === "cancelled" || mission.status === "refused";
  const showCompany = mission.accepted_bibulance && !isClosed;

  return (
    <li className="patient-card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`patient-status ${TONE_CLASS[st.tone]}`}>{st.label}</span>
      </div>

      <p className="text-xl font-bold">{formatDateTime(mission.rdv_time)}</p>

      {showCompany ? (
        <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--patient-soft,#e8f3f6)] px-3 py-3">
          <p className="text-base font-bold text-[var(--muted)]">
            Société d’ambulances
          </p>
          <p className="text-xl font-bold text-[var(--accent)]">
            {companyName ?? "Société partenaire"}
          </p>
          <p className="mt-1 text-base text-[var(--muted)]">
            C’est cette société qui vient vous chercher.
          </p>
        </div>
      ) : null}

      {!isClosed ? (
        <div>
          <p className="text-base font-bold text-[var(--muted)]">Prise en charge</p>
          <p className="text-2xl font-bold text-[var(--accent)]">
            {formatTime(mission.pec_estimated_time)}
          </p>
          <p className="text-base text-[var(--muted)]">
            Heure prévue pour venir vous chercher
          </p>
        </div>
      ) : null}

      <div>
        <p className="text-base font-bold text-[var(--muted)]">Trajet</p>
        <p className="text-lg font-semibold">{mission.emitter_address ?? "—"}</p>
        <p className="text-lg font-semibold" aria-hidden="true">
          ↓
        </p>
        <p className="sr-only">vers</p>
        <p className="text-lg font-semibold">
          {mission.destination_address ?? "—"}
        </p>
      </div>

      <p
        className={`text-base ${
          isClosed ? "font-semibold text-[var(--danger)]" : "text-[var(--muted)]"
        }`}
      >
        {st.hint}
      </p>

      {isClosed ? (
        <a
          href="/commander"
          className="patient-btn patient-btn-secondary inline-flex w-full items-center justify-center"
        >
          Nouvelle demande
        </a>
      ) : null}

      <p className="text-base font-semibold">
        {mission.vehicle_type === "AMB" ? "Ambulance" : "Voiture sanitaire (VSL)"}
      </p>
    </li>
  );
}
