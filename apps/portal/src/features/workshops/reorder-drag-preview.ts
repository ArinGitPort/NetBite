import type { DragEvent } from "react";

/** Make the entire item follow the pointer when its handle starts a native drag. */
export function setReorderDragPreview(
  event: DragEvent<HTMLButtonElement>,
  preview: HTMLElement | null,
) {
  if (!preview || typeof event.dataTransfer.setDragImage !== "function") return;
  const bounds = preview.getBoundingClientRect();
  event.dataTransfer.setDragImage(
    preview,
    Math.max(0, (event.clientX ?? bounds.left) - bounds.left),
    Math.max(0, (event.clientY ?? bounds.top) - bounds.top),
  );
}
