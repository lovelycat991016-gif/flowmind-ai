import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProcessingStatusBadge } from "./processing-status-badge";

describe("ProcessingStatusBadge", () => {
  it.each([
    ["queued", "等待AI处理"],
    ["running", "正在处理中"],
    ["completed", "处理完成"],
    ["failed", "处理失败"],
    ["cancelled", "已取消"],
  ] as const)("renders %s as %s with an accessible status", (status, label) => {
    render(<ProcessingStatusBadge status={status} />);

    expect(
      screen.getByRole("status", { name: `AI 处理状态：${label}` }),
    ).toHaveTextContent(label);
  });
});
