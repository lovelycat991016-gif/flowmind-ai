export type AuthFormState = {
  status: "idle" | "error" | "success";
  message: string;
};

export type AuthFormAction = (
  previousState: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

export const INITIAL_AUTH_FORM_STATE: AuthFormState = {
  status: "idle",
  message: "",
};
