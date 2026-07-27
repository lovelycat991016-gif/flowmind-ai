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

import { getDashboardMeetingData } from "./get-dashboard-meetings";

afterEach(() => {
  vi.useRealTimers();
  createClientMock.mockReset();
  vi.unstubAllEnvs();
});

function countQuery(count: number) {
  const query = {
    select: vi.fn(),
    is: vi.fn(),
    not: vi.fn(),
    gte: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
    then: (resolve: (value: { count: number; error: null }) => unknown) =>
      Promise.resolve({ count, error: null }).then(resolve),
  };
  query.select.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

it("derives dashboard metrics and recent meetings from meetings queries", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-17T12:00:00.000Z"));

  const total = countQuery(12);
  const active = countQuery(8);
  const archived = countQuery(4);
  const thisWeek = countQuery(3);
  const openTasks = countQuery(5);
  const completedTasks = countQuery(2);
  const recent = {
    select: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({
      data: [
        {
          id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
          title: "Product weekly",
          meeting_date: "2026-07-17T01:30:00.000Z",
          archived_at: null,
          created_at: "2026-07-17T01:00:00.000Z",
          updated_at: "2026-07-17T01:00:00.000Z",
        },
      ],
      error: null,
    }),
  };
  recent.select.mockReturnValue(recent);
  recent.is.mockReturnValue(recent);
  recent.order.mockReturnValue(recent);

  const meetingQueries = [total, active, archived, thisWeek, recent];
  const actionItemQueries = [openTasks, completedTasks];
  const from = vi
    .fn()
    .mockImplementation((table: string) =>
      table === "meetings" ? meetingQueries.shift() : actionItemQueries.shift(),
    );
  createClientMock.mockResolvedValue({ from });

  const result = await getDashboardMeetingData();

  expect(total.select).toHaveBeenCalledWith("id", {
    count: "exact",
    head: true,
  });
  expect(active.is).toHaveBeenCalledWith("archived_at", null);
  expect(archived.not).toHaveBeenCalledWith("archived_at", "is", null);
  expect(thisWeek.gte).toHaveBeenCalledWith(
    "meeting_date",
    "2026-07-13T00:00:00.000Z",
  );
  expect(recent.limit).toHaveBeenCalledWith(4);
  expect(openTasks.in).toHaveBeenCalledWith("status", ["open", "in_progress"]);
  expect(completedTasks.eq).toHaveBeenCalledWith("status", "completed");
  expect(result.metrics).toEqual({
    total: 12,
    active: 8,
    archived: 4,
    thisWeek: 3,
    openTasks: 5,
    completedTasks: 2,
  });
  expect(result.recentMeetings[0]?.title).toBe("Product weekly");
});

it("reports a safe structured event for a failing Supabase query", async () => {
  const error = {
    code: "42P01",
    message: 'relation "meetings" does not exist',
  };
  const failed = {
    select: vi.fn().mockResolvedValue({ count: null, error }),
  };
  const query = countQuery(0);
  const recent = {
    select: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  recent.select.mockReturnValue(recent);
  recent.is.mockReturnValue(recent);
  recent.order.mockReturnValue(recent);
  createClientMock.mockResolvedValue({
    from: vi
      .fn()
      .mockReturnValueOnce(failed)
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(recent)
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(query),
  });
  await expect(getDashboardMeetingData()).rejects.toThrow(
    "Unable to load dashboard meeting data.",
  );

  expect(reportServerEventMock).toHaveBeenCalledWith(
    expect.objectContaining({
      category: "supabase",
      operation: "dashboard_meeting_query",
      outcome: "failure",
      failureCode: "supabase_query_failed",
    }),
  );
});
