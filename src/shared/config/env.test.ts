import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "./env";

describe("parsePublicEnv", () => {
  it("accepts valid public application configuration", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_APP_URL: "https://flowmind.example.com/",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co/",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anonymous-key",
      }),
    ).toEqual({
      appUrl: "https://flowmind.example.com",
      supabaseUrl: "https://project.supabase.co",
      supabaseAnonKey: "public-anonymous-key",
    });
  });

  it("rejects malformed URLs", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_APP_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anonymous-key",
      }),
    ).toThrow("FlowMind environment configuration is invalid");
  });

  it("rejects a missing Supabase anonymous key", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_APP_URL: "https://flowmind.example.com",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      }),
    ).toThrow("FlowMind environment configuration is invalid");
  });

  it("rejects non-HTTPS public URLs in production", () => {
    expect(() =>
      parsePublicEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "http://flowmind.example.com",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anonymous-key",
      }),
    ).toThrow("FlowMind environment configuration is invalid");
  });

  it("rejects server-only configuration passed to the public parser", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_APP_URL: "https://flowmind.example.com",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anonymous-key",
        CRON_SECRET: "server-only-secret",
      }),
    ).toThrow("FlowMind environment configuration is invalid");
  });
});
