import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "crypto";

import { verifyWebhookSignature } from "@/lib/connectors/sync-engine";

describe("verifyWebhookSignature", () => {
  afterEach(() => {
    delete process.env.ALLOW_INSECURE_WEBHOOKS;
  });

  it("rejects missing secret by default (AUD-SEC-002)", () => {
    expect(verifyWebhookSignature("{}", "abc", null)).toBe(false);
    expect(verifyWebhookSignature("{}", null, undefined)).toBe(false);
  });

  it("allows missing secret only with ALLOW_INSECURE_WEBHOOKS=1", () => {
    process.env.ALLOW_INSECURE_WEBHOOKS = "1";
    expect(verifyWebhookSignature("{}", null, null)).toBe(true);
  });

  it("accepts valid sha256(secret+body)", () => {
    const secret = "test-secret";
    const body = '{"missions":[]}';
    const sig = createHash("sha256").update(secret + body).digest("hex");
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
    expect(verifyWebhookSignature(body, `sha256=${sig}`, secret)).toBe(true);
    expect(verifyWebhookSignature(body, "deadbeef", secret)).toBe(false);
  });
});
