import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/class-names";

export function Checkbox({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-[5px] border border-line bg-canvas text-canvas data-[state=checked]:border-signal-green data-[state=checked]:bg-signal-green",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export const RadioGroup = RadioGroupPrimitive.Root;
export function RadioControl({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "group grid size-6 shrink-0 place-items-center rounded-full border border-line bg-raised text-copy transition-colors hover:border-signal-green/70 hover:bg-signal-green-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange disabled:pointer-events-none disabled:opacity-45 data-[state=checked]:border-signal-green data-[state=checked]:bg-signal-green-soft",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="grid size-full place-items-center">
        <span className="size-2.5 rounded-full bg-signal-green shadow-[0_0_0_2px_rgba(13,22,20,0.75)]" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export function RadioItem({
  children,
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Item> & { children?: ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-line bg-canvas px-3 text-sm text-copy">
      <RadioControl className={className} {...props} />
      {children}
    </label>
  );
}
