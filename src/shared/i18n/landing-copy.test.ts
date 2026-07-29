import { describe, expect, it } from "vitest";

import { zhCN } from "./zh-CN";

describe("landing copy resource", () => {
  it("contains the complete Chinese public-product message set", () => {
    expect(zhCN.landing.heroTitle).toBe(
      "让会议从记录工具变成可持续利用的知识资产。",
    );
    expect(zhCN.landing.start).toBe("免费开始使用");
    expect(zhCN.landing.workflow).toHaveLength(3);
    expect(Object.values(zhCN.landing.capabilities)).toHaveLength(5);
    expect(zhCN.landing.capabilities.copilot.title).toBe("会议 Copilot");
  });
});
