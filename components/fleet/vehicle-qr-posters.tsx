"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  VEHICLE_QR_TAGLINE,
  VEHICLE_QR_TAGLINE_SHORT,
  companyBookingUrl,
  qrDataUrl,
} from "@/lib/qr/vehicle-poster";

type VehicleRow = {
  code: string;
  vehicle_type: string;
};

export function VehicleQrPosters({
  companyName,
  companySlug,
  vehicles,
}: {
  companyName: string;
  companySlug: string;
  vehicles: VehicleRow[];
}) {
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [companyQr, setCompanyQr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const companyUrl = companyBookingUrl(companySlug);
      const companyData = await qrDataUrl(companyUrl, 640);
      if (cancelled) return;
      setCompanyQr(companyData);

      const next: Record<string, string> = {};
      for (const v of vehicles) {
        next[v.code] = await qrDataUrl(
          companyBookingUrl(companySlug, v.code),
          640,
        );
      }
      if (!cancelled) setQrs(next);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [companySlug, vehicles]);

  const sheets =
    vehicles.length > 0
      ? vehicles
      : [{ code: "FLOTTTE", vehicle_type: "VSL" as const }];

  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-wrap gap-3">
        <Button type="button" onClick={() => window.print()}>
          Imprimer les affiches
        </Button>
        <a
          href={companyBookingUrl(companySlug)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center text-sm font-medium text-[var(--accent)] underline"
        >
          Tester le lien public
        </a>
      </div>

      {/* Société — 1 grande affiche */}
      <article className="qr-poster mx-auto max-w-xl break-inside-avoid rounded-3xl border-2 border-[var(--ink)] bg-white p-8 text-center shadow-sm print:max-w-none print:border-0 print:shadow-none">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">
          Bibulance
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
          {companyName}
        </h2>
        <p className="mt-2 text-base text-[var(--muted)]">
          Commandez votre prochain transport sanitaire
        </p>
        <div className="mx-auto mt-6 flex size-56 items-center justify-center rounded-2xl border border-[var(--border)] bg-white p-3 sm:size-64">
          {companyQr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companyQr}
              alt={`QR code commande ${companyName}`}
              className="size-full object-contain"
            />
          ) : (
            <span className="text-sm text-[var(--muted)]">QR…</span>
          )}
        </div>
        <p className="mt-6 text-lg font-semibold leading-snug text-[var(--ink)]">
          {VEHICLE_QR_TAGLINE}
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          www.bibulance.fr · {companyBookingUrl(companySlug).replace(/^https?:\/\//, "")}
        </p>
      </article>

      {/* Une affiche par véhicule */}
      <div className="grid gap-6 md:grid-cols-2 print:grid-cols-2">
        {sheets.map((v) => {
          const src =
            qrs[v.code] ||
            (v.code === "FLOTTTE" ? companyQr : undefined);
          return (
            <article
              key={v.code}
              className="qr-poster break-inside-avoid rounded-3xl border-2 border-[var(--ink)] bg-white p-6 text-center print:border print:shadow-none"
            >
              <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
                Bibulance · {v.vehicle_type}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold">
                Véhicule {v.code}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{companyName}</p>
              <div className="mx-auto mt-4 flex size-44 items-center justify-center rounded-xl border border-[var(--border)] p-2 sm:size-52">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={`QR ${v.code}`}
                    className="size-full object-contain"
                  />
                ) : (
                  <span className="text-sm text-[var(--muted)]">QR…</span>
                )}
              </div>
              <p className="mt-4 text-base font-semibold leading-snug text-[var(--ink)]">
                {VEHICLE_QR_TAGLINE_SHORT}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Ambulance ou VSL → commande en ligne, sans appeler
              </p>
            </article>
          );
        })}
      </div>

    </div>
  );
}
