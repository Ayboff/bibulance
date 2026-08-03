import { redirect } from "next/navigation";

import { ProMissionsBoard } from "@/components/missions/pro-missions-board";
import { getSessionContext } from "@/lib/auth/session";
import { listCompanyVehicles, listMissions } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

export default async function ProMissionsPage() {
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
        <h1 className="text-2xl font-semibold">Missions</h1>
        <p className="text-muted">
          File du jour, filtres, actions régulateur et PEC — realtime actif.
        </p>
      </div>
      <ProMissionsBoard
        companyId={session.activeCompanyId}
        initialMissions={missions}
        initialVehicles={vehicles}
      />
    </section>
  );
}
