import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

type AuthPanelProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthPanel({
  children,
  description,
  footer,
  title,
}: AuthPanelProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
        {footer ? (
          <div className="text-muted-foreground mt-6 text-center text-sm">
            {footer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
