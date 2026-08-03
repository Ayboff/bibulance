import { redirect } from "next/navigation";

import { PatientTripsList } from "@/components/patient/patient-trips-list";
import { getSessionContext } from "@/lib/auth/session";
import { listMissions } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

export default async function MesTransportsPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login?next=/mes-transports");

  const supabase = await createClient();
  const missions = await listMissions(supabase, session, { scope: "mine" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="patient-title">Mes trajets</h1>
        <p className="patient-lead mt-2">
          Suivez l’état de vos transports. L’heure de prise en charge se met à
          jour automatiquement.
        </p>
      </div>
      <PatientTripsList userId={session.userId} initialMissions={missions} />
    </div>
  );
}
