"use server";

import { redirect } from "next/navigation";

import { mapAuthError } from "@/features/auth/model/auth-errors";
import { getSafeInternalPath } from "@/features/auth/model/auth-routes";
import {
  forgotPasswordSchema,
  loginSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/features/auth/model/auth-schema";
import type { AuthFormState } from "@/features/auth/model/auth-state";
import { getPublicEnv } from "@/shared/config/env";
import { createClient } from "@/shared/lib/supabase/server";

function firstIssueMessage(error: {
  issues: ReadonlyArray<{ message: string }>;
}) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export async function signInAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = loginSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { status: "error", message: firstIssueMessage(result.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    return { status: "error", message: mapAuthError(error.message) };
  }

  const nextPath = formData.get("next");
  redirect(getSafeInternalPath(typeof nextPath === "string" ? nextPath : null));
}

export async function signUpAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = signUpSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { status: "error", message: firstIssueMessage(result.error) };
  }

  const { appUrl } = getPublicEnv();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: { emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard` },
  });

  if (error) {
    return { status: "error", message: mapAuthError(error.message) };
  }

  if (data.user && data.user.identities?.length === 0) {
    return {
      status: "error",
      message: "An account already exists for this email.",
    };
  }

  return {
    status: "success",
    message: "Check your email to confirm your account.",
  };
}

export async function requestPasswordResetAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = forgotPasswordSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { status: "error", message: firstIssueMessage(result.error) };
  }

  const { appUrl } = getPublicEnv();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    result.data.email,
    {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    },
  );

  if (error) {
    return { status: "error", message: mapAuthError(error.message) };
  }

  return {
    status: "success",
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = updatePasswordSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { status: "error", message: firstIssueMessage(result.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  });

  if (error) {
    return { status: "error", message: mapAuthError(error.message) };
  }

  return { status: "success", message: "Your password has been updated." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
