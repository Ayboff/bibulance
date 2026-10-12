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
    <main className="brand-surface relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_top,_rgb(91_242_247_/_0.2),_transparent_60%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Logo variant="full" priority />
        <div className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <Link
              href="/compte"
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-ink hover:bg-white/60"
            >
              Mon compte
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-ink hover:bg-white/60"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="hidden min-h-11 items-center rounded-xl bg-ink px-4 text-sm font-semibold text-white sm:inline-flex"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-16 pt-6 sm:pt-10">
        <div className="max-w-2xl space-y-6">
          <p className="animate-brand-fade-up text-sm font-bold uppercase tracking-[0.14em] text-ink/70">
            Régulation ambulance
          </p>
          <h1 className="animate-brand-fade-up-delay text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-[3.35rem] lg:leading-[1.1]">
            Toutes vos missions,{" "}
            <span className="bg-gradient-to-r from-[#2ec4d6] to-[#3dd68c] bg-clip-text text-transparent">
              une seule interface
            </span>
          </h1>
          <p className="animate-brand-fade-up-delay-2 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
            Ambléa, SPS, SCR&apos;urgences, PTAH et commandes particuliers —
            le régulateur pilote tout depuis Bibulance, aussi sur smartphone.
          </p>

          <div className="animate-brand-fade-up-delay-2 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Link
              href={proHref}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-accent px-7 text-base font-bold text-accent-foreground shadow-[0_12px_30px_-12px_rgb(46_196_214_/_0.8)] transition hover:brightness-105"
            >
              Espace société
            </Link>
            <Link
              href={patientHref}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-white/80 px-7 text-base font-bold text-ink backdrop-blur transition hover:bg-white"
            >
              Commander un transport
            </Link>
          </div>

          {session ? (
            <p className="text-sm text-muted">
              Connecté : {session.email}
            </p>
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
