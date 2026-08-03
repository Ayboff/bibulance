"use client";

import { useActionState } from "react";

import {
  createInviteAction,
  type InviteActionState,
} from "@/lib/auth/invite-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: InviteActionState = {};

export function InviteMemberForm() {
  const [state, action, pending] = useActionState(createInviteAction, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      {state.token ? (
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase text-muted">Code</p>
          <p className="break-all font-mono text-sm">{state.token}</p>
          <p className="mt-2 text-xs text-muted">
            Lien : /pro/invite?token={state.token}
          </p>
        </div>
      ) : null}

      <div>
        <Label htmlFor="email">Email du collaborateur</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div>
        <Label htmlFor="role">Rôle</Label>
        <select
          id="role"
          name="role"
          className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-base"
          defaultValue="regulator"
        >
          <option value="regulator">Régulateur</option>
          <option value="admin">Admin</option>
          <option value="driver">Chauffeur</option>
        </select>
      </div>

      <Button type="submit" loading={pending}>
        Créer l’invitation
      </Button>
    </form>
  );
}
