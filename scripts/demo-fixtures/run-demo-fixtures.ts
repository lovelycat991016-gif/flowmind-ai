import process from "node:process";

import { assertDemoFixtureEnvironment } from "../../src/features/demo-fixtures/demo-fixture-guard";
import { createDemoFixtureRunner } from "../../src/features/demo-fixtures/demo-fixture-runner";
import {
  createSupabaseDemoFixtureRepository,
  type FixtureClient,
} from "../../src/features/demo-fixtures/supabase-demo-fixture-repository";
import { createWorkerServiceRoleClient } from "../../src/shared/lib/supabase/service-role";

const actions = ["seed", "reset", "verify"] as const;
type DemoFixtureAction = (typeof actions)[number];

function parseAction(value: string | undefined): DemoFixtureAction {
  if (actions.includes(value as DemoFixtureAction)) {
    return value as DemoFixtureAction;
  }
  throw new Error("Demo fixture action is invalid.");
}

async function run() {
  const action = parseAction(process.argv[2]);
  assertDemoFixtureEnvironment({
    demoFixturesEnabled: process.env.DEMO_FIXTURES_ENABLED,
    fixtureUserEmail: process.env.DEMO_FIXTURE_USER_EMAIL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    productionSupabaseUrl: process.env.FLOWMIND_PRODUCTION_SUPABASE_URL,
    vercelEnvironment: process.env.VERCEL_ENV,
  });

  const repository = createSupabaseDemoFixtureRepository(
    createWorkerServiceRoleClient() as unknown as FixtureClient,
  );
  await createDemoFixtureRunner(repository)[action]();
  console.log(`Demo fixtures ${action} completed.`);
}

void run();
