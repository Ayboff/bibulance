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

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Planning confirmé</h1>
        <p className="text-muted">
          Aujourd’hui et à venir — vous pouvez encore changer le véhicule, la
          PEC et le statut même après confirmation.
        </p>
      </div>
      <ConfirmedMissionsBoard
        companyId={session.activeCompanyId}
        initialMissions={missions}
        vehicles={vehicles.map((v) => ({
          id: v.id,
          code: v.code,
          vehicle_type: v.vehicle_type,
        }))}
      />
    </section>
  );
}
