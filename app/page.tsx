import Link from "next/link";

import { getSessionContext } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSessionContext();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Bibulance
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Régulation unifiée pour sociétés d’ambulances
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Missions métier (Ambléa, SPS, SCR’urgences, PTAH…) et commandes
          particuliers, dans une seule interface multi-tenant sécurisée.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={session?.isStaff ? "/pro/missions" : session ? "/pro/onboarding" : "/login?next=/pro/missions"}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-6 py-3 text-base font-semibold text-accent-foreground"
        >
          Espace société
        </Link>
        <Link
          href={session ? "/commander" : "/login?next=/commander"}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-base font-semibold text-foreground"
        >
          Commander un transport
        </Link>
      </div>

      {session ? (
        <p className="text-sm text-muted">
          Connecté : {session.email}
          {" · "}
          <Link href="/compte" className="font-semibold text-accent underline">
            Mon compte
          </Link>
        </p>
      ) : (
        <p className="text-sm text-muted">
          <Link href="/login" className="font-semibold text-accent underline">
            Se connecter
          </Link>
          {" · "}
          <Link href="/register" className="font-semibold text-accent underline">
            Créer un compte
          </Link>
        </p>
      )}
    </main>
  );
}
