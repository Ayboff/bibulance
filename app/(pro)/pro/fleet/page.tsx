import { redirect } from "next/navigation";

import { FleetPanel } from "@/components/fleet/fleet-panel";
import { getSessionContext } from "@/lib/auth/session";
import { listCompanyDrivers } from "@/lib/fleet/service";
import { listCompanyVehicles } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

export default async function ProFleetPage() {
  const session = await getSessionContext();
  if (!session?.isStaff || !session.activeCompanyId) {
    redirect("/pro/onboarding");
  }

  const supabase = await createClient();
  const [vehicles, drivers] = await Promise.all([
    listCompanyVehicles(supabase, session.activeCompanyId),
    listCompanyDrivers(supabase, session.activeCompanyId),
  ]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Parc & chauffeurs</h1>
        <p className="text-muted">
          Gérez les véhicules disponibles pour l’affectation des missions.
        </p>
      </div>
      <FleetPanel initialVehicles={vehicles} initialDrivers={drivers} />
    </section>
  );
}
