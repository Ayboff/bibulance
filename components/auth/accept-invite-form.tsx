"use client";

import { useActionState } from "react";

import { acceptInviteAction, type AuthActionState } from "@/lib/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthActionState = {};

export function AcceptInviteForm({ token }: { token?: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div>
        <Label htmlFor="token">Code d’invitation</Label>
        <Input
          id="token"
          name="token"
          required
          defaultValue={token}
          placeholder="Collez le jeton reçu par email"
        />
      </div>

      <Button type="submit" className="w-full" loading={pending}>
        Rejoindre la société
      </Button>
    </form>
  );
}
