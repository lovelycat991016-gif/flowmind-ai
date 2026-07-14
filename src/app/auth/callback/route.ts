import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/shared/lib/supabase/server";

function getSafeDestination(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = getSafeDestination(
    request.nextUrl.searchParams.get("next"),
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback", request.url));
}
