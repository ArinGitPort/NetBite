import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/class-names";

const badgeVariants = cva(
  "inline-flex min-h-6 w-fit items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[0.58rem] font-semibold uppercase leading-none tracking-[0.045em] [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:self-center",
  {
    variants: {
      tone: {
        neutral: "border-line bg-raised text-muted",
        success: "border-signal-green/60 bg-signal-green-soft text-signal-green",
        warning: "border-signal-orange/60 bg-signal-orange-soft text-signal-orange",
        danger: "border-signal-red/60 bg-signal-red-soft text-signal-red",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
