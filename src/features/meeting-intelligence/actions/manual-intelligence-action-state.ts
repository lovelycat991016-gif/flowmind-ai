export type ManualIntelligenceActionState = {
  status: "idle" | "error" | "success";
  message: string;
  value: string;
};

export const INITIAL_MANUAL_INTELLIGENCE_ACTION_STATE: ManualIntelligenceActionState =
  {
    status: "idle",
    message: "",
    value: "",
  };
