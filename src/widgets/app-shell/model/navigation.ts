import {
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings,
  Video,
  type LucideIcon,
} from "lucide-react";
import { zhCN } from "@/shared/i18n/zh-CN";

export type NavigationItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  reserved?: boolean;
  disabled?: boolean;
};

export const primaryNavigation: ReadonlyArray<NavigationItem> = [
  {
    label: zhCN.navigation.dashboard,
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  { label: zhCN.navigation.meetings, icon: Video, href: "/meetings" },
  { label: zhCN.navigation.summaries, icon: FileText, reserved: true },
  { label: zhCN.navigation.actionItems, icon: ListChecks, reserved: true },
  { label: zhCN.navigation.settings, icon: Settings, disabled: true },
];
