import { redirect } from "next/navigation";

import { VehicleQrPosters } from "@/components/fleet/vehicle-qr-posters";
import { getSessionContext } from "@/lib/auth/session";
import { listCompanyVehicles } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

export default async function ProAffichesPage() {
  const session = await getSessionContext();
  if (!session?.isStaff || !session.activeCompanyId) {
    redirect("/pro/onboarding");
  }

  const supabase = await createClient();
  const [{ data: company }, vehicles] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, slug")
      .eq("id", session.activeCompanyId)
      .single(),
    listCompanyVehicles(supabase, session.activeCompanyId),
  ]);

  if (!company) redirect("/pro/onboarding");

  return (
    <section className="space-y-4">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold">Affiches QR véhicules</h1>
        <p className="text-muted">
          Imprimez et collez sur vos VSL / ambulances. Le QR ouvre la commande
          Bibulance déjà liée à {company.name}.
        </p>
      </div>
      <VehicleQrPosters
        companyName={company.name}
        companySlug={company.slug}
        vehicles={vehicles.map((v) => ({
          code: v.code,
          vehicle_type: v.vehicle_type,
        }))}
      />
    </section>
  );
}
