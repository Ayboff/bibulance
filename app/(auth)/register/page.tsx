import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";
import { Logo } from "@/components/brand/logo";

export default function RegisterPage() {
  return (
    <main className="brand-surface flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
        <div className="animate-brand-fade-up space-y-4">
          <Logo variant="full" priority />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              Créer un compte
            </h1>
            <p className="text-muted">
              Choisissez particulier pour commander, ou société pour réguler.
            </p>
          </div>
        </div>

        <div className="animate-brand-fade-up-delay brand-card p-6">
          <RegisterForm />
        </div>

        <p className="animate-brand-fade-up-delay-2 text-center text-sm text-muted">
          Déjà inscrit ?{" "}
          <Link href="/login" className="font-semibold text-ink underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
