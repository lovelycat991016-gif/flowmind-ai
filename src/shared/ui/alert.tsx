import { CircleAlert, CircleCheck } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/utils";

type AlertProps = React.ComponentProps<"div"> & {
  variant?: "error" | "success";
};

export function Alert({
  children,
  className,
  variant = "error",
  ...props
}: AlertProps) {
  const Icon = variant === "error" ? CircleAlert : CircleCheck;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm",
        variant === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
        className,
      )}
      role="alert"
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
