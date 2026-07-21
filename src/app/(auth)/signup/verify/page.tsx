import type { Metadata } from "next";

import {
  resendSignupEmailVerificationAction,
  verifySignupEmailOtpAction,
} from "@/features/auth/actions/auth-actions";
import { getSafeInternalPath } from "@/features/auth/model/auth-routes";
import { SignupOtpVerificationForm } from "@/features/auth/ui/signup-otp-verification-form";
import { AuthPanel } from "@/features/auth/ui/auth-panel";
import { zhCN } from "@/shared/i18n/zh-CN";

export const metadata: Metadata = { title: zhCN.auth.verifyEmail };

export default async function SignUpVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email = "", next } = await searchParams;
  return (
    <AuthPanel
      description={zhCN.auth.verifyEmailDescription}
      title={zhCN.auth.verifyEmail}
    >
      <SignupOtpVerificationForm
        email={email}
        nextPath={getSafeInternalPath(next)}
        resendAction={resendSignupEmailVerificationAction}
        verifyAction={verifySignupEmailOtpAction}
      />
    </AuthPanel>
  );
}
