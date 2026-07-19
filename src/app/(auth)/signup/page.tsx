import type { Metadata } from "next";
import Link from "next/link";

import { signUpAction } from "@/features/auth/actions/auth-actions";
import { AuthForm } from "@/features/auth/ui/auth-form";
import { AuthPanel } from "@/features/auth/ui/auth-panel";
import { zhCN } from "@/shared/i18n/zh-CN";

export const metadata: Metadata = { title: zhCN.auth.createAccount };

export default function SignUpPage() {
  return (
    <AuthPanel
      description={zhCN.auth.signUpDescription}
      footer={
        <>
          {zhCN.auth.hasAccount}{" "}
          <Link
            className="text-primary font-medium hover:underline"
            href="/login"
          >
            {zhCN.auth.signIn}
          </Link>
        </>
      }
      title={zhCN.auth.signUpTitle}
    >
      <AuthForm action={signUpAction} mode="signup" />
    </AuthPanel>
  );
}
