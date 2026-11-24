import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const GUEST_TOKENS_COOKIE = "bibulance_guest_tokens";
const MAX_TOKENS = 20;

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function createGuestAccessToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function readGuestTokensFromCookies(): Promise<string[]> {
  const jar = await cookies();
  const raw = jar.get(GUEST_TOKENS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is string => typeof t === "string" && t.length >= 16)
      .slice(0, MAX_TOKENS);
  } catch {
    return [];
  }
}

export function mergeGuestTokens(
  existing: string[],
  nextToken: string,
): string[] {
  const set = new Set([nextToken, ...existing]);
  return [...set].slice(0, MAX_TOKENS);
}

export function guestTokensCookieOptions(tokens: string[]) {
  return {
    name: GUEST_TOKENS_COOKIE,
    value: JSON.stringify(tokens),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400, // ~13 months
  };
}

/** Attach updated guest token cookie on a NextResponse. */
export async function attachGuestTokenCookie(
  response: NextResponse,
  token: string,
): Promise<NextResponse> {
  const existing = await readGuestTokensFromCookies();
  const merged = mergeGuestTokens(existing, token);
  const opts = guestTokensCookieOptions(merged);
  response.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return response;
}

export function getPublicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "https://www.bibulance.fr";
}
