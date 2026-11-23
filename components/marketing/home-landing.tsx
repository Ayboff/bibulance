import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { BookingMotion } from "@/components/marketing/booking-motion";
import { DashboardMotion } from "@/components/marketing/dashboard-motion";

type HomeLandingProps = {
  proHref: string;
  patientHref: string;
  sessionEmail?: string | null;
  isLoggedIn: boolean;
};

const TESTIMONIALS = [
  {
    quote:
      "Une seule file pour tout. Nos régulateurs gagnent du temps dès le premier jour.",
    name: "Claire Moreau",
    role: "Responsable régulation",
    org: "Ambulance Seine Est",
  },
  {
    quote:
      "J’ai commandé pour mon père sans appeler trois sociétés. Clair, rapide, rassurant.",
    name: "Amine Benali",
    role: "Particulier",
    org: "Île-de-France",
  },
  {
    quote:
      "Plateformes + patients Bibulance au même endroit. On assigne, on confirme, c’est réglé.",
    name: "Sophie Renaud",
    role: "Directrice d’exploitation",
    org: "Horizon Ambulances",
  },
  {
    quote:
      "Mes trajets de dialyse sont planifiés une fois. Je n’ai plus à tout recommencer chaque semaine.",
    name: "Marie Lefèvre",
    role: "Patiente",
    org: "Essonne",
  },
] as const;

export function HomeLanding({
  proHref,
  patientHref,
  sessionEmail,
  isLoggedIn,
}: HomeLandingProps) {
  return (
    <main className="landing-root relative flex min-h-full flex-1 flex-col overflow-x-hidden bg-[var(--background)] text-[var(--ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(100vh,900px)] bg-[radial-gradient(120%_80%_at_10%_0%,#dceef2_0%,transparent_55%),linear-gradient(180deg,#eaf4f6_0%,#f6f8f9_45%,#ffffff_100%)]"
      />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo variant="full" priority size="lg" />
        <nav className="flex items-center gap-2 sm:gap-3">
          <a
            href="#particuliers"
            className="hidden min-h-11 items-center rounded-xl px-3 text-sm font-medium text-ink hover:bg-white/70 md:inline-flex"
          >
            Particuliers
          </a>
          <a
            href="#societes"
            className="hidden min-h-11 items-center rounded-xl px-3 text-sm font-medium text-ink hover:bg-white/70 md:inline-flex"
          >
            Sociétés
          </a>
          {isLoggedIn ? (
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
                className="hidden min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-[#367f91] sm:inline-flex"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-20 lg:pt-10">
        <div className="max-w-xl space-y-6">
          <p className="animate-brand-fade-up font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.18em] text-accent">
            Transport sanitaire · France
          </p>
          <h1 className="animate-brand-fade-up font-[family-name:var(--font-display)] text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Bibulance
          </h1>
          <p className="animate-brand-fade-up-delay text-xl font-medium leading-snug text-ink sm:text-2xl">
            Commander une ambulance devient simple.
            <span className="block text-accent">
              La réguler, enfin lisible.
            </span>
          </p>
          <p className="animate-brand-fade-up-delay max-w-lg text-lg leading-relaxed text-muted">
            Bibulance relie les patients qui ont besoin d’un transport (VSL ou
            ambulance) et les sociétés qui les prennent en charge — sur une seule
            plateforme claire.
          </p>
          <div className="animate-brand-fade-up-delay-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={patientHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-7 text-base font-semibold text-accent-foreground transition hover:bg-[#367f91]"
            >
              Je commande un transport
            </Link>
            <Link
              href={proHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-7 text-base font-semibold text-ink transition hover:bg-accent-soft"
            >
              J’équipe ma société
            </Link>
          </div>
          {sessionEmail ? (
            <p className="text-sm text-muted">Connecté : {sessionEmail}</p>
          ) : null}
        </div>

        <div className="animate-brand-fade-up-delay justify-self-center lg:justify-self-end">
          <BookingMotion />
        </div>
      </section>

      {/* Dual audience fork */}
      <section className="relative z-10 border-t border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Pour qui est Bibulance ?
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted">
            Deux entrées. Un même produit. Choisissez votre parcours.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Link
              href="#particuliers"
              className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
            >
              <p className="font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.14em] text-accent">
                Particulier / patient
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
                J’ai besoin d’un transport
              </h3>
              <p className="mt-2 text-base leading-relaxed text-muted">
                Réservez pour vous ou un proche, choisissez une société ou les
                partenaires, suivez vos trajets — sans enchaîner les appels.
              </p>
              <span className="mt-5 inline-flex text-sm font-semibold text-accent group-hover:underline">
                Voir comment ça marche →
              </span>
            </Link>

            <Link
              href="#societes"
              className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
            >
              <p className="font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.14em] text-accent">
                Société d’ambulances
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
                Je veux réguler sans chaos
              </h3>
              <p className="mt-2 text-base leading-relaxed text-muted">
                Recevez demandes patients et missions plateformes dans une file
                unique. Assignez un véhicule, confirmez, pilotez.
              </p>
              <span className="mt-5 inline-flex text-sm font-semibold text-accent group-hover:underline">
                Voir le tableau de bord →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Patient */}
      <section
        id="particuliers"
        className="relative z-10 border-t border-[var(--border)] bg-[var(--background)]"
      >
        <div className="mx-auto grid max-w-6xl items-start gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-5">
            <p className="font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Parcours patient
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Un transport commandé en quelques minutes
            </h2>
            <p className="text-lg leading-relaxed text-muted">
              Plus besoin de chercher un numéro, de répéter l’adresse trois fois,
              ou de ne pas savoir si quelqu’un a pris la demande.
            </p>
            <ul className="space-y-3 text-base text-ink">
              {[
                "Adresses préremplies (Base Adresse Nationale)",
                "Trajet unique ou itératif (dialyse, etc.)",
                "Pour vous ou pour un proche",
                "Suivi dans Mes trajets",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href={patientHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-semibold text-accent-foreground transition hover:bg-[#367f91]"
            >
              Commander un transport
            </Link>
          </div>
          <div className="justify-self-center lg:justify-self-end">
            <BookingMotion />
          </div>
        </div>
      </section>

      {/* Companies */}
      <section id="societes" className="relative z-10 border-t border-[var(--border)] bg-white">
        <div className="mx-auto grid max-w-6xl items-start gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <DashboardMotion />
          </div>
          <div className="order-1 space-y-5 lg:order-2">
            <p className="font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Parcours société
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Une régulation que vos équipes comprennent au premier coup d’œil
            </h2>
            <p className="text-lg leading-relaxed text-muted">
              Bibulance centralise ce qui arrivait partout : téléphone, plateformes,
              messages. Une file. Une décision. Un véhicule.
            </p>
            <ul className="space-y-3 text-base text-ink">
              {[
                "Demandes patients + missions plateformes au même endroit",
                "Assignation véhicule avant confirmation",
                "Planning confirmé lisible",
                "Pensé ordinateur et téléphone",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href={proHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-[var(--background)] px-6 text-base font-semibold text-ink transition hover:bg-accent-soft"
            >
              Accéder à l’espace pro
            </Link>
          </div>
        </div>
      </section>

      {/* Value */}
      <section className="relative z-10 border-t border-[var(--border)] bg-[var(--accent-soft)]/50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="max-w-2xl font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            La valeur ajoutée, sans jargon
          </h2>
          <p className="mt-3 max-w-xl text-lg text-muted">
            Ce que Bibulance change concrètement — pour le patient et pour la
            société.
          </p>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {[
              {
                title: "Moins d’appels",
                text: "La demande est structurée à l’écran. Moins de malentendus, moins de relances.",
              },
              {
                title: "Une seule file",
                text: "Particuliers et plateformes arrivent au même endroit. La régulation respire.",
              },
              {
                title: "Décision plus rapide",
                text: "Adresse, horaire, besoin, véhicule : l’essentiel est visible avant de confirmer.",
              },
            ].map((v) => (
              <div key={v.title}>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink">
                  {v.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-muted">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 border-t border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Ils ont essayé Bibulance
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="border-l-2 border-accent pl-5">
                <div className="flex gap-0.5 text-accent" aria-label="5 étoiles">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} aria-hidden>
                      ★
                    </span>
                  ))}
                </div>
                <blockquote className="mt-3 text-base leading-relaxed text-ink">
                  « {t.quote} »
                </blockquote>
                <figcaption className="mt-3 text-sm text-muted">
                  <span className="font-semibold text-ink">{t.name}</span>
                  {" · "}
                  {t.role} · {t.org}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 border-t border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Prêt à commencer ?
          </h2>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Créez un compte en quelques minutes. Particulier ou société : vous
            choisissez votre entrée.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={isLoggedIn ? patientHref : "/register?intent=patient"}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-7 text-base font-semibold text-accent-foreground transition hover:bg-[#367f91]"
            >
              Compte particulier
            </Link>
            <Link
              href={isLoggedIn ? proHref : "/register?intent=company"}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border px-7 text-base font-semibold text-ink transition hover:bg-accent-soft"
            >
              Compte société
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--border)] bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Logo variant="full" size="sm" />
            <p className="font-[family-name:var(--font-display)] text-sm text-muted">
              Bibulance — transports sanitaires, plus clairs.
            </p>
          </div>
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} Bibulance
          </p>
        </div>
      </footer>
    </main>
  );
}
