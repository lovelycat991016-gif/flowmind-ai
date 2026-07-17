import type { Metadata } from "next";

import { DashboardView } from "@/features/dashboard/ui/dashboard-view";
import { getDashboardMeetingData } from "@/features/meetings/queries/get-dashboard-meetings";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await getDashboardMeetingData();
  return <DashboardView userName="Alex" data={data} />;
}
