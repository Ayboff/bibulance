import type { AddressSuggestion } from "@/lib/geo/ban";

type NominatimResult = {
  display_name?: string;
  name?: string;
  class?: string;
  type?: string;
  address?: {
    amenity?: string;
    healthcare?: string;
    hospital?: string;
    clinic?: string;
    road?: string;
    pedestrian?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
  };
};

const HEALTH_TYPES = new Set([
  "hospital",
  "clinic",
  "doctors",
  "dentist",
  "nursing_home",
  "social_facility",
]);

const HEALTH_CLASSES = new Set(["amenity", "healthcare", "emergency"]);

function isHealthResult(row: NominatimResult): boolean {
  const cls = (row.class ?? "").toLowerCase();
  const type = (row.type ?? "").toLowerCase();
  if (HEALTH_CLASSES.has(cls) && HEALTH_TYPES.has(type)) return true;
  if (cls === "healthcare") return true;
  if (type === "hospital" || type === "clinic") return true;
  return false;
}

function kindFor(row: NominatimResult): AddressSuggestion["kind"] {
  const type = (row.type ?? "").toLowerCase();
  if (type === "hospital") return "hospital";
  if (type === "clinic") return "clinic";
  return "poi";
}

function cityFrom(address: NominatimResult["address"]): string {
  if (!address) return "";
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.suburb ||
    ""
  ).trim();
}

function labelFrom(row: NominatimResult): string {
  const address = row.address ?? {};
  const name = (
    row.name ||
    address.amenity ||
    address.hospital ||
    address.clinic ||
    address.healthcare ||
    ""
  ).trim();
  const road = [address.house_number, address.road || address.pedestrian]
    .filter(Boolean)
    .join(" ")
    .trim();
  const city = cityFrom(address);
  const postcode = (address.postcode ?? "").trim();
  const parts = [name, road, [postcode, city].filter(Boolean).join(" ")].filter(
    Boolean,
  );
  if (parts.length >= 2) return parts.join(", ");
  return (row.display_name ?? name).trim();
}

/**
 * Hôpitaux / cliniques par nom via Nominatim (OpenStreetMap).
 * Complète la BAN, qui ne indexe que les adresses postales.
 */
export async function searchHealthFacilities(
  query: string,
  limit = 6,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const capped = Math.min(Math.max(limit, 1), 10);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(Math.min(capped * 2, 12)));
  url.searchParams.set("countrycodes", "fr");
  url.searchParams.set("accept-language", "fr");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Bibulance/1.0 (transport sanitaire; contact@bibulance.fr)",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Nominatim search failed (${res.status})`);
  }

  const data = (await res.json()) as NominatimResult[];
  const out: AddressSuggestion[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!isHealthResult(row)) continue;
    const label = labelFrom(row);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const address = row.address ?? {};
    const name = (
      row.name ||
      address.amenity ||
      address.hospital ||
      address.clinic ||
      label
    ).trim();

    out.push({
      label,
      name,
      postcode: (address.postcode ?? "").trim(),
      city: cityFrom(address),
      context: "Établissement de santé",
      housenumber: address.house_number?.trim() || undefined,
      street: (address.road || address.pedestrian)?.trim() || undefined,
      kind: kindFor(row),
    });

    if (out.length >= capped) break;
  }

  return out;
}

/** Si la requête ne mentionne pas déjà un type d’établissement, on enrichit. */
export function healthSearchQueries(query: string): string[] {
  const q = query.trim();
  if (q.length < 3) return [];
  if (
    /h[oô]pital|clinique|chu\b|chru\b|polyclinique|centre\s+m[eé]dical|ehpad/i.test(
      q,
    )
  ) {
    return [q];
  }
  return [q, `hôpital ${q}`, `clinique ${q}`];
}
