import process from "node:process";

import { z } from "zod";

const workerEnvSchema = z.object({
  CRON_SECRET: z.string().trim().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
});

type WorkerEnvInput = Record<string, string | undefined>;

export type WorkerEnv = {
  cronSecret: string;
  supabaseServiceRoleKey: string;
};

export function parseWorkerEnv(input: WorkerEnvInput): WorkerEnv {
  const result = workerEnvSchema.safeParse(input);

  if (!result.success) {
    throw new Error("Worker environment configuration is invalid.");
  }

  return {
    cronSecret: result.data.CRON_SECRET,
    supabaseServiceRoleKey: result.data.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getWorkerEnv() {
  return parseWorkerEnv({
    CRON_SECRET: process.env.CRON_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
