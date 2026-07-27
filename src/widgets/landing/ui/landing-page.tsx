import {
  AudioLines,
  BotMessageSquare,
  CheckSquare2,
  FileText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { zhCN } from "@/shared/i18n/zh-CN";
import { buttonVariants } from "@/shared/ui/button";

const capabilities = [
  { icon: BotMessageSquare, ...zhCN.landing.capabilities.assistant },
  { icon: AudioLines, ...zhCN.landing.capabilities.transcription },
  { icon: FileText, ...zhCN.landing.capabilities.summary },
  { icon: CheckSquare2, ...zhCN.landing.capabilities.actionItems },
  { icon: Sparkles, ...zhCN.landing.capabilities.copilot },
];

export function LandingPage() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link className="text-lg font-semibold tracking-tight" href="/">
          {zhCN.brand.name}
        </Link>
        <Link className={buttonVariants({ variant: "ghost" })} href="/login">
          {zhCN.auth.signIn}
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-primary text-sm font-semibold">
            {zhCN.landing.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            {zhCN.landing.heroTitle}
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8">
            {zhCN.landing.heroDescription}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className={buttonVariants({ size: "lg" })} href="/signup">
              {zhCN.landing.start}
            </Link>
            <Link
              className={buttonVariants({ size: "lg", variant: "outline" })}
              href="/login"
            >
              {zhCN.landing.signIn}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 border-y">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {zhCN.landing.capabilitiesTitle}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
            {zhCN.landing.capabilitiesDescription}
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <li
                  className="bg-card rounded-lg border p-5"
                  key={capability.title}
                >
                  <Icon aria-hidden="true" className="text-primary size-5" />
                  <h3 className="mt-4 font-semibold">{capability.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {capability.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {zhCN.landing.workflowTitle}
        </h2>
        <ol
          aria-label={zhCN.landing.workflowTitle}
          className="mt-8 grid gap-6 md:grid-cols-3"
        >
          {zhCN.landing.workflow.map((step, index) => (
            <li className="border-primary border-l-2 pl-4" key={step.title}>
              <p className="text-primary text-sm font-semibold">{`0${index + 1}`}</p>
              <h3 className="mt-2 font-semibold">{step.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            {zhCN.landing.ctaTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 opacity-90">
            {zhCN.landing.ctaDescription}
          </p>
          <Link
            className="bg-background text-foreground mt-6 inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-semibold"
            href="/signup"
          >
            {zhCN.landing.start}
          </Link>
        </div>
      </section>
    </main>
  );
}
