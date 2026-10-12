import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/brand/logo";
import { ProMobileNav, ProSidebar } from "@/components/pro/pro-sidebar";
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
    <div className="min-h-full flex-1 bg-background">
      <ProSidebar
        companyName={companyName}
        email={session?.email}
        role={session?.activeRole}
      />

      <div className="flex min-h-full min-w-0 flex-1 flex-col md:pl-[96px]">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Logo variant="mark" href="/pro/missions" size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {companyName}
              </p>
              <p className="text-xs text-muted">Régulation</p>
            </div>
          </div>
          <SignOutButton label="Quitter" />
        </header>
        <ProMobileNav />
        <div className="flex-1 p-4 md:p-6 lg:p-7">{children}</div>
      </div>
    </div>
  );
}
