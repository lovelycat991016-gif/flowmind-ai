import { describe, expect, it } from "vitest";
import { isActiveMeetingKnowledgeJobStatus } from "./meeting-knowledge";

describe("meeting knowledge job model", () => {
  it("identifies only queued and processing jobs as active", () => {
    expect(isActiveMeetingKnowledgeJobStatus("queued")).toBe(true);
    expect(isActiveMeetingKnowledgeJobStatus("processing")).toBe(true);
    expect(isActiveMeetingKnowledgeJobStatus("completed")).toBe(false);
    expect(isActiveMeetingKnowledgeJobStatus("failed")).toBe(false);
  });
});
