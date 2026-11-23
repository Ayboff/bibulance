/** Client-safe NIR helpers (no Node crypto). */

export function normalizeNirDigits(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "").slice(0, 15);
}

export function maskNirDigits(value: string | null | undefined): string {
  const digits = normalizeNirDigits(value);
  if (!digits) return "";
  if (digits.length <= 4) return "••••";
  return `${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

/**
 * Safe label for UI from stored payload value (plaintext legacy, plain:, or sealed).
 * Never attempts AES decrypt in the browser.
 */
export function displayNirSafe(stored: string | null | undefined): string {
  if (!stored) return "";
  if (/^\d{13,15}$/.test(stored)) return maskNirDigits(stored);
  if (stored.startsWith("plain:")) {
    try {
      const raw =
        typeof atob === "function"
          ? atob(stored.slice("plain:".length))
          : Buffer.from(stored.slice("plain:".length), "base64").toString(
              "utf8",
            );
      return maskNirDigits(raw);
    } catch {
      return "••••";
    }
  }
  if (stored.startsWith("nir:v1:") || stored.startsWith("enc:v1:")) {
    return "•••••••••••";
  }
  // Unknown shape — do not echo
  return "••••";
}
