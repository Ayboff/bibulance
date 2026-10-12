import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/brand/logo";
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
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="border-b border-border px-4 py-4">
          <Logo variant="full" href="/pro/missions" />
          <p
            className="mt-3 truncate text-sm font-semibold text-ink"
            title={companyName}
          >
            {companyName}
          </p>
          <p className="truncate text-xs text-muted">Espace régulation</p>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <ProNav className="flex-1" />
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <p className="truncate text-xs text-muted">{session?.email}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-ring">
              {session?.activeRole}
            </p>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Logo variant="mark" href="/pro/missions" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{companyName}</p>
              <p className="text-xs text-muted">Bibulance Pro</p>
            </div>
          </div>
          <SignOutButton label="Quitter" />
        </header>
        <ProMobileNav />
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
