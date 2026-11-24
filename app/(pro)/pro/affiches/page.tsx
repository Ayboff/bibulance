import { redirect } from "next/navigation";

import { VehicleQrPosters } from "@/components/fleet/vehicle-qr-posters";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ProAffichesPage() {
  const session = await getSessionContext();
  if (!session?.isStaff || !session.activeCompanyId) {
    redirect("/pro/onboarding");
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("id", session.activeCompanyId)
    .single();

  if (!company) redirect("/pro/onboarding");

  return (
    <section className="space-y-4">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold">Affiche QR Bibulance</h1>
        <p className="text-muted">
          Une seule affiche à coller sur vos véhicules. Le QR ouvre la commande
          en ligne pour {company.name} — sans inscription.
        </p>
      </div>
      <VehicleQrPosters
        companyName={company.name}
        companySlug={company.slug}
      />
    </section>
  );
}
