"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canAdminCompany } from "@/lib/auth/rbac";
import { requireStaffSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type InviteActionState = {
  error?: string;
  success?: string;
  token?: string;
};

const inviteSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "regulator", "driver"]),
});

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createInviteAction(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  let session;
  try {
    session = await requireStaffSession();
  } catch {
    return { error: "Session expirée ou accès refusé." };
  }

  if (!canAdminCompany(session.activeRole)) {
    return { error: "Seuls owner/admin peuvent inviter." };
  }

  const parsed = inviteSchema.safeParse({
    email: formString(formData, "email").toLowerCase(),
    role: formString(formData, "role") || "regulator",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_invites")
    .insert({
      company_id: session.activeCompanyId!,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: session.userId,
    })
    .select("token")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Une invitation existe déjà pour cet email." };
    }
    return { error: error.message };
  }

  revalidatePath("/pro/settings");
  return {
    success: "Invitation créée. Partagez le code ci-dessous.",
    token: data.token,
  };
}
