import type { Metadata } from "next";

import { updatePasswordAction } from "@/features/auth/actions/auth-actions";
import { AuthForm } from "@/features/auth/ui/auth-form";
import { AuthPanel } from "@/features/auth/ui/auth-panel";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthPanel
      description="Use at least eight characters for your new password."
      title="Choose a new password"
    >
      <AuthForm action={updatePasswordAction} mode="reset-password" />
    </AuthPanel>
  );
}
