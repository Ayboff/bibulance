import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/brand/logo";

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/";

  return (
    <main className="brand-surface flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
        <div className="animate-brand-fade-up space-y-4">
          <Logo variant="full" priority />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              Connexion
            </h1>
            <p className="text-muted">
              Accédez à l’espace société ou à votre espace particulier.
            </p>
          </div>
        </div>

        <div className="animate-brand-fade-up-delay brand-card space-y-4 p-6">
          {params.error ? (
            <p className="rounded-xl border border-danger/35 bg-[#fff1f3] px-4 py-3 text-sm font-medium text-[#b4233a]">
              La connexion a échoué. Réessayez.
            </p>
          ) : null}

          <LoginForm next={next} />
        </div>

        <p className="animate-brand-fade-up-delay-2 text-center text-sm text-muted">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-semibold text-ink underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}
