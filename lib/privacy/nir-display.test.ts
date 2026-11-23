import { describe, expect, it } from "vitest";

import {
  displayNirSafe,
  maskNirDigits,
  normalizeNirDigits,
} from "@/lib/privacy/nir-display";

describe("nir display", () => {
  it("normalizes to 15 digits max", () => {
    expect(normalizeNirDigits("1 85 01 75 116 001 23")).toBe("185017511600123");
    expect(normalizeNirDigits("abc")).toBe("");
  });

  it("masks keeping last 4", () => {
    expect(maskNirDigits("185017511600123")).toBe("•••••••••••0123");
  });

  it("never echoes sealed ciphertext", () => {
    expect(displayNirSafe("nir:v1:abcdef")).toBe("•••••••••••");
    expect(displayNirSafe("185017511600123")).toBe("•••••••••••0123");
  });

  it("masks plain: base64 storage", () => {
    const b64 = Buffer.from("185017511600123", "utf8").toString("base64");
    expect(displayNirSafe(`plain:${b64}`)).toBe("•••••••••••0123");
  });
});
