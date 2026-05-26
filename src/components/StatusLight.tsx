import React from "react";
import { cn } from "@/lib/utils";

interface StatusLightProps {
  status: "active" | "warning" | "error" | "inactive";
  label: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const DOT_SIZE: Record<NonNullable<StatusLightProps["size"]>, string> = {
  sm: "h-3 w-3 min-h-[0.75rem] min-w-[0.75rem]",
  md: "h-4 w-4 min-h-[1rem] min-w-[1rem]",
  lg: "h-5 w-5 min-h-[1.25rem] min-w-[1.25rem]",
};

const DOT_STATUS: Record<StatusLightProps["status"], string> = {
  active: "border-accent bg-accent shadow-[0_0_5px_hsl(var(--accent)_/_0.4)]",
  warning: "border-warning bg-warning shadow-[0_0_5px_hsl(var(--warning)_/_0.35)]",
  error: "border-destructive bg-destructive shadow-[0_0_5px_hsl(var(--destructive)_/_0.35)]",
  inactive: "border-border bg-muted shadow-none",
};

const StatusLight: React.FC<StatusLightProps> = ({
  status,
  label,
  size = "md",
  showLabel = true,
}) => {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      {showLabel ? (
        <span className="shrink-0 whitespace-nowrap text-[0.8125rem] font-medium leading-tight text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          "shrink-0 flex-none rounded-full border-2 box-border",
          DOT_SIZE[size],
          DOT_STATUS[status],
        )}
        title={label}
        aria-hidden
      />
    </div>
  );
};

export { StatusLight };
