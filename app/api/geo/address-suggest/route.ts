import { NextResponse } from "next/server";
import { z } from "zod";

import { searchFrenchAddresses } from "@/lib/geo/ban";

const querySchema = z.object({
  q: z.string().trim().min(3).max(200),
  limit: z.coerce.number().int().min(1).max(10).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await searchFrenchAddresses(
      parsed.data.q,
      parsed.data.limit ?? 6,
    );
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[geo/address-suggest]", err);
    return NextResponse.json(
      { suggestions: [], error: "Recherche d’adresse indisponible" },
      { status: 502 },
    );
  }
}
