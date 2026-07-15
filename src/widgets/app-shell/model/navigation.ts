import {
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings,
  Video,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  active?: boolean;
  reserved?: boolean;
  disabled?: boolean;
};

export const primaryNavigation: ReadonlyArray<NavigationItem> = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "#dashboard-top",
    active: true,
  },
  { label: "Meetings", icon: Video, href: "#recent-meetings" },
  { label: "Summaries", icon: FileText, reserved: true },
  { label: "Action Items", icon: ListChecks, reserved: true },
  { label: "Settings", icon: Settings, disabled: true },
];
