import {
  formatParisDateTime,
  formatParisTime,
  fromParisDatetimeLocalValue,
  toParisDatetimeLocalValue,
} from "@/lib/missions/timezone";

export function formatDateTime(value: string | null | undefined) {
  return formatParisDateTime(value);
}

export function formatTime(value: string | null | undefined) {
  return formatParisTime(value);
}

export function toDatetimeLocalValue(iso: string | null | undefined) {
  return toParisDatetimeLocalValue(iso);
}

export function fromDatetimeLocalValue(local: string) {
  return fromParisDatetimeLocalValue(local);
}

export const STATUS_LABELS: Record<string, string> = {
  incoming: "Entrante",
  pending_platform: "Attente plateforme",
  confirmed: "Confirmée",
  assigned: "Affectée",
  in_progress: "En cours",
  done: "Terminée",
  cancelled: "Annulée",
  refused: "Refusée",
};

export const PLATFORM_LABELS: Record<string, string> = {
  amblea: "Ambléa",
  sps: "SPS",
  scr_urgences: "SCR'urgences",
  ptah: "PTAH",
  paramedic: "Paramedic",
  bibulance_web: "Bibulance",
  csv: "CSV",
  manual: "Manuel",
  other: "Autre",
};
