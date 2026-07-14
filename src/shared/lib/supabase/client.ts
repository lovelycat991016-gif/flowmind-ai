"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/shared/config/env";

export function createClient() {
  const { supabaseAnonKey, supabaseUrl } = getPublicEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
