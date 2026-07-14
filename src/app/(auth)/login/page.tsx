import type { Metadata } from "next";
import Link from "next/link";

import { signInAction } from "@/features/auth/actions/auth-actions";
import { AuthForm } from "@/features/auth/ui/auth-form";
import { AuthPanel } from "@/features/auth/ui/auth-panel";
import { Alert } from "@/shared/ui/alert";

export const metadata: Metadata = { title: "Sign in" };

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthPanel
      description="Use your work email to access your meeting workspace."
      footer={
        <>
          New to FlowMind?{" "}
          <Link
            className="text-primary font-medium hover:underline"
            href="/signup"
          >
            Create an account
          </Link>
        </>
      }
      title="Welcome back"
    >
      {params.error === "callback" ? (
        <Alert className="mb-5">
          The sign-in link is invalid or expired. Request a new one.
        </Alert>
      ) : null}
      <AuthForm action={signInAction} mode="login" nextPath={params.next} />
    </AuthPanel>
  );
}
