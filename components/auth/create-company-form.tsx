"use client";

import { useActionState } from "react";

import { createCompanyAction, type AuthActionState } from "@/lib/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthActionState = {};

export function CreateCompanyForm() {
  const [state, action, pending] = useActionState(createCompanyAction, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div>
        <Label htmlFor="name">Nom de la société</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Ambulances Dupont"
          minLength={2}
        />
      </div>

      <div>
        <Label htmlFor="slug">Identifiant (slug)</Label>
        <Input
          id="slug"
          name="slug"
          required
          placeholder="ambulances-dupont"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        />
        <p className="mt-1 text-xs text-muted">
          Minuscules, chiffres et tirets uniquement.
        </p>
      </div>

      <div>
        <Label htmlFor="siret">SIRET (optionnel)</Label>
        <Input id="siret" name="siret" inputMode="numeric" />
      </div>

      <Button type="submit" className="w-full" loading={pending}>
        Créer ma société
      </Button>
    </form>
  );
}
