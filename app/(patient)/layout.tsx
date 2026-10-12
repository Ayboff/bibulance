import { Logo } from "@/components/brand/logo";
import { PatientNav } from "@/components/patient/patient-nav";

import "./patient.css";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="patient-app flex min-h-full flex-1 flex-col">
      <a
        href="#contenu-principal"
        className="absolute left-4 top-4 z-50 -translate-y-[200%] rounded-lg bg-[var(--accent)] px-4 py-3 font-bold text-[var(--accent-foreground)] focus:translate-y-0"
      >
        Aller au contenu principal
      </a>

      <header className="border-b-2 border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <Logo variant="full" href="/commander" size="sm" />
          <p className="text-sm font-semibold text-[var(--muted)]">
            Espace patient
          </p>
        </div>
      </header>

      <main
        id="contenu-principal"
        className="mx-auto w-full max-w-lg flex-1 px-4 py-6"
        tabIndex={-1}
      >
        {children}
      </main>

      <PatientNav />
    </div>
  );
}
