"use server";

import { runMeetingLifecycleAction } from "./meeting-lifecycle";

export async function restoreMeetingAction(formData: FormData) {
  return runMeetingLifecycleAction(formData, "restore");
}
