import type { ReactNode } from "react";

import { cn } from "../../lib/class-names";

type FeedbackTone = "success" | "warning" | "error";

const tones: Record<FeedbackTone, string> = {
  success: "border-signal-green bg-signal-green-soft text-[#abd2c8]",
  warning: "border-signal-orange bg-signal-orange-soft text-[#f0b184]",
  error: "border-signal-red bg-signal-red-soft text-[#ff9da1]",
};

export function Feedback({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: FeedbackTone;
}) {
  return (
    <div
      className={cn(
        "rounded-control border-l-[3px] px-4 py-3 text-sm",
        tones[tone],
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
