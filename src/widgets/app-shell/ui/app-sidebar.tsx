import { AudioLines } from "lucide-react";
import { usePathname } from "next/navigation";

import { primaryNavigation } from "@/widgets/app-shell/model/navigation";

type AppSidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4 xl:px-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#d7f0e5] text-[#155b42]">
          <AudioLines aria-hidden="true" className="size-5" />
        </span>
        <span
          className={
            mobile ? "font-semibold" : "hidden font-semibold xl:inline"
          }
        >
          FlowMind AI
        </span>
      </div>

      <nav aria-label="Primary" className="flex-1 px-3 py-5">
        <ul className="space-y-1">
          {primaryNavigation.map((item) => {
            const active = item.href
              ? pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`))
              : false;
            const Icon = item.icon;
            const content = (
              <>
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span
                  className={
                    mobile
                      ? "flex-1 text-left"
                      : "flex-1 text-left md:hidden xl:inline"
                  }
                >
                  {item.label}
                </span>
                {item.reserved ? (
                  <span
                    aria-hidden="true"
                    className={
                      mobile
                        ? "text-sidebar-muted text-[11px]"
                        : "text-sidebar-muted hidden text-[11px] xl:inline"
                    }
                  >
                    Soon
                  </span>
                ) : null}
              </>
            );
            const className = [
              "flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              active
                ? "bg-white/12 text-white"
                : "text-sidebar-muted hover:bg-white/8 hover:text-white",
              item.disabled || item.reserved
                ? "cursor-not-allowed opacity-55"
                : "",
              mobile
                ? ""
                : "md:justify-center md:px-0 xl:justify-start xl:px-3",
            ].join(" ");

            return (
              <li key={item.label}>
                {item.href ? (
                  <a
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={className}
                    href={item.href}
                    onClick={onNavigate}
                    title={!mobile ? item.label : undefined}
                  >
                    {content}
                  </a>
                ) : (
                  <button
                    aria-label={item.label}
                    className={className}
                    disabled
                    title={`${item.label} is not available yet`}
                    type="button"
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="text-sidebar-muted border-t border-white/10 px-5 py-4 text-xs">
        <span className={mobile ? "" : "hidden xl:inline"}>FlowMind v0.2</span>
        <span
          aria-hidden="true"
          className={mobile ? "hidden" : "block text-center xl:hidden"}
        >
          v2
        </span>
      </div>
    </div>
  );
}
