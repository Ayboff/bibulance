import type { MissionStatus } from "@/types/database";

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

export function patientStatus(status: string) {
  return (
    PATIENT_STATUS[status as MissionStatus] ?? {
      label: status,
      hint: "",
      tone: "info" as const,
    }
  );
}
