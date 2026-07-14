import { AudioLines, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/features/auth/ui/sign-out-button";
import { createClient } from "@/shared/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen">
      <header className="bg-card border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3 font-semibold">
            <span className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-md">
              <AudioLines aria-hidden="true" className="size-5" />
            </span>
            FlowMind AI
          </div>
          <SignOutButton />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="border-b pb-8">
          <p className="text-muted-foreground text-sm font-medium">Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-2 text-sm">{user.email}</p>
        </div>

        <div className="mt-8 flex max-w-2xl items-start gap-4 border-l-4 border-[#278362] bg-white px-5 py-4">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-[#176b4d]"
          />
          <div>
            <h2 className="text-sm font-semibold">Account secured</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Your authenticated workspace is ready.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
