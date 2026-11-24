import QRCode from "qrcode";

import { getPublicSiteUrl } from "@/lib/site-url";

export function companyBookingUrl(slug: string, vehicleCode?: string): string {
  const base = `${getPublicSiteUrl()}/c/${encodeURIComponent(slug)}`;
  if (!vehicleCode) return base;
  return `${base}?v=${encodeURIComponent(vehicleCode)}`;
}

export async function qrDataUrl(text: string, size = 512): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: size,
    color: {
      dark: "#1a2332",
      light: "#ffffff",
    },
  });
}

export const VEHICLE_QR_TAGLINE =
  "Pour vos prochains trajets ambulance ou VSL, plus besoin d’appeler : scannez et commandez en ligne sur Bibulance.";

export const VEHICLE_QR_TAGLINE_SHORT =
  "Scannez → commande en ligne. Plus besoin d’appeler.";
