import {
  Activity,
  ArrowRight,
  AudioLines,
  BotMessageSquare,
  BrainCircuit,
  CheckSquare2,
  CircleCheckBig,
  Database,
  FileText,
  FileSearch,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
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

const valueIcons = [BrainCircuit, CircleCheckBig, FileSearch];
const architectureIcons = [Activity, Database, ShieldCheck];

function ProductPreview() {
  const demo = zhCN.landing.demo;

  return (
    <div className="bg-card overflow-hidden rounded-lg border shadow-[var(--shadow-elevated)]">
      <div className="flex items-center justify-between border-b px-4 py-3 text-xs">
        <span className="font-semibold">{demo.meetingTitle}</span>
        <span className="text-primary inline-flex items-center gap-1 font-medium">
          <Sparkles aria-hidden="true" className="size-3.5" /> AI 已整理
        </span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-muted/60 rounded-md p-4">
          <p className="text-muted-foreground text-xs font-medium">会议摘要</p>
          <p className="mt-2 text-sm leading-6">{demo.intelligence.summary}</p>
          <p className="text-primary mt-4 text-xs font-semibold">{demo.sourcesLabel} · 3</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-muted-foreground text-xs font-medium">{demo.copilot.title}</p>
          <p className="bg-accent text-accent-foreground mt-3 rounded-md px-3 py-2 text-xs leading-5">
            {demo.copilot.question}
          </p>
          <p className="text-muted-foreground mt-3 text-xs leading-5">{demo.copilot.answer}</p>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { architecture, capabilitiesDescription, capabilitiesTitle, demo, value, workflow } =
    zhCN.landing;

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

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-12 pb-20 sm:px-6 sm:pt-20 sm:pb-28 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:items-center lg:px-8">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold">{zhCN.landing.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            {zhCN.landing.heroTitle}
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-8">
            {zhCN.landing.heroDescription}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className={buttonVariants({ size: "lg" })} href="#demo-case">
              {zhCN.landing.viewDemo}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              className={buttonVariants({ size: "lg", variant: "outline" })}
              href="/signup"
            >
              {zhCN.landing.start}
            </Link>
          </div>
        </div>
        <ProductPreview />
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-primary text-sm font-semibold">产品价值</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {zhCN.landing.valueTitle}
            </h2>
            <p className="text-muted-foreground mt-4 leading-7">{zhCN.landing.valueDescription}</p>
          </div>
          <ul className="mt-10 grid gap-7 md:grid-cols-3">
            {value.map((item, index) => {
              const Icon = valueIcons[index];
              return (
                <li className="border-t pt-5" key={item.title}>
                  <Icon aria-hidden="true" className="text-primary size-5" />
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">{item.description}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold">AI Workflow</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {zhCN.landing.workflowTitle}
          </h2>
        </div>
        <ol aria-label={zhCN.landing.workflowTitle} className="mt-10 grid gap-7 md:grid-cols-3">
          {workflow.map((step, index) => (
            <li className="border-l-2 border-primary pl-5" key={step.title}>
              <p className="text-primary text-sm font-semibold">{`0${index + 1}`}</p>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-muted/50 border-y" id="demo-case">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div className="lg:sticky lg:top-8">
              <p className="text-primary text-sm font-semibold">{demo.eyebrow}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{demo.title}</h2>
              <p className="text-muted-foreground mt-4 leading-7">{demo.description}</p>
              <nav aria-label={demo.navigationLabel} className="mt-8 grid gap-2">
                {demo.navigation.map((item, index) => (
                  <Link
                    aria-label={item.title}
                    className="hover:bg-card flex items-center justify-between border-b py-3 text-sm font-semibold"
                    href={item.href}
                    key={item.href}
                  >
                    <span>{`${index + 1}. ${item.title}`}</span>
                    <ArrowRight aria-hidden="true" className="text-primary size-4" />
                  </Link>
                ))}
              </nav>
            </div>

            <div className="grid gap-5">
              <article className="bg-card rounded-lg border p-5 sm:p-7" id="demo-intelligence">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-muted-foreground text-sm">{demo.meetingDate}</p>
                    <h3 className="mt-1 text-xl font-semibold">{demo.meetingTitle}</h3>
                  </div>
                  <span className="bg-success-muted text-success rounded-full px-3 py-1 text-xs font-semibold">已完成分析</span>
                </div>
                <div className="mt-6 border-l-2 border-primary pl-4">
                  <h4 className="font-semibold">{demo.intelligence.title}</h4>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">{demo.intelligence.summary}</p>
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold">关键决策</h4>
                    <ul className="text-muted-foreground mt-3 grid gap-2 text-sm leading-6">
                      {demo.intelligence.decisions.map((decision) => (
                        <li className="flex gap-2" key={decision}>
                          <CircleCheckBig aria-hidden="true" className="text-primary mt-0.5 size-4 shrink-0" />
                          {decision}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">行动项</h4>
                    <ul className="text-muted-foreground mt-3 grid gap-2 text-sm leading-6">
                      {demo.intelligence.actionItems.map((actionItem) => (
                        <li className="flex gap-2" key={actionItem}>
                          <CheckSquare2 aria-hidden="true" className="text-primary mt-0.5 size-4 shrink-0" />
                          {actionItem}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="bg-warning-muted text-warning mt-6 flex gap-2 rounded-md px-4 py-3 text-sm leading-6">
                  <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {demo.intelligence.risk}
                </p>
              </article>

              <article className="bg-card rounded-lg border p-5 sm:p-7" id="demo-copilot">
                <div className="flex items-center gap-2">
                  <BotMessageSquare aria-hidden="true" className="text-primary size-5" />
                  <h3 className="text-xl font-semibold">{demo.copilot.title}</h3>
                </div>
                <p className="bg-muted mt-5 ml-auto max-w-md rounded-md px-4 py-3 text-sm leading-6">
                  {demo.copilot.question}
                </p>
                <p className="bg-accent text-accent-foreground mt-3 max-w-md rounded-md px-4 py-3 text-sm leading-6">
                  {demo.copilot.answer}
                </p>
              </article>

              <article className="bg-card rounded-lg border p-5 sm:p-7" id="demo-sources">
                <div className="flex items-center gap-2">
                  <FileSearch aria-hidden="true" className="text-primary size-5" />
                  <h3 className="text-xl font-semibold">{demo.sourcesLabel}</h3>
                </div>
                <ul aria-label={demo.sourcesLabel} className="mt-5 divide-y border-y">
                  {demo.sources.map((source) => (
                    <li className="py-4" key={source.title}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold">{source.title}</p>
                        <p className="text-muted-foreground text-xs">{source.date}</p>
                      </div>
                      <p className="text-muted-foreground mt-2 text-sm leading-6">{source.excerpt}</p>
                    </li>
                  ))}
                </ul>
              </article>

              <aside aria-label={demo.fallback.title} className="border-l-2 border-muted-foreground/40 px-4 py-2">
                <p className="font-semibold">{demo.fallback.title}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">{demo.fallback.description}</p>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold">核心能力</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {capabilitiesTitle}
          </h2>
          <p className="text-muted-foreground mt-4 leading-7">{capabilitiesDescription}</p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => {
            const Icon = capability.icon;

            return (
              <li className="rounded-lg border p-5" key={capability.title}>
                <Icon aria-hidden="true" className="text-primary size-5" />
                <h3 className="mt-4 font-semibold">{capability.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {capability.description}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold">{architecture.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{architecture.title}</h2>
          <p className="text-muted-foreground mt-4 leading-7">{architecture.description}</p>
        </div>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {architecture.layers.map((layer, index) => {
            const Icon = architectureIcons[index];
            return (
              <li className="border-t pt-5" key={layer.title}>
                <Icon aria-hidden="true" className="text-primary size-5" />
                <h3 className="mt-4 text-lg font-semibold">{layer.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">{layer.description}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">{zhCN.landing.ctaTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 opacity-90">{zhCN.landing.ctaDescription}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="bg-background text-foreground inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-semibold" href="#demo-case">
              {zhCN.landing.viewDemo}
            </Link>
            <Link className="border-primary-foreground/50 inline-flex h-11 items-center justify-center rounded-md border px-5 text-sm font-semibold" href="/signup">
              {zhCN.landing.start}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
