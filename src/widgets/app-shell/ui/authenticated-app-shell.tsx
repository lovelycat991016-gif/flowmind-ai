import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/ui/sign-out-button";
import { createClient } from "@/shared/lib/supabase/server";
import { AppShell } from "./app-shell";

const previewEnabled =
  process.env.NODE_ENV === "development" && process.env.DASHBOARD_PREVIEW === "true";

export async function AuthenticatedAppShell({ children }: { children: ReactNode }) {
  let userEmail = "alex@flowmind.ai";
  if (!previewEnabled) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userEmail = user.email ?? "FlowMind user";
  }

  return (
    <AppShell
      userActions={previewEnabled ? <p className="text-muted-foreground px-3 py-2 text-xs">Local preview session</p> : <SignOutButton />}
      userEmail={userEmail}
    >
      {children}
    </AppShell>
  );
}
