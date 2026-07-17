import type { ReactNode } from "react";
import { AuthenticatedAppShell } from "@/widgets/app-shell/ui/authenticated-app-shell";

export const dynamic = "force-dynamic";

export default function MeetingsLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
