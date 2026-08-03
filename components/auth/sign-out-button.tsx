import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton({ label = "Déconnexion" }: { label?: string }) {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary" className="w-full sm:w-auto">
        {label}
      </Button>
    </form>
  );
}
