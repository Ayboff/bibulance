import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/auth/safe-next";

describe("safeNextPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeNextPath("/commander")).toBe("/commander");
    expect(safeNextPath("/mes-transports?x=1")).toBe("/mes-transports?x=1");
  });

  it("blocks protocol-relative and absolute URLs", () => {
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("\\evil")).toBe("/");
  });

  it("falls back on empty", () => {
    expect(safeNextPath("", "/pro")).toBe("/pro");
    expect(safeNextPath(null)).toBe("/");
  });
});
