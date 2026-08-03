import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <div className="space-y-2">
        <Link href="/" className="text-sm font-semibold text-accent">
          Bibulance
        </Link>
        <h1 className="text-3xl font-semibold">Créer un compte</h1>
        <p className="text-muted">
          Particulier (commande de transport) ou société d’ambulances.
        </p>
      </div>
      <RegisterForm />
    </main>
  );
}
