import { LogOut } from "lucide-react";

import { signOutAction } from "@/features/auth/actions/auth-actions";
import { Button } from "@/shared/ui/button";
import { zhCN } from "@/shared/i18n/zh-CN";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="outline">
        <LogOut aria-hidden="true" className="size-4" />
        {zhCN.auth.signOut}
      </Button>
    </form>
  );
}
