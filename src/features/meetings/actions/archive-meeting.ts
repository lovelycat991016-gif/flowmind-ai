"use server";

import { runMeetingLifecycleAction } from "./meeting-lifecycle";

export async function archiveMeetingAction(formData: FormData) {
  return runMeetingLifecycleAction(formData, "archive");
}
