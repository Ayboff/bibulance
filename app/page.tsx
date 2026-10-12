import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { getSessionContext } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSessionContext();

  const proHref = session?.isStaff
    ? "/pro/missions"
    : session
      ? "/pro/onboarding"
      : "/login?next=/pro/missions";
  const patientHref = session ? "/commander" : "/login?next=/commander";

  return (
    <main className="brand-surface relative flex min-h-full flex-1 flex-col">
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Logo variant="full" priority />
        <div className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <Link
              href="/compte"
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-ink hover:bg-white/70"
            >
              Mon compte
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-ink hover:bg-white/70"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="hidden min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground sm:inline-flex"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-16 pt-8">
        <div className="max-w-2xl space-y-5">
          <p className="animate-brand-fade-up text-sm font-medium text-accent">
            Pour les sociétés d’ambulances et leurs patients
          </p>
          <h1 className="animate-brand-fade-up-delay text-4xl font-semibold tracking-tight text-ink sm:text-5xl sm:leading-[1.12]">
            Une file claire pour réguler
            <span className="block text-accent">sans surcharge visuelle</span>
          </h1>
          <p className="animate-brand-fade-up-delay-2 max-w-xl text-lg leading-relaxed text-muted">
            Les demandes des particuliers et les missions des plateformes
            (Ambléa, SPS, SCR&apos;urgences, PTAH…) arrivent au même endroit —
            lisible sur ordinateur comme sur téléphone.
          </p>

          <div className="animate-brand-fade-up-delay-2 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Link
              href={proHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-7 text-base font-semibold text-accent-foreground transition hover:bg-[#367f91]"
            >
              Accéder à la régulation
            </Link>
            <Link
              href={patientHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-7 text-base font-semibold text-ink transition hover:bg-accent-soft"
            >
              Demander un transport
            </Link>
          </div>

          {session ? (
            <p className="text-sm text-muted">Connecté : {session.email}</p>
          ) : (
            <p className="text-sm text-muted sm:hidden">
              <Link href="/register" className="font-semibold text-ink underline">
                Créer un compte
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
