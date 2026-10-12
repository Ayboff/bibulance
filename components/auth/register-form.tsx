"use client";

import { useActionState, useState } from "react";

import { signUp, type AuthActionState } from "@/lib/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthActionState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  const [intent, setIntent] = useState<"patient" | "company">("patient");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="intent" value={intent} />

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">Je m’inscris en tant que</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setIntent("patient")}
            className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition ${
              intent === "patient"
                ? "border-ring bg-accent-soft text-ink shadow-sm"
                : "border-border bg-card text-muted hover:bg-background"
            }`}
          >
            Particulier
          </button>
          <button
            type="button"
            onClick={() => setIntent("company")}
            className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition ${
              intent === "company"
                ? "border-ring bg-accent-soft text-ink shadow-sm"
                : "border-border bg-card text-muted hover:bg-background"
            }`}
          >
            Société d’ambulances
          </button>
        </div>
      </fieldset>

      <div>
        <Label htmlFor="full_name">Nom complet</Label>
        <Input id="full_name" name="full_name" required autoComplete="name" />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      <Button type="submit" className="w-full" loading={pending}>
        Créer mon compte
      </Button>
    </form>
  );
}
