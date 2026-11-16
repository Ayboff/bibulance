"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    caption: "1 · Qui transporte-t-on ?",
    sell: "Pour vous, ou pour un proche — en un clic.",
    title: "Je commande pour…",
    choices: [
      { label: "Moi-même", selected: true },
      { label: "Un proche", selected: false },
    ],
    footer: "Continuer",
  },
  {
    caption: "2 · D’où partez-vous ?",
    sell: "L’adresse se complète toute seule (France).",
    title: "Adresse de départ",
    field: "12 Avenue Victor Hugo, Paris",
    suggestions: ["12 Avenue Victor Hugo 75116 Paris"],
    footer: "Continuer",
  },
  {
    caption: "3 · Où allez-vous ?",
    sell: "Hôpital, clinique, domicile — même simplicité.",
    title: "Adresse d’arrivée",
    field: "47 Boulevard de l’Hôpital, Paris",
    suggestions: ["47 Boulevard de l’Hôpital 75013 Paris"],
    footer: "Continuer",
  },
  {
    caption: "4 · Quand ?",
    sell: "Un trajet unique, ou des trajets itératifs (dialyse…).",
    title: "Date & heure",
    meta: ["Demain", "09:30", "Aller"],
    footer: "Continuer",
  },
  {
    caption: "5 · C’est envoyé",
    sell: "La société reçoit la demande. Vous suivez dans Mes trajets.",
    title: "Demande transmise",
    success: true,
    footer: "Voir mon trajet",
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
    }, 2800);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const current = STEPS[step] ?? STEPS[0];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="w-full max-w-[380px]" aria-label="Démo : commander un transport">
      <div className="mb-4 space-y-1">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-[var(--accent)]">
          {current.caption}
        </p>
        <p className="text-sm leading-snug text-[var(--muted)]">{current.sell}</p>
      </div>

      <div className="landing-device overflow-hidden rounded-[1.6rem] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between bg-[linear-gradient(90deg,#e8f3f6,#f6f8f9)] px-4 py-3">
          <span className="text-xs font-bold tracking-[0.08em] text-[var(--accent)]">
            BIBULANCE
          </span>
          <span className="text-xs tabular-nums text-[var(--muted)]">
            {step + 1}/{STEPS.length}
          </span>
        </div>
        <div className="h-1 bg-[var(--border)]">
          <div
            className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-4 px-4 py-5" key={step}>
          <p className="landing-motion-fade font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
            {current.title}
          </p>

          {"choices" in current && current.choices ? (
            <div className="landing-motion-fade space-y-2">
              {current.choices.map((c) => (
                <div
                  key={c.label}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                    c.selected
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                      : "border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {c.label}
                </div>
              ))}
            </div>
          ) : null}

          {"field" in current && current.field ? (
            <div className="landing-motion-fade space-y-2">
              <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)]/50 px-3 py-3 text-sm font-medium text-[var(--ink)]">
                {current.field}
              </div>
              {current.suggestions?.map((s) => (
                <div
                  key={s}
                  className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--muted)]"
                >
                  {s}
                </div>
              ))}
            </div>
          ) : null}

          {"meta" in current && current.meta ? (
            <div className="landing-motion-fade flex flex-wrap gap-2">
              {current.meta.map((m) => (
                <span
                  key={m}
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
                >
                  {m}
                </span>
              ))}
            </div>
          ) : null}

          {"success" in current && current.success ? (
            <div className="landing-motion-fade rounded-xl border border-[var(--mint)]/40 bg-[var(--mint-soft)] px-3 py-4">
              <p className="text-sm font-semibold text-[var(--success)]">
                Société notifiée
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Suivi disponible dans Mes trajets
              </p>
            </div>
          ) : null}

          <div className="flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-semibold text-white">
            {current.footer}
          </div>
        </div>
      </div>
    </div>
  );
}
