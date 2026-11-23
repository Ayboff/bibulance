import { describe, expect, it } from "vitest";

import { healthSearchQueries } from "@/lib/geo/health-pois";

describe("healthSearchQueries", () => {
  it("keeps explicit facility queries as-is", () => {
    expect(healthSearchQueries("Hôpital Pitié")).toEqual(["Hôpital Pitié"]);
    expect(healthSearchQueries("Clinique Pasteur Toulouse")).toEqual([
      "Clinique Pasteur Toulouse",
    ]);
    expect(healthSearchQueries("CHU Bordeaux")).toEqual(["CHU Bordeaux"]);
  });

  it("adds hôpital/clinique boosts for bare names", () => {
    expect(healthSearchQueries("Pitié Salpêtrière")).toEqual([
      "Pitié Salpêtrière",
      "hôpital Pitié Salpêtrière",
      "clinique Pitié Salpêtrière",
    ]);
  });

  it("ignores short queries", () => {
    expect(healthSearchQueries("ab")).toEqual([]);
  });
});
