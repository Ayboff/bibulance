/** Canonical public origin for SEO (sitemap, Open Graph, JSON-LD). */
export function getSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.bibulance.fr";
  return raw.replace(/\/$/, "");
}

export const SITE_NAME = "Bibulance";

export const SITE_TAGLINE =
  "Commander un transport sanitaire ou réguler vos missions d’ambulance — clairement.";

export const SITE_DESCRIPTION =
  "Bibulance relie particuliers et sociétés d’ambulances : demandez un transport sanitaire (VSL ou ambulance) ou régulez vos missions sur une plateforme claire.";
