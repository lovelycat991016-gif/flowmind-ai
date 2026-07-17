"use server";

import { runMeetingLifecycleAction } from "./meeting-lifecycle";

export async function deleteMeetingAction(formData: FormData) {
  return runMeetingLifecycleAction(formData, "delete");
}
