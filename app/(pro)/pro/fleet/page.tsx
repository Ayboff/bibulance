import { redirect } from "next/navigation";

import { FleetPanel } from "@/components/fleet/fleet-panel";
import { FleetPlanning } from "@/components/fleet/fleet-planning";
import { getSessionContext } from "@/lib/auth/session";
import { listCompanyDrivers } from "@/lib/fleet/service";
import { parisDateKey } from "@/lib/missions/timezone";
import { listCompanyVehicles, listMissions } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

export default async function ProFleetPage() {
  const session = await getSessionContext();
  if (!session?.isStaff || !session.activeCompanyId) {
    redirect("/pro/onboarding");
  }

  const supabase = await createClient();
  const today = parisDateKey();
  const [vehicles, drivers, missions] = await Promise.all([
    listCompanyVehicles(supabase, session.activeCompanyId),
    listCompanyDrivers(supabase, session.activeCompanyId),
    listMissions(supabase, session, { scope: "company", date: today }),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Parc & chauffeurs</h1>
        <p className="text-muted">
          Planning de disponibilité + gestion du parc. Un véhicule déjà affecté
          sur un créneau ne peut pas être repris en double.
        </p>
      </div>

      <FleetPlanning vehicles={vehicles} missions={missions} />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">Configuration</h2>
        <FleetPanel initialVehicles={vehicles} initialDrivers={drivers} />
      </div>
    </section>
  );
}
