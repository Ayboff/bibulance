"use client";

import { useEffect, useState } from "react";

const PHASES = [
  {
    caption: "1 · Une demande arrive",
    sell: "Patient Bibulance ou plateforme : tout tombe dans la même file.",
    badge: "Nouvelle",
    badgeTone: "accent" as const,
    patient: "Martin · Dialyse",
    route: "Créteil → Henri Mondor",
    time: "10:15",
    panelTitle: "À faire",
    panelBody: "Ouvrir la mission et choisir un véhicule de la flotte.",
    cta: "Prendre en charge",
    vehicle: null,
  },
  {
    caption: "2 · Vous assignez le véhicule",
    sell: "Avant de confirmer : le bon véhicule, la bonne équipe.",
    badge: "Assignation",
    badgeTone: "accent" as const,
    patient: "Martin · Dialyse",
    route: "Créteil → Henri Mondor",
    time: "10:15",
    panelTitle: "Flotte disponible",
    panelBody: "AMB-12 sélectionnée · chauffeur prêt.",
    cta: "Confirmer la mission",
    vehicle: "AMB-12",
  },
  {
    caption: "3 · Mission confirmée",
    sell: "Le planning se met à jour. Le patient est informé.",
    badge: "Confirmée",
    badgeTone: "mint" as const,
    patient: "Martin · Dialyse",
    route: "Créteil → Henri Mondor",
    time: "10:15",
    panelTitle: "Dans le planning",
    panelBody: "Visible dans les missions confirmées du jour.",
    cta: "Voir le planning",
    vehicle: "AMB-12",
  },
] as const;

export function DashboardMotion() {
  const [phase, setPhase] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setPhase((p) => (p + 1) % PHASES.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const current = PHASES[phase] ?? PHASES[0];

  return (
    <div className="w-full" aria-label="Démo : régulation société">
      <div className="mb-4 space-y-1">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-[var(--accent)]">
          {current.caption}
        </p>
        <p className="max-w-md text-sm leading-snug text-[var(--muted)]">
          {current.sell}
        </p>
      </div>

      <div className="landing-device overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div>
            <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--ink)]">
              Régulation
            </p>
            <p className="text-xs text-[var(--muted)]">File du jour · Bibulance</p>
          </div>
          <span
            className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
              current.badgeTone === "mint"
                ? "bg-[var(--mint-soft)] text-[var(--success)]"
                : "bg-[var(--accent-soft)] text-[var(--accent)]"
            }`}
          >
            {current.badge}
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-[1.15fr_0.85fr] sm:p-5">
          <div className="space-y-3" key={`list-${phase}`}>
            <div className="landing-motion-fade rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)]/70 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-2xl font-semibold tabular-nums text-[var(--ink)]">
                  {current.time}
                </p>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
                  Bibulance
                </span>
              </div>
              <p className="mt-1 font-semibold text-[var(--ink)]">{current.patient}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{current.route}</p>
              {current.vehicle ? (
                <p className="mt-2 text-xs font-semibold text-[var(--accent)]">
                  Véhicule {current.vehicle}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3 opacity-50">
              <p className="text-lg font-semibold tabular-nums">11:00</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Dupont · Radio</p>
            </div>
          </div>

          <div className="landing-motion-fade flex flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
              {current.panelTitle}
            </p>
            <p className="mt-2 flex-1 text-sm leading-snug text-[var(--ink)]">
              {current.panelBody}
            </p>
            {phase === 1 ? (
              <div className="mt-3 space-y-1.5">
                {["AMB-12 · Libre", "VSL-04 · Libre", "AMB-03 · Occupé"].map(
                  (v, i) => (
                    <div
                      key={v}
                      className={`rounded-lg border px-2.5 py-2 text-xs ${
                        i === 0
                          ? "border-[var(--accent)] bg-white font-semibold text-[var(--ink)]"
                          : "border-[var(--border)] bg-white/60 text-[var(--muted)]"
                      }`}
                    >
                      {v}
                    </div>
                  ),
                )}
              </div>
            ) : null}
            <div
              className={`mt-3 flex h-10 items-center justify-center rounded-xl text-sm font-semibold ${
                phase === 2
                  ? "bg-[var(--mint-soft)] text-[var(--success)]"
                  : "bg-[var(--accent)] text-white"
              }`}
            >
              {current.cta}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
