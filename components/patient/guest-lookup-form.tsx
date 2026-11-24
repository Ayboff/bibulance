"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GuestLookupForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [lastname, setLastname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/missions/guest-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, lastname }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Recherche impossible");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="patient-card space-y-4">
      <p className="font-bold text-[var(--accent)]">Retrouver mes trajets</p>
      <p className="text-base text-[var(--muted)]">
        Saisissez le téléphone et le nom du patient utilisés lors de la
        commande (sans compte).
      </p>
      <div>
        <label className="patient-label" htmlFor="guest-phone">
          Téléphone
        </label>
        <input
          id="guest-phone"
          className="patient-input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="06 12 34 56 78"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div>
        <label className="patient-label" htmlFor="guest-last">
          Nom du patient
        </label>
        <input
          id="guest-last"
          className="patient-input"
          required
          autoComplete="family-name"
          value={lastname}
          onChange={(e) => setLastname(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm font-semibold text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="patient-btn patient-btn-primary w-full"
        disabled={busy}
      >
        {busy ? "Recherche…" : "Voir mes trajets"}
      </button>
    </form>
  );
}
