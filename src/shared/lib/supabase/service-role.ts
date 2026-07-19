import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/shared/config/env";
import { getWorkerEnv } from "@/shared/config/worker-env";

export function createWorkerServiceRoleClient() {
  const { supabaseUrl } = getPublicEnv();
  const { supabaseServiceRoleKey } = getWorkerEnv();

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
