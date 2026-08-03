import { redirect } from "next/navigation";

import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { CreateCompanyForm } from "@/components/auth/create-company-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSessionContext } from "@/lib/auth/session";

export default async function ProOnboardingPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login?next=/pro/onboarding");

  if (session.isStaff) {
    redirect("/pro/missions");
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Configurer votre société</h1>
        <p className="text-muted">
          Connecté en tant que {session.email}. Créez votre société Bibulance ou
          acceptez une invitation.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Nouvelle société</h2>
        <CreateCompanyForm />
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Invitation reçue</h2>
        <AcceptInviteForm />
      </section>

      <SignOutButton />
    </main>
  );
}
