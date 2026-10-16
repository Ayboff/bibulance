"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";

import {
  buildOccurrencesFromDays,
  isDateTimeInPast,
  parisNowParts,
  suggestDefaultTime,
} from "@/lib/missions/booking-meta";

type Company = { id: string; name: string; slug: string };

type DayKey =
  | "Lundi"
  | "Mardi"
  | "Mercredi"
  | "Jeudi"
  | "Vendredi"
  | "Samedi"
  | "Dimanche";

type DaySlot = {
  active: boolean;
  time: string;
  trip_type: "aller" | "aller_retour";
};

type Draft = {
  booking_mode: "once" | "iterative";
  dispatch_mode: "specific" | "partners";
  company_id: string;
  depart_address: string;
  arrival_address: string;
  date: string;
  time: string;
  trip_type: "aller" | "aller_retour";
  ordered_for_someone: boolean;
  /** Patient transporté */
  firstname: string;
  lastname: string;
  phone: string;
  patient_birthdate: string;
  patient_social_security: string;
  /** Demandeur (si proche) */
  relative_firstname: string;
  relative_lastname: string;
  relative_relation: string;
  relative_phone: string;
  transport_type: "VSL" | "AMB";
  days: Record<DayKey, DaySlot>;
  end_date: string;
  count: string;
  specialties: {
    accompagnant: boolean;
    fauteuil: boolean;
    oxygene: boolean;
  };
};

const DAYS: DayKey[] = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const STEPS = [
  "who",
  "mode",
  "company",
  "depart",
  "arrive",
  "when",
  "patient",
  "vehicle",
  "confirm",
] as const;

type Step = (typeof STEPS)[number];

const STEP_TITLES: Record<Step, string> = {
  who: "Je commande pour…",
  mode: "Type de transport",
  company: "Société d’ambulances",
  depart: "Adresse de départ",
  arrive: "Adresse d’arrivée",
  when: "Quand ?",
  patient: "Informations du trajet",
  vehicle: "Véhicule et besoins",
  confirm: "Vérifier et envoyer",
};

const STEP_HINTS: Record<Step, string> = {
  who: "Pour vous, ou pour un proche (parents, grands-parents…).",
  mode: "Un trajet unique, ou des trajets itératifs (dialyse, etc.).",
  company: "Votre société habituelle, ou toutes les partenaires Bibulance.",
  depart: "Où faut-il venir vous prendre ?",
  arrive: "Où devez-vous aller ?",
  when: "Indiquez la date et l’heure du rendez-vous.",
  patient: "Nom, téléphone et infos utiles pour le transport.",
  vehicle: "Quel véhicule, et avez-vous des besoins particuliers ?",
  confirm: "Relisez bien avant d’envoyer.",
};

function defaultDays(time: string): Record<DayKey, DaySlot> {
  return Object.fromEntries(
    DAYS.map((d) => [d, { active: false, time, trip_type: "aller" as const }]),
  ) as Record<DayKey, DaySlot>;
}

function capitalizeFr(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** ISO date YYYY-MM-DD → "Vendredi 17 octobre" */
function formatDateFr(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return capitalizeFr(
    d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );
}

/** "15:00" → "15 h 00" */
function formatTimeFr(time: string) {
  const [h = "00", m = "00"] = time.split(":");
  return `${h} h ${m}`;
}

function tripTypeLabel(tripType: "aller" | "aller_retour" | "retour") {
  if (tripType === "aller_retour") return "Aller-retour";
  if (tripType === "retour") return "Retour";
  return "Aller";
}

/** Keep digits only, max 15 (French NIR without key spaces). */
function normalizeNirInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 15);
}

function nirValidationMessage(value: string): string | null {
  const digits = normalizeNirInput(value);
  if (!digits) return null;
  if (digits.length < 15) {
    return `Le numéro de sécurité sociale doit contenir exactement 15 chiffres (${digits.length}/15).`;
  }
  return null;
}

export function BookingWizard({
  companies,
  defaultName,
}: {
  companies: Company[];
  defaultName?: { first?: string; last?: string };
}) {
  const router = useRouter();
  const formId = useId();
  const { today, minTimeToday, defaultTime } = useMemo(() => {
    const parts = parisNowParts();
    return {
      today: parts.date,
      minTimeToday: parts.time,
      defaultTime: suggestDefaultTime(),
    };
  }, []);

  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    booking_mode: "once",
    dispatch_mode: companies.length > 1 ? "partners" : "specific",
    company_id: companies[0]?.id ?? "",
    depart_address: "",
    arrival_address: "",
    date: today,
    time: defaultTime,
    trip_type: "aller",
    ordered_for_someone: false,
    firstname: defaultName?.first ?? "",
    lastname: defaultName?.last ?? "",
    phone: "",
    patient_birthdate: "",
    patient_social_security: "",
    relative_firstname: defaultName?.first ?? "",
    relative_lastname: defaultName?.last ?? "",
    relative_relation: "",
    relative_phone: "",
    transport_type: "VSL",
    days: defaultDays(defaultTime),
    end_date: "",
    count: "8",
    specialties: {
      accompagnant: false,
      fauteuil: false,
      oxygene: false,
    },
  });

  const selfFirst = defaultName?.first ?? "";
  const selfLast = defaultName?.last ?? "";

  const steps = STEPS;
  const step = steps[stepIndex] ?? "confirm";
  const total = steps.length;
  const currentNumber = stepIndex + 1;

  const previewOccurrences = useMemo(() => {
    if (draft.booking_mode === "once") {
      return [
        {
          date: draft.date,
          time: draft.time,
          trip_type: draft.trip_type,
        },
      ];
    }
    return buildOccurrencesFromDays({
      days: draft.days,
      end_date: draft.end_date || undefined,
      count: draft.count ? Number(draft.count) : undefined,
    });
  }, [draft]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  }

  function updateDay(day: DayKey, patch: Partial<DaySlot>) {
    setDraft((d) => ({
      ...d,
      days: { ...d.days, [day]: { ...d.days[day], ...patch } },
    }));
    setError(null);
  }

  function validateCurrent(): string | null {
    switch (step) {
      case "who":
        return null;
      case "mode":
        return draft.booking_mode ? null : "Choisissez un type.";
      case "company":
        if (draft.dispatch_mode === "partners") return null;
        return draft.company_id ? null : "Choisissez une société.";
      case "depart":
        return draft.depart_address.trim().length >= 3
          ? null
          : "Indiquez l’adresse de départ.";
      case "arrive":
        return draft.arrival_address.trim().length >= 3
          ? null
          : "Indiquez l’adresse d’arrivée.";
      case "when":
        if (draft.booking_mode === "once") {
          if (!draft.date) return "Choisissez une date.";
          if (!draft.time) return "Choisissez une heure.";
          if (draft.date < today) {
            return "La date du rendez-vous ne peut pas être dans le passé.";
          }
          if (isDateTimeInPast(draft.date, draft.time)) {
            return `Choisissez une heure à partir de ${formatTimeFr(minTimeToday)} pour aujourd’hui.`;
          }
          return null;
        }
        if (!DAYS.some((d) => draft.days[d].active)) {
          return "Activez au moins un jour de la semaine.";
        }
        if (!draft.end_date && !draft.count) {
          return "Indiquez une date de fin ou un nombre de trajets.";
        }
        if (previewOccurrences.length === 0) {
          return "Aucune date à venir — vérifiez les jours et les horaires (pas d’heure déjà passée).";
        }
        return null;
      case "patient": {
        if (draft.ordered_for_someone) {
          if (draft.relative_firstname.trim().length < 1) {
            return "Indiquez votre prénom (demandeur).";
          }
          if (draft.relative_lastname.trim().length < 1) {
            return "Indiquez votre nom (demandeur).";
          }
          if (draft.relative_phone.trim().length < 6) {
            return "Indiquez votre téléphone (demandeur).";
          }
          if (draft.firstname.trim().length < 1) {
            return "Indiquez le prénom du patient transporté.";
          }
          if (draft.lastname.trim().length < 1) {
            return "Indiquez le nom du patient transporté.";
          }
          if (!draft.patient_birthdate) {
            return "Indiquez la date de naissance du patient.";
          }
        } else {
          if (draft.firstname.trim().length < 1) return "Indiquez le prénom.";
          if (draft.lastname.trim().length < 1) return "Indiquez le nom.";
        }
        const nirError = nirValidationMessage(draft.patient_social_security);
        if (nirError) return nirError;
        return null;
      }
      case "vehicle":
        return draft.transport_type ? null : "Choisissez un type de transport.";
      default:
        return null;
    }
  }

  function goNext() {
    const msg = validateCurrent();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setStepIndex((i) => Math.min(i + 1, total - 1));
  }

  function goBack() {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function submit() {
    const msg = validateCurrent();
    if (msg) {
      setError(msg);
      return;
    }
    if (previewOccurrences.length === 0) {
      setError("Aucune date de transport à envoyer.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id:
            draft.dispatch_mode === "specific" ? draft.company_id : undefined,
          dispatch_mode: draft.dispatch_mode,
          booking_mode: draft.booking_mode,
          firstname: draft.firstname.trim(),
          lastname: draft.lastname.trim(),
          phone: draft.phone.trim() || undefined,
          patient_birthdate: draft.patient_birthdate || undefined,
          patient_social_security:
            normalizeNirInput(draft.patient_social_security) || undefined,
          ordered_for_someone: draft.ordered_for_someone,
          relative_firstname: draft.ordered_for_someone
            ? draft.relative_firstname.trim()
            : undefined,
          relative_lastname: draft.ordered_for_someone
            ? draft.relative_lastname.trim()
            : undefined,
          relative_relation: draft.ordered_for_someone
            ? draft.relative_relation.trim() || undefined
            : undefined,
          relative_phone: draft.ordered_for_someone
            ? draft.relative_phone.trim()
            : undefined,
          depart_address: draft.depart_address.trim(),
          arrival_address: draft.arrival_address.trim(),
          date: draft.booking_mode === "once" ? draft.date : undefined,
          time: draft.booking_mode === "once" ? draft.time : undefined,
          transport_type: draft.transport_type,
          trip_type: draft.trip_type,
          occurrences: previewOccurrences,
          specialties: draft.specialties,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Envoi impossible");
      const id = json.mission?.id as string | undefined;
      const count = (json.created_count as number | undefined) ?? 1;
      const qs = new URLSearchParams();
      if (id) qs.set("id", id);
      qs.set("count", String(count));
      if (draft.dispatch_mode === "partners") qs.set("partners", "1");
      if (draft.booking_mode === "iterative") qs.set("iterative", "1");
      router.push(`/commander/succes?${qs.toString()}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  if (companies.length === 0) {
    return (
      <div className="patient-card space-y-3" role="alert">
        <p className="patient-title">Service indisponible</p>
        <p className="patient-lead">
          Aucune société d’ambulances n’est disponible pour le moment. Réessayez
          plus tard.
        </p>
      </div>
    );
  }

  const companyName =
    companies.find((c) => c.id === draft.company_id)?.name ?? "Société";
  const dispatchLabel =
    draft.dispatch_mode === "partners"
      ? "Partenaires Bibulance (sans préférence)"
      : companyName;

  return (
    <div className="space-y-6 animate-brand-fade-up">
      <div>
        <p className="patient-step" aria-live="polite">
          Étape {currentNumber} sur {total}
        </p>
        <h1 className="patient-title mt-1">{STEP_TITLES[step]}</h1>
        <p className="patient-lead mt-2">
          {step === "when" && draft.booking_mode === "iterative"
            ? "Choisissez les jours et l’heure de chaque trajet itératif."
            : step === "patient" && draft.ordered_for_someone
              ? "Renseignez vos coordonnées, puis celles du patient transporté."
              : STEP_HINTS[step]}
        </p>
      </div>

      <div
        className="patient-progress"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={currentNumber}
        aria-label={`Progression : étape ${currentNumber} sur ${total}`}
      >
        <div
          className="patient-progress-bar"
          style={{ width: `${(currentNumber / total) * 100}%` }}
        />
      </div>

      {error ? (
        <div
          className="patient-card border-[var(--danger)] text-[var(--danger)]"
          role="alert"
          aria-live="assertive"
        >
          <p className="font-bold">{error}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {step === "mode" ? (
          <fieldset className="space-y-3">
            <legend className="patient-label">Votre besoin</legend>
            <button
              type="button"
              className="patient-choice"
              data-selected={draft.booking_mode === "once"}
              aria-pressed={draft.booking_mode === "once"}
              onClick={() => update("booking_mode", "once")}
            >
              <span className="block">Trajet ponctuel</span>
              <span className="mt-1 block text-base font-normal text-[var(--muted)]">
                Une seule date — consultation, examen, sortie…
              </span>
            </button>
            <button
              type="button"
              className="patient-choice"
              data-selected={draft.booking_mode === "iterative"}
              aria-pressed={draft.booking_mode === "iterative"}
              onClick={() => update("booking_mode", "iterative")}
            >
              <span className="block">Trajets itératifs</span>
              <span className="mt-1 block text-base font-normal text-[var(--muted)]">
                Dialyse, chimiothérapie… les mêmes jours chaque semaine
              </span>
            </button>
          </fieldset>
        ) : null}

        {step === "company" ? (
          <fieldset className="space-y-3">
            <legend className="patient-label">Qui doit venir ?</legend>
            {companies.length > 1 ? (
              <button
                type="button"
                className="patient-choice"
                data-selected={draft.dispatch_mode === "partners"}
                aria-pressed={draft.dispatch_mode === "partners"}
                onClick={() => update("dispatch_mode", "partners")}
              >
                <span className="block">Pas de préférence</span>
                <span className="mt-1 block text-base font-normal text-[var(--muted)]">
                  Envoyer aux sociétés partenaires Bibulance — la première qui
                  accepte prend en charge
                </span>
              </button>
            ) : null}

            <p className="pt-1 text-base font-bold text-[var(--muted)]">
              Ou choisir une société
            </p>
            {companies.map((c) => (
              <button
                key={c.id}
                type="button"
                className="patient-choice"
                data-selected={
                  draft.dispatch_mode === "specific" &&
                  draft.company_id === c.id
                }
                aria-pressed={
                  draft.dispatch_mode === "specific" &&
                  draft.company_id === c.id
                }
                onClick={() => {
                  setDraft((d) => ({
                    ...d,
                    dispatch_mode: "specific",
                    company_id: c.id,
                  }));
                  setError(null);
                }}
              >
                {c.name}
              </button>
            ))}
          </fieldset>
        ) : null}

        {step === "depart" ? (
          <div>
            <label className="patient-label" htmlFor={`${formId}-depart`}>
              Adresse de départ
            </label>
            <input
              id={`${formId}-depart`}
              className="patient-input"
              value={draft.depart_address}
              onChange={(e) => update("depart_address", e.target.value)}
              autoComplete="street-address"
              placeholder="Exemple : 12 rue Victor Hugo, Paris"
              required
            />
            <p className="mt-2 text-base text-[var(--muted)]">
              Écrivez l’adresse complète, avec la ville.
            </p>
          </div>
        ) : null}

        {step === "arrive" ? (
          <div>
            <label className="patient-label" htmlFor={`${formId}-arrive`}>
              Adresse d’arrivée
            </label>
            <input
              id={`${formId}-arrive`}
              className="patient-input"
              value={draft.arrival_address}
              onChange={(e) => update("arrival_address", e.target.value)}
              autoComplete="street-address"
              placeholder="Exemple : Hôpital Sud, Évry"
              required
            />
          </div>
        ) : null}

        {step === "when" && draft.booking_mode === "once" ? (
          <div className="space-y-4">
            <div>
              <label className="patient-label" htmlFor={`${formId}-date`}>
                Date du rendez-vous
              </label>
              <input
                id={`${formId}-date`}
                className="patient-input"
                type="date"
                value={draft.date}
                min={today}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setDraft((d) => {
                    let nextTime = d.time;
                    if (
                      nextDate === today &&
                      isDateTimeInPast(nextDate, nextTime)
                    ) {
                      nextTime = suggestDefaultTime();
                    }
                    return { ...d, date: nextDate, time: nextTime };
                  });
                  setError(null);
                }}
                required
              />
            </div>
            <div>
              <label className="patient-label" htmlFor={`${formId}-time`}>
                Heure du rendez-vous
              </label>
              <input
                id={`${formId}-time`}
                className="patient-input"
                type="time"
                value={draft.time}
                min={draft.date === today ? minTimeToday : undefined}
                onChange={(e) => update("time", e.target.value)}
                required
              />
              <p className="mt-2 text-base text-[var(--muted)]">
                {draft.date === today
                  ? `Aujourd’hui, choisissez une heure à partir de ${formatTimeFr(minTimeToday)}.`
                  : "Nous viendrons vous chercher un peu avant cette heure."}
              </p>
            </div>
            <fieldset className="space-y-3">
              <legend className="patient-label">Type de trajet</legend>
              <button
                type="button"
                className="patient-choice"
                data-selected={draft.trip_type === "aller"}
                aria-pressed={draft.trip_type === "aller"}
                onClick={() => update("trip_type", "aller")}
              >
                Aller simple
              </button>
              <button
                type="button"
                className="patient-choice"
                data-selected={draft.trip_type === "aller_retour"}
                aria-pressed={draft.trip_type === "aller_retour"}
                onClick={() => update("trip_type", "aller_retour")}
              >
                Aller-retour
              </button>
            </fieldset>
          </div>
        ) : null}

        {step === "when" && draft.booking_mode === "iterative" ? (
          <div className="space-y-4">
            {DAYS.map((day) => {
              const slot = draft.days[day];
              return (
                <div
                  key={day}
                  className="patient-card space-y-3"
                  data-active={slot.active}
                >
                  <button
                    type="button"
                    className="patient-choice"
                    data-selected={slot.active}
                    aria-pressed={slot.active}
                    onClick={() => updateDay(day, { active: !slot.active })}
                  >
                    {day}
                  </button>
                  {slot.active ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          className="patient-label"
                          htmlFor={`${formId}-${day}-time`}
                        >
                          Heure
                        </label>
                        <input
                          id={`${formId}-${day}-time`}
                          className="patient-input"
                          type="time"
                          value={slot.time}
                          onChange={(e) =>
                            updateDay(day, { time: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label
                          className="patient-label"
                          htmlFor={`${formId}-${day}-trip`}
                        >
                          Trajet
                        </label>
                        <select
                          id={`${formId}-${day}-trip`}
                          className="patient-input"
                          value={slot.trip_type}
                          onChange={(e) =>
                            updateDay(day, {
                              trip_type: e.target.value as
                                | "aller"
                                | "aller_retour",
                            })
                          }
                        >
                          <option value="aller">Aller</option>
                          <option value="aller_retour">Aller-retour</option>
                        </select>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="patient-label" htmlFor={`${formId}-end`}>
                  Jusqu’au (optionnel)
                </label>
                <input
                  id={`${formId}-end`}
                  className="patient-input"
                  type="date"
                  min={today}
                  value={draft.end_date}
                  onChange={(e) => update("end_date", e.target.value)}
                />
              </div>
              <div>
                <label className="patient-label" htmlFor={`${formId}-count`}>
                  Nombre de trajets
                </label>
                <input
                  id={`${formId}-count`}
                  className="patient-input"
                  type="number"
                  min={1}
                  max={40}
                  value={draft.count}
                  onChange={(e) => update("count", e.target.value)}
                />
              </div>
            </div>

            {previewOccurrences.length > 0 ? (
              <IterativeTripList
                occurrences={previewOccurrences}
                title="Aperçu des trajets"
                maxVisible={6}
              />
            ) : null}
          </div>
        ) : null}

        {step === "who" ? (
          <fieldset className="space-y-3">
            <legend className="patient-label">Je commande pour…</legend>
            <button
              type="button"
              className="patient-choice"
              data-selected={!draft.ordered_for_someone}
              aria-pressed={!draft.ordered_for_someone}
              onClick={() => {
                setDraft((d) => ({
                  ...d,
                  ordered_for_someone: false,
                  firstname: selfFirst || d.firstname,
                  lastname: selfLast || d.lastname,
                }));
                setError(null);
              }}
            >
              <span className="block">Moi-même</span>
              <span className="mt-1 block text-base font-normal text-[var(--muted)]">
                Je suis le patient transporté
              </span>
            </button>
            <button
              type="button"
              className="patient-choice"
              data-selected={draft.ordered_for_someone}
              aria-pressed={draft.ordered_for_someone}
              onClick={() => {
                setDraft((d) => ({
                  ...d,
                  ordered_for_someone: true,
                  relative_firstname:
                    d.relative_firstname || selfFirst || d.firstname,
                  relative_lastname:
                    d.relative_lastname || selfLast || d.lastname,
                  firstname:
                    d.ordered_for_someone || d.firstname !== selfFirst
                      ? d.firstname
                      : "",
                  lastname:
                    d.ordered_for_someone || d.lastname !== selfLast
                      ? d.lastname
                      : "",
                }));
                setError(null);
              }}
            >
              <span className="block">Pour un proche</span>
              <span className="mt-1 block text-base font-normal text-[var(--muted)]">
                Parents, grands-parents, aidant… je commande pour quelqu’un
                d’autre
              </span>
            </button>
          </fieldset>
        ) : null}

        {step === "patient" ? (
          <div className="space-y-5">
            {draft.ordered_for_someone ? (
              <>
                <div className="patient-card space-y-4">
                  <p className="font-bold text-[var(--accent)]">
                    Informations du demandeur
                  </p>
                  <div>
                    <label
                      className="patient-label"
                      htmlFor={`${formId}-rel-first`}
                    >
                      Votre prénom
                    </label>
                    <input
                      id={`${formId}-rel-first`}
                      className="patient-input"
                      value={draft.relative_firstname}
                      onChange={(e) =>
                        update("relative_firstname", e.target.value)
                      }
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="patient-label"
                      htmlFor={`${formId}-rel-last`}
                    >
                      Votre nom
                    </label>
                    <input
                      id={`${formId}-rel-last`}
                      className="patient-input"
                      value={draft.relative_lastname}
                      onChange={(e) =>
                        update("relative_lastname", e.target.value)
                      }
                      autoComplete="family-name"
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="patient-label"
                      htmlFor={`${formId}-rel-link`}
                    >
                      Lien avec le patient (ex. : fils, fille, aidant)
                    </label>
                    <input
                      id={`${formId}-rel-link`}
                      className="patient-input"
                      value={draft.relative_relation}
                      onChange={(e) =>
                        update("relative_relation", e.target.value)
                      }
                      placeholder="Fils, fille, voisin…"
                    />
                  </div>
                  <div>
                    <label
                      className="patient-label"
                      htmlFor={`${formId}-rel-phone`}
                    >
                      Votre téléphone
                    </label>
                    <input
                      id={`${formId}-rel-phone`}
                      className="patient-input"
                      type="tel"
                      value={draft.relative_phone}
                      onChange={(e) =>
                        update("relative_phone", e.target.value)
                      }
                      autoComplete="tel"
                      inputMode="tel"
                      required
                    />
                  </div>
                </div>

                <div className="patient-card space-y-4">
                  <p className="font-bold text-[var(--accent)]">
                    Patient transporté
                  </p>
                  <div>
                    <label
                      className="patient-label"
                      htmlFor={`${formId}-first`}
                    >
                      Prénom du patient
                    </label>
                    <input
                      id={`${formId}-first`}
                      className="patient-input"
                      value={draft.firstname}
                      onChange={(e) => update("firstname", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="patient-label" htmlFor={`${formId}-last`}>
                      Nom du patient
                    </label>
                    <input
                      id={`${formId}-last`}
                      className="patient-input"
                      value={draft.lastname}
                      onChange={(e) => update("lastname", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="patient-label"
                      htmlFor={`${formId}-birth`}
                    >
                      Date de naissance
                    </label>
                    <input
                      id={`${formId}-birth`}
                      className="patient-input"
                      type="date"
                      value={draft.patient_birthdate}
                      onChange={(e) =>
                        update("patient_birthdate", e.target.value)
                      }
                      required
                    />
                  </div>
                  <NirField
                    id={`${formId}-nir`}
                    value={draft.patient_social_security}
                    onChange={(v) => update("patient_social_security", v)}
                  />
                  <div>
                    <label
                      className="patient-label"
                      htmlFor={`${formId}-phone`}
                    >
                      Téléphone du patient (optionnel)
                    </label>
                    <input
                      id={`${formId}-phone`}
                      className="patient-input"
                      type="tel"
                      value={draft.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      inputMode="tel"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="patient-label" htmlFor={`${formId}-first`}>
                    Prénom
                  </label>
                  <input
                    id={`${formId}-first`}
                    className="patient-input"
                    value={draft.firstname}
                    onChange={(e) => update("firstname", e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div>
                  <label className="patient-label" htmlFor={`${formId}-last`}>
                    Nom
                  </label>
                  <input
                    id={`${formId}-last`}
                    className="patient-input"
                    value={draft.lastname}
                    onChange={(e) => update("lastname", e.target.value)}
                    autoComplete="family-name"
                    required
                  />
                </div>
                <div>
                  <label className="patient-label" htmlFor={`${formId}-phone`}>
                    Téléphone (recommandé)
                  </label>
                  <input
                    id={`${formId}-phone`}
                    className="patient-input"
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                <div>
                  <label className="patient-label" htmlFor={`${formId}-birth`}>
                    Date de naissance (optionnel)
                  </label>
                  <input
                    id={`${formId}-birth`}
                    className="patient-input"
                    type="date"
                    value={draft.patient_birthdate}
                    onChange={(e) =>
                      update("patient_birthdate", e.target.value)
                    }
                  />
                </div>
                <NirField
                  id={`${formId}-nir`}
                  value={draft.patient_social_security}
                  onChange={(v) => update("patient_social_security", v)}
                />
              </div>
            )}
          </div>
        ) : null}

        {step === "vehicle" ? (
          <div className="space-y-5">
            <fieldset className="space-y-3">
              <legend className="patient-label">Type de véhicule</legend>
              <button
                type="button"
                className="patient-choice"
                data-selected={draft.transport_type === "VSL"}
                aria-pressed={draft.transport_type === "VSL"}
                onClick={() => update("transport_type", "VSL")}
              >
                <span className="block">Voiture sanitaire (VSL)</span>
                <span className="mt-1 block text-base font-normal text-[var(--muted)]">
                  Pour une personne qui peut s’asseoir
                </span>
              </button>
              <button
                type="button"
                className="patient-choice"
                data-selected={draft.transport_type === "AMB"}
                aria-pressed={draft.transport_type === "AMB"}
                onClick={() => update("transport_type", "AMB")}
              >
                <span className="block">Ambulance</span>
                <span className="mt-1 block text-base font-normal text-[var(--muted)]">
                  Pour une personne allongée ou avec soins
                </span>
              </button>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="patient-label">Besoins (optionnel)</legend>
              {(
                [
                  ["accompagnant", "Accompagnant"],
                  ["fauteuil", "Fauteuil roulant"],
                  ["oxygene", "Oxygène"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="patient-choice flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--accent)]"
                    checked={draft.specialties[key]}
                    onChange={(e) =>
                      update("specialties", {
                        ...draft.specialties,
                        [key]: e.target.checked,
                      })
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
          </div>
        ) : null}

        {step === "confirm" ? (
          <div className="space-y-4" aria-label="Récapitulatif">
            <div className="patient-card space-y-3">
              <ReviewRow
                label="Type"
                value={
                  draft.booking_mode === "iterative"
                    ? `Trajets itératifs · ${previewOccurrences.length} trajets`
                    : "Trajet ponctuel"
                }
              />
              <ReviewRow label="Société" value={dispatchLabel} />
              <ReviewRow label="Départ" value={draft.depart_address} />
              <ReviewRow label="Arrivée" value={draft.arrival_address} />
              {draft.booking_mode === "once" ? (
                <ReviewRow
                  label="Rendez-vous"
                  value={`${formatDateFr(draft.date)} · ${formatTimeFr(draft.time)}${
                    draft.trip_type === "aller_retour"
                      ? " · Aller-retour"
                      : ""
                  }`}
                />
              ) : null}
              <ReviewRow
                label="Commande"
                value={
                  draft.ordered_for_someone
                    ? "Pour un proche"
                    : "Pour moi-même"
                }
              />
              {draft.ordered_for_someone ? (
                <>
                  <ReviewRow
                    label="Demandeur"
                    value={`${draft.relative_firstname} ${draft.relative_lastname}${
                      draft.relative_relation
                        ? ` · ${draft.relative_relation}`
                        : ""
                    }`}
                  />
                  <ReviewRow
                    label="Tél. demandeur"
                    value={draft.relative_phone}
                  />
                  <ReviewRow
                    label="Patient transporté"
                    value={`${draft.firstname} ${draft.lastname}`}
                  />
                  {draft.patient_birthdate ? (
                    <ReviewRow
                      label="Date de naissance"
                      value={formatDateFr(draft.patient_birthdate)}
                    />
                  ) : null}
                </>
              ) : (
                <ReviewRow
                  label="Passager"
                  value={`${draft.firstname} ${draft.lastname}`}
                />
              )}
              {draft.phone ? (
                <ReviewRow
                  label={
                    draft.ordered_for_someone
                      ? "Tél. patient"
                      : "Téléphone"
                  }
                  value={draft.phone}
                />
              ) : null}
              {draft.patient_social_security.trim() ? (
                <ReviewRow
                  label="N° sécu."
                  value={draft.patient_social_security.trim()}
                />
              ) : (
                <ReviewRow label="N° sécu." value="Non renseigné" />
              )}
              <ReviewRow
                label="Véhicule"
                value={
                  draft.transport_type === "AMB"
                    ? "Ambulance"
                    : "Voiture sanitaire (VSL)"
                }
              />
            </div>

            {draft.booking_mode === "iterative" ? (
              <IterativeTripList
                occurrences={previewOccurrences}
                title="Prochains trajets"
                maxVisible={8}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        {step === "confirm" ? (
          <button
            type="button"
            className="patient-btn patient-btn-primary w-full"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy
              ? "Envoi en cours…"
              : draft.booking_mode === "iterative"
                ? `Envoyer ${previewOccurrences.length} trajets itératifs`
                : "Envoyer ma demande"}
          </button>
        ) : (
          <button
            type="button"
            className="patient-btn patient-btn-primary w-full"
            onClick={goNext}
          >
            Continuer
          </button>
        )}

        {stepIndex > 0 ? (
          <button
            type="button"
            className="patient-btn patient-btn-secondary w-full"
            onClick={goBack}
            disabled={busy}
          >
            Retour
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
      <p className="text-base font-bold text-[var(--muted)]">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function NirField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const digits = normalizeNirInput(value);
  const alert = nirValidationMessage(digits);

  return (
    <div>
      <label className="patient-label" htmlFor={id}>
        Numéro de sécurité sociale (optionnel)
      </label>
      <input
        id={id}
        className="patient-input"
        value={digits}
        onChange={(e) => onChange(normalizeNirInput(e.target.value))}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={15}
        autoComplete="off"
        placeholder="15 chiffres"
        aria-invalid={alert ? true : undefined}
        aria-describedby={alert ? `${id}-hint` : `${id}-help`}
      />
      {alert ? (
        <p
          id={`${id}-hint`}
          className="mt-2 text-base font-semibold text-[var(--danger)]"
          role="alert"
        >
          {alert}
        </p>
      ) : (
        <p id={`${id}-help`} className="mt-2 text-base text-[var(--muted)]">
          {digits.length > 0
            ? `${digits.length}/15 chiffres`
            : "Si vous le renseignez, il doit contenir exactement 15 chiffres. Sinon vous pourrez le fournir plus tard."}
        </p>
      )}
    </div>
  );
}

function IterativeTripList({
  occurrences,
  title,
  maxVisible = 8,
}: {
  occurrences: Array<{
    date: string;
    time: string;
    trip_type: "aller" | "aller_retour";
  }>;
  title: string;
  maxVisible?: number;
}) {
  const visible = occurrences.slice(0, maxVisible);
  const remaining = occurrences.length - visible.length;

  return (
    <section className="patient-trip-panel" aria-label={title}>
      <header className="patient-trip-panel-head">
        <div>
          <p className="patient-trip-panel-kicker">{title}</p>
          <p className="patient-trip-panel-count">
            {occurrences.length} trajet{occurrences.length > 1 ? "s" : ""}{" "}
            planifié{occurrences.length > 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <ol className="patient-trip-list">
        {visible.map((o, index) => (
          <li key={`${o.date}-${o.time}-${index}`} className="patient-trip-item">
            <span className="patient-trip-index" aria-hidden="true">
              {index + 1}
            </span>
            <div className="patient-trip-body">
              <p className="patient-trip-date">{formatDateFr(o.date)}</p>
              <p className="patient-trip-meta">
                <span className="patient-trip-time">
                  {formatTimeFr(o.time)}
                </span>
                <span className="patient-trip-dot" aria-hidden="true">
                  ·
                </span>
                <span>{tripTypeLabel(o.trip_type)}</span>
              </p>
            </div>
          </li>
        ))}
      </ol>

      {remaining > 0 ? (
        <p className="patient-trip-more">
          + {remaining} autre{remaining > 1 ? "s" : ""} trajet
          {remaining > 1 ? "s" : ""}
        </p>
      ) : null}
    </section>
  );
}
