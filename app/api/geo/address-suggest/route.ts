import { NextResponse } from "next/server";
import { z } from "zod";

import { searchFrenchAddresses, type AddressSuggestion } from "@/lib/geo/ban";
import {
  healthSearchQueries,
  searchHealthFacilities,
} from "@/lib/geo/health-pois";

const querySchema = z.object({
  q: z.string().trim().min(3).max(200),
  limit: z.coerce.number().int().min(1).max(10).optional(),
  /** destination = prioriser hôpitaux / cliniques par nom */
  mode: z.enum(["address", "destination"]).optional(),
});

function dedupe(suggestions: AddressSuggestion[]): AddressSuggestion[] {
  const seen = new Set<string>();
  const out: AddressSuggestion[] = [];
  for (const s of suggestions) {
    const key = s.label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? undefined,
    mode: searchParams.get("mode") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ suggestions: [] });
  }

  const limit = parsed.data.limit ?? 6;
  const mode = parsed.data.mode ?? "address";
  const q = parsed.data.q;

  try {
    if (mode !== "destination") {
      const suggestions = await searchFrenchAddresses(q, limit);
      return NextResponse.json({
        suggestions: suggestions.map((s) => ({
          ...s,
          kind: s.kind ?? "address",
        })),
      });
    }

    const healthQueries = healthSearchQueries(q);
    const [ban, ...healthBatches] = await Promise.all([
      searchFrenchAddresses(q, limit).catch(() => [] as AddressSuggestion[]),
      ...healthQueries
        .slice(0, 2)
        .map((hq) =>
          searchHealthFacilities(hq, limit).catch(
            () => [] as AddressSuggestion[],
          ),
        ),
    ]);

    const health = dedupe(healthBatches.flat());
    const addresses = ban.map((s) => ({ ...s, kind: s.kind ?? "address" as const }));
    const merged = dedupe([...health, ...addresses]).slice(0, limit);

    return NextResponse.json({ suggestions: merged });
  } catch (err) {
    console.error("[geo/address-suggest]", err);
    return NextResponse.json(
      { suggestions: [], error: "Recherche d’adresse indisponible" },
      { status: 502 },
    );
  }
}
