import { describe, expect, it } from "vitest";

import { getProcessingFailurePresentation } from "./processing-failure-presentation";

describe("getProcessingFailurePresentation", () => {
  it.each([
    [
      "audio_format_mismatch",
      "录音格式不一致",
      "文件内容与文件名或声明的音频类型不一致，请检查原始文件。",
    ],
    [
      "audio_format_unsupported",
      "暂不支持此音频格式",
      "该录音的实际音频格式暂不受支持。",
    ],
    [
      "audio_format_unrecognized",
      "无法识别录音格式",
      "无法从文件内容识别有效的音频格式，请检查文件是否完整。",
    ],
  ] as const)(
    "presents %s without exposing the failure code",
    (code, title, description) => {
      const presentation = getProcessingFailurePresentation(code);

      expect(presentation).toEqual({ title, description });
      expect(`${presentation.title}${presentation.description}`).not.toContain(
        code,
      );
    },
  );

  it.each([
    ["provider_timeout", "转录服务暂时不可用", "转录服务暂时无法完成处理。"],
    [
      "storage_unavailable",
      "无法读取录音文件",
      "系统暂时无法读取已上传的录音文件。",
    ],
    [
      "lease_expired",
      "转录处理失败",
      "系统未能完成录音转录，请稍后联系管理员。",
    ],
    [
      "worker_unexpected_error",
      "转录处理失败",
      "系统未能完成录音转录，请稍后联系管理员。",
    ],
  ] as const)("uses a safe presentation for %s", (code, title, description) => {
    expect(getProcessingFailurePresentation(code)).toEqual({
      title,
      description,
    });
  });

  it.each([null, "future_internal_failure"])(
    "uses the generic fallback for %s",
    (code) => {
      const presentation = getProcessingFailurePresentation(code);

      expect(presentation).toEqual({
        title: "转录处理失败",
        description: "系统未能完成录音转录，请稍后联系管理员。",
      });
      if (code) {
        expect(
          `${presentation.title}${presentation.description}`,
        ).not.toContain(code);
      }
    },
  );
});
