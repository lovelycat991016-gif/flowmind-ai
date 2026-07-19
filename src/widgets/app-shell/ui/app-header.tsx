"use client";

import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/ui/button";
import { zhCN } from "@/shared/i18n/zh-CN";

type AppHeaderProps = {
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenNavigation: () => void;
  userEmail: string;
  userActions?: ReactNode;
};

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export function AppHeader({
  menuButtonRef,
  onOpenNavigation,
  userActions,
  userEmail,
}: AppHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node))
        setUserMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserMenuOpen(false);
    };

    window.addEventListener("pointerdown", closeOnOutsidePress);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePress);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [userMenuOpen]);

  return (
    <header className="bg-card/95 fixed inset-x-0 top-0 z-30 h-16 border-b backdrop-blur md:left-[72px] xl:left-60">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          aria-label={zhCN.navigation.openNavigation}
          className="md:hidden"
          onClick={onOpenNavigation}
          ref={menuButtonRef}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>

        <div className="hidden min-w-0 sm:block">
          <p className="text-muted-foreground text-xs">
            {zhCN.navigation.workspace}
          </p>
          <p className="truncate text-sm font-semibold">
            {zhCN.navigation.dashboard}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <label className="relative hidden sm:block">
            <span className="sr-only">{zhCN.meetings.search}</span>
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <input
              aria-label={zhCN.meetings.search}
              className="border-input bg-background text-muted-foreground h-10 w-48 cursor-not-allowed rounded-md border pr-3 pl-9 text-sm lg:w-64"
              disabled
              placeholder={zhCN.meetings.search}
              type="search"
            />
          </label>

          <Button
            aria-label={zhCN.navigation.notifications}
            className="text-muted-foreground"
            disabled
            size="icon"
            title={zhCN.navigation.notificationsUnavailable}
            type="button"
            variant="ghost"
          >
            <Bell aria-hidden="true" className="size-5" />
          </Button>

          <div className="relative" id="dashboard-settings" ref={userMenuRef}>
            <button
              aria-label={zhCN.navigation.userMenu}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              className="hover:bg-muted flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-1.5 transition-colors focus-visible:outline-2"
              onClick={() => setUserMenuOpen((open) => !open)}
              type="button"
            >
              <span className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-md text-xs font-semibold">
                {getInitials(userEmail)}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`text-muted-foreground hidden size-4 transition-transform sm:block ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {userMenuOpen ? (
              <div
                aria-label={zhCN.navigation.userMenu}
                className="bg-card absolute top-12 right-0 w-64 rounded-lg border p-2 shadow-[var(--shadow-elevated)]"
                role="menu"
              >
                <div className="border-b px-3 py-2.5">
                  <p className="text-xs font-medium">
                    {zhCN.navigation.signedInAs}
                  </p>
                  <p className="text-muted-foreground mt-1 truncate text-sm">
                    {userEmail}
                  </p>
                </div>
                {userActions ? <div className="pt-2">{userActions}</div> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
