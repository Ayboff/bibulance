import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth/session";
import { formatDateTime, formatTime } from "@/lib/missions/format";
import { getMission } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  id?: string;
  count?: string;
  partners?: string;
  recurring?: string;
}>;

export default async function CommanderSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSessionContext();
  if (!session) redirect("/login?next=/commander");

  const params = await searchParams;
  let pec: string | null = null;
  let rdv: string | null = null;
  const count = Math.max(1, Number(params.count ?? "1") || 1);
  const partners = params.partners === "1";
  const recurring = params.recurring === "1";

  if (params.id) {
    try {
      const supabase = await createClient();
      const mission = await getMission(supabase, params.id);
      if (mission.created_by === session.userId) {
        pec = mission.pec_estimated_time;
        rdv = mission.rdv_time;
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
          {recurring
            ? `${count} transport${count > 1 ? "s" : ""} régulier${count > 1 ? "s" : ""} ont bien été transmis.`
            : partners
              ? "Votre demande a été envoyée aux sociétés partenaires Bibulance."
              : "Votre demande de transport a bien été reçue."}{" "}
          Suivez l’avancement dans « Mes trajets ».
        </p>
        {partners ? (
          <p className="text-base font-semibold text-[var(--accent)]">
            La première société qui accepte prendra en charge votre trajet.
          </p>
        ) : null}
        {rdv ? (
          <p className="text-lg font-semibold">
            {recurring ? "Premier rendez-vous" : "Rendez-vous"} :{" "}
            {formatDateTime(rdv)}
          </p>
        ) : null}
        {pec && !recurring ? (
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
        className="patient-btn patient-btn-primary flex w-full items-center justify-center"
      >
        Voir mes trajets
      </Link>
      <Link
        href="/commander"
        className="patient-btn patient-btn-secondary flex w-full items-center justify-center"
      >
        Nouvelle demande
      </Link>
    </div>
  );
}
