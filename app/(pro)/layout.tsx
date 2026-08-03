import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProMobileNav, ProNav } from "@/components/pro/pro-nav";
import { getSessionContext } from "@/lib/auth/session";

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();
  const companyName =
    session?.memberships.find((m) => m.company_id === session.activeCompanyId)
      ?.company?.name ?? "Société";

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 md:flex md:flex-col">
        <Link href="/pro/missions" className="mb-2 block text-lg font-bold text-accent">
          Bibulance Pro
        </Link>
        <p className="mb-6 truncate text-xs text-muted" title={companyName}>
          {companyName}
        </p>
        <ProNav className="flex-1" />
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="truncate text-xs text-muted">{session?.email}</p>
          <p className="text-xs font-semibold uppercase text-muted">
            {session?.activeRole}
          </p>
          <SignOutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <div>
            <p className="font-bold text-accent">Bibulance Pro</p>
            <p className="truncate text-xs text-muted">{companyName}</p>
          </div>
          <SignOutButton label="Quitter" />
        </header>
        <ProMobileNav />
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
