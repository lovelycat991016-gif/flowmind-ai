import { AudioLines } from "lucide-react";

import { zhCN } from "@/shared/i18n/zh-CN";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(320px,0.85fr)_1.15fr]">
      <section className="hidden bg-[#18241f] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex size-10 items-center justify-center rounded-md bg-[#d7f0e5] text-[#155b42]">
            <AudioLines aria-hidden="true" className="size-5" />
          </span>
          {zhCN.brand.name}
        </div>
        <blockquote className="max-w-lg space-y-5">
          <p className="text-3xl leading-tight font-semibold">
            {zhCN.brand.statement}
          </p>
          <footer className="text-sm text-[#b9c9c1]">
            {zhCN.brand.description}
          </footer>
        </blockquote>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 text-lg font-semibold lg:hidden">
            <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-md">
              <AudioLines aria-hidden="true" className="size-5" />
            </span>
            {zhCN.brand.name}
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
