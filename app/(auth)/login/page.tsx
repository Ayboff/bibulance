import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/";

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <div className="space-y-2">
        <Link href="/" className="text-sm font-semibold text-accent">
          Bibulance
        </Link>
        <h1 className="text-3xl font-semibold">Connexion</h1>
        <p className="text-muted">
          Accédez à l’espace société ou à votre espace particulier.
        </p>
      </div>

      {params.error ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          La connexion a échoué. Réessayez.
        </p>
      ) : null}

      <LoginForm next={next} />
    </main>
  );
}
