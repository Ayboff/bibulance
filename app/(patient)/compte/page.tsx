import { redirect } from "next/navigation";

import { PatientAccountForm } from "@/components/patient/patient-account-form";
import { getSessionContext } from "@/lib/auth/session";

export default async function ComptePage() {
  const session = await getSessionContext();
  if (!session) redirect("/login?next=/compte");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="patient-title">Mon compte</h1>
        <p className="patient-lead mt-2">
          Vos informations personnelles. Un seul écran, simple à modifier.
        </p>
      </div>
      <PatientAccountForm
        email={session.email}
        initialName={session.profile?.full_name ?? ""}
      />
    </div>
  );
}
