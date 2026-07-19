import { zhCN } from "@/shared/i18n/zh-CN";

export type RecordingActionResult<T = never> =
  { status: "success"; data: T } | { status: "error"; message: string };

export const recordingUploadActionError = zhCN.recordings.uploadActionFailed;
