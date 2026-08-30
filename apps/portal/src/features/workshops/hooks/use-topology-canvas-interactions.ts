import type { Dispatch, PointerEvent as ReactPointerEvent, RefObject, SetStateAction } from "react";
import type { WorkshopTopology } from "@netbite/workshops/contracts";

export function useTopologyCanvasInteractions({ canvasRef, connectionMode, pan, setPan, setPanning, viewport, setTopology }: {
  canvasRef: RefObject<HTMLDivElement | null>;
  connectionMode: boolean;
  pan: { x: number; y: number };
  setPan: Dispatch<SetStateAction<{ x: number; y: number }>>;
  setPanning: (value: boolean) => void;
  viewport: { width: number; height: number };
  setTopology: Dispatch<SetStateAction<WorkshopTopology>>;
}) {
  const panCanvas = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || connectionMode) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-topology-interactive]")) return;
    event.preventDefault();
    const origin = { pointerX: event.clientX, pointerY: event.clientY, panX: pan.x, panY: pan.y };
    const maximumX = Math.max(120, viewport.width * 0.8);
    const maximumY = Math.max(120, viewport.height * 0.8);
    setPanning(true);
    const move = (next: PointerEvent) => setPan({ x: Math.max(-maximumX, Math.min(maximumX, origin.panX + next.clientX - origin.pointerX)), y: Math.max(-maximumY, Math.min(maximumY, origin.panY + next.clientY - origin.pointerY)) });
    const stop = () => {
      setPanning(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };
  const dragDevice = (event: ReactPointerEvent, id: string) => {
    event.preventDefault(); event.stopPropagation();
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const nodeBounds = event.currentTarget.getBoundingClientRect();
    const minimumX = nodeBounds.width / 2 / bounds.width;
    const maximumX = 1 - minimumX;
    const minimumY = nodeBounds.height / 2 / bounds.height;
    const maximumY = 1 - minimumY;
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (next: PointerEvent) => setTopology((value) => ({ ...value, devices: value.devices.map((device) => device.id === id ? { ...device, x: Math.max(minimumX, Math.min(maximumX, (next.clientX - bounds.left - pan.x) / bounds.width)), y: Math.max(minimumY, Math.min(maximumY, (next.clientY - bounds.top - pan.y) / bounds.height)) } : device) }));
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
  return { panCanvas, dragDevice };
}
