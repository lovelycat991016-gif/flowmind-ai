export type DemoFixtureEnvironment = {
  demoFixturesEnabled: string | undefined;
  fixtureUserEmail: string | undefined;
  supabaseUrl: string | undefined;
  productionSupabaseUrl?: string | undefined;
  vercelEnvironment: string | undefined;
};

function invalidEnvironment(): never {
  throw new Error("Demo fixture environment is invalid.");
}

function origin(value: string | undefined) {
  if (!value) invalidEnvironment();
  try {
    return new URL(value).origin;
  } catch {
    return invalidEnvironment();
  }
}

function isLocalOrigin(value: string) {
  const hostname = new URL(value).hostname;
  return hostname === "127.0.0.1" || hostname === "localhost";
}

export function assertDemoFixtureEnvironment(environment: DemoFixtureEnvironment) {
  const targetOrigin = origin(environment.supabaseUrl);
  if (
    environment.demoFixturesEnabled !== "true" ||
    environment.vercelEnvironment === "production" ||
    !environment.fixtureUserEmail?.startsWith("demo.flowmind@") ||
    !environment.fixtureUserEmail.endsWith(".test")
  ) {
    invalidEnvironment();
  }

  if (environment.productionSupabaseUrl && targetOrigin === origin(environment.productionSupabaseUrl)) {
    invalidEnvironment();
  }

  if (!isLocalOrigin(targetOrigin) && environment.vercelEnvironment !== "preview") {
    invalidEnvironment();
  }
}
