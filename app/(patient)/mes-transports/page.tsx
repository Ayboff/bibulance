import Link from "next/link";

import { GuestLookupForm } from "@/components/patient/guest-lookup-form";
import { PatientTripsList } from "@/components/patient/patient-trips-list";
import { getSessionContext } from "@/lib/auth/session";
import { readGuestTokensFromCookies } from "@/lib/guest/tokens";
import {
  listBookableCompaniesPublic,
  listMissionsByGuestTokens,
} from "@/lib/missions/guest-service";
import {
  listBookableCompanies,
  listMissions,
} from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";
import type { Mission } from "@/types/database";

export default async function MesTransportsPage() {
  const session = await getSessionContext();
  const guestTokens = await readGuestTokensFromCookies();

  let missions: Mission[] = [];
  let companyNames: Record<string, string> = {};
  let userId = "";

  if (session) {
    const supabase = await createClient();
    const [mine, companies] = await Promise.all([
      listMissions(supabase, session, { scope: "mine" }),
      listBookableCompanies(supabase).catch(() => listBookableCompaniesPublic()),
    ]);
    missions = mine;
    companyNames = Object.fromEntries(companies.map((c) => [c.id, c.name]));
    userId = session.userId;

    if (guestTokens.length > 0) {
      const guestMissions = await listMissionsByGuestTokens(guestTokens);
      const byId = new Map(missions.map((m) => [m.id, m]));
      for (const m of guestMissions) byId.set(m.id, m);
      missions = [...byId.values()].sort((a, b) =>
        a.rdv_time.localeCompare(b.rdv_time),
      );
    }
  } else if (guestTokens.length > 0) {
    const [guestMissions, companies] = await Promise.all([
      listMissionsByGuestTokens(guestTokens),
      listBookableCompaniesPublic(),
    ]);
    missions = guestMissions;
    companyNames = Object.fromEntries(companies.map((c) => [c.id, c.name]));
  }

  const hasTrips = missions.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="patient-title">Mes trajets</h1>
        <p className="patient-lead mt-2">
          {session
            ? "Suivez l’état de vos transports. L’heure de prise en charge se met à jour automatiquement."
            : "Sans compte : vos trajets restent visibles sur cet appareil, ou via téléphone + nom."}
        </p>
      </div>

      {hasTrips ? (
        <PatientTripsList
          userId={userId}
          initialMissions={missions}
          companyNames={companyNames}
        />
      ) : null}

      {!session ? (
        <div className="space-y-4">
          {!hasTrips ? <GuestLookupForm /> : null}
          {hasTrips ? (
            <details className="patient-card">
              <summary className="cursor-pointer font-bold text-[var(--accent)]">
                Retrouver d’autres trajets
              </summary>
              <div className="mt-4">
                <GuestLookupForm />
              </div>
            </details>
          ) : null}
          <p className="text-center text-sm text-[var(--muted)]">
            <Link href="/login?next=/mes-transports" className="underline">
              Se connecter
            </Link>{" "}
            pour un historique lié à votre compte.
          </p>
        </div>
      ) : null}

      {!hasTrips && session ? (
        <p className="patient-card patient-lead">
          Vous n’avez aucun transport pour le moment.{" "}
          <Link href="/commander" className="font-bold text-[var(--accent)]">
            Commander
          </Link>
        </p>
      ) : null}
    </div>
  );
}
