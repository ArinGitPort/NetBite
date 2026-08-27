import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/class-names";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <section
      className={cn("min-w-0 rounded-panel border border-line bg-surface/95 p-6 shadow-panel", className)}
      {...props}
    >
      {children}
    </section>
  );
}
