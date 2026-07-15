"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/shared/ui/button";
import { AppHeader } from "@/widgets/app-shell/ui/app-header";
import { AppSidebar } from "@/widgets/app-shell/ui/app-sidebar";

type AppShellProps = {
  children: ReactNode;
  userEmail: string;
  userActions?: ReactNode;
};

export function AppShell({ children, userActions, userEmail }: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const dialogId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const closeNavigation = () => {
    setNavigationOpen(false);
    menuButtonRef.current?.focus();
  };

  useEffect(() => {
    if (!navigationOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNavigation();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements =
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0]!;
      const lastElement = focusableElements[focusableElements.length - 1]!;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navigationOpen]);

  return (
    <div className="bg-background min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] md:block xl:w-60">
        <AppSidebar />
      </aside>

      <AppHeader
        menuButtonRef={menuButtonRef}
        onOpenNavigation={() => setNavigationOpen(true)}
        userActions={userActions}
        userEmail={userEmail}
      />

      {navigationOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/45 md:hidden"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeNavigation();
          }}
        >
          <div
            aria-label="Navigation"
            aria-modal="true"
            className="h-full w-[min(84vw,320px)] shadow-[var(--shadow-elevated)]"
            id={dialogId}
            ref={drawerRef}
            role="dialog"
          >
            <div className="relative h-full">
              <AppSidebar mobile onNavigate={closeNavigation} />
              <Button
                aria-label="Close navigation"
                className="absolute top-3 right-3 text-white hover:bg-white/10"
                onClick={closeNavigation}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <main
        className="min-h-screen pt-16 md:pl-[72px] xl:pl-60"
        id="dashboard-main"
      >
        {children}
      </main>
    </div>
  );
}
