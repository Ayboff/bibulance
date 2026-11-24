import type { Mission, MissionStatus, VehicleType } from "@/types/database";

const TERMINAL: ReadonlySet<MissionStatus> = new Set([
  "cancelled",
  "refused",
  "done",
]);

/** Fenêtre d’occupation estimée (pas d’heure de fin stockée). */
export type OccupancyWindow = {
  startMs: number;
  endMs: number;
};

export type VehiclePlanStatus =
  | "disponible"
  | "reserve"
  | "en_trajet"
  | "occupe";

export type VehicleDaySlot = {
  missionId: string;
  rdvTime: string;
  pecTime: string | null;
  status: MissionStatus;
  patientLabel: string;
  destination: string;
  window: OccupancyWindow;
};

export type VehicleDayPlan = {
  vehicleId: string;
  code: string;
  vehicleType: VehicleType;
  status: VehiclePlanStatus;
  statusLabel: string;
  statusHint: string;
  slots: VehicleDaySlot[];
  nextSlot: VehicleDaySlot | null;
};

export function isMissionOccupyingVehicle(
  mission: Pick<Mission, "status" | "assigned_vehicle_id">,
): boolean {
  if (!mission.assigned_vehicle_id) return false;
  return !TERMINAL.has(mission.status);
}

/**
 * Occupation : de la PEC (ou RDV−45 min) jusqu’à RDV+2h (ou +3h A/R).
 * Suffisant pour éviter deux courses au même créneau sans inventer une durée exacte.
 */
export function missionOccupancyWindow(
  mission: Pick<Mission, "rdv_time" | "pec_estimated_time" | "trip_type">,
): OccupancyWindow | null {
  const rdvMs = Date.parse(mission.rdv_time);
  if (Number.isNaN(rdvMs)) return null;

  let startMs = rdvMs - 45 * 60_000;
  if (mission.pec_estimated_time) {
    const pecMs = Date.parse(mission.pec_estimated_time);
    if (!Number.isNaN(pecMs)) startMs = Math.min(startMs, pecMs);
  }

  const afterRdvHours = mission.trip_type === "aller_retour" ? 3 : 2;
  const endMs = rdvMs + afterRdvHours * 3_600_000;
  if (endMs <= startMs) return null;
  return { startMs, endMs };
}

export function windowsOverlap(a: OccupancyWindow, b: OccupancyWindow): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function findOverlappingVehicleMissions(
  vehicleId: string,
  candidate: Pick<
    Mission,
    "id" | "rdv_time" | "pec_estimated_time" | "trip_type" | "status" | "assigned_vehicle_id"
  >,
  missions: Mission[],
): Mission[] {
  const candidateWindow = missionOccupancyWindow(candidate);
  if (!candidateWindow) return [];

  return missions.filter((m) => {
    if (m.id === candidate.id) return false;
    if (m.assigned_vehicle_id !== vehicleId) return false;
    if (!isMissionOccupyingVehicle(m)) return false;
    const w = missionOccupancyWindow(m);
    if (!w) return false;
    return windowsOverlap(candidateWindow, w);
  });
}

function patientLabel(m: Mission): string {
  const name = [m.patient_first_name, m.patient_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || "Patient";
}

function statusForVehicle(
  slots: VehicleDaySlot[],
  nowMs: number,
): Pick<VehicleDayPlan, "status" | "statusLabel" | "statusHint" | "nextSlot"> {
  const activeNow = slots.find(
    (s) =>
      s.window.startMs <= nowMs &&
      s.window.endMs > nowMs &&
      !TERMINAL.has(s.status),
  );

  if (activeNow?.status === "in_progress") {
    return {
      status: "en_trajet",
      statusLabel: "En trajet",
      statusHint: "Course en cours — ne pas réaffecter.",
      nextSlot: activeNow,
    };
  }

  if (activeNow) {
    return {
      status: "occupe",
      statusLabel: "Occupé",
      statusHint: `Affecté · RDV ${formatHm(activeNow.rdvTime)}`,
      nextSlot: activeNow,
    };
  }

  const upcoming = slots
    .filter((s) => s.window.endMs > nowMs && !TERMINAL.has(s.status))
    .sort((a, b) => a.window.startMs - b.window.startMs)[0];

  if (upcoming) {
    return {
      status: "reserve",
      statusLabel: "Réservé",
      statusHint: `Prochain RDV ${formatHm(upcoming.rdvTime)}`,
      nextSlot: upcoming,
    };
  }

  return {
    status: "disponible",
    statusLabel: "Disponible",
    statusHint: "Aucun créneau occupé pour le moment.",
    nextSlot: null,
  };
}

function formatHm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

export function buildFleetDayPlan(
  vehicles: Array<{
    id: string;
    code: string;
    vehicle_type: VehicleType;
    is_active?: boolean;
  }>,
  missions: Mission[],
  nowMs = Date.now(),
): VehicleDayPlan[] {
  const activeVehicles = vehicles.filter((v) => v.is_active !== false);

  return activeVehicles
    .map((vehicle) => {
      const slots: VehicleDaySlot[] = missions
        .filter(
          (m) =>
            m.assigned_vehicle_id === vehicle.id && isMissionOccupyingVehicle(m),
        )
        .map((m) => {
          const window = missionOccupancyWindow(m);
          if (!window) return null;
          return {
            missionId: m.id,
            rdvTime: m.rdv_time,
            pecTime: m.pec_estimated_time,
            status: m.status,
            patientLabel: patientLabel(m),
            destination: m.destination_address ?? m.destination_facility ?? "—",
            window,
          } satisfies VehicleDaySlot;
        })
        .filter((s): s is VehicleDaySlot => s != null)
        .sort((a, b) => a.window.startMs - b.window.startMs);

      const live = statusForVehicle(slots, nowMs);

      return {
        vehicleId: vehicle.id,
        code: vehicle.code,
        vehicleType: vehicle.vehicle_type,
        slots,
        ...live,
      } satisfies VehicleDayPlan;
    })
    .sort((a, b) => a.code.localeCompare(b.code, "fr"));
}

export function vehicleBusyLabel(
  vehicleId: string,
  candidate: Pick<
    Mission,
    "id" | "rdv_time" | "pec_estimated_time" | "trip_type" | "status" | "assigned_vehicle_id"
  >,
  missions: Mission[],
): string | null {
  const conflicts = findOverlappingVehicleMissions(vehicleId, candidate, missions);
  if (conflicts.length === 0) return null;
  const first = conflicts[0]!;
  const hm = formatHm(first.rdv_time);
  return `Occupé (RDV ${hm})`;
}
