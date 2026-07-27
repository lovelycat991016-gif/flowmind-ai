import type { Metadata } from "next";

import { DashboardView } from "@/features/dashboard/ui/dashboard-view";
import { getDashboardAttention } from "@/features/dashboard/queries/get-dashboard-attention";
import { getDashboardMeetingData } from "@/features/meetings/queries/get-dashboard-meetings";
import { zhCN } from "@/shared/i18n/zh-CN";

export const metadata: Metadata = { title: zhCN.navigation.dashboard };

export default async function DashboardPage() {
  const [data, attention] = await Promise.all([
    getDashboardMeetingData(),
    getDashboardAttention(),
  ]);
  return <DashboardView userName="Alex" data={data} attention={attention} />;
}
