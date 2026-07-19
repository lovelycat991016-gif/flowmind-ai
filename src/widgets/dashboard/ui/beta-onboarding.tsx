import { AudioLines, CalendarPlus, FileText, Sparkles } from "lucide-react";
import Link from "next/link";

import { zhCN } from "@/shared/i18n/zh-CN";
import { buttonVariants } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

const onboardingSteps = [
  {
    icon: CalendarPlus,
    title: zhCN.dashboard.betaOnboardingStepCreateTitle,
    description: zhCN.dashboard.betaOnboardingStepCreateDescription,
  },
  {
    icon: AudioLines,
    title: zhCN.dashboard.betaOnboardingStepUploadTitle,
    description: zhCN.dashboard.betaOnboardingStepUploadDescription,
  },
  {
    icon: Sparkles,
    title: zhCN.dashboard.betaOnboardingStepProcessTitle,
    description: zhCN.dashboard.betaOnboardingStepProcessDescription,
  },
  {
    icon: FileText,
    title: zhCN.dashboard.betaOnboardingStepReviewTitle,
    description: zhCN.dashboard.betaOnboardingStepReviewDescription,
  },
];

export function BetaOnboarding() {
  return (
    <section aria-labelledby="beta-onboarding-title">
      <Card>
        <CardHeader>
          <CardTitle as="h2" id="beta-onboarding-title">
            {zhCN.dashboard.betaOnboardingTitle}
          </CardTitle>
          <CardDescription>
            {zhCN.dashboard.betaOnboardingDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <ol
            aria-label={zhCN.dashboard.betaOnboardingSteps}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {onboardingSteps.map(({ icon: Icon, title, description }) => (
              <li
                className="bg-muted/40 flex min-h-36 flex-col rounded-md p-4"
                key={title}
              >
                <Icon aria-hidden="true" className="text-primary size-4" />
                <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {description}
                </p>
              </li>
            ))}
          </ol>
          <Link className={buttonVariants()} href="/meetings/new">
            <CalendarPlus aria-hidden="true" className="size-4" />
            {zhCN.dashboard.betaOnboardingCreate}
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
