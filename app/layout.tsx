import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { OrganizationJsonLd } from "@/components/seo/json-ld";
import {
  getSiteOrigin,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/seo/site";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const origin = getSiteOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: {
    default: `${SITE_NAME} — Transport sanitaire & régulation d’ambulances`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Bibulance",
    "bibulance",
    "transport sanitaire",
    "ambulance",
    "VSL",
    "régulation ambulance",
    "commander ambulance",
    "société d’ambulances",
    "transport dialyse",
  ],
  authors: [{ name: SITE_NAME, url: origin }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "health",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: origin,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/logo-bibulance.png",
        width: 1200,
        height: 392,
        alt: "Logo Bibulance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Transport sanitaire & régulation`,
    description: SITE_DESCRIPTION,
    images: ["/logo-bibulance.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon-32.png",
  },
  // Optional: set GOOGLE_SITE_VERIFICATION in Vercel after Search Console
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <OrganizationJsonLd />
        {children}
      </body>
    </html>
  );
}
