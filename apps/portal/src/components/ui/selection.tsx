import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "../../lib/class-names";

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
export function RadioItem({
  children,
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Item> & { children?: ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-line bg-canvas px-3 text-sm text-copy">
      <RadioGroupPrimitive.Item
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border border-line bg-canvas",
          className,
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-signal-green" />
      </RadioGroupPrimitive.Item>
      {children}
    </label>
  );
}
