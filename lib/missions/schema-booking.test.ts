import { describe, expect, it } from "vitest";

import { createPatientMissionSchema } from "@/lib/missions/schema";
import { isActiveUpcomingMission } from "@/lib/patient/status";

const base = {
  dispatch_mode: "specific" as const,
  booking_mode: "once" as const,
  company_id: "00000000-0000-4000-8000-000000000001",
  firstname: "Ada",
  lastname: "Lovelace",
  phone: "0612345678",
  depart_address: "10 rue de la Paix 75002 Paris",
  arrival_address: "Hôpital Saint-Louis Paris",
  date: "2099-06-15",
  time: "10:30",
  transport_type: "VSL" as const,
};

describe("createPatientMissionSchema regression", () => {
  it("requires a callable phone", () => {
    expect(createPatientMissionSchema.safeParse({ ...base, phone: "" }).success).toBe(
      false,
    );
    expect(
      createPatientMissionSchema.safeParse({ ...base, phone: "abcdef" }).success,
    ).toBe(false);
    expect(createPatientMissionSchema.safeParse(base).success).toBe(true);
  });

  it("rejects letter-only NIR that would previously collapse to empty", () => {
    const r = createPatientMissionSchema.safeParse({
      ...base,
      patient_social_security: "abcdefghijklmno",
    });
    expect(r.success).toBe(false);
  });

  it("accepts spaced valid NIR", () => {
    const r = createPatientMissionSchema.safeParse({
      ...base,
      patient_social_security: "1 85 01 75 116 001 23",
    });
    expect(r.success).toBe(true);
  });
});

describe("isActiveUpcomingMission regression", () => {
  it("keeps non-terminal overdue missions in upcoming", () => {
    expect(
      isActiveUpcomingMission({
        status: "assigned",
        rdv_time: "2020-01-01T10:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isActiveUpcomingMission({
        status: "cancelled",
        rdv_time: "2099-01-01T10:00:00.000Z",
      }),
    ).toBe(false);
  });
});
