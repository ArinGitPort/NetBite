import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type ThemePreference } from "@/app/theme/theme-provider";
import { Button } from "@/components/ui/button";

const options: Array<{ id: ThemePreference; label: string; icon: typeof Monitor }> = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

export function ThemeMenu() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const TriggerIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button aria-label={`Appearance: ${preference}`} size="icon" tone="ghost"><TriggerIcon /></Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 grid min-w-44 gap-1 rounded-control border border-line bg-raised p-1.5 text-copy shadow-panel"
          sideOffset={8}
        >
          <DropdownMenu.Label className="px-2 py-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted">Appearance</DropdownMenu.Label>
          {options.map((option) => {
            const OptionIcon = option.icon;
            return (
              <DropdownMenu.Item
                className="flex min-h-10 cursor-default items-center gap-2 rounded-control px-2 text-xs outline-none focus:bg-signal-green-soft"
                key={option.id}
                onSelect={() => setPreference(option.id)}
              >
                <OptionIcon className="size-4" />
                <span>{option.label}</span>
                {preference === option.id ? <Check className="ml-auto size-4 text-signal-green" /> : null}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
