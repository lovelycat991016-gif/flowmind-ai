import type { Metadata } from "next";
import Link from "next/link";

import { signInAction } from "@/features/auth/actions/auth-actions";
import { AuthForm } from "@/features/auth/ui/auth-form";
import { AuthPanel } from "@/features/auth/ui/auth-panel";
import { Alert } from "@/shared/ui/alert";
import { zhCN } from "@/shared/i18n/zh-CN";

export const metadata: Metadata = { title: zhCN.auth.signIn };

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthPanel
      description={zhCN.auth.loginDescription}
      footer={
        <>
          {zhCN.auth.noAccount}{" "}
          <Link
            className="text-primary font-medium hover:underline"
            href="/signup"
          >
            {zhCN.auth.createAccount}
          </Link>
        </>
      }
      title={zhCN.auth.loginTitle}
    >
      {params.error === "callback" ? (
        <Alert className="mb-5">{zhCN.auth.callbackInvalid}</Alert>
      ) : null}
      <AuthForm action={signInAction} mode="login" nextPath={params.next} />
    </AuthPanel>
  );
}
