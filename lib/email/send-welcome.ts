import { createAdminClient } from "@/lib/supabase/admin";

import { getAppOrigin, getEmailFrom, getResendClient, isEmailConfigured } from "./resend";
import {
  buildWelcomeEmail,
  type WelcomeAudience,
} from "./templates/welcome";

const META_KEY = "welcome_email_sent_at";

export type SendWelcomeResult =
  | { ok: true; skipped?: "not_configured" | "already_sent" | "no_email" }
  | { ok: false; error: string };

function resolveAudience(
  primaryRole: string | undefined | null,
  fallback?: WelcomeAudience,
): WelcomeAudience {
  if (primaryRole === "owner" || primaryRole === "dispatcher" || primaryRole === "driver") {
    return "company";
  }
  if (primaryRole === "patient") return "patient";
  return fallback ?? "patient";
}

/**
 * Sends the branded welcome email once per user after email confirmation
 * (or immediately when confirmation is disabled and a session exists).
 */
export async function sendWelcomeEmailForUser(input: {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  primaryRole?: string | null;
  audienceHint?: WelcomeAudience;
}): Promise<SendWelcomeResult> {
  if (!isEmailConfigured()) {
    console.warn("[email] RESEND_API_KEY missing — welcome email skipped");
    return { ok: true, skipped: "not_configured" };
  }

  const resend = getResendClient();
  if (!resend) {
    return { ok: true, skipped: "not_configured" };
  }

  try {
    const admin = createAdminClient();
    const { data: userData, error: userError } =
      await admin.auth.admin.getUserById(input.userId);

    if (userError || !userData.user) {
      return { ok: false, error: userError?.message ?? "Utilisateur introuvable" };
    }

    const user = userData.user;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

    if (typeof meta[META_KEY] === "string" && meta[META_KEY]) {
      return { ok: true, skipped: "already_sent" };
    }

    const email = (input.email ?? user.email)?.trim();
    if (!email) {
      return { ok: true, skipped: "no_email" };
    }

    const fullName =
      (input.fullName ??
        (typeof meta.full_name === "string" ? meta.full_name : null) ??
        email.split("@")[0] ??
        "bonjour") ||
      "bonjour";

    const primaryRole =
      input.primaryRole ??
      (typeof meta.primary_role === "string" ? meta.primary_role : null);

    const audience = resolveAudience(primaryRole, input.audienceHint);
    const content = buildWelcomeEmail({
      fullName,
      audience,
      appOrigin: getAppOrigin(),
    });

    const { error: sendError } = await resend.emails.send({
      from: getEmailFrom(),
      to: email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (sendError) {
      console.error("[email] welcome send failed", sendError);
      return { ok: false, error: sendError.message };
    }

    const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...meta,
        [META_KEY]: new Date().toISOString(),
      },
    });

    if (metaError) {
      // Email already sent — log but don't fail the auth flow
      console.warn("[email] could not mark welcome_email_sent_at", metaError.message);
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur email";
    console.error("[email] welcome unexpected error", message);
    return { ok: false, error: message };
  }
}
