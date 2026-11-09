export type AddressSuggestion = {
  label: string;
  name: string;
  postcode: string;
  city: string;
  context: string;
  housenumber?: string;
  street?: string;
};

type BanFeature = {
  properties?: {
    label?: string;
    name?: string;
    postcode?: string;
    city?: string;
    context?: string;
    housenumber?: string;
    street?: string;
  };
};

type BanResponse = {
  features?: BanFeature[];
};

/**
 * Base Adresse Nationale (data.gouv.fr) — gratuit, sans clé API.
 * Doc : https://adresse.data.gouv.fr/outils/api-doc/adresse
 */
export async function searchFrenchAddresses(
  query: string,
  limit = 6,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = new URL("https://api-adresse.data.gouv.fr/search/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 10)));
  url.searchParams.set("autocomplete", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`BAN search failed (${res.status})`);
  }

  const data = (await res.json()) as BanResponse;

  const out: AddressSuggestion[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const label = (p.label ?? "").trim();
    if (!label) continue;
    out.push({
      label,
      name: (p.name ?? label).trim(),
      postcode: (p.postcode ?? "").trim(),
      city: (p.city ?? "").trim(),
      context: (p.context ?? "").trim(),
      housenumber: p.housenumber?.trim() || undefined,
      street: p.street?.trim() || undefined,
    });
  }
  return out;
}
