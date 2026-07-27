import { redirect } from "next/navigation";
import { LandingPage } from "@/widgets/landing/ui/landing-page";
import { createClient } from "@/shared/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return <LandingPage />;
}
