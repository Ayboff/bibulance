import QRCode from "qrcode";

import { getPublicSiteUrl } from "@/lib/site-url";

export function companyBookingUrl(slug: string): string {
  return `${getPublicSiteUrl()}/c/${encodeURIComponent(slug)}`;
}

export async function qrDataUrl(text: string, size = 720): Promise<string> {
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

/** Phrase principale sous le QR — claire pour un passant. */
export const VEHICLE_QR_HEADLINE = "Scannez pour commander";

export const VEHICLE_QR_TAGLINE =
  "Ambulance ou VSL : plus besoin d’appeler. La commande se fait en ligne sur Bibulance.";
