import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/class-names";

const badgeVariants = cva(
  "inline-flex min-h-6 w-fit items-center gap-2 whitespace-nowrap rounded-full border px-2.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.045em] [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-line bg-raised text-muted",
        success: "border-signal-green/60 bg-signal-green-soft text-[#9ccabe]",
        warning: "border-signal-orange/60 bg-signal-orange-soft text-[#efad7a]",
        danger: "border-signal-red/60 bg-signal-red-soft text-[#ff858a]",
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
