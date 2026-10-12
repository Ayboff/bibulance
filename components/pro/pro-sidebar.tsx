"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  ListChecks,
  Plug,
  Settings,
  Truck,
} from "lucide-react";
import { useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/pro/missions", label: "Missions", icon: ListChecks },
  { href: "/pro/confirmed", label: "Confirmées", icon: CheckCircle2 },
  { href: "/pro/fleet", label: "Parc", icon: Truck },
  { href: "/pro/connectors", label: "Connecteurs", icon: Plug },
  { href: "/pro/settings", label: "Paramètres", icon: Settings },
] as const;

export function ProSidebar({
  companyName,
  email,
  role,
}: {
  companyName: string;
  email?: string | null;
  role?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <aside
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className={cn(
        "fixed bottom-4 left-3 top-4 z-40 hidden flex-col rounded-2xl border border-white/50 bg-white/85 shadow-[0_10px_40px_-18px_rgb(26_35_50_/_0.28)] backdrop-blur-xl transition-[width] duration-300 ease-out md:flex",
        open ? "w-[220px]" : "w-[72px]",
      )}
      aria-label="Navigation régulation"
    >
      <div
        className={cn(
          "flex h-[84px] items-center justify-center border-b border-border/70 px-3",
          open && "justify-start px-4",
        )}
      >
        {open ? (
          <Logo variant="full" href="/pro/missions" size="sm" />
        ) : (
          <Logo variant="mark" href="/pro/missions" size="lg" />
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2.5">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 transition",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-ink/80 hover:bg-background hover:text-ink",
                !open && "justify-center px-0",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-[22px] w-[22px] shrink-0",
                  active ? "text-accent" : "text-ink/70",
                )}
                strokeWidth={1.85}
              />
              <span
                className={cn(
                  "truncate text-[15px] font-medium transition-all duration-200",
                  open
                    ? "translate-x-0 opacity-100"
                    : "pointer-events-none w-0 -translate-x-2 overflow-hidden opacity-0",
                  active && "font-semibold text-accent",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "space-y-2 border-t border-border/70 p-3",
          !open && "flex flex-col items-center",
        )}
      >
        {open ? (
          <>
            <p className="truncate text-xs font-semibold text-ink" title={companyName}>
              {companyName}
            </p>
            <p className="truncate text-[11px] text-muted" title={email ?? undefined}>
              {email}
            </p>
            {role ? (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                {role}
              </p>
            ) : null}
            <SignOutButton />
          </>
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent">
            {(role ?? "pro").slice(0, 3)}
          </p>
        )}
      </div>
    </aside>
  );
}

export function ProMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 md:hidden">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-accent text-accent-foreground"
                : "bg-background text-muted",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
