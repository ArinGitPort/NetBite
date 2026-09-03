import type { ReactNode } from "react";

import netbiteLogo from "@netbite/brand/logo.png";
import { cn } from "@/lib/class-names";

export function BrandMark({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative grid size-9 shrink-0 place-items-center", className)}
    >
      <span className="absolute inset-[18%] rounded-full bg-signal-red opacity-20 blur-md" />
      <img
        alt=""
        className={cn(
          "relative size-[88%] object-contain drop-shadow-[0_4px_10px_rgb(224_79_86/18%)]",
          imageClassName,
        )}
        src={netbiteLogo}
      />
    </span>
  );
}

export function BrandLockup({
  className,
  markClassName,
  subtitle,
}: {
  className?: string;
  markClassName?: string;
  subtitle?: ReactNode;
}) {
  return (
    <div
      aria-label="NetBite"
      className={cn("flex items-center gap-2.5", className)}
    >
      <BrandMark className={markClassName} />
      <span className="grid gap-1">
        <strong className="text-[0.82rem] tracking-[0.08em]">NETBITE</strong>
        {subtitle ? (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">
            {subtitle}
          </span>
        ) : null}
      </span>
    </div>
  );
}
