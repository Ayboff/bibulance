import { describe, expect, it } from "vitest";

import {
  assertMissionTransition,
  canPatientCancel,
  canTransitionMissionStatus,
  MISSION_TRANSITIONS,
} from "@/lib/missions/transitions";
import type { MissionStatus } from "@/types/database";

const ALL = Object.keys(MISSION_TRANSITIONS) as MissionStatus[];

describe("mission transitions", () => {
  it("forbids terminal escapes", () => {
    for (const terminal of ["done", "cancelled", "refused"] as MissionStatus[]) {
      for (const to of ALL) {
        if (to === terminal) {
          expect(canTransitionMissionStatus(terminal, to)).toBe(true);
        } else {
          expect(canTransitionMissionStatus(terminal, to)).toBe(false);
        }
      }
    }
  });

  it("allows incoming → pending_platform and refuse", () => {
    expect(canTransitionMissionStatus("incoming", "pending_platform")).toBe(true);
    expect(canTransitionMissionStatus("incoming", "refused")).toBe(true);
    expect(canTransitionMissionStatus("incoming", "done")).toBe(false);
  });

  it("assertMissionTransition throws on illegal jump", () => {
    expect(() => assertMissionTransition("incoming", "done")).toThrow(
      /TRANSITION_FORBIDDEN/,
    );
  });

  it("patient cancel only early non-accepted", () => {
    expect(canPatientCancel("incoming", false)).toBe(true);
    expect(canPatientCancel("pending_platform", false)).toBe(true);
    expect(canPatientCancel("incoming", true)).toBe(false);
    expect(canPatientCancel("confirmed", false)).toBe(false);
    expect(canPatientCancel("done", false)).toBe(false);
  });
});
