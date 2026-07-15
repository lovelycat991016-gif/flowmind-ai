import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getAuthRedirect } from "@/features/auth/model/auth-routes";
import { getPublicEnv } from "@/shared/config/env";

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function updateSession(request: NextRequest) {
  const dashboardPreviewEnabled =
    process.env.NODE_ENV === "development" &&
    process.env.DASHBOARD_PREVIEW === "true" &&
    request.nextUrl.pathname.startsWith("/dashboard");

  if (dashboardPreviewEnabled) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { supabaseAnonKey, supabaseUrl } = getPublicEnv();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const destination = getAuthRedirect({
    pathname: request.nextUrl.pathname,
    isAuthenticated: Boolean(user),
  });

  if (!destination) {
    return response;
  }

  return copyCookies(
    response,
    NextResponse.redirect(new URL(destination, request.url)),
  );
}
