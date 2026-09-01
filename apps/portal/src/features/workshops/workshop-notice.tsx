import { X } from "lucide-react";

interface WorkshopNoticeProps {
  message?: string;
  error?: boolean;
  onDismiss: () => void;
}

export function WorkshopNotice({
  message,
  error = false,
  onDismiss,
}: WorkshopNoticeProps) {
  if (!message) return null;

  return (
    <div
      className={`mb-4 flex min-h-11 items-center justify-between gap-3 rounded-control border p-2 pl-3 text-sm ${
        error
          ? "border-signal-red/60 bg-signal-red-soft text-signal-red"
          : "border-signal-green/60 bg-signal-green-soft text-signal-green"
      }`}
      role={error ? "alert" : "status"}
    >
      <span>{message}</span>
      <button
        aria-label="Dismiss notification"
        className="-my-1 grid size-11 shrink-0 place-items-center rounded-control border border-transparent text-current hover:border-current/35 hover:bg-black/10 focus-visible:outline-offset-0 [&_svg]:size-4"
        onClick={onDismiss}
        type="button"
      >
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
