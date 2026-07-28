import { describe, expect, it } from "vitest";

import { demoFixtureManifest } from "./demo-fixture-manifest";
import {
  createDemoFixtureRunner,
  type DemoFixtureRepository,
} from "./demo-fixture-runner";

function createRepository(): DemoFixtureRepository & {
  fixtureWrites: number;
  resets: string[];
  verifiedUserIds: string[];
} {
  return {
    fixtureWrites: 0,
    resets: [],
    verifiedUserIds: [],
    async ensureDemoUser(email) {
      return { id: `user:${email}`, email };
    },
    async upsertFixture(input) {
      expect(input.fixture.meetings).toHaveLength(3);
      expect(input.fixture.meetings.map((meeting) => meeting.id)).toEqual([
        "10000000-0000-4000-8000-000000000001",
        "10000000-0000-4000-8000-000000000002",
        "10000000-0000-4000-8000-000000000003",
      ]);
      this.fixtureWrites += 1;
    },
    async resetFixture(userId) {
      this.resets.push(userId);
    },
    async verifyFixture(input) {
      this.verifiedUserIds.push(input.userId);
      return {
        hasExpectedMeetings: true,
        hasExpectedRagSources: true,
        isOwnerScoped: true,
      };
    },
  };
}

describe("demo fixture runner", () => {
  it("seeds the same dedicated user fixture idempotently", async () => {
    const repository = createRepository();
    const runner = createDemoFixtureRunner(repository);

    await runner.seed();
    await runner.seed();

    expect(repository.fixtureWrites).toBe(2);
    expect(repository.resets).toEqual([]);
  });

  it("resets only the dedicated demo user fixture", async () => {
    const repository = createRepository();
    const runner = createDemoFixtureRunner(repository);

    await runner.reset();

    expect(repository.resets).toEqual([
      `user:${demoFixtureManifest.user.email}`,
    ]);
  });

  it("verifies fixture completeness and owner isolation", async () => {
    const repository = createRepository();
    const runner = createDemoFixtureRunner(repository);

    await expect(runner.verify()).resolves.toEqual({
      hasExpectedMeetings: true,
      hasExpectedRagSources: true,
      isOwnerScoped: true,
    });
    expect(repository.verifiedUserIds).toEqual([
      `user:${demoFixtureManifest.user.email}`,
    ]);
  });

  it("fails verification when the repository cannot prove isolation", async () => {
    const repository = createRepository();
    repository.verifyFixture = async () => ({
      hasExpectedMeetings: true,
      hasExpectedRagSources: true,
      isOwnerScoped: false,
    });

    await expect(createDemoFixtureRunner(repository).verify()).rejects.toThrow(
      "Demo fixture verification failed.",
    );
  });
});
