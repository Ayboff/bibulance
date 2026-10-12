import { redirect } from "next/navigation";

import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { CreateCompanyForm } from "@/components/auth/create-company-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/brand/logo";
import { getSessionContext } from "@/lib/auth/session";

export default async function ProOnboardingPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login?next=/pro/onboarding");

  if (session.isStaff) {
    redirect("/pro/missions");
  }

  return (
    <main className="brand-surface flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-12">
        <div className="space-y-4">
          <Logo variant="full" priority />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              Bienvenue — créez votre société
            </h1>
            <p className="text-muted">
              Connecté : {session.email}. Indiquez le nom de votre société
              d’ambulances, ou collez un code d’invitation.
            </p>
          </div>
        </div>

        <section className="brand-card space-y-4 p-6">
          <h2 className="text-xl font-bold text-ink">Nouvelle société</h2>
          <CreateCompanyForm />
        </section>

        <section className="brand-card space-y-4 p-6">
          <h2 className="text-xl font-bold text-ink">Invitation reçue</h2>
          <AcceptInviteForm />
        </section>

        <SignOutButton />
      </div>
    </main>
  );
}
