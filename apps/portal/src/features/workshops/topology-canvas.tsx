import { Cable, Monitor, Network, Router, Server } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import type { WorkshopTopology, WorkshopTopologyDevice } from "@netbite/workshops/contracts";
import type { WorkshopCableGeometry, WorkshopTopologyLabelGeometry } from "@netbite/workshops/topology-authoring";
import { TopologyDeviceEditor } from "@/features/workshops/topology-device-editor";

interface TopologyCanvasProps {
  topology: WorkshopTopology;
  canvasRef: RefObject<HTMLDivElement | null>;
  viewport: { width: number; height: number };
  pan: { x: number; y: number };
  panning: boolean;
  geometry: WorkshopCableGeometry[];
  labels: WorkshopTopologyLabelGeometry[];
  selected?: WorkshopTopologyDevice;
  selectedDeviceId?: string;
  selectedLinkId?: string;
  connectionMode: boolean;
  connectionStartId?: string;
  connectionPointer?: { x: number; y: number };
  onCanvasPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onLinkSelect: (id: string) => void;
  onDevicePointerDown: (event: ReactPointerEvent, id: string) => void;
  onDeviceClick: (id: string) => void;
  onDeviceUpdate: (patch: Partial<WorkshopTopologyDevice>) => void;
  onAddInterface: () => void;
  isInterfaceConnected: (id: string) => boolean;
  onRemoveInterface: (id: string) => void;
  onConnect: () => void;
  onRemoveDevice: () => void;
}

function DeviceIcon({ type }: { type: WorkshopTopologyDevice["type"] }) {
  if (type === "router") return <Router />;
  if (type === "server") return <Server />;
  if (type === "switch") return <Network />;
  return <Monitor />;
}

export function TopologyCanvas(props: TopologyCanvasProps) {
  const { topology, viewport, pan } = props;
  return (
    <div className={`mt-4 grid h-[clamp(480px,62vw,680px)] grid-cols-[minmax(0,1fr)_340px] items-stretch overflow-hidden rounded-panel border border-line max-xl:h-auto max-xl:grid-cols-1`}>
      <div
        aria-label={topology.accessibilityDescription}
        className={`relative h-full min-h-0 w-full touch-none overflow-hidden bg-canvas bg-[image:var(--nb-grid)] bg-[size:24px_24px] max-xl:h-[clamp(480px,62vw,680px)] max-sm:h-[clamp(400px,105vw,560px)] ${props.panning ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={props.onCanvasPointerDown}
        ref={props.canvasRef}
        style={{ backgroundPosition: `${pan.x}px ${pan.y}px` }}
      >
        <div className="absolute inset-0 will-change-transform" style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0)` }}>
          <svg aria-hidden="true" className="absolute inset-0 size-full overflow-visible [&_line]:[vector-effect:non-scaling-stroke]" preserveAspectRatio="none" viewBox={`0 0 ${Math.max(1, viewport.width)} ${Math.max(1, viewport.height)}`}>
            {props.geometry.map((cable) => {
              const link = topology.links.find((item) => item.id === cable.linkId);
              return link ? (
                <g key={cable.linkId}>
                  <line className={`pointer-events-none [stroke-width:1.5] ${link.state === "down" ? "stroke-signal-red" : props.selectedLinkId === link.id ? "stroke-signal-orange" : "stroke-signal-green"}`} x1={cable.start.x} y1={cable.start.y} x2={cable.end.x} y2={cable.end.y} />
                  <line className="cursor-pointer stroke-transparent [pointer-events:stroke] [stroke-width:18]" data-topology-interactive="true" onClick={(event) => { event.stopPropagation(); props.onLinkSelect(link.id); }} x1={cable.start.x} y1={cable.start.y} x2={cable.end.x} y2={cable.end.y} />
                </g>
              ) : null;
            })}
            {props.connectionStartId && props.connectionPointer ? (() => {
              const from = topology.devices.find((device) => device.id === props.connectionStartId);
              return from ? <line className="pointer-events-none stroke-signal-orange [stroke-dasharray:2_1] [stroke-width:1.5]" x1={from.x * viewport.width} y1={from.y * viewport.height} x2={props.connectionPointer.x * viewport.width} y2={props.connectionPointer.y * viewport.height} /> : null;
            })() : null}
          </svg>
          {props.labels.map((label) => {
            const style = { left: label.x, top: label.y, minWidth: label.width, minHeight: label.height };
            const classes = "absolute z-[3] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[3px] border py-1 font-mono text-[0.62rem] font-semibold leading-none text-white shadow-[0_1px_4px_rgba(0,0,0,.7)]";
            return label.kind === "endpoint" ? <span aria-hidden="true" className={`${classes} pointer-events-none border-[#6f6673] bg-[#111013] px-1`} key={label.id} style={style}>{label.text}</span> : <button aria-label={`Inspect connection ${label.text}`} className={`${classes} px-2 ${label.tone === "warning" ? "border-signal-orange bg-[#2b1c12] hover:border-white" : "border-[#6f6673] bg-[#211d24] hover:border-signal-orange"}`} data-topology-interactive="true" key={label.id} onClick={() => props.onLinkSelect(label.linkId)} style={style} type="button">{label.text}</button>;
          })}
          {topology.devices.map((device) => (
            <button className={`absolute z-[2] grid w-24 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center gap-1 rounded-control border p-2 text-copy active:cursor-grabbing ${props.selectedDeviceId === device.id ? "border-signal-orange bg-signal-orange-soft" : "border-line bg-raised"}`} data-topology-device-id={device.id} data-topology-interactive="true" key={device.id} onClick={() => props.onDeviceClick(device.id)} onPointerDown={(event) => props.onDevicePointerDown(event, device.id)} style={{ left: `${device.x * 100}%`, top: `${device.y * 100}%` }}>
              <DeviceIcon type={device.type} /><strong>{device.name}</strong>
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 z-[4] rounded-control border border-line bg-canvas/90 px-3 py-2 font-mono text-[0.58rem] text-muted shadow-sm">DRAG EMPTY SPACE TO PAN</div>
      </div>
      {props.selected ? (
        <TopologyDeviceEditor device={props.selected} update={props.onDeviceUpdate} onAddInterface={props.onAddInterface} isInterfaceConnected={props.isInterfaceConnected} onRemoveInterface={props.onRemoveInterface} onConnect={props.onConnect} onRemove={props.onRemoveDevice} />
      ) : (
        <aside className="grid h-full min-h-0 content-center justify-items-center gap-3 overflow-y-auto border-l border-line bg-sidebar p-8 text-center text-sm text-muted max-xl:h-auto max-xl:border-l-0 max-xl:border-t max-xl:overflow-visible">
          <Cable className="size-8" /><strong className="text-copy">Select a device or connection</strong>
          <p className="m-0 max-w-xs leading-6">Configure a device, inspect a cable, or use Connect Devices to draw a cable automatically.</p>
        </aside>
      )}
    </div>
  );
}
