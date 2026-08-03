"use client";

import { useState } from "react";

import { signOut } from "@/lib/auth/actions";

export function PatientAccountForm({
  email,
  initialName,
}: {
  email: string | null;
  initialName: string;
}) {
  const [fullName, setFullName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Enregistrement impossible");
      setMessage("Vos informations ont été enregistrées.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="patient-card space-y-2">
        <p className="text-base font-bold text-[var(--muted)]">Email</p>
        <p className="text-lg font-semibold">{email ?? "—"}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="patient-label" htmlFor="full_name">
            Nom complet
          </label>
          <input
            id="full_name"
            className="patient-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
            minLength={2}
          />
        </div>

        {error ? (
          <p className="patient-card text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="patient-card text-[var(--success)]" role="status">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          className="patient-btn patient-btn-primary w-full"
          disabled={busy}
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      <div className="border-t-2 border-[var(--border)] pt-6">
        <form action={signOut}>
          <button type="submit" className="patient-btn patient-btn-secondary w-full">
            Me déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
