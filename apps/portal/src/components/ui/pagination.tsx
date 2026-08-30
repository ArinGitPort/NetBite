import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import type { ComponentProps } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/class-names";

export function Pagination({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      aria-label="Pagination"
      className={cn("flex w-full items-center justify-center", className)}
      data-slot="pagination"
      {...props}
    />
  );
}

export function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      className={cn("m-0 flex list-none items-center gap-1 p-0", className)}
      data-slot="pagination-content"
      {...props}
    />
  );
}

export function PaginationItem(props: ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

interface PaginationButtonProps extends ButtonProps {
  active?: boolean;
}

export function PaginationButton({
  active = false,
  className,
  ...props
}: PaginationButtonProps) {
  return (
    <Button
      aria-current={active ? "page" : undefined}
      className={cn(
        "min-h-9 min-w-9 px-2 font-mono text-[0.65rem]",
        active && "border-signal-green/70 bg-signal-green-soft text-copy",
        className,
      )}
      data-active={active || undefined}
      data-slot="pagination-button"
      size="compact"
      tone={active ? "outline" : "ghost"}
      {...props}
    />
  );
}

export function PaginationPrevious({
  children = "Previous",
  className,
  ...props
}: ButtonProps) {
  return (
    <Button
      className={cn("px-2", className)}
      data-slot="pagination-previous"
      size="compact"
      tone="ghost"
      {...props}
    >
      <ChevronLeft aria-hidden="true" />
      <span className="sr-only">{children}</span>
    </Button>
  );
}

export function PaginationNext({
  children = "Next",
  className,
  ...props
}: ButtonProps) {
  return (
    <Button
      className={cn("px-2", className)}
      data-slot="pagination-next"
      size="compact"
      tone="ghost"
      {...props}
    >
      <span className="sr-only">{children}</span>
      <ChevronRight aria-hidden="true" />
    </Button>
  );
}

export function PaginationEllipsis({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-9 place-items-center text-muted", className)}
      data-slot="pagination-ellipsis"
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
