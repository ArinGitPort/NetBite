import type { HTMLAttributes } from "react";

import LiquidWaveSpinner, { InlineWaveSpinner } from "@/components/shadcn-space/spinner/spinner-10";
import { cn } from "@/lib/class-names";

interface LoadingContentProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  variant?: "page" | "section" | "table" | "inline";
}

export function LoadingContent({
  className,
  label = "Loading content",
  variant = "section",
  ...props
}: LoadingContentProps) {
  if (variant === "inline") {
    return (
      <div
        aria-label={label}
        aria-live="polite"
        className={cn("flex min-h-14 items-center justify-center gap-2 text-xs text-muted", className)}
        role="status"
        {...props}
      >
        <InlineWaveSpinner decorative label={label} />
        <span>{label}</span>
      </div>
    );
  }
  return (
    <div
      aria-label={label}
      aria-live="polite"
      className={cn(
        "flex items-center justify-center text-center",
        variant === "page" && "min-h-[55vh]",
        variant === "section" && "min-h-60",
        variant === "table" && "min-h-72 rounded-control border border-line bg-surface",
        className,
      )}
      role="status"
      {...props}
    >
      <LiquidWaveSpinner className="max-w-sm" size="sm" words={[label]} />
    </div>
  );
}

export function LoadingButtonContent({ label }: { label: string }) {
  return (
    <>
      <InlineWaveSpinner decorative label={label} />
      <span>{label}</span>
    </>
  );
}
