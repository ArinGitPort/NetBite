import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/class-names";

export function FilterToolbar({
  active,
  children,
  className,
  layout = "inline",
  onReset,
  onSearchChange,
  resultLabel,
  searchLabel,
  searchPlaceholder,
  searchValue,
}: {
  active: boolean;
  children?: ReactNode;
  className?: string;
  layout?: "inline" | "stacked";
  onReset: () => void;
  onSearchChange: (value: string) => void;
  resultLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 border-y border-line bg-canvas/35 p-4 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-center",
        layout === "stacked" && "lg:grid-cols-1",
        className,
      )}
    >
      <label className="relative block min-w-0">
        <span className="sr-only">{searchLabel}</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        />
        <input
          className="min-h-11 w-full rounded-control border border-line bg-canvas py-2 pl-10 pr-3 text-sm text-copy outline-none placeholder:text-muted hover:border-muted focus:border-signal-orange focus:ring-2 focus:ring-signal-orange/25"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          value={searchValue}
        />
      </label>
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-2",
          layout === "stacked" &&
            "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto] [&>button]:w-full xl:[&>button]:w-auto",
        )}
      >
        {children}
        {active ? (
          <Button onClick={onReset} size="compact" tone="ghost">
            <X /> CLEAR FILTERS
          </Button>
        ) : null}
      </div>
      <p
        className={cn(
          "m-0 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted lg:col-span-2",
          layout === "stacked" && "lg:col-span-1",
        )}
      >
        {resultLabel}
      </p>
    </div>
  );
}
