import { describe, expect, it } from "vitest";

import {
  buildFleetDayPlan,
  findOverlappingVehicleMissions,
  missionOccupancyWindow,
  windowsOverlap,
} from "@/lib/fleet/availability";
import type { Mission } from "@/types/database";

function m(partial: Partial<Mission> & Pick<Mission, "id" | "rdv_time">): Mission {
  return {
    company_id: "c1",
    source_platform: "bibulance_web",
    source_mission_id: null,
    external_payload: {},
    sync_hash: null,
    status: "assigned",
    pec_estimated_time: null,
    pec_set_by: null,
    emitter_facility: null,
    emitter_address: "A",
    destination_facility: null,
    destination_address: "B",
    patient_id: null,
    patient_first_name: "A",
    patient_last_name: "B",
    vehicle_type: "VSL",
    trip_type: "aller",
    care_type: null,
    floor_info: null,
    notes: null,
    specialties: {},
    contract_required: false,
    accepted_bibulance: true,
    platform_confirmation: true,
    assigned_vehicle_id: "v1",
    assigned_driver_id: null,
    is_locked: true,
    created_by: null,
    accepted_at: null,
    platform_confirmed_at: null,
    assigned_at: null,
    created_at: "2026-11-24T08:00:00.000Z",
    updated_at: "2026-11-24T08:00:00.000Z",
    deleted_at: null,
    ...partial,
  };
}

describe("fleet availability", () => {
  it("builds occupancy windows around RDV", () => {
    const w = missionOccupancyWindow({
      rdv_time: "2026-11-24T12:00:00.000Z",
      pec_estimated_time: "2026-11-24T11:15:00.000Z",
      trip_type: "aller",
    });
    expect(w).not.toBeNull();
    expect(w!.startMs).toBe(Date.parse("2026-11-24T11:15:00.000Z"));
    expect(w!.endMs).toBe(Date.parse("2026-11-24T14:00:00.000Z"));
  });

  it("detects overlapping assignments on same vehicle", () => {
    const existing = [
      m({
        id: "a",
        rdv_time: "2026-11-24T12:00:00.000Z",
        pec_estimated_time: "2026-11-24T11:15:00.000Z",
      }),
    ];
    const candidate = m({
      id: "b",
      rdv_time: "2026-11-24T12:30:00.000Z",
      assigned_vehicle_id: null,
      status: "incoming",
    });
    const conflicts = findOverlappingVehicleMissions("v1", candidate, existing);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.id).toBe("a");
  });

  it("allows non-overlapping later slot", () => {
    const existing = [
      m({
        id: "a",
        rdv_time: "2026-11-24T09:00:00.000Z",
        pec_estimated_time: "2026-11-24T08:15:00.000Z",
      }),
    ];
    const candidate = m({
      id: "b",
      rdv_time: "2026-11-24T16:00:00.000Z",
      assigned_vehicle_id: null,
      status: "incoming",
    });
    expect(findOverlappingVehicleMissions("v1", candidate, existing)).toHaveLength(
      0,
    );
  });

  it("windowsOverlap is exclusive on edges", () => {
    expect(
      windowsOverlap(
        { startMs: 0, endMs: 10 },
        { startMs: 10, endMs: 20 },
      ),
    ).toBe(false);
    expect(
      windowsOverlap(
        { startMs: 0, endMs: 11 },
        { startMs: 10, endMs: 20 },
      ),
    ).toBe(true);
  });

  it("builds day plan statuses", () => {
    const now = Date.parse("2026-11-24T12:00:00.000Z");
    const plan = buildFleetDayPlan(
      [
        { id: "v1", code: "VSL 1", vehicle_type: "VSL" },
        { id: "v2", code: "AMB 1", vehicle_type: "AMB" },
      ],
      [
        m({
          id: "a",
          assigned_vehicle_id: "v1",
          status: "in_progress",
          rdv_time: "2026-11-24T12:30:00.000Z",
          pec_estimated_time: "2026-11-24T11:30:00.000Z",
        }),
      ],
      now,
    );
    expect(plan.find((p) => p.vehicleId === "v1")?.status).toBe("en_trajet");
    expect(plan.find((p) => p.vehicleId === "v2")?.status).toBe("disponible");
  });
});
