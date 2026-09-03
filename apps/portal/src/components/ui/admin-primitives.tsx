import { FileText } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { LoadingContent } from "@/components/ui/loading-content";
import { cn } from "@/lib/class-names";

export function LoadingState({ label = "Loading portal" }: { label?: string }) {
  return <LoadingContent label={label} />;
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-2.5 text-center text-muted">
      <FileText className="size-7" />
      <strong className="text-sm">{title}</strong>
      <p className="m-0 max-w-lg text-sm leading-6">{detail}</p>
    </div>
  );
}

export function StatusBadge({
  children,
  className = "",
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "green" | "orange" | "red";
}) {
  const normalizedTone = tone === "green" ? "success" : tone === "orange" ? "warning" : tone === "red" ? "danger" : "neutral";
  return (
    <Badge className={className} tone={normalizedTone}>
      {children}
    </Badge>
  );
}

export function StatusHeading({
  status,
  title,
  className,
}: {
  status: ReactNode;
  title: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-start gap-2.5", className)}>
      {status}
      <h2 className="break-words leading-tight">{title}</h2>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-0 content-start gap-1.5 text-[0.68rem] font-semibold text-copy">
      <span>{label}</span>
      {children}
      {hint ? (
        <small className="font-normal leading-5 text-muted">{hint}</small>
      ) : null}
    </label>
  );
}

export function PageIntro({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
      <div className="max-w-[780px]">
        <p className="mb-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
          {eyebrow}
        </p>
        <h1 className="mb-2 text-[clamp(2rem,3vw,2.5rem)] font-bold leading-[1.08] tracking-[-0.04em]">
          {title}
        </h1>
        <p className="m-0 max-w-[720px] text-sm leading-6 text-muted">
          {detail}
        </p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function DialogFrame({
  eyebrow,
  title,
  detail,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      description={detail}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
      title={title}
    >
      <p className="-mt-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
        {eyebrow}
      </p>
      {children}
    </Dialog>
  );
}
