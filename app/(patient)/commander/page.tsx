import { redirect } from "next/navigation";

import { BookingWizard } from "@/components/patient/booking-wizard";
import { getSessionContext } from "@/lib/auth/session";
import { listBookableCompanies } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

export default async function CommanderPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login?next=/commander");

  const supabase = await createClient();
  const companies = await listBookableCompanies(supabase);

  const nameParts = (session.profile?.full_name ?? "").trim().split(/\s+/);
  const defaultName = {
    first: nameParts[0] || undefined,
    last: nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
  };

  return <BookingWizard companies={companies} defaultName={defaultName} />;
}
