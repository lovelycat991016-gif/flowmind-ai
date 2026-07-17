import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { getMeetingById, getMeetingsPage } from "./get-meetings";

const row = {
  id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  title: "Product weekly",
  meeting_date: "2026-07-17T01:30:00.000Z",
  archived_at: null,
  created_at: "2026-07-17T01:00:00.000Z",
  updated_at: "2026-07-17T01:00:00.000Z",
};

type QueryResult = {
  data: (typeof row)[] | null;
  error: { message: string } | null;
};

function listQuery(result: QueryResult = { data: [row], error: null }) {
  const query = {
    select: vi.fn(),
    is: vi.fn(),
    not: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    range: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.ilike.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

beforeEach(() => {
  createClientMock.mockReset();
});

describe("meeting queries", () => {
  it("builds an active newest-first 21-row query", async () => {
    const query = listQuery();
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    const page = await getMeetingsPage({
      q: "",
      filter: "active",
      sort: "date-desc",
      page: 1,
    });

    expect(query.is).toHaveBeenCalledWith("archived_at", null);
    expect(query.order).toHaveBeenNthCalledWith(1, "meeting_date", {
      ascending: false,
    });
    expect(query.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(query.range).toHaveBeenCalledWith(0, 20);
    expect(page.meetings[0]).toMatchObject({
      title: "Product weekly",
      archivedAt: null,
    });
  });

  it("builds an archived title search and escapes wildcard characters", async () => {
    const query = listQuery();
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await getMeetingsPage({
      q: "50%_plan",
      filter: "archived",
      sort: "title-asc",
      page: 2,
    });

    expect(query.not).toHaveBeenCalledWith("archived_at", "is", null);
    expect(query.ilike).toHaveBeenCalledWith("title", "%50\\%\\_plan%");
    expect(query.order).toHaveBeenNthCalledWith(1, "title", {
      ascending: true,
    });
    expect(query.range).toHaveBeenCalledWith(20, 40);
  });

  it("returns null for missing or owner-hidden detail rows", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle,
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(getMeetingById(row.id)).resolves.toBeNull();
    expect(query.eq).toHaveBeenCalledWith("id", row.id);
  });

  it("throws a safe error when Supabase rejects a query", async () => {
    const query = listQuery({
      data: null,
      error: { message: "database details" },
    });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(
      getMeetingsPage({ q: "", filter: "active", sort: "date-desc", page: 1 }),
    ).rejects.toThrow("Unable to load meetings.");
  });
});
