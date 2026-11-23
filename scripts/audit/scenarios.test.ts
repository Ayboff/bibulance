import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { canTransitionMissionStatus } from "@/lib/missions/transitions";
import { PATIENT_STATUS } from "@/lib/patient/status";
import { verifyWebhookSignature } from "@/lib/connectors/sync-engine";
import { createPatientMissionSchema } from "@/lib/missions/schema";
import type { MissionStatus } from "@/types/database";

type Scenario = {
  id: string;
  category: string;
  executable: string;
  dimensions: Record<string, unknown>;
  expected: Record<string, unknown>;
};

const summaryPath = join(process.cwd(), "docs/audit/scenarios-summary.json");
const scenariosPath = join(process.cwd(), "docs/audit/scenarios.json");

describe("audit scenario matrix", () => {
  it("has at least 5000 distinct scenarios generated", () => {
    const summary = JSON.parse(readFileSync(summaryPath, "utf8")) as {
      total: number;
      uniqueIds: number;
    };
    expect(summary.total).toBeGreaterThanOrEqual(5000);
    expect(summary.uniqueIds).toBe(summary.total);
  });

  it("executes all transition / status / webhook / schema scenarios", () => {
    const { scenarios } = JSON.parse(
      readFileSync(scenariosPath, "utf8"),
    ) as { scenarios: Scenario[] };

    let ran = 0;
    let failed = 0;
    const failures: string[] = [];

    for (const s of scenarios) {
      if (s.executable === "transitions") {
        ran++;
        const from = s.dimensions.from as MissionStatus | undefined;
        const to = s.dimensions.to as MissionStatus | undefined;
        if (from && to) {
          const ok = canTransitionMissionStatus(from, to);
          if (ok !== Boolean(s.expected.transition_ok)) {
            failed++;
            failures.push(`${s.id} transition ${from}->${to}`);
          }
        }
      } else if (s.executable === "status_copy") {
        ran++;
        const status = s.dimensions.status as MissionStatus;
        const entry = PATIENT_STATUS[status];
        if (!entry?.label || !entry?.hint) {
          failed++;
          failures.push(`${s.id} missing patient copy`);
        }
      } else if (s.executable === "webhook") {
        ran++;
        const hasSecret = s.dimensions.hasSecret === true;
        const sig = s.dimensions.sig as string;
        const secret = hasSecret ? "sec" : null;
        const body = "{}";
        let header: string | null = null;
        if (sig === "valid" && hasSecret) {
          const { createHash } = require("crypto") as typeof import("crypto");
          header = createHash("sha256").update("sec" + body).digest("hex");
        } else if (sig === "invalid") {
          header = "00";
        }
        const accepted = verifyWebhookSignature(body, header, secret);
        const shouldAccept = hasSecret && sig === "valid";
        if (accepted !== shouldAccept) {
          failed++;
          failures.push(`${s.id} webhook accept=${accepted}`);
        }
      } else if (s.executable === "schema" && s.category === "A_patient_booking") {
        ran++;
        const d = s.dimensions;
        const dateEdge = d.dateEdge as string;
        const addr = d.addr as string;
        const phone = d.phone as string;
        const relative = d.relative === true;
        const nir = d.nir as string;

        const payload = {
          dispatch_mode: d.dispatch,
          booking_mode: d.booking === "iterative" ? "iterative" : "once",
          company_id:
            d.dispatch === "specific"
              ? "00000000-0000-4000-8000-000000000001"
              : undefined,
          firstname: "Ada",
          lastname: "Lovelace",
          phone:
            phone === "valid_fr"
              ? "0612345678"
              : phone === "short"
                ? "12"
                : phone === "missing"
                  ? undefined
                  : phone === "international"
                    ? "+33612345678"
                    : "abcdef",
          depart_address:
            addr === "missing" ? "ab" : "10 rue de la Paix 75002 Paris",
          arrival_address: "Hôpital Saint-Louis Paris",
          date:
            dateEdge === "invalid_format"
              ? "32/13/2020"
              : dateEdge === "past"
                ? "2020-01-01"
                : "2099-06-15",
          time: dateEdge === "today_past_time" ? "00:01" : "10:30",
          transport_type: d.transport,
          trip_type: d.trip,
          ordered_for_someone: relative,
          relative_firstname: relative ? "Jean" : undefined,
          relative_lastname: relative ? "Dupont" : undefined,
          relative_phone:
            relative && phone === "missing" ? "1" : relative ? "0611223344" : undefined,
          patient_birthdate: relative ? "1950-01-01" : undefined,
          patient_social_security:
            nir === "valid_15"
              ? "185017511600123"
              : nir === "short"
                ? "123"
                : nir === "letters"
                  ? "abcdefghijklmno"
                  : nir === "spaces_ok"
                    ? "1 85 01 75 116 001 23"
                    : undefined,
          specialties: d.specs,
          occurrences:
            d.booking === "iterative"
              ? [
                  {
                    date:
                      dateEdge === "past" ||
                      dateEdge === "today_past_time" ||
                      dateEdge === "invalid_format"
                        ? dateEdge === "invalid_format"
                          ? "2099-06-15"
                          : "2020-01-01"
                        : "2099-06-15",
                    time: "10:30",
                    trip_type: "aller" as const,
                  },
                ]
              : undefined,
        };

        // Stable past rejection (avoid flake on wall-clock "today").
        if (dateEdge === "today_past_time") {
          (payload as { date: string }).date = "2020-01-01";
        }

        const parsed = createPatientMissionSchema.safeParse(payload);
        // Iterative bookings validate occurrences[], not the top-level date string.
        const dateReject =
          dateEdge === "past" ||
          dateEdge === "today_past_time" ||
          (dateEdge === "invalid_format" && d.booking !== "iterative");

        const hardReject =
          addr === "missing" ||
          dateReject ||
          phone === "short" ||
          phone === "letters" ||
          nir === "short" ||
          nir === "letters" ||
          (relative && phone === "missing");

        if (hardReject && parsed.success) {
          failed++;
          failures.push(`${s.id} expected schema reject`);
        }
        if (!hardReject && !parsed.success) {
          failed++;
          failures.push(
            `${s.id} unexpected schema fail: ${parsed.error.issues[0]?.message}`,
          );
        }
      }
    }

    expect(ran).toBeGreaterThan(1000);
    if (failures.length) {
      expect.soft(failures.slice(0, 20)).toEqual([]);
    }
    expect(failed).toBe(0);
  });
});
