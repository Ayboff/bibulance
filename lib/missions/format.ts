import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    const d = parseISO(value.length === 16 ? `${value}:00` : value);
    if (Number.isNaN(d.getTime())) return value;
    return format(d, "dd MMM yyyy · HH:mm", { locale: fr });
  } catch {
    return value;
  }
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    const d = parseISO(value.length === 16 ? `${value}:00` : value);
    if (Number.isNaN(d.getTime())) return value;
    return format(d, "HH:mm", { locale: fr });
  } catch {
    return value;
  }
}

export function toDatetimeLocalValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(local: string) {
  const d = new Date(local);
  return d.toISOString();
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
