import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

type PublicEnvInput = Record<string, string | undefined>;

export type PublicEnv = {
  appUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function removeTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

export function parsePublicEnv(input: PublicEnvInput): PublicEnv {
  const result = publicEnvSchema.safeParse(input);

  if (!result.success) {
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
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
