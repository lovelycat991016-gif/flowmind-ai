import type { Metadata } from "next";
import Link from "next/link";

import { requestPasswordResetAction } from "@/features/auth/actions/auth-actions";
import { AuthForm } from "@/features/auth/ui/auth-form";
import { AuthPanel } from "@/features/auth/ui/auth-panel";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthPanel
      description="Enter your email and we will send a secure password reset link."
      footer={
        <Link
          className="text-primary font-medium hover:underline"
          href="/login"
        >
          Return to sign in
        </Link>
      }
      title="Reset your password"
    >
      <AuthForm action={requestPasswordResetAction} mode="forgot-password" />
    </AuthPanel>
  );
}
