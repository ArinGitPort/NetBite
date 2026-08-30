import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/class-names";

interface FieldShellProps {
  children: ReactNode;
  hint?: ReactNode;
  label: ReactNode;
}

function FieldShell({ children, hint, label }: FieldShellProps) {
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

const control =
  "w-full rounded-control border border-line bg-canvas px-3 py-2.5 text-[0.8rem] text-copy outline-none transition-colors placeholder:text-muted/70 focus:border-signal-orange focus:ring-2 focus:ring-signal-orange/15";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  hint?: ReactNode;
  label: ReactNode;
}

export function InputField({
  className,
  hint,
  label,
  ...props
}: InputFieldProps) {
  return (
    <FieldShell hint={hint} label={label}>
      <input className={cn(control, "min-h-11", className)} {...props} />
    </FieldShell>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hint?: ReactNode;
  label: ReactNode;
}

export function TextareaField({
  className,
  hint,
  label,
  ...props
}: TextareaFieldProps) {
  return (
    <FieldShell hint={hint} label={label}>
      <textarea
        className={cn(control, "resize-y leading-6", className)}
        {...props}
      />
    </FieldShell>
  );
}
