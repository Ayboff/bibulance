import { redirect } from "next/navigation";

import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { getSessionContext } from "@/lib/auth/session";

type SearchParams = Promise<{ token?: string }>;

export default async function ProInvitePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSessionContext();
  if (!session) {
    const params = await searchParams;
    const token = params.token ?? "";
    redirect(`/login?next=${encodeURIComponent(`/pro/invite?token=${token}`)}`);
  }

  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Rejoindre une société</h1>
        <p className="text-muted">
          Entrez le code d’invitation fourni par votre administrateur.
        </p>
      </div>
      <AcceptInviteForm token={params.token} />
    </main>
  );
}
