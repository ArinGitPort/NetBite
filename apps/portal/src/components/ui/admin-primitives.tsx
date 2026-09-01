import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

export function LoadingState({ label = "Loading portal" }: { label?: string }) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center text-muted">
      <span className="size-7 animate-spin rounded-full border-2 border-line border-t-signal-orange" />
      <strong>{label}</strong>
    </div>
  );
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

export function ConfirmAction({
  className,
  ariaLabel,
  disabled,
  triggerTitle,
  children,
  eyebrow = "CONFIRM ACTION",
  title,
  detail,
  confirmLabel,
  tone = "danger",
  onConfirm,
}: {
  className: string;
  ariaLabel?: string;
  disabled?: boolean;
  triggerTitle?: string;
  children: ReactNode;
  eyebrow?: string;
  title: string;
  detail: string;
  confirmLabel: string;
  tone?: "danger" | "warning";
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = useCallback(() => {
    if (!busy) setOpen(false);
  }, [busy]);
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch (nextError) {
      setError(
        (nextError as Error).message || "The action could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        aria-label={ariaLabel}
        className={className}
        disabled={disabled}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        title={triggerTitle}
        type="button"
      >
        {children}
      </button>
      {open ? (
        <DialogFrame
          detail={detail}
          eyebrow={eyebrow}
          onClose={close}
          title={title}
        >
          {error ? (
            <div
              className="rounded-control border border-signal-red/60 bg-signal-red-soft p-3 text-sm text-signal-red"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button disabled={busy} onClick={close} tone="outline">
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() => void confirm()}
              tone={tone === "danger" ? "destructive" : "secondary"}
            >
              {busy ? "Working..." : confirmLabel}
            </Button>
          </div>
        </DialogFrame>
      ) : null}
    </>
  );
}
