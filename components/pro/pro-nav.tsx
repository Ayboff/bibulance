"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/pro/missions", label: "Missions" },
  { href: "/pro/confirmed", label: "Confirmées" },
  { href: "/pro/fleet", label: "Parc" },
  { href: "/pro/connectors", label: "Connecteurs" },
  { href: "/pro/settings", label: "Paramètres" },
];

export function ProNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-xl px-3 py-3 text-base font-medium transition",
              active
                ? "bg-accent-soft font-bold text-ink ring-1 ring-ring/25"
                : "text-muted hover:bg-background hover:text-ink",
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ProMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 md:hidden">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-accent text-accent-foreground"
                : "bg-background text-muted",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
