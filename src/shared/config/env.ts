import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

type PublicEnvInput = Record<string, string | undefined>;

const serverOnlyKeys = ["CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export type PublicEnv = {
  appUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function removeTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function hasServerOnlyValue(input: PublicEnvInput) {
  return serverOnlyKeys.some((key) => Boolean(input[key]?.trim()));
}

function requiresHttps(input: PublicEnvInput) {
  return input.NODE_ENV === "production";
}

export function parsePublicEnv(input: PublicEnvInput): PublicEnv {
  const result = publicEnvSchema.safeParse(input);

  if (
    !result.success ||
    hasServerOnlyValue(input) ||
    (requiresHttps(input) &&
      (new URL(result.data.NEXT_PUBLIC_APP_URL).protocol !== "https:" ||
        new URL(result.data.NEXT_PUBLIC_SUPABASE_URL).protocol !== "https:"))
  ) {
    throw new Error("FlowMind environment configuration is invalid.");
  }

  return {
    appUrl: removeTrailingSlash(result.data.NEXT_PUBLIC_APP_URL),
    supabaseUrl: removeTrailingSlash(result.data.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getPublicEnv() {
  return parsePublicEnv({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
