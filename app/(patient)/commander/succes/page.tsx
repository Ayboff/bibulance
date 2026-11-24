import Link from "next/link";

import { getSessionContext } from "@/lib/auth/session";
import { readGuestTokensFromCookies } from "@/lib/guest/tokens";
import { formatDateTime, formatTime } from "@/lib/missions/format";
import {
  guestTokenOf,
  listMissionsByGuestTokens,
} from "@/lib/missions/guest-service";
import { getMission } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  id?: string;
  count?: string;
  partners?: string;
  recurring?: string;
  iterative?: string;
  token?: string;
}>;

export default async function CommanderSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSessionContext();
  const params = await searchParams;
  const guestTokens = await readGuestTokensFromCookies();

  let pec: string | null = null;
  let rdv: string | null = null;
  let trackToken: string | null = params.token ?? null;
  const count = Math.max(1, Number(params.count ?? "1") || 1);
  const partners = params.partners === "1";
  const iterative = params.iterative === "1" || params.recurring === "1";

  if (params.id) {
    try {
      if (session) {
        const supabase = await createClient();
        const mission = await getMission(supabase, params.id);
        if (mission.created_by === session.userId) {
          pec = mission.pec_estimated_time;
          rdv = mission.rdv_time;
        }
      } else if (guestTokens.length > 0) {
        const missions = await listMissionsByGuestTokens(guestTokens);
        const mission = missions.find((m) => m.id === params.id) ?? missions[0];
        if (mission) {
          pec = mission.pec_estimated_time;
          rdv = mission.rdv_time;
          trackToken = guestTokenOf(mission) ?? trackToken;
        }
      }
    } catch {
      // ignore — still show success
    }
  }

  return (
    <div className="space-y-6 animate-brand-fade-up">
      <div className="patient-card space-y-3 border-[var(--success)]">
        <p className="patient-title text-[var(--success)]">Demande envoyée</p>
        <p className="patient-lead">
          {iterative
            ? `${count} trajet${count > 1 ? "s" : ""} itératif${count > 1 ? "s" : ""} ont bien été transmis.`
            : partners
              ? "Votre demande a été envoyée aux sociétés partenaires Bibulance."
              : "Votre demande de transport a bien été reçue."}{" "}
          Suivez l’avancement dans « Mes trajets ».
        </p>
        {!session ? (
          <p className="text-base font-semibold text-[var(--accent)]">
            Conservez ce téléphone / cet appareil pour revoir vos trajets sans
            créer de compte.
          </p>
        ) : null}
        {partners ? (
          <p className="text-base font-semibold text-[var(--accent)]">
            La première société qui accepte prendra en charge votre trajet.
          </p>
        ) : null}
        {rdv ? (
          <p className="text-lg font-semibold">
            {iterative ? "Premier rendez-vous" : "Rendez-vous"} :{" "}
            {formatDateTime(rdv)}
          </p>
        ) : null}
        {pec && !iterative ? (
          <div>
            <p className="text-base font-bold text-[var(--muted)]">
              Prise en charge estimée
            </p>
            <p className="text-3xl font-bold text-[var(--accent)]">
              {formatTime(pec)}
            </p>
          </div>
        ) : null}
      </div>

      <Link
        href="/mes-transports"
        className="patient-btn patient-btn-primary flex w-full items-center justify-center gap-2"
      >
        Voir mes trajets
        <span aria-hidden="true">→</span>
      </Link>
      <Link
        href="/commander"
        className="patient-btn patient-btn-secondary flex w-full items-center justify-center gap-2"
      >
        <span aria-hidden="true">←</span>
        Nouvelle demande
      </Link>
    </div>
  );
}
