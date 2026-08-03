import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

const AUTH_PATHS = ["/login", "/register"];
const PATIENT_PROTECTED = ["/mes-transports", "/compte", "/commander"];
const PRO_PREFIX = "/pro";

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPatientProtected(pathname: string) {
  return PATIENT_PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isProPath(pathname: string) {
  return pathname === PRO_PREFIX || pathname.startsWith(`${PRO_PREFIX}/`);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname, search } = request.nextUrl;

  if (!url || !anon) {
    // Env not ready — allow boot without auth enforcement
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Cron + health + partner webhooks bypass session redirects
  if (
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/webhooks")
  ) {
    return supabaseResponse;
  }

  const needsAuth = isProPath(pathname) || isPatientProtected(pathname);

  if (!user && needsAuth) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthPath(pathname)) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  // Staff gate for /pro (except onboarding & invite)
  if (user && isProPath(pathname)) {
    const allowWithoutMembership =
      pathname.startsWith("/pro/onboarding") ||
      pathname.startsWith("/pro/invite");

    if (!allowWithoutMembership) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC until gen types
      const { data: isStaff } = await (supabase as any).rpc("is_staff_user");
      if (!isStaff) {
        const onboarding = request.nextUrl.clone();
        onboarding.pathname = "/pro/onboarding";
        onboarding.search = "";
        return NextResponse.redirect(onboarding);
      }
    }
  }

  return supabaseResponse;
}
