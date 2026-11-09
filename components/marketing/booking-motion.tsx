"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    title: "Je commande pour…",
    detail: "Moi-même",
    lines: ["Moi-même", "Pour un proche"],
    active: 0,
  },
  {
    title: "Adresse de départ",
    detail: "12 Avenue Victor Hugo, Paris",
    lines: ["12 Avenue Victor Hugo 75116 Paris", "12 Rue Victor Hugo…"],
    active: 0,
  },
  {
    title: "Adresse d’arrivée",
    detail: "Hôpital — 47 bd de l’Hôpital",
    lines: ["47 Boulevard de l’Hôpital 75013 Paris"],
    active: 0,
  },
  {
    title: "Quand ?",
    detail: "Demain · 09:30",
    lines: ["Date : demain", "Heure : 09:30 · Aller"],
    active: 0,
  },
  {
    title: "Envoyé",
    detail: "Demande transmise",
    lines: ["Société notifiée", "Suivi dans Mes trajets"],
    active: 0,
  },
] as const;

export function BookingMotion() {
  const [step, setStep] = useState(0);
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
      setStep((s) => (s + 1) % STEPS.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const current = STEPS[step] ?? STEPS[0];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      className="landing-device relative mx-auto w-full max-w-[340px]"
      aria-label="Démonstration animée : commander un transport"
    >
      <div className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--accent-soft)]/60 px-4 py-3">
          <span className="text-xs font-semibold tracking-wide text-[var(--accent)]">
            Bibulance
          </span>
          <span className="text-xs text-[var(--muted)]">
            Étape {step + 1}/{STEPS.length}
          </span>
        </div>

        <div className="h-1 bg-[var(--border)]">
          <div
            className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-4 px-4 py-5" key={step}>
          <div className="landing-motion-fade">
            <p className="text-sm font-semibold text-[var(--ink)]">
              {current.title}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">{current.detail}</p>
          </div>

          <div className="space-y-2">
            {current.lines.map((line, i) => (
              <div
                key={line}
                className={`rounded-xl border px-3 py-3 text-sm transition ${
                  i === current.active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--ink)]"
                    : "border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {line}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <div className="h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)]" />
            <div className="flex h-11 flex-[1.4] items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-semibold text-white">
              {step === STEPS.length - 1 ? "Terminé" : "Continuer"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
