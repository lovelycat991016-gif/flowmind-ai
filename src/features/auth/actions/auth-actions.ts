"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";

import { mapAuthError } from "@/features/auth/model/auth-errors";
import { getSafeInternalPath } from "@/features/auth/model/auth-routes";
import {
  emailOtpRequestSchema,
  emailOtpVerificationSchema,
  forgotPasswordSchema,
  loginSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/features/auth/model/auth-schema";
import type { AuthFormState } from "@/features/auth/model/auth-state";
import { getPublicEnv } from "@/shared/config/env";
import { zhCN } from "@/shared/i18n/zh-CN";
import { createClient } from "@/shared/lib/supabase/server";

function firstIssueMessage(error: {
  issues: ReadonlyArray<{ message: string }>;
}) {
  return error.issues[0]?.message ?? zhCN.auth.formFallback;
}

export async function requestSignupEmailVerificationAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = signUpSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { status: "error", message: firstIssueMessage(result.error) };
  }

  const supabase = await createClient();
  const { appUrl } = getPublicEnv();
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { status: "error", message: mapAuthError(error.message) };
  }

  if (data.session) {
    await supabase.auth.signOut();
    return { status: "error", message: zhCN.auth.authFailed };
  }

  const nextPath = formData.get("next");
  const destination = getSafeInternalPath(
    typeof nextPath === "string" ? nextPath : null,
  );
  redirect(
    `/signup/verify?email=${encodeURIComponent(result.data.email)}&next=${encodeURIComponent(destination)}` as Route,
  );
}

export async function verifySignupEmailOtpAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = emailOtpVerificationSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!result.success) {
    return { status: "error", message: firstIssueMessage(result.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: result.data.email,
    token: result.data.token,
    type: "signup",
  });

  if (error) {
    return { status: "error", message: mapAuthError(error.message) };
  }

  const nextPath = formData.get("next");
  redirect(getSafeInternalPath(typeof nextPath === "string" ? nextPath : null));
}

export async function resendSignupEmailVerificationAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = emailOtpRequestSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { status: "error", message: firstIssueMessage(result.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: result.data.email,
  });

  if (error) {
    return { status: "error", message: mapAuthError(error.message) };
  }

  return { status: "success", message: zhCN.auth.otpCodeSent };
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
    message: zhCN.auth.resetLinkSent,
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

  return { status: "success", message: zhCN.auth.passwordUpdated };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
