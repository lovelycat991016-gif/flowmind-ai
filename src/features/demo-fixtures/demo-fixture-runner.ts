import { demoFixtureManifest, type DemoFixtureManifest } from "./demo-fixture-manifest";

type DemoFixtureUser = { id: string; email: string };
export type DemoFixtureVerification = {
  hasExpectedMeetings: boolean;
  hasExpectedRagSources: boolean;
  isOwnerScoped: boolean;
};

export type DemoFixtureRepository = {
  ensureDemoUser(email: string): Promise<DemoFixtureUser>;
  upsertFixture(input: { userId: string; fixture: DemoFixtureManifest }): Promise<void>;
  resetFixture(userId: string): Promise<void>;
  verifyFixture(input: { userId: string; fixture: DemoFixtureManifest }): Promise<DemoFixtureVerification>;
};

function verificationFailed(): never {
  throw new Error("Demo fixture verification failed.");
}

export function createDemoFixtureRunner(
  repository: DemoFixtureRepository,
  fixture = demoFixtureManifest,
) {
  async function getDemoUser() {
    return repository.ensureDemoUser(fixture.user.email);
  }

  return {
    async seed() {
      const user = await getDemoUser();
      await repository.upsertFixture({ fixture, userId: user.id });
    },
    async reset() {
      const user = await getDemoUser();
      await repository.resetFixture(user.id);
    },
    async verify() {
      const user = await getDemoUser();
      const result = await repository.verifyFixture({ fixture, userId: user.id });
      if (!result.hasExpectedMeetings || !result.hasExpectedRagSources || !result.isOwnerScoped) {
        verificationFailed();
      }
      return result;
    },
  };
}
