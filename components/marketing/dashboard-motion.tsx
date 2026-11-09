"use client";

import { useEffect, useState } from "react";

const PHASES = [
  {
    badge: "Nouvelle demande",
    patient: "Martin · Dialyse",
    route: "Créteil → Henri Mondor",
    time: "10:15",
    action: "Assigner un véhicule",
    highlight: 0,
  },
  {
    badge: "Véhicule choisi",
    patient: "Martin · Dialyse",
    route: "Créteil → Henri Mondor",
    time: "10:15",
    action: "Confirmer la mission",
    highlight: 1,
  },
  {
    badge: "Confirmée",
    patient: "Martin · Dialyse",
    route: "Créteil → Henri Mondor",
    time: "10:15",
    action: "Dans le planning",
    highlight: 2,
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
    }, 2800);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const current = PHASES[phase] ?? PHASES[0];

  return (
    <div
      className="landing-device w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]"
      aria-label="Démonstration animée : tableau de régulation"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">Régulation</p>
          <p className="text-xs text-[var(--muted)]">File du jour</p>
        </div>
        <span className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
          {current.badge}
        </span>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-[1.2fr_0.8fr] sm:p-5">
        <div className="space-y-3" key={`list-${phase}`}>
          <div className="landing-motion-fade rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)]/80 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold tabular-nums text-[var(--ink)]">
                  {current.time}
                </p>
                <p className="mt-1 font-medium text-[var(--ink)]">
                  {current.patient}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{current.route}</p>
              </div>
              <span className="text-xs font-semibold text-[var(--accent)]">
                Bibulance
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-3 opacity-55">
            <p className="text-lg font-semibold tabular-nums text-[var(--ink)]">
              11:00
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Dupont · Radiologie
            </p>
          </div>
        </div>

        <div className="landing-motion-fade space-y-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
            Action
          </p>
          <p className="text-sm font-medium text-[var(--ink)]">{current.action}</p>
          <div className="space-y-1.5 pt-1">
            {["AMB-12 · Disponible", "VSL-04 · Disponible", "AMB-03 · En course"].map(
              (v, i) => (
                <div
                  key={v}
                  className={`rounded-lg border px-2.5 py-2 text-xs ${
                    current.highlight === 1 && i === 0
                      ? "border-[var(--accent)] bg-white font-semibold text-[var(--ink)]"
                      : "border-[var(--border)] bg-white/70 text-[var(--muted)]"
                  }`}
                >
                  {v}
                </div>
              ),
            )}
          </div>
          <div
            className={`mt-2 flex h-10 items-center justify-center rounded-xl text-sm font-semibold ${
              phase === 2
                ? "bg-[var(--mint-soft)] text-[var(--success)]"
                : "bg-[var(--accent)] text-white"
            }`}
          >
            {phase === 2 ? "Mission confirmée" : "Valider"}
          </div>
        </div>
      </div>
    </div>
  );
}
