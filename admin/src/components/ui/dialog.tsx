import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/class-names";
import { Button } from "./button";

const overlay = "fixed inset-0 z-50 bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out";
const content = "fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100vh-32px)] w-[min(620px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-panel border border-line bg-surface p-6 shadow-panel sm:p-7";

export function Dialog({ open, onOpenChange, title, description, children, closeDisabled = false }: {
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
            <DialogPrimitive.Title className="m-0 text-xl font-bold text-copy">{title}</DialogPrimitive.Title>
            {description ? <DialogPrimitive.Description className="mb-0 mt-2 leading-7 text-muted">{description}</DialogPrimitive.Description> : null}
          </div>
          {children}
          <DialogPrimitive.Close asChild>
            <Button aria-label="Close dialog" className="absolute right-4 top-4" disabled={closeDisabled} size="icon" tone="ghost"><X /></Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmationDialog({ trigger, title, description, confirmLabel, destructive = false, onConfirm }: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialogPrimitive.Root>
      <AlertDialogPrimitive.Trigger asChild>{trigger}</AlertDialogPrimitive.Trigger>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={overlay} />
        <AlertDialogPrimitive.Content className={content}>
          <AlertDialogPrimitive.Title className="m-0 text-xl font-bold text-copy">{title}</AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="m-0 leading-7 text-muted">{description}</AlertDialogPrimitive.Description>
          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <AlertDialogPrimitive.Cancel asChild><Button tone="outline">Cancel</Button></AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button onClick={() => void onConfirm()} tone={destructive ? "destructive" : "primary"}>{confirmLabel}</Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
