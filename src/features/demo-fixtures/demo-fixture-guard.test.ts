import { describe, expect, it } from "vitest";

import {
  assertDemoFixtureEnvironment,
  type DemoFixtureEnvironment,
} from "./demo-fixture-guard";

const localEnvironment: DemoFixtureEnvironment = {
  demoFixturesEnabled: "true",
  fixtureUserEmail: "demo.flowmind@example.test",
  supabaseUrl: "http://127.0.0.1:54321",
  vercelEnvironment: undefined,
};

describe("demo fixture environment", () => {
  it("accepts an explicitly enabled local fixture target", () => {
    expect(() => assertDemoFixtureEnvironment(localEnvironment)).not.toThrow();
  });

  it("rejects production and missing opt-in safely", () => {
    expect(() =>
      assertDemoFixtureEnvironment({
        ...localEnvironment,
        vercelEnvironment: "production",
      }),
    ).toThrow("Demo fixture environment is invalid.");
    expect(() =>
      assertDemoFixtureEnvironment({
        ...localEnvironment,
        demoFixturesEnabled: undefined,
      }),
    ).toThrow("Demo fixture environment is invalid.");
  });

  it("rejects preview when it targets the configured production database", () => {
    expect(() =>
      assertDemoFixtureEnvironment({
        ...localEnvironment,
        productionSupabaseUrl: "https://flowmind.supabase.co",
        supabaseUrl: "https://flowmind.supabase.co",
        vercelEnvironment: "preview",
      }),
    ).toThrow("Demo fixture environment is invalid.");
  });

  it("requires a dedicated demo user email namespace", () => {
    expect(() =>
      assertDemoFixtureEnvironment({
        ...localEnvironment,
        fixtureUserEmail: "person@example.com",
      }),
    ).toThrow("Demo fixture environment is invalid.");
  });
});
