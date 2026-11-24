import { describe, expect, it } from "vitest";

import {
  createGuestAccessToken,
  mergeGuestTokens,
  normalizePhoneDigits,
} from "@/lib/guest/tokens";

describe("guest tokens", () => {
  it("normalizes phone to digits", () => {
    expect(normalizePhoneDigits("06 12 34 56 78")).toBe("0612345678");
    expect(normalizePhoneDigits("+33 6 12-34-56-78")).toBe("33612345678");
  });

  it("creates opaque tokens", () => {
    const a = createGuestAccessToken();
    const b = createGuestAccessToken();
    expect(a).toHaveLength(32);
    expect(a).not.toEqual(b);
  });

  it("merges tokens with newest first and dedupes", () => {
    expect(mergeGuestTokens(["aaa", "bbb"], "ccc")).toEqual([
      "ccc",
      "aaa",
      "bbb",
    ]);
    expect(mergeGuestTokens(["aaa", "bbb"], "aaa")).toEqual(["aaa", "bbb"]);
  });
});
