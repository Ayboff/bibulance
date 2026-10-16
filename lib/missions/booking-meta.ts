import type { Json, Mission } from "@/types/database";

export type DispatchMode = "specific" | "partners";
export type BookingMode = "once" | "recurring";

export type MissionBookingMeta = {
  dispatch_mode: DispatchMode;
  booking_mode: BookingMode;
  broadcast_id: string | null;
  series_id: string | null;
  phone: string | null;
};

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function getMissionBookingMeta(
  mission: Pick<Mission, "external_payload">,
): MissionBookingMeta {
  const p = asRecord(mission.external_payload);
  const dispatch =
    p.dispatch_mode === "partners" ? "partners" : "specific";
  const booking = p.booking_mode === "recurring" ? "recurring" : "once";
  return {
    dispatch_mode: dispatch,
    booking_mode: booking,
    broadcast_id:
      typeof p.broadcast_id === "string" ? p.broadcast_id : null,
    series_id: typeof p.series_id === "string" ? p.series_id : null,
    phone: typeof p.phone === "string" ? p.phone : null,
  };
}

export function buildOccurrencesFromDays(args: {
  days: Record<
    string,
    { active: boolean; time: string; trip_type?: "aller" | "aller_retour" }
  >;
  end_date?: string;
  count?: number;
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
  const start = new Date();
  start.setHours(0, 0, 0, 0);
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
    generated.push({
      date: `${yyyy}-${mm}-${dd}`,
      time: slot.time,
      trip_type: slot.trip_type ?? "aller",
    });
  }

  return generated;
}
