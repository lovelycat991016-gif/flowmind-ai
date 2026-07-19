import { beforeEach, describe, expect, it, vi } from "vitest";
const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));
vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: createClientMock,
}));
import {
  getMeetingIntelligence,
  getMeetingIntelligenceStatusPresentation,
} from "./get-meeting-intelligence";
const row = {
  id: "a",
  meeting_id: "b",
  transcript_id: "c",
  user_id: "d",
  status: "completed",
  model_identifier: "m",
  prompt_version: "meeting_intelligence/v1",
  output_metadata: {},
  result: {
    provider: "p",
    modelIdentifier: "m",
    promptVersion: "meeting_intelligence/v1",
    summary: { content: "s" },
    actionItems: [],
    decisions: [],
    outputMetadata: {},
  },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};
function q(data: unknown, error: unknown = null) {
  const x = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  x.select.mockReturnValue(x);
  x.eq.mockReturnValue(x);
  return x;
}
beforeEach(() => createClientMock.mockReset());
describe("getMeetingIntelligence", () => {
  it("returns an owner-visible completed result", async () => {
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(q(row)),
    });
    await expect(getMeetingIntelligence("b")).resolves.toMatchObject({
      meetingId: "b",
      result: row.result,
    });
  });
  it("returns null for inaccessible intelligence", async () => {
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(q(null)),
    });
    await expect(getMeetingIntelligence("b")).resolves.toBeNull();
  });
  it("hides malformed stored results", async () => {
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(q({ ...row, result: { bad: true } })),
    });
    await expect(getMeetingIntelligence("b")).resolves.toMatchObject({
      result: null,
    });
  });
  it.each([
    ["queued", "pending"],
    ["running", "pending"],
    ["failed", "unavailable"],
  ] as const)("maps %s safely", (status, state) =>
    expect(getMeetingIntelligenceStatusPresentation(status).state).toBe(state),
  );
});
