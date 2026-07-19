import type { Metadata } from "next";
import Link from "next/link";

import { requestPasswordResetAction } from "@/features/auth/actions/auth-actions";
import { AuthForm } from "@/features/auth/ui/auth-form";
import { AuthPanel } from "@/features/auth/ui/auth-panel";
import { zhCN } from "@/shared/i18n/zh-CN";

export const metadata: Metadata = { title: zhCN.auth.forgotTitle };

export default function ForgotPasswordPage() {
  return (
    <AuthPanel
      description={zhCN.auth.forgotDescription}
      footer={
        <Link
          className="text-primary font-medium hover:underline"
          href="/login"
        >
          {zhCN.auth.returnLogin}
        </Link>
      }
      title={zhCN.auth.forgotTitle}
    >
      <AuthForm action={requestPasswordResetAction} mode="forgot-password" />
    </AuthPanel>
  );
}
