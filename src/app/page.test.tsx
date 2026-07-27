import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import HomePage from "./page";

beforeEach(() => vi.clearAllMocks());

describe("HomePage", () => {
  it("renders the public landing page for visitors without a session", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    render(await HomePage());

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "让每场会议都有结果",
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("keeps authenticated visitors on the dashboard route", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
    });

    await HomePage();

    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });
});
