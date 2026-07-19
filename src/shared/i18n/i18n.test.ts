import { describe, expect, it } from "vitest";

import { t, zhCN } from "./zh-CN";

describe("Chinese localization", () => {
  it("uses Simplified Chinese as the default typed resource", () => {
    expect(t("navigation", "dashboard")).toBe("工作台");
    expect(t("meetings", "create")).toBe("新建会议");
    expect(t("common", "delete")).toBe("删除");
    expect(
      Object.values(zhCN).flatMap((value) => Object.values(value)),
    ).not.toContain("");
  });

  it("includes keys for every authenticated and authentication surface", () => {
    expect(zhCN.dashboard).toHaveProperty("quickActions");
    expect(zhCN.dashboard).toHaveProperty("welcomeDescription");
    expect(zhCN.meetings).toHaveProperty("manageHistory");
    expect(zhCN).toHaveProperty("intelligence");
    expect(zhCN.auth).toHaveProperty("loginDescription");
    expect(zhCN.auth).toHaveProperty("accountConfirmationSent");
  });
});
