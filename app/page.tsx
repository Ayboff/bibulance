import { HomeLanding } from "@/components/marketing/home-landing";
import { getSessionContext } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSessionContext();

  const proHref = session?.isStaff
    ? "/pro/missions"
    : session
      ? "/pro/onboarding"
      : "/login?next=/pro/missions";
  const patientHref = session ? "/commander" : "/login?next=/commander";

  return (
    <HomeLanding
      proHref={proHref}
      patientHref={patientHref}
      sessionEmail={session?.email}
      isLoggedIn={Boolean(session)}
    />
  );
}
