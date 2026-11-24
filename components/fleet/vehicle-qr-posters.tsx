"use client";

import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  VEHICLE_QR_HEADLINE,
  VEHICLE_QR_TAGLINE,
  companyBookingUrl,
  qrDataUrl,
} from "@/lib/qr/vehicle-poster";

export function VehicleQrPosters({
  companyName,
  companySlug,
}: {
  companyName: string;
  companySlug: string;
}) {
  const [qr, setQr] = useState("");
  const bookingUrl = companyBookingUrl(companySlug);
  const displayUrl = bookingUrl.replace(/^https?:\/\//, "");

  useEffect(() => {
    let cancelled = false;
    void qrDataUrl(bookingUrl, 720).then((data) => {
      if (!cancelled) setQr(data);
    });
    return () => {
      cancelled = true;
    };
  }, [bookingUrl]);

  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => window.print()}>
          Imprimer l’affiche
        </Button>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center text-sm font-medium text-[var(--accent)] underline"
        >
          Tester le lien de commande
        </a>
      </div>

      {/* Une seule affiche pub Bibulance — A4 portrait */}
      <article
        className="qr-poster relative mx-auto w-full max-w-[210mm] overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)] print:max-w-none print:rounded-none print:border-0 print:shadow-none"
        aria-label="Affiche QR Bibulance à coller sur le véhicule"
      >
        {/* Bandeau marque */}
        <div className="relative overflow-hidden bg-[linear-gradient(145deg,#2f7a8c_0%,#3d8fa3_42%,#5fa88a_100%)] px-8 pb-10 pt-8 text-center text-white sm:px-12 sm:pb-12 sm:pt-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-white/10"
          />
          <div className="relative mx-auto inline-flex rounded-2xl bg-white/95 px-5 py-3 shadow-sm">
            <Logo variant="full" href={null} size="lg" priority />
          </div>
          <h1 className="relative mt-6 font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Bibulance
          </h1>
          <p className="relative mx-auto mt-3 max-w-md text-lg font-medium text-white/95 sm:text-xl">
            Transport sanitaire, en un scan
          </p>
        </div>

        {/* Corps : QR + message */}
        <div className="space-y-6 bg-[linear-gradient(180deg,#eaf4f6_0%,#ffffff_38%,#ffffff_100%)] px-6 py-8 text-center sm:px-10 sm:py-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Partenaire
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
              {companyName}
            </p>
          </div>

          <div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-[1.5rem] border-2 border-[var(--accent)]/35 bg-white p-5 shadow-[var(--shadow-soft)] sm:p-7">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)] sm:text-3xl">
              {VEHICLE_QR_HEADLINE}
            </p>
            <div className="flex aspect-square w-full max-w-[280px] items-center justify-center rounded-2xl border border-[var(--border)] bg-white p-3 sm:max-w-[320px]">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt={`QR code commande Bibulance — ${companyName}`}
                  className="size-full object-contain"
                />
              ) : (
                <span className="text-sm text-[var(--muted)]">
                  Génération du QR…
                </span>
              )}
            </div>
            <p className="text-base font-semibold leading-snug text-[var(--ink)] sm:text-lg">
              {VEHICLE_QR_TAGLINE}
            </p>
          </div>

          <div className="space-y-2 pb-2">
            <p className="text-sm font-medium text-[var(--muted)]">
              Ouvrez l’appareil photo → scannez → choisissez date et adresse
            </p>
            <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--accent)]">
              www.bibulance.fr
            </p>
            <p className="break-all text-xs text-[var(--muted)]">{displayUrl}</p>
          </div>
        </div>

        {/* Pied de page marque */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--ink)] px-6 py-4 text-left text-white sm:px-10">
          <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide sm:text-base">
            Bibulance
          </p>
          <p className="text-xs text-white/75 sm:text-sm">
            Ambulance · VSL · sans appeler
          </p>
        </div>
      </article>
    </div>
  );
}
