/** App business timezone — all patient/regulator wall clocks use Paris. */
export const APP_TZ = "Europe/Paris";

function parisParts(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
    hour: parts.hour!,
    minute: parts.minute!,
    second: parts.second!,
  };
}

export function parisDateKey(date = new Date()): string {
  const p = parisParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Convert a Paris wall-clock date+time to a UTC ISO string for timestamptz.
 * Example: 2026-10-17 22:45 (CEST) → 2026-10-17T20:45:00.000Z
 */
export function parisWallToUtcIso(date: string, time: string): string {
  const [ys, ms, ds] = date.split("-");
  const timeParts = time.split(":");
  const year = Number(ys);
  const month = Number(ms);
  const day = Number(ds);
  const hour = Number(timeParts[0]);
  const minute = Number(timeParts[1] ?? 0);
  const second = Number(timeParts[2] ?? 0);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const shown = parisParts(new Date(utcGuess));
  const shownAsUtc = Date.UTC(
    Number(shown.year),
    Number(shown.month) - 1,
    Number(shown.day),
    Number(shown.hour),
    Number(shown.minute),
    Number(shown.second),
  );
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const corrected = utcGuess + (desiredAsUtc - shownAsUtc);
  return new Date(corrected).toISOString();
}

export function formatParisTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

export function formatParisDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    timeZone: APP_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return formatted.replace(",", " ·");
}

/** Value for <input type="datetime-local"> in Paris wall time. */
export function toParisDatetimeLocalValue(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = parisParts(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Parse datetime-local (Paris wall) into UTC ISO. */
export function fromParisDatetimeLocalValue(local: string): string {
  const [date, time] = local.split("T");
  if (!date || !time) return new Date(local).toISOString();
  return parisWallToUtcIso(date, time);
}

/** Inclusive Paris calendar-day bounds as UTC ISO for DB filters. */
export function parisDayBoundsUtc(dateKey: string): {
  start: string;
  end: string;
} {
  const start = parisWallToUtcIso(dateKey, "00:00:00");
  const endMs =
    new Date(parisWallToUtcIso(dateKey, "23:59:59")).getTime() + 999;
  return { start, end: new Date(endMs).toISOString() };
}
