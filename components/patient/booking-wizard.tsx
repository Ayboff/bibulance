"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";

type Company = { id: string; name: string; slug: string };

type Draft = {
  company_id: string;
  depart_address: string;
  arrival_address: string;
  date: string;
  time: string;
  firstname: string;
  lastname: string;
  phone: string;
  transport_type: "VSL" | "AMB";
};

const STEPS = [
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
  company: "Choisir la société",
  depart: "Adresse de départ",
  arrive: "Adresse d’arrivée",
  when: "Date et heure",
  patient: "Vos informations",
  vehicle: "Type de transport",
  confirm: "Vérifier et envoyer",
};

const STEP_HINTS: Record<Step, string> = {
  company: "Qui doit venir vous chercher ?",
  depart: "Où faut-il venir vous prendre ?",
  arrive: "Où devez-vous aller ?",
  when: "Quand avez-vous rendez-vous ?",
  patient: "Pour qui est ce transport ?",
  vehicle: "Quel véhicule vous convient ?",
  confirm: "Relisez bien avant d’envoyer.",
};

export function BookingWizard({
  companies,
  defaultName,
}: {
  companies: Company[];
  defaultName?: { first?: string; last?: string };
}) {
  const router = useRouter();
  const formId = useId();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const initialSteps = useMemo<Step[]>(() => {
    if (companies.length <= 1) {
      return STEPS.filter((s) => s !== "company");
    }
    return [...STEPS];
  }, [companies.length]);

  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    company_id: companies[0]?.id ?? "",
    depart_address: "",
    arrival_address: "",
    date: today,
    time: "14:00",
    firstname: defaultName?.first ?? "",
    lastname: defaultName?.last ?? "",
    phone: "",
    transport_type: "VSL",
  });

  const steps = initialSteps;
  const step = steps[stepIndex] ?? "confirm";
  const total = steps.length;
  const currentNumber = stepIndex + 1;

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  }

  function validateCurrent(): string | null {
    switch (step) {
      case "company":
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
        if (!draft.date) return "Choisissez une date.";
        if (!draft.time) return "Choisissez une heure.";
        return null;
      case "patient":
        if (draft.firstname.trim().length < 1) return "Indiquez le prénom.";
        if (draft.lastname.trim().length < 1) return "Indiquez le nom.";
        return null;
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
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: draft.company_id,
          firstname: draft.firstname.trim(),
          lastname: draft.lastname.trim(),
          phone: draft.phone.trim() || undefined,
          depart_address: draft.depart_address.trim(),
          arrival_address: draft.arrival_address.trim(),
          date: draft.date,
          time: draft.time,
          transport_type: draft.transport_type,
          trip_type: "aller",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Envoi impossible");
      const id = json.mission?.id as string | undefined;
      router.push(id ? `/commander/succes?id=${id}` : "/mes-transports");
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

  return (
    <div className="space-y-6">
      <div>
        <p className="patient-step" aria-live="polite">
          Étape {currentNumber} sur {total}
        </p>
        <h1 className="patient-title mt-1">{STEP_TITLES[step]}</h1>
        <p className="patient-lead mt-2">{STEP_HINTS[step]}</p>
      </div>

      <div
        className="h-3 w-full overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--card)]"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={currentNumber}
        aria-label={`Progression : étape ${currentNumber} sur ${total}`}
      >
        <div
          className="h-full bg-[var(--accent)] transition-all"
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
        {step === "company" ? (
          <fieldset className="space-y-3">
            <legend className="patient-label">Société d’ambulances</legend>
            {companies.map((c) => (
              <button
                key={c.id}
                type="button"
                className="patient-choice"
                data-selected={draft.company_id === c.id}
                aria-pressed={draft.company_id === c.id}
                onClick={() => update("company_id", c.id)}
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

        {step === "when" ? (
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
                onChange={(e) => update("date", e.target.value)}
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
                onChange={(e) => update("time", e.target.value)}
                required
              />
              <p className="mt-2 text-base text-[var(--muted)]">
                Nous viendrons vous chercher un peu avant cette heure.
              </p>
            </div>
          </div>
        ) : null}

        {step === "patient" ? (
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
          </div>
        ) : null}

        {step === "vehicle" ? (
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
        ) : null}

        {step === "confirm" ? (
          <div className="patient-card space-y-3" aria-label="Récapitulatif">
            <ReviewRow label="Société" value={companyName} />
            <ReviewRow label="Départ" value={draft.depart_address} />
            <ReviewRow label="Arrivée" value={draft.arrival_address} />
            <ReviewRow
              label="Rendez-vous"
              value={`${draft.date} à ${draft.time}`}
            />
            <ReviewRow
              label="Passager"
              value={`${draft.firstname} ${draft.lastname}`}
            />
            {draft.phone ? (
              <ReviewRow label="Téléphone" value={draft.phone} />
            ) : null}
            <ReviewRow
              label="Véhicule"
              value={
                draft.transport_type === "AMB"
                  ? "Ambulance"
                  : "Voiture sanitaire (VSL)"
              }
            />
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
            {busy ? "Envoi en cours…" : "Envoyer ma demande"}
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
