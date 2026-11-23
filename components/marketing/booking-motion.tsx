"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    caption: "1 · Où aller ?",
    sell: "Départ + arrivée. Tapez « Pitié » pour trouver l’hôpital.",
    title: "Où aller ?",
    field: "Pitié-Salpêtrière",
    suggestions: [
      "Hôpital · Pitié-Salpêtrière, Paris 13e",
      "47 Boulevard de l’Hôpital 75013 Paris",
    ],
    footer: "Continuer",
  },
  {
    caption: "2 · Quand ?",
    sell: "Ponctuel ou itératif — date et heure en un écran.",
    title: "Date & heure",
    meta: ["Demain", "09:30", "Aller"],
    footer: "Continuer",
  },
  {
    caption: "3 · Qui voyage ?",
    sell: "Pour vous, ou pour un proche — en un clic.",
    title: "Je commande pour…",
    choices: [
      { label: "Moi-même", selected: true },
      { label: "Un proche", selected: false },
    ],
    footer: "Continuer",
  },
  {
    caption: "4 · C’est envoyé",
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
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <span className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-wide text-[var(--muted)]">
            BIBULANCE
          </span>
          <span className="text-xs tabular-nums text-[var(--muted)]">
            {step + 1}/{STEPS.length}
          </span>
        </div>
        <div
          className="h-1 bg-[var(--accent-soft)]"
          aria-hidden
        >
          <div
            className="h-full bg-[var(--accent)] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-4 p-4" key={step}>
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
            {current.title}
          </h3>

          {"field" in current && current.field ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--ink)]">
                {current.field}
              </div>
              {"suggestions" in current && current.suggestions
                ? current.suggestions.map((s) => (
                    <div
                      key={s}
                      className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)]/50 px-3 py-2 text-sm text-[var(--ink)]"
                    >
                      {s}
                    </div>
                  ))
                : null}
            </div>
          ) : null}

          {"meta" in current && current.meta ? (
            <div className="flex flex-wrap gap-2">
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

          {"choices" in current && current.choices ? (
            <div className="space-y-2">
              {current.choices.map((c) => (
                <div
                  key={c.label}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
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

          {"success" in current && current.success ? (
            <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 py-6 text-center">
              <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--ink)]">
                Demande envoyée
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Une société vous recontacte bientôt.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            tabIndex={-1}
            className="landing-motion-fade w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)]"
          >
            {current.footer}
          </button>
        </div>
      </div>
    </div>
  );
}
