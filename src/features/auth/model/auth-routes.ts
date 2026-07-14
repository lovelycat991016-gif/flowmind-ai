import type { Route } from "next";

const AUTH_ENTRY_ROUTES = new Set(["/login", "/signup", "/forgot-password"]);

type AuthRouteContext = {
  pathname: string;
  isAuthenticated: boolean;
};

export function getAuthRedirect({
  pathname,
  isAuthenticated,
}: AuthRouteContext): string | null {
  const isProtectedRoute =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (isProtectedRoute && !isAuthenticated) {
    return `/login?next=${encodeURIComponent(pathname)}`;
  }

  if (AUTH_ENTRY_ROUTES.has(pathname) && isAuthenticated) {
    return "/dashboard";
  }

  return null;
}

export function getSafeInternalPath(value: string | null | undefined): Route {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value as Route;
  }

  return "/dashboard";
}
