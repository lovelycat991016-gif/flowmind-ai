"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  INITIAL_AUTH_FORM_STATE,
  type AuthFormAction,
} from "@/features/auth/model/auth-state";
import { zhCN } from "@/shared/i18n/zh-CN";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type Props = {
  email: string;
  nextPath?: string;
  resendAction: AuthFormAction;
  verifyAction: AuthFormAction;
};

function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" disabled={pending} size="lg" type="submit">
      {pending ? zhCN.auth.waiting : children}
    </Button>
  );
}

export function SignupOtpVerificationForm({
  email,
  nextPath,
  resendAction,
  verifyAction,
}: Props) {
  const [verifyState, verifyFormAction] = useActionState(
    verifyAction,
    INITIAL_AUTH_FORM_STATE,
  );
  const [resendState, resendFormAction] = useActionState(
    resendAction,
    INITIAL_AUTH_FORM_STATE,
  );
  const state = verifyState.status !== "idle" ? verifyState : resendState;

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm">{email}</p>
      {state.message ? (
        <Alert variant={state.status === "success" ? "success" : "error"}>
          {state.message}
        </Alert>
      ) : null}
      <form action={verifyFormAction} className="space-y-5">
        <input name="email" type="hidden" value={email} />
        {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
        <div className="space-y-2">
          <Label htmlFor="token">{zhCN.auth.otpCode}</Label>
          <Input
            autoComplete="one-time-code"
            id="token"
            inputMode="numeric"
            maxLength={6}
            name="token"
            pattern="[0-9]{6}"
            required
          />
        </div>
        <SubmitButton>{zhCN.auth.verifyEmail}</SubmitButton>
      </form>
      <form action={resendFormAction}>
        <input name="email" type="hidden" value={email} />
        <Button type="submit" variant="outline">
          {zhCN.auth.resendVerificationCode}
        </Button>
      </form>
    </div>
  );
}
