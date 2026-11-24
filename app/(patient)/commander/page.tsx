import { BookingWizard } from "@/components/patient/booking-wizard";
import { getSessionContext } from "@/lib/auth/session";
import {
  getCompanyBySlug,
  listBookableCompaniesPublic,
} from "@/lib/missions/guest-service";
import { listBookableCompanies } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  societe?: string;
  company?: string;
  v?: string;
}>;

export default async function CommanderPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSessionContext();
  const params = await searchParams;
  const slug = (params.societe || params.company || "").trim().toLowerCase();

  let companies: { id: string; name: string; slug: string }[] = [];
  if (session) {
    try {
      const supabase = await createClient();
      companies = await listBookableCompanies(supabase);
    } catch {
      companies = await listBookableCompaniesPublic();
    }
  } else {
    companies = await listBookableCompaniesPublic();
  }

  let presetCompanyId: string | undefined;
  if (slug) {
    const match =
      companies.find((c) => c.slug === slug) ?? (await getCompanyBySlug(slug));
    if (match) {
      presetCompanyId = match.id;
      if (!companies.some((c) => c.id === match.id)) {
        companies = [match, ...companies];
      }
    }
  }

  const nameParts = (session?.profile?.full_name ?? "").trim().split(/\s+/);
  const defaultName = session
    ? {
        first: nameParts[0] || undefined,
        last: nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
      }
    : undefined;

  return (
    <div className="space-y-4">
      {!session ? (
        <p className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--ink)]">
          Pas besoin de créer un compte — indiquez votre téléphone pour commander
          et retrouver vos trajets.
        </p>
      ) : null}
      <BookingWizard
        companies={companies}
        defaultName={defaultName}
        presetCompanyId={presetCompanyId}
        vehicleCode={params.v?.trim() || undefined}
      />
    </div>
  );
}
