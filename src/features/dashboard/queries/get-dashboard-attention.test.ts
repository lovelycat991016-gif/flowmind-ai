import { afterEach, expect, it, vi } from "vitest";

const { createClientMock, reportServerEventMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  reportServerEventMock: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: createClientMock,
}));
vi.mock("@/shared/observability/server", () => ({
  reportServerEvent: reportServerEventMock,
}));

import { getDashboardAttention } from "./get-dashboard-attention";

afterEach(() => {
  createClientMock.mockReset();
  reportServerEventMock.mockReset();
  vi.useRealTimers();
});

function countQuery(
  count: number | null,
  error: { code: string; message: string } | null = null,
) {
  const query = {
    select: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    then: (
      resolve: (value: {
        count: number | null;
        error: { code: string; message: string } | null;
      }) => unknown,
    ) => Promise.resolve({ count, error }).then(resolve),
  };
  query.select.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lt.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

it("derives explainable AI workspace attention from owner-scoped persisted data", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-27T09:00:00.000Z"));
  const todayMeetings = countQuery(2);
  const completedIntelligence = countQuery(4);
  const openTasks = countQuery(3);
  const intelligenceRows = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({
      data: [
        {
          id: "intelligence-1",
          meeting_id: "meeting-1",
          status: "completed",
          updated_at: "2026-07-27T08:00:00.000Z",
          result: {
            provider: "mock",
            modelIdentifier: "mock-v1",
            promptVersion: "v1",
            summary: { content: "摘要" },
            keyPoints: [],
            actionItems: [],
            decisions: [{ content: "本周发布", sourceSegmentIndex: null }],
            risks: ["上线前需完成验收"],
            outputMetadata: {},
          },
        },
      ],
      error: null,
    }),
  };
  intelligenceRows.select.mockReturnValue(intelligenceRows);
  intelligenceRows.order.mockReturnValue(intelligenceRows);
  const meetingRows = {
    select: vi.fn(),
    in: vi.fn().mockResolvedValue({
      data: [{ id: "meeting-1", title: "产品周会" }],
      error: null,
    }),
  };
  meetingRows.select.mockReturnValue(meetingRows);
  const meetings = [todayMeetings, meetingRows];
  const intelligences = [completedIntelligence, intelligenceRows];
  const actionItems = [openTasks];
  createClientMock.mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === "meetings") return meetings.shift();
      if (table === "meeting_intelligence") return intelligences.shift();
      return actionItems.shift();
    }),
  });

  await expect(getDashboardAttention()).resolves.toEqual({
    todayMeetingCount: 2,
    completedIntelligenceCount: 4,
    openTaskCount: 3,
    riskReminders: [
      {
        meetingId: "meeting-1",
        meetingTitle: "产品周会",
        content: "上线前需完成验收",
      },
    ],
    recentDecisions: [
      {
        meetingId: "meeting-1",
        meetingTitle: "产品周会",
        content: "本周发布",
      },
    ],
    recentActivities: [
      {
        meetingId: "meeting-1",
        meetingTitle: "产品周会",
        status: "completed",
        updatedAt: "2026-07-27T08:00:00.000Z",
      },
    ],
  });
});

it("keeps Supabase query failures safe and observable", async () => {
  const error = { code: "42P01", message: "internal table name" };
  const failed = countQuery(null, error);
  createClientMock.mockResolvedValue({ from: vi.fn().mockReturnValue(failed) });

  await expect(getDashboardAttention()).rejects.toThrow(
    "Unable to load dashboard AI workspace data.",
  );
  expect(reportServerEventMock).toHaveBeenCalledWith(
    expect.objectContaining({ operation: "dashboard_meeting_query" }),
  );
});
