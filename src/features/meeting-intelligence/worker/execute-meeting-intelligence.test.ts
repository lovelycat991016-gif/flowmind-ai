import { describe, expect, it, vi } from "vitest";
import { executeNextMeetingIntelligence } from "./execute-meeting-intelligence";
const job = {
  id: "a",
  meetingId: "m",
  transcriptId: null,
  userId: "u",
  lockedBy: "w",
};
const result = {
  provider: "p",
  modelIdentifier: "m",
  promptVersion: "meeting_intelligence/v1",
  summary: { content: "s" },
  actionItems: [],
  decisions: [],
  outputMetadata: {},
};
const setup = () => ({
  claim: vi.fn().mockResolvedValue(job),
  loadInput: vi
    .fn()
    .mockResolvedValue({ content: "manual text", language: "zh" }),
  complete: vi.fn(),
  fail: vi.fn(),
});
describe("executeNextMeetingIntelligence", () => {
  it("generates and persists one claimed manual-text result", async () => {
    const dependencies = setup();
    const provider = { generate: vi.fn().mockResolvedValue(result) };
    await expect(
      executeNextMeetingIntelligence({
        workerId: "w",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).resolves.toEqual({ status: "completed", jobId: "a" });
    expect(dependencies.loadInput).toHaveBeenCalledWith(job);
    expect(dependencies.complete).toHaveBeenCalledWith(job, result);
  });
  it("fails safely for missing input and provider failure", async () => {
    const dependencies = setup();
    dependencies.loadInput.mockRejectedValue({
      code: "intelligence_input_invalid",
    });
    const provider = { generate: vi.fn() };
    await expect(
      executeNextMeetingIntelligence({
        workerId: "w",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).resolves.toMatchObject({
      status: "failed",
      code: "intelligence_input_invalid",
    });
  });
  it("does not execute twice when no job is claimable", async () => {
    const dependencies = setup();
    dependencies.claim.mockResolvedValue(null);
    const provider = { generate: vi.fn() };
    await expect(
      executeNextMeetingIntelligence({
        workerId: "w",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).resolves.toEqual({ status: "idle" });
    expect(provider.generate).not.toHaveBeenCalled();
  });
});
