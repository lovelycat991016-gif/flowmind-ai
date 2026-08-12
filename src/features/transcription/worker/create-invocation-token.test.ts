import { describe, expect, it } from "vitest";

import { createInvocationToken } from "./create-invocation-token";

describe("createInvocationToken", () => {
  it("combines an internal worker role and invocation-unique id", () => {
    expect(
      createInvocationToken(
        "transcription-cron",
        "550e8400-e29b-41d4-a716-446655440000",
      ),
    ).toBe("transcription-cron:550e8400-e29b-41d4-a716-446655440000");
  });

  it("creates a new token for each invocation", () => {
    expect(createInvocationToken("transcription-cron")).not.toBe(
      createInvocationToken("transcription-cron"),
    );
  });
});
