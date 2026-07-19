"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  INITIAL_AUTH_FORM_STATE,
  type AuthFormAction,
} from "@/features/auth/model/auth-state";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { zhCN } from "@/shared/i18n/zh-CN";

type AuthMode = "login" | "signup" | "forgot-password" | "reset-password";

type AuthFormProps = {
  action: AuthFormAction;
  mode: AuthMode;
  nextPath?: string;
};

const submitLabels: Record<AuthMode, string> = {
  login: zhCN.auth.signIn,
  signup: zhCN.auth.createAccount,
  "forgot-password": zhCN.auth.sendReset,
  "reset-password": zhCN.auth.updatePassword,
};

function SubmitButton({ mode }: { mode: AuthMode }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} size="lg" type="submit">
      {pending ? zhCN.auth.waiting : submitLabels[mode]}
    </Button>
  );
}

export function AuthForm({ action, mode, nextPath }: AuthFormProps) {
  const [state, formAction] = useActionState(action, INITIAL_AUTH_FORM_STATE);
  const asksForEmail = mode !== "reset-password";
  const asksForPassword = mode !== "forgot-password";
  const asksForConfirmation = mode === "signup" || mode === "reset-password";

  return (
    <form action={formAction} className="space-y-5">
      {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}

      {state.message ? (
        <Alert variant={state.status === "success" ? "success" : "error"}>
          {state.message}
        </Alert>
      ) : null}

      {asksForEmail ? (
        <div className="space-y-2">
          <Label htmlFor="email">{zhCN.auth.email}</Label>
          <Input
            autoComplete="email"
            id="email"
            name="email"
            placeholder={zhCN.auth.emailPlaceholder}
            required
            type="email"
          />
        </div>
      ) : null}

      {asksForPassword ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="password">
              {mode === "reset-password"
                ? zhCN.auth.newPassword
                : zhCN.auth.password}
            </Label>
            {mode === "login" ? (
              <Link
                className="text-primary text-sm font-medium hover:underline"
                href="/forgot-password"
              >
                {zhCN.auth.forgotPassword}
              </Link>
            ) : null}
          </div>
          <Input
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            id="password"
            minLength={mode === "login" ? undefined : 8}
            name="password"
            required
            type="password"
          />
        </div>
      ) : null}

      {asksForConfirmation ? (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{zhCN.auth.confirmPassword}</Label>
          <Input
            autoComplete="new-password"
            id="confirmPassword"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
        </div>
      ) : null}

      <SubmitButton mode={mode} />
    </form>
  );
}
