import { NextResponse } from "next/server";

import { sendWelcomeEmailForUser } from "@/lib/email/send-welcome";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        const audienceHint = next.startsWith("/pro")
          ? ("company" as const)
          : next.startsWith("/commander")
            ? ("patient" as const)
            : undefined;

        // Fire-and-forget would risk serverless kill — await briefly but never block redirect on failure
        await sendWelcomeEmailForUser({
          userId: user.id,
          email: user.email,
          fullName:
            typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : null,
          primaryRole:
            typeof user.user_metadata?.primary_role === "string"
              ? user.user_metadata.primary_role
              : null,
          audienceHint,
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
