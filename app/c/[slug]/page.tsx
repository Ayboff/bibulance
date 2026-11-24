import { redirect } from "next/navigation";

/** QR véhicule / société → commande pré-remplie pour cette société. */
export default async function CompanyBookingEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { slug } = await params;
  const q = await searchParams;
  const qs = new URLSearchParams();
  qs.set("societe", slug);
  if (q.v?.trim()) qs.set("v", q.v.trim());
  redirect(`/commander?${qs.toString()}`);
}
