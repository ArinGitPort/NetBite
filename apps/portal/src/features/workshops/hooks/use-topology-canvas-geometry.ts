import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { WorkshopTopology } from '@netbite/workshops/contracts';
import { calculateWorkshopTopologyGeometry } from '@netbite/workshops/topology-authoring';

export function useTopologyCanvasGeometry(topology: WorkshopTopology) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasViewport, setCanvasViewport] = useState({
    width: 0,
    height: 0,
    fontScale: 1,
  });
  const [nodeSizes, setNodeSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const nodeMeasurementKey = topology.devices
    .map((device) => `${device.id}:${device.name}:${device.type}`)
    .join("|");
  const nodesForMeasurement = useMemo(
    () => topology.devices.map(({ id }) => ({ id })),
    // The string changes only when a rendered node's measured identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeMeasurementKey],
  );
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const bounds = canvas.getBoundingClientRect();
      const rootFontSize =
        Number.parseFloat(
          window.getComputedStyle(document.documentElement).fontSize,
        ) || 16;
      const nextViewport = {
        width: bounds.width,
        height: bounds.height,
        fontScale: Math.max(1, rootFontSize / 16),
      };
      setCanvasViewport((current) =>
        current.width === nextViewport.width &&
        current.height === nextViewport.height &&
        current.fontScale === nextViewport.fontScale
          ? current
          : nextViewport,
      );
      const nextNodeSizes = Object.fromEntries(
        nodesForMeasurement.map((device) => {
          const element = canvas.querySelector<HTMLElement>(
            `[data-topology-device-id="${CSS.escape(device.id)}"]`,
          );
          const rect = element?.getBoundingClientRect();
          return [
            device.id,
            { width: rect?.width ?? 96, height: rect?.height ?? 72 },
          ];
        }),
      );
      setNodeSizes((current) =>
        Object.keys(nextNodeSizes).length === Object.keys(current).length &&
        Object.entries(nextNodeSizes).every(
          ([id, size]) =>
            current[id]?.width === size.width &&
            current[id]?.height === size.height,
        )
          ? current
          : nextNodeSizes,
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [nodesForMeasurement]);
  const cableGeometry = useMemo(
    () =>
      calculateWorkshopTopologyGeometry(
        topology,
        canvasViewport,
        topology.devices.map((device) => ({
          deviceId: device.id,
          x: device.x * canvasViewport.width,
          y: device.y * canvasViewport.height,
          width: nodeSizes[device.id]?.width ?? 96,
          height: nodeSizes[device.id]?.height ?? 72,
        })),
      ),
    [canvasViewport, nodeSizes, topology],
  );
  const labels = cableGeometry.flatMap((cable) => [
    ...cable.endpointLabels,
    cable.contextLabel,
  ]);

  return { canvasRef, canvasViewport, cableGeometry, labels };
}
