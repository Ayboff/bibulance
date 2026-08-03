import { InviteMemberForm } from "@/components/auth/invite-member-form";
import { canAdminCompany } from "@/lib/auth/rbac";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

type MemberRow = {
  id: string;
  role: AppRole;
  is_active: boolean;
  user_id: string;
};

type InviteRow = {
  id: string;
  email: string;
  role: AppRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
};

export default async function ProSettingsPage() {
  const session = await getSessionContext();
  const isAdmin = canAdminCompany(session?.activeRole);
  const supabase = await createClient();

  let members: MemberRow[] = [];
  let invites: InviteRow[] = [];
  let profiles: { id: string; email: string | null; full_name: string | null }[] =
    [];

  if (session?.activeCompanyId) {
    const { data: memberRows } = await supabase
      .from("company_memberships")
      .select("id, role, is_active, user_id")
      .eq("company_id", session.activeCompanyId)
      .eq("is_active", true);

    members = (memberRows ?? []) as MemberRow[];

    const userIds = members.map((m) => m.user_id);
    if (userIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      profiles = profileRows ?? [];
    }

    if (isAdmin) {
      const { data: inviteRows } = await supabase
        .from("company_invites")
        .select("id, email, role, token, expires_at, accepted_at")
        .eq("company_id", session.activeCompanyId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      invites = (inviteRows ?? []) as InviteRow[];
    }
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres société</h1>
        <p className="text-muted">
          Membres, rôles et invitations — isolation multi-tenant active.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Membres</h2>
        <ul className="divide-y divide-border">
          {members.map((m) => {
            const profile = profileMap.get(m.user_id);
            return (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">
                    {profile?.full_name ?? profile?.email ?? m.user_id}
                  </p>
                  <p className="text-sm text-muted">{profile?.email}</p>
                </div>
                <span className="rounded-md bg-background px-2 py-1 text-xs font-semibold uppercase">
                  {m.role}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {isAdmin ? (
        <>
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Inviter un collaborateur</h2>
            <InviteMemberForm />
          </div>

          {invites.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">Invitations en attente</h2>
              <ul className="space-y-3">
                {invites.map((invite) => (
                  <li
                    key={invite.id}
                    className="rounded-lg bg-background p-3 text-sm"
                  >
                    <p className="font-medium">
                      {invite.email} · {invite.role}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-muted">
                      {invite.token}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">
          Seuls les administrateurs peuvent gérer les invitations.
        </p>
      )}
    </section>
  );
}
