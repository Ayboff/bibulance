import { addDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

import type { Mission } from "@/types/database";

export function toDateKey(value: string): string {
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const d = parseISO(value);
    if (Number.isNaN(d.getTime())) return value.slice(0, 10);
    return format(d, "yyyy-MM-dd");
  } catch {
    return value.slice(0, 10);
  }
}

export function todayKey(timeZone = "Europe/Paris"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function shiftDateKey(dateKey: string, days: number): string {
  const d = parseISO(`${dateKey}T12:00:00`);
  return format(addDays(d, days), "yyyy-MM-dd");
}

export function formatDateKeyLong(dateKey: string): string {
  try {
    return format(parseISO(`${dateKey}T12:00:00`), "EEEE d MMMM yyyy", {
      locale: fr,
    });
  } catch {
    return dateKey;
  }
}

export function isConfirmedMission(m: Mission): boolean {
  return m.accepted_bibulance && m.platform_confirmation;
}

export function computeMissionKpis(missions: Mission[], dateKey: string) {
  const ofDay = missions.filter((m) => toDateKey(m.rdv_time) === dateKey);
  return {
    ofDay: ofDay.length,
    incoming: ofDay.filter((m) => !m.accepted_bibulance && m.status !== "refused")
      .length,
    pendingPlatform: ofDay.filter(
      (m) => m.accepted_bibulance && !m.platform_confirmation,
    ).length,
    confirmed: ofDay.filter(isConfirmedMission).length,
    bibulanceWeb: ofDay.filter((m) => m.source_platform === "bibulance_web")
      .length,
    assigned: ofDay.filter((m) => !!m.assigned_vehicle_id).length,
  };
}
