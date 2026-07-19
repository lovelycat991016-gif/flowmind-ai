import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getPublicEnv: vi.fn(),
  getWorkerEnv: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/shared/config/env", () => ({ getPublicEnv: mocks.getPublicEnv }));
vi.mock("@/shared/config/worker-env", () => ({
  getWorkerEnv: mocks.getWorkerEnv,
}));

import { createWorkerServiceRoleClient } from "./service-role";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPublicEnv.mockReturnValue({
    supabaseUrl: "https://project.supabase.co",
  });
  mocks.getWorkerEnv.mockReturnValue({
    supabaseServiceRoleKey: "service-role-key",
  });
});

describe("createWorkerServiceRoleClient", () => {
  it("creates an isolated non-session Supabase client with the service role key", () => {
    createWorkerServiceRoleClient();

    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "service-role-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  });
});
