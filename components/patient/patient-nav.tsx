"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/commander", label: "Commander", description: "Nouvelle demande de transport" },
  { href: "/mes-transports", label: "Mes trajets", description: "Voir mes transports" },
  { href: "/compte", label: "Mon compte", description: "Gérer mon profil" },
];

export function PatientNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-20 border-t-2 border-[var(--border)] bg-[var(--card)]"
      aria-label="Navigation principale"
    >
      <ul className="mx-auto flex max-w-lg">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`patient-btn flex w-full flex-col items-center justify-center gap-0.5 rounded-none border-0 px-2 py-3 text-center ${
                  active
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "bg-transparent text-[var(--foreground)]"
                }`}
                aria-current={active ? "page" : undefined}
                aria-label={item.description}
              >
                <span className="text-base font-bold leading-tight">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
