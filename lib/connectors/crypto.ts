import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1:";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptCredentials(payload: Record<string, unknown>): string {
  const secret = process.env.CONNECTOR_ENCRYPTION_KEY;
  const json = JSON.stringify(payload);

  if (!secret) {
    // Local/dev fallback — never use in production without a key
    return `plain:${Buffer.from(json, "utf8").toString("base64")}`;
  }

  const iv = randomBytes(12);
  const key = deriveKey(secret);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    Buffer.concat([iv, tag, encrypted]).toString("base64")
  );
}

export function decryptCredentials(
  value: string | null | undefined,
): Record<string, unknown> {
  if (!value) return {};

  if (value.startsWith("plain:")) {
    const raw = Buffer.from(value.slice("plain:".length), "base64").toString(
      "utf8",
    );
    return JSON.parse(raw) as Record<string, unknown>;
  }

  if (!value.startsWith(PREFIX)) {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  const secret = process.env.CONNECTOR_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("CONNECTOR_ENCRYPTION_KEY required to decrypt credentials");
  }

  const buf = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = deriveKey(secret);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const json = Buffer.concat([
    decipher.update(data),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}
