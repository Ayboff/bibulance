import { createClient } from "@/lib/supabase/server";
import type { AppRole, Company, Profile } from "@/types/database";
import { isStaffRole } from "@/lib/auth/rbac";

export type Membership = {
  id: string;
  company_id: string;
  role: AppRole;
  is_active: boolean;
  company: Pick<Company, "id" | "name" | "slug"> | null;
};

export type SessionContext = {
  userId: string;
  email: string | null;
  profile: Profile | null;
  memberships: Membership[];
  activeCompanyId: string | null;
  activeRole: AppRole | null;
  isStaff: boolean;
};

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membershipRows } = await supabase
    .from("company_memberships")
    .select("id, company_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const companyIds = (membershipRows ?? []).map((m) => m.company_id);
  let companiesById = new Map<string, Pick<Company, "id" | "name" | "slug">>();

  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, slug")
      .in("id", companyIds);

    companiesById = new Map((companies ?? []).map((c) => [c.id, c]));
  }

  const memberships: Membership[] = (membershipRows ?? []).map((row) => ({
    id: row.id,
    company_id: row.company_id,
    role: row.role,
    is_active: row.is_active,
    company: companiesById.get(row.company_id) ?? null,
  }));

  const activeCompanyId =
    profile?.default_company_id &&
    memberships.some((m) => m.company_id === profile.default_company_id)
      ? profile.default_company_id
      : (memberships[0]?.company_id ?? null);

  const activeRole =
    memberships.find((m) => m.company_id === activeCompanyId)?.role ??
    profile?.primary_role ??
    null;

  return {
    userId: user.id,
    email: user.email ?? profile?.email ?? null,
    profile,
    memberships,
    activeCompanyId,
    activeRole,
    isStaff: memberships.some((m) => isStaffRole(m.role)),
  };
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export async function requireStaffSession(): Promise<SessionContext> {
  const session = await requireSession();
  if (!session.isStaff || !session.activeCompanyId) {
    throw new Error("FORBIDDEN_STAFF");
  }
  return session;
}
