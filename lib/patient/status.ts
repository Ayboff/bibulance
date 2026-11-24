import { getMissionBookingMeta } from "@/lib/missions/booking-meta";
import type { Mission, MissionStatus } from "@/types/database";

/** Plain-language status for patients (no ops jargon). */
export const PATIENT_STATUS: Record<
  MissionStatus,
  { label: string; hint: string; tone: "info" | "progress" | "ok" | "done" | "bad" }
> = {
  incoming: {
    label: "Demande reçue",
    hint: "Votre demande a bien été enregistrée.",
    tone: "info",
  },
  pending_platform: {
    label: "En cours de traitement",
    hint: "La société d’ambulances traite votre demande.",
    tone: "progress",
  },
  confirmed: {
    label: "Confirmée",
    hint: "Votre transport est confirmé.",
    tone: "ok",
  },
  assigned: {
    label: "Véhicule prévu",
    hint: "Un véhicule est prévu pour vous chercher.",
    tone: "ok",
  },
  in_progress: {
    label: "En route",
    hint: "Le transport est en cours.",
    tone: "progress",
  },
  done: {
    label: "Terminé",
    hint: "Ce transport est terminé.",
    tone: "done",
  },
  cancelled: {
    label: "Annulé",
    hint: "Ce transport a été annulé.",
    tone: "bad",
  },
  refused: {
    label: "Non pris en charge",
    hint: "La société n’a pas pu prendre en charge cette demande.",
    tone: "bad",
  },
};

const TERMINAL_STATUSES = new Set<MissionStatus>([
  "cancelled",
  "refused",
  "done",
]);

export function isTerminalMissionStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status as MissionStatus);
}

/**
 * Demande encore en recherche, jamais acceptée, et l’horaire RDV est dépassé.
 * Plus pertinent dans « À venir » — le patient doit être informé clairement.
 */
export function isUnacceptedPastDeadline(
  mission: Pick<
    Mission,
    "status" | "rdv_time" | "accepted_bibulance" | "external_payload"
  >,
  nowMs = Date.now(),
): boolean {
  if (mission.accepted_bibulance) return false;
  if (
    mission.status !== "incoming" &&
    mission.status !== "pending_platform"
  ) {
    return false;
  }
  const rdvMs = Date.parse(mission.rdv_time);
  if (Number.isNaN(rdvMs)) return false;
  return rdvMs < nowMs;
}

/** Active trips that still belong in the « À venir » feed. */
export function isActiveUpcomingMission(
  mission: Pick<
    Mission,
    "status" | "rdv_time" | "accepted_bibulance" | "external_payload"
  >,
  nowMs = Date.now(),
): boolean {
  if (isTerminalMissionStatus(mission.status)) return false;
  if (isUnacceptedPastDeadline(mission, nowMs)) return false;
  return true;
}

export function patientStatus(status: string) {
  return (
    PATIENT_STATUS[status as MissionStatus] ?? {
      label: status,
      hint: "",
      tone: "info" as const,
    }
  );
}

/** Contextual patient-facing explanation (cancellation / refusal reasons). */
export function patientStatusDetail(
  mission: Mission,
  nowMs = Date.now(),
): {
  label: string;
  hint: string;
  tone: "info" | "progress" | "ok" | "done" | "bad";
} {
  const base = patientStatus(mission.status);
  const meta = getMissionBookingMeta(mission);

  if (mission.status === "cancelled") {
    if (meta.expired_unaccepted === true || meta.cancel_reason === "expired_unaccepted") {
      return {
        label: "Horaires dépassés",
        hint:
          "L’heure du rendez-vous est passée et aucune société n’a accepté à temps. Créez une nouvelle demande si vous avez encore besoin d’un transport.",
        tone: "bad",
      };
    }
    if (meta.dispatch_mode === "partners") {
      return {
        ...base,
        hint:
          "Aucune société partenaire n’a pu accepter cette course à temps. Vous pouvez créer une nouvelle demande — nous rechercherons à nouveau une société disponible.",
      };
    }
    return {
      ...base,
      hint:
        "Ce transport a été annulé. Si vous avez encore besoin d’une ambulance, créez une nouvelle demande pour trouver une autre société.",
    };
  }

  if (mission.status === "refused") {
    if (meta.dispatch_mode === "partners") {
      return {
        ...base,
        hint:
          "Les sociétés contactées n’ont pas pu prendre en charge cette demande. Créez une nouvelle course pour relancer la recherche auprès des partenaires.",
      };
    }
    return {
      ...base,
      hint:
        "La société choisie n’a pas pu prendre en charge cette demande. Vous pouvez commander à nouveau auprès d’une autre société ou sans préférence (partenaires Bibulance).",
    };
  }

  // Still "incoming" in DB but past RDV — show expired until server cancel catches up
  if (isUnacceptedPastDeadline(mission, nowMs)) {
    return {
      label: "Horaires dépassés",
      hint:
        "L’heure du rendez-vous est passée et aucune société n’a accepté. Cette demande n’est plus active — créez-en une nouvelle si besoin.",
      tone: "bad",
    };
  }

  if (
    meta.dispatch_mode === "partners" &&
    !mission.accepted_bibulance &&
    (mission.status === "incoming" || mission.status === "pending_platform")
  ) {
    return {
      label: "Recherche en cours",
      hint:
        "Nous avons envoyé votre demande aux sociétés partenaires. La première qui accepte prendra en charge votre trajet.",
      tone: "progress",
    };
  }

  if (mission.accepted_bibulance && !isTerminalMissionStatus(mission.status)) {
    return {
      ...base,
      hint:
        "Une société d’ambulances a accepté votre demande. Son nom s’affiche ci-dessus.",
    };
  }

  return base;
}
