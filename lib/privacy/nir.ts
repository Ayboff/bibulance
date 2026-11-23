import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import {
  displayNirSafe,
  maskNirDigits,
  normalizeNirDigits,
} from "@/lib/privacy/nir-display";

const PREFIX = "nir:v1:";

export {
  displayNirSafe,
  maskNirDigits as maskNir,
  normalizeNirDigits as normalizeNir,
} from "@/lib/privacy/nir-display";

function secret(): string | undefined {
  return (
    process.env.NIR_ENCRYPTION_KEY ||
    process.env.CONNECTOR_ENCRYPTION_KEY ||
    undefined
  );
}

function deriveKey(sec: string): Buffer {
  return createHash("sha256").update(`bibulance-nir:${sec}`).digest();
}

/**
 * Store form: encrypted if key present, else `plain:` base64 (dev only).
 * Never put raw 15 digits in JSON columns when a key exists.
 */
export function sealNir(value: string | null | undefined): string | null {
  const digits = normalizeNirDigits(value);
  if (!digits) return null;

  const sec = secret();
  if (!sec) {
    return `plain:${Buffer.from(digits, "utf8").toString("base64")}`;
  }

  const iv = randomBytes(12);
  const key = deriveKey(sec);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(digits, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Reveal digits for authorized staff display/masking pipeline. */
export function openNir(stored: string | null | undefined): string | null {
  if (!stored) return null;

  if (/^\d{15}$/.test(stored)) {
    // Legacy plaintext rows
    return stored;
  }

  if (stored.startsWith("plain:")) {
    try {
      return Buffer.from(stored.slice("plain:".length), "base64").toString(
        "utf8",
      );
    } catch {
      return null;
    }
  }

  if (!stored.startsWith(PREFIX)) return null;

  const sec = secret();
  if (!sec) return null;

  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const key = deriveKey(sec);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}

/** Safe label for regulator UI (server may decrypt then mask). */
export function displayNirForStaff(stored: string | null | undefined): string {
  const open = openNir(stored);
  if (open) return maskNirDigits(open);
  return displayNirSafe(stored);
}
