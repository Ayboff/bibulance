import { redirect } from "next/navigation";

import { ConfirmedMissionsBoard } from "@/components/missions/confirmed-missions-board";
import { getSessionContext } from "@/lib/auth/session";
import { listCompanyVehicles, listMissions } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

export default async function ProConfirmedPage() {
  const session = await getSessionContext();
  if (!session?.isStaff || !session.activeCompanyId) {
    redirect("/pro/onboarding");
  }

  const supabase = await createClient();
  const [missions, vehicles] = await Promise.all([
    listMissions(supabase, session, { scope: "company" }),
    listCompanyVehicles(supabase, session.activeCompanyId),
  ]);

  const vehicleLabels = Object.fromEntries(
    vehicles.map((v) => [v.id, `${v.code} (${v.vehicle_type})`]),
  );

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Planning confirmé</h1>
        <p className="text-muted">
          Missions validées, regroupées par date pour le suivi.
        </p>
      </div>
      <ConfirmedMissionsBoard
        companyId={session.activeCompanyId}
        initialMissions={missions}
        vehicleLabels={vehicleLabels}
      />
    </section>
  );
}
