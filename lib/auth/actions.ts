"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { sendWelcomeEmailForUser } from "@/lib/email/send-welcome";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
});

const registerSchema = credentialsSchema.extend({
  full_name: z.string().min(2, "Nom trop court"),
  intent: z.enum(["patient", "company"]).default("patient"),
});

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export type AuthActionState = {
  error?: string;
  success?: string;
};

export async function signInWithPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Email ou mot de passe incorrect." };
  }

  const next = formString(formData, "next") || "/";
  redirect(next.startsWith("/") ? next : "/");
}

export async function signUp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
    full_name: formString(formData, "full_name"),
    intent: formString(formData, "intent") || "patient",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/callback?next=${encodeURIComponent(
        parsed.data.intent === "company" ? "/pro/onboarding" : "/commander",
      )}`,
      data: {
        full_name: parsed.data.full_name,
        primary_role: parsed.data.intent === "company" ? "owner" : "patient",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled, session exists → welcome email then redirect
  if (data.session && data.user) {
    await sendWelcomeEmailForUser({
      userId: data.user.id,
      email: parsed.data.email,
      fullName: parsed.data.full_name,
      primaryRole: parsed.data.intent === "company" ? "owner" : "patient",
      audienceHint: parsed.data.intent === "company" ? "company" : "patient",
    });
    redirect(parsed.data.intent === "company" ? "/pro/onboarding" : "/commander");
  }

  return {
    success:
      "Compte créé. Vérifiez votre email pour confirmer l’inscription, puis connectez-vous.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createCompanyAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const name = formString(formData, "name");
  const slug = formString(formData, "slug").toLowerCase();
  const siret = formString(formData, "siret") || null;

  if (name.length < 2) return { error: "Nom de société requis." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: "Slug invalide (ex: ambulance-paris)." };
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC args until gen types
  const { error } = await (supabase as any).rpc("create_company", {
    p_name: name,
    p_slug: slug,
    p_siret: siret,
  });

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { error: "Ce slug est déjà utilisé." };
    }
    return { error: error.message };
  }

  redirect("/pro/missions");
}

export async function acceptInviteAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const token = formString(formData, "token");
  if (!token) return { error: "Jeton d’invitation manquant." };

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC args until gen types
  const { error } = await (supabase as any).rpc("accept_company_invite", {
    p_token: token,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/pro/missions");
}
