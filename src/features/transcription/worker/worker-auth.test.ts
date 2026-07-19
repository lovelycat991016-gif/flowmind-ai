import { describe, expect, it } from "vitest";

import { authorizeWorkerRequest } from "./worker-auth";

describe("authorizeWorkerRequest", () => {
  const cronSecret = "cron-secret-value";

  it("accepts only the matching bearer token for the internal worker request", () => {
    expect(authorizeWorkerRequest(`Bearer ${cronSecret}`, cronSecret)).toBe(
      true,
    );
  });

  it.each([
    [null],
    [""],
    ["Basic cron-secret-value"],
    ["Bearer incorrect-secret"],
    ["Bearer "],
  ])("rejects an invalid worker authorization header", (authorization) => {
    expect(authorizeWorkerRequest(authorization, cronSecret)).toBe(false);
  });

  it("does not authorize an empty configured secret", () => {
    expect(authorizeWorkerRequest("Bearer cron-secret-value", "")).toBe(false);
  });
});
