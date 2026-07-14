import { LogOut } from "lucide-react";

import { signOutAction } from "@/features/auth/actions/auth-actions";
import { Button } from "@/shared/ui/button";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="outline">
        <LogOut aria-hidden="true" className="size-4" />
        Sign out
      </Button>
    </form>
  );
}
