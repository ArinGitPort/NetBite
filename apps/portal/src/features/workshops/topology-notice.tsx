import { X } from "lucide-react";

export function TopologyNotice({ message, error = false, onDismiss }: { message?: string; error?: boolean; onDismiss: () => void }) {
  return message ? <div className={`mx-4 mt-4 flex min-h-11 items-center justify-between gap-3 rounded-control border p-2 pl-3 text-sm ${error ? "border-signal-red/60 bg-signal-red-soft text-[#ff9da1]" : "border-signal-green/60 bg-signal-green-soft text-[#abd2c8]"}`} role={error ? "alert" : "status"}><span>{message}</span><button aria-label="Dismiss topology notification" className="-my-1 grid size-10 shrink-0 place-items-center rounded-control border border-transparent text-current hover:border-current/35 hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange [&_svg]:size-4" onClick={onDismiss} type="button"><X aria-hidden="true" /></button></div> : null;
}
