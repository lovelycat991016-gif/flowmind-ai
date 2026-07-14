import type { Metadata } from "next";
import Link from "next/link";

import { signUpAction } from "@/features/auth/actions/auth-actions";
import { AuthForm } from "@/features/auth/ui/auth-form";
import { AuthPanel } from "@/features/auth/ui/auth-panel";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthPanel
      description="Create your private FlowMind meeting workspace."
      footer={
        <>
          Already have an account?{" "}
          <Link
            className="text-primary font-medium hover:underline"
            href="/login"
          >
            Sign in
          </Link>
        </>
      }
      title="Create your account"
    >
      <AuthForm action={signUpAction} mode="signup" />
    </AuthPanel>
  );
}
