"use client";

import { useActionState } from "react";

import { signInWithPassword, type AuthActionState } from "@/lib/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthActionState = {};

export function LoginForm({ next = "/" }: { next?: string }) {
  const [state, action, pending] = useActionState(signInWithPassword, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {state.error ? <Alert>{state.error}</Alert> : null}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vous@exemple.fr"
        />
      </div>

      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </div>

      <Button type="submit" className="w-full" loading={pending}>
        Se connecter
      </Button>
    </form>
  );
}
