import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/class-names";
import { Button } from "@/components/ui/button";
import { LoadingButtonContent } from "@/components/ui/loading-content";

const overlay =
  "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0";
const content =
  "fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100vh-32px)] w-[min(620px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-panel border border-line bg-surface p-5 shadow-panel sm:p-6";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  closeDisabled = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  closeDisabled?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <DialogPrimitive.Content className={content}>
          <div className="pr-12">
            <DialogPrimitive.Title className="m-0 text-lg font-bold text-copy">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mb-0 mt-2 leading-7 text-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {children}
          <DialogPrimitive.Close asChild>
            <Button
              aria-label="Close dialog"
              className="absolute right-4 top-4"
              disabled={closeDisabled}
              size="icon"
              tone="ghost"
            >
              <X />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmationDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busyLabel = "WORKING...",
  intent = "standard",
  onConfirm,
}: {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel?: string;
  intent?: "standard" | "warning" | "destructive";
  onConfirm: () => void | Promise<void>;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback((nextOpen: boolean) => {
    if (busy && !nextOpen) return;
    if (nextOpen) setError("");
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [busy, controlledOpen, onOpenChange]);
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      if (controlledOpen === undefined) setInternalOpen(false);
      onOpenChange?.(false);
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : "The action could not be completed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {trigger ? (
        <AlertDialogPrimitive.Trigger asChild>
          {trigger}
        </AlertDialogPrimitive.Trigger>
      ) : null}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          className={overlay}
          data-confirmation-overlay=""
          onClick={() => { if (!busy) setOpen(false); }}
        />
        <AlertDialogPrimitive.Content
          className={cn(
            content,
            "isolate w-[min(512px,calc(100%-32px))] gap-6 overflow-hidden p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
          onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancelRef.current?.focus();
          }}
        >
          <AlertDialogPrimitive.Cancel asChild>
            <Button
              aria-label="Close confirmation"
              className="absolute right-3 top-3 z-10"
              disabled={busy}
              size="icon"
              tone="ghost"
            >
              <X />
            </Button>
          </AlertDialogPrimitive.Cancel>
          {intent !== "standard" ? (
            <AlertTriangle
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute -right-5 -top-7 -z-10 size-36 rotate-[-8deg] opacity-[0.045]",
                intent === "destructive" ? "text-signal-red" : "text-signal-orange",
              )}
              strokeWidth={1}
            />
          ) : null}
          <div className="relative grid gap-2 pr-8 text-center sm:text-left">
            <AlertDialogPrimitive.Title className="m-0 text-lg font-semibold tracking-tight text-copy">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="m-0 text-sm leading-6 text-muted">
              {description}
            </AlertDialogPrimitive.Description>
          </div>
          {error ? (
            <p className="m-0 rounded-control border border-signal-red/50 bg-signal-red-soft p-3 text-sm leading-6 text-signal-red" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel asChild>
              <Button disabled={busy} ref={cancelRef} tone="outline">CANCEL</Button>
            </AlertDialogPrimitive.Cancel>
            <Button
              disabled={busy}
              onClick={() => void confirm()}
              tone={intent === "destructive" ? "destructive" : intent === "warning" ? "secondary" : "primary"}
            >
              {busy ? <LoadingButtonContent label={busyLabel} /> : confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export function ConfirmAction({
  className,
  ariaLabel,
  disabled,
  triggerTitle,
  children,
  detail,
  tone = "danger",
  ...dialogProps
}: Omit<Parameters<typeof ConfirmationDialog>[0], "trigger" | "intent" | "description"> & {
  className: string;
  ariaLabel?: string;
  disabled?: boolean;
  triggerTitle?: string;
  children: ReactNode;
  detail: string;
  tone?: "danger" | "warning" | "standard";
}) {
  return (
    <ConfirmationDialog
      {...dialogProps}
      description={detail}
      intent={tone === "danger" ? "destructive" : tone}
      trigger={
        <button
          aria-label={ariaLabel}
          className={className}
          disabled={disabled}
          title={triggerTitle}
          type="button"
        >
          {children}
        </button>
      }
    />
  );
}
