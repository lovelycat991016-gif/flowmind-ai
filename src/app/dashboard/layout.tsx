import { redirect } from "next/navigation";

import { SignOutButton } from "@/features/auth/ui/sign-out-button";
import { createClient } from "@/shared/lib/supabase/server";
import { AppShell } from "@/widgets/app-shell/ui/app-shell";

export const dynamic = "force-dynamic";

const dashboardPreviewEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.DASHBOARD_PREVIEW === "true";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let userEmail = "alex@flowmind.ai";

  if (!dashboardPreviewEnabled) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");
    userEmail = user.email ?? "FlowMind user";
  }

  return (
    <AppShell
      userActions={
        dashboardPreviewEnabled ? (
          <p className="text-muted-foreground px-3 py-2 text-xs">
            Local preview session
          </p>
        ) : (
          <SignOutButton />
        )
      }
      userEmail={userEmail}
    >
      {children}
    </AppShell>
  );
}
