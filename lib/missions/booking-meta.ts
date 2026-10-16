import type { Json, Mission } from "@/types/database";

export type DispatchMode = "specific" | "partners";
export type BookingMode = "once" | "iterative";

export type MissionBookingMeta = {
  dispatch_mode: DispatchMode;
  booking_mode: BookingMode;
  broadcast_id: string | null;
  series_id: string | null;
  phone: string | null;
  ordered_for_someone: boolean;
  relative_firstname: string | null;
  relative_lastname: string | null;
  relative_relation: string | null;
  relative_phone: string | null;
  patient_birthdate: string | null;
  patient_social_security: string | null;
};

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getMissionBookingMeta(
  mission: Pick<Mission, "external_payload">,
): MissionBookingMeta {
  const p = asRecord(mission.external_payload);
  const dispatch =
    p.dispatch_mode === "partners" ? "partners" : "specific";
  const booking =
    p.booking_mode === "iterative" || p.booking_mode === "recurring"
      ? "iterative"
      : "once";
  return {
    dispatch_mode: dispatch,
    booking_mode: booking,
    broadcast_id: asString(p.broadcast_id),
    series_id: asString(p.series_id),
    phone: asString(p.phone),
    ordered_for_someone: p.ordered_for_someone === true,
    relative_firstname: asString(p.relative_firstname),
    relative_lastname: asString(p.relative_lastname),
    relative_relation: asString(p.relative_relation),
    relative_phone: asString(p.relative_phone),
    patient_birthdate: asString(p.patient_birthdate),
    patient_social_security: asString(p.patient_social_security),
  };
}

/** Wall-clock date/time in Europe/Paris (YYYY-MM-DD + HH:mm). */
export function parisNowParts(now = new Date()): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/** True if the RDV is strictly before now (Paris). */
export function isDateTimeInPast(date: string, time: string, now = new Date()) {
  const current = parisNowParts(now);
  if (date < current.date) return true;
  if (date > current.date) return false;
  return time < current.time;
}

/** Next sensible default time (round up to next 15 min, Paris). */
export function suggestDefaultTime(now = new Date()): string {
  const { time } = parisNowParts(now);
  const [hStr, mStr] = time.split(":");
  let h = Number(hStr);
  let m = Number(mStr);
  m = Math.ceil((m + 1) / 15) * 15;
  if (m >= 60) {
    m = 0;
    h += 1;
  }
  if (h >= 24) return "23:59";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function buildOccurrencesFromDays(args: {
  days: Record<
    string,
    { active: boolean; time: string; trip_type?: "aller" | "aller_retour" }
  >;
  end_date?: string;
  count?: number;
  now?: Date;
}): Array<{ date: string; time: string; trip_type: "aller" | "aller_retour" }> {
  const dayIndex: Record<string, number> = {
    Lundi: 1,
    Mardi: 2,
    Mercredi: 3,
    Jeudi: 4,
    Vendredi: 5,
    Samedi: 6,
    Dimanche: 0,
  };

  const generated: Array<{
    date: string;
    time: string;
    trip_type: "aller" | "aller_retour";
  }> = [];
  const now = args.now ?? new Date();
  const { date: todayParis } = parisNowParts(now);
  const start = new Date(`${todayParis}T12:00:00`);
  const end = args.end_date ? new Date(`${args.end_date}T23:59:59`) : null;
  const maxCount = args.count && args.count > 0 ? Math.min(args.count, 40) : 40;

  for (let i = 0; i < 200 && generated.length < maxCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (end && d > end) break;

    const dayName = Object.keys(dayIndex).find(
      (k) => dayIndex[k] === d.getDay(),
    );
    if (!dayName) continue;
    const slot = args.days[dayName];
    if (!slot?.active) continue;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const date = `${yyyy}-${mm}-${dd}`;
    if (isDateTimeInPast(date, slot.time, now)) continue;

    generated.push({
      date,
      time: slot.time,
      trip_type: slot.trip_type ?? "aller",
    });
  }

  return generated;
}
