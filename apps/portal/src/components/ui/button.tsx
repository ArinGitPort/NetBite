import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/class-names";

export const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control border px-4 text-[0.7rem] font-semibold text-current transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4",
  {
    variants: {
      tone: {
        neutral:
          "border-line bg-raised text-copy hover:border-muted hover:bg-surface",
        primary:
          "border-copy bg-copy text-canvas hover:border-copy hover:bg-copy/85 hover:text-canvas active:bg-copy/75",
        secondary:
          "border-signal-orange/60 bg-signal-orange-soft text-signal-orange hover:border-signal-orange",
        destructive:
          "border-signal-red/60 bg-signal-red-soft text-signal-red hover:border-signal-red",
        outline:
          "border-line bg-transparent text-copy hover:border-muted hover:bg-raised",
        ghost:
          "border-transparent bg-transparent text-muted hover:border-line hover:bg-raised hover:text-copy",
      },
      size: {
        default: "px-4",
        compact: "min-h-9 px-3",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { tone: "neutral", size: "default" },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, "tone"> {
  tone?: VariantProps<typeof buttonVariants>["tone"] | "default" | "danger";
}

export function Button({
  children,
  className,
  tone = "neutral",
  size,
  type = "button",
  ...props
}: ButtonProps) {
  const normalizedTone =
    tone === "default" ? "neutral" : tone === "danger" ? "destructive" : tone;
  return (
    <button
      className={cn(buttonVariants({ tone: normalizedTone, size }), className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
