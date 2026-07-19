import type { Metadata } from "next";

import { updatePasswordAction } from "@/features/auth/actions/auth-actions";
import { AuthForm } from "@/features/auth/ui/auth-form";
import { AuthPanel } from "@/features/auth/ui/auth-panel";
import { zhCN } from "@/shared/i18n/zh-CN";

export const metadata: Metadata = { title: zhCN.auth.resetTitle };

export default function ResetPasswordPage() {
  return (
    <AuthPanel
      description={zhCN.auth.resetDescription}
      title={zhCN.auth.resetTitle}
    >
      <AuthForm action={updatePasswordAction} mode="reset-password" />
    </AuthPanel>
  );
}
