import { describe, expect, it } from "vitest";

import {
  actionItemStatusTransitionSchema,
  createActionItemFromIntelligenceSchema,
} from "./action-item-input";

const meetingId = "6b79f5f3-f083-4a75-b74b-41342f2b1454";
const intelligenceId = "2c15dfe2-ea8c-420e-85ad-e85901974931";

describe("action item contracts", () => {
  it("accepts a validated intelligence action-item reference", () => {
    expect(
      createActionItemFromIntelligenceSchema.safeParse({
        meetingId,
        intelligenceId,
        actionItemIndex: 0,
      }).success,
    ).toBe(true);
  });

  it("allows completion but rejects terminal task changes", () => {
    expect(
      actionItemStatusTransitionSchema.safeParse({
        from: "open",
        to: "completed",
      }).success,
    ).toBe(true);
    expect(
      actionItemStatusTransitionSchema.safeParse({
        from: "completed",
        to: "open",
      }).success,
    ).toBe(false);
  });
});
