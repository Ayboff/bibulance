import { describe, expect, it } from "vitest";

import {
  isActiveUpcomingMission,
  isUnacceptedPastDeadline,
  patientStatusDetail,
} from "@/lib/patient/status";
import type { Mission } from "@/types/database";

function mission(partial: Partial<Mission>): Mission {
  return {
    id: "m1",
    company_id: "c1",
    source_platform: "bibulance_web",
    source_mission_id: null,
    external_payload: { dispatch_mode: "partners" },
    sync_hash: null,
    status: "incoming",
    rdv_time: "2026-11-23T21:00:00.000Z",
    pec_estimated_time: "2026-11-23T20:15:00.000Z",
    pec_set_by: null,
    emitter_facility: null,
    emitter_address: "A",
    destination_facility: null,
    destination_address: "B",
    patient_id: null,
    patient_first_name: "Jean",
    patient_last_name: "Dupont",
    vehicle_type: "AMB",
    trip_type: "aller",
    care_type: null,
    floor_info: null,
    notes: null,
    specialties: {},
    contract_required: false,
    accepted_bibulance: false,
    platform_confirmation: false,
    assigned_vehicle_id: null,
    assigned_driver_id: null,
    is_locked: false,
    created_by: null,
    accepted_at: null,
    platform_confirmed_at: null,
    assigned_at: null,
    created_at: "2026-11-23T10:00:00.000Z",
    updated_at: "2026-11-23T10:00:00.000Z",
    deleted_at: null,
    ...partial,
  };
}

const afterRdv = Date.parse("2026-11-24T12:00:00.000Z");
const beforeRdv = Date.parse("2026-11-23T10:00:00.000Z");

describe("unaccepted past deadline", () => {
  it("detects unaccepted past RDV", () => {
    expect(isUnacceptedPastDeadline(mission({}), afterRdv)).toBe(true);
    expect(isUnacceptedPastDeadline(mission({}), beforeRdv)).toBe(false);
  });

  it("ignores accepted or terminal missions", () => {
    expect(
      isUnacceptedPastDeadline(
        mission({ accepted_bibulance: true }),
        afterRdv,
      ),
    ).toBe(false);
    expect(
      isUnacceptedPastDeadline(mission({ status: "cancelled" }), afterRdv),
    ).toBe(false);
  });

  it("removes expired from upcoming feed", () => {
    expect(isActiveUpcomingMission(mission({}), afterRdv)).toBe(false);
    expect(isActiveUpcomingMission(mission({}), beforeRdv)).toBe(true);
  });

  it("explains expiry to the patient", () => {
    const detail = patientStatusDetail(mission({}), afterRdv);
    expect(detail.label).toBe("Horaires dépassés");
    expect(detail.tone).toBe("bad");
    expect(detail.hint.toLowerCase()).toMatch(/nouvelle demande|nouvelle/);
  });

  it("uses cancelled+expired meta copy", () => {
    const detail = patientStatusDetail(
      mission({
        status: "cancelled",
        external_payload: {
          dispatch_mode: "partners",
          expired_unaccepted: true,
          cancel_reason: "expired_unaccepted",
        },
      }),
      afterRdv,
    );
    expect(detail.label).toBe("Horaires dépassés");
  });
});
