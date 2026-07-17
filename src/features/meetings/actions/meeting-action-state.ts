export type MeetingActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Partial<Record<"title" | "meetingDateLocal", string>>;
  values: { title: string; meetingDateLocal: string };
};

export const INITIAL_MEETING_ACTION_STATE: MeetingActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  values: { title: "", meetingDateLocal: "" },
};

export function firstFieldErrors(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
) {
  const fieldErrors: MeetingActionState["fieldErrors"] = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (
      (field === "title" || field === "meetingDateLocal") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}
