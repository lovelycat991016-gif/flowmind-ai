import type { Metadata } from "next";

import { DashboardView } from "@/features/dashboard/ui/dashboard-view";
import { getDashboardMeetingData } from "@/features/meetings/queries/get-dashboard-meetings";
import { zhCN } from "@/shared/i18n/zh-CN";

export const metadata: Metadata = { title: zhCN.navigation.dashboard };

export default async function DashboardPage() {
  const data = await getDashboardMeetingData();
  return <DashboardView userName="Alex" data={data} />;
}
