import { describe, expect, it } from "vitest";

import { parseWorkerEnv } from "./worker-env";

describe("parseWorkerEnv", () => {
  it("accepts the server-only secrets required by the worker boundary", () => {
    expect(
      parseWorkerEnv({
        CRON_SECRET: "cron-secret-value",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    ).toEqual({
      cronSecret: "cron-secret-value",
      supabaseServiceRoleKey: "service-role-key",
    });
  });

  it("rejects missing or blank worker secrets without naming the secret", () => {
    expect(() =>
      parseWorkerEnv({ SUPABASE_SERVICE_ROLE_KEY: "service-role-key" }),
    ).toThrow("Worker environment configuration is invalid.");
    expect(() =>
      parseWorkerEnv({
        CRON_SECRET: "cron-secret-value",
        SUPABASE_SERVICE_ROLE_KEY: "   ",
      }),
    ).toThrow("Worker environment configuration is invalid.");
  });
});
