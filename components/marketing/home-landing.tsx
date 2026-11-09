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
      "Nos régulateurs voient enfin toutes les demandes au même endroit. Moins d’appels, moins d’erreurs.",
    name: "Claire Moreau",
    role: "Responsable régulation",
    org: "Ambulance Seine Est",
  },
  {
    quote:
      "J’ai commandé un transport pour mon père en quelques minutes. Simple, clair, sans stress.",
    name: "Amine Benali",
    role: "Particulier",
    org: "Île-de-France",
  },
  {
    quote:
      "Les missions plateformes et les demandes patients arrivent dans une file lisible. On assigne et on confirme sans se perdre.",
    name: "Sophie Renaud",
    role: "Directrice d’exploitation",
    org: "Groupe Ambulances Horizon",
  },
  {
    quote:
      "Pour mes séances de dialyse, je réserve mes trajets itératifs une fois. Ça change tout.",
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
    <main className="relative flex min-h-full flex-1 flex-col overflow-x-hidden bg-[var(--background)] text-[var(--ink)]">
      {/* Atmospheric plane */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(92vh,820px)] bg-[linear-gradient(165deg,#e4f1f4_0%,#eef5f7_38%,#f6f8f9_72%,#ffffff_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[var(--accent)]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-64 h-56 w-56 rounded-full bg-[var(--mint)]/15 blur-3xl"
      />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo variant="full" priority size="lg" />
        <nav className="flex items-center gap-2 sm:gap-3">
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
                className="hidden min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground sm:inline-flex hover:bg-[#367f91]"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero — one composition */}
      <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 pb-16 pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-20 lg:pt-8">
        <div className="max-w-xl space-y-6">
          <h1 className="animate-brand-fade-up text-[2.35rem] font-semibold leading-[1.12] tracking-tight text-ink sm:text-5xl sm:leading-[1.1]">
            Bibulance
            <span className="mt-2 block text-[1.35rem] font-medium leading-snug text-accent sm:text-2xl">
              Commander un transport sanitaire, ou le réguler, en toute clarté.
            </span>
          </h1>
          <p className="animate-brand-fade-up-delay max-w-lg text-lg leading-relaxed text-muted">
            Pour les particuliers et les sociétés d’ambulances : une seule
            plateforme pour demander un trajet et organiser les missions sans
            chaos.
          </p>
          <div className="animate-brand-fade-up-delay-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={patientHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-7 text-base font-semibold text-accent-foreground transition hover:bg-[#367f91]"
            >
              Demander un transport
            </Link>
            <Link
              href={proHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-7 text-base font-semibold text-ink transition hover:bg-accent-soft"
            >
              Espace sociétés
            </Link>
          </div>
          {sessionEmail ? (
            <p className="text-sm text-muted">Connecté : {sessionEmail}</p>
          ) : (
            <p className="text-sm text-muted sm:hidden">
              <Link href="/register" className="font-semibold text-ink underline">
                Créer un compte
              </Link>
            </p>
          )}
        </div>

        <div className="animate-brand-fade-up-delay relative justify-self-center lg:justify-self-end">
          <BookingMotion />
        </div>
      </section>

      {/* What it is */}
      <section className="relative z-10 border-t border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Bibulance, c’est quoi ?
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            Une application web qui relie les patients qui ont besoin d’un
            transport (VSL ou ambulance) et les sociétés qui les prennent en
            charge — avec une régulation claire pour les professionnels.
          </p>
          <ul className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Pour les particuliers",
                text: "Vous réservez un trajet pour vous ou un proche, choisissez une société ou les partenaires, et suivez vos demandes.",
              },
              {
                title: "Pour les sociétés",
                text: "Vous recevez les demandes et les missions plateformes dans une file unique, assignez un véhicule, confirmez.",
              },
              {
                title: "Pour la régulation",
                text: "Moins de dispersion : une interface lisible sur ordinateur comme sur téléphone, pensée pour le terrain.",
              },
            ].map((item) => (
              <li key={item.title} className="space-y-2">
                <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                <p className="text-base leading-relaxed text-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Patient motion section */}
      <section className="relative z-10 border-t border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <div className="mx-auto max-w-[340px] lg:mx-0">
              <BookingMotion />
            </div>
          </div>
          <div className="order-1 space-y-4 lg:order-2">
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Commander un transport en quelques étapes
            </h2>
            <p className="max-w-md text-lg leading-relaxed text-muted">
              Adresse, horaire, besoin : le parcours guide le patient sans jargon.
              La demande part ensuite vers la société choisie — ou vers les
              partenaires Bibulance.
            </p>
            <Link
              href={patientHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-semibold text-accent-foreground transition hover:bg-[#367f91]"
            >
              Essayer la commande
            </Link>
          </div>
        </div>
      </section>

      {/* Pro dashboard motion */}
      <section className="relative z-10 border-t border-[var(--border)] bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Une régulation que vos équipes comprennent au premier regard
            </h2>
            <p className="max-w-md text-lg leading-relaxed text-muted">
              Nouvelle demande, choix du véhicule, confirmation : le tableau de
              bord suit le rythme réel d’une société d’ambulances.
            </p>
            <Link
              href={proHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-[var(--background)] px-6 text-base font-semibold text-ink transition hover:bg-accent-soft"
            >
              Voir l’espace pro
            </Link>
          </div>
          <DashboardMotion />
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 border-t border-[var(--border)] bg-[var(--accent-soft)]/40">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Ils utilisent Bibulance
          </h2>
          <p className="mt-3 max-w-xl text-lg text-muted">
            Des retours de sociétés et de particuliers qui ont testé la solution.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="border-l-2 border-[var(--accent)] pl-5"
              >
                <div
                  className="flex gap-0.5 text-[var(--accent)]"
                  aria-label="5 étoiles"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-sm font-bold" aria-hidden>
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
                  {t.role}
                  {" · "}
                  {t.org}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 border-t border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Prêt à simplifier vos transports ?
          </h2>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Créez un compte en quelques minutes — particulier ou société
            d’ambulances.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={isLoggedIn ? patientHref : "/register?intent=patient"}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-7 text-base font-semibold text-accent-foreground transition hover:bg-[#367f91]"
            >
              Commencer comme particulier
            </Link>
            <Link
              href={isLoggedIn ? proHref : "/register?intent=company"}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border px-7 text-base font-semibold text-ink transition hover:bg-accent-soft"
            >
              Inscrire ma société
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo variant="full" size="sm" />
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} Bibulance — transports sanitaires,
            plus clairs.
          </p>
        </div>
      </footer>
    </main>
  );
}
