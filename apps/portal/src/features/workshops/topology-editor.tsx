import {
  AlertTriangle,
  Cable,
  Monitor,
  Network,
  Plus,
  RotateCcw,
  Router,
  Save,
  Server,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  WorkshopTopology,
  WorkshopTopologyDevice,
  WorkshopLinkPurpose,
  WorkshopTopologyStarterId,
} from "@netbite/workshops/contracts";
import { validateWorkshopTopology } from "@netbite/workshops/contracts";
import {
  calculateWorkshopTopologyGeometry,
  createWorkshopTopologyStarter,
  deriveWorkshopLinkPurpose,
  deriveWorkshopLinkContext,
  getAvailableConnectionInterfaces,
  normalizeWorkshopTopology,
  hasWorkshopLinkPurposeConflict,
  suggestWorkshopInterfaceName,
} from "@netbite/workshops/topology-authoring";
import * as api from "../../lib/content-api";
import type { WorkshopTopologyRow } from "../../lib/content-api";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/selection";
import { TopologyDeviceEditor } from "./topology-device-editor";
import {
  AddInterfaceDialog,
  ConnectDevicesDialog,
  StarterTopologyDialog,
} from "./topology-dialogs";

function Notice({
  message,
  error = false,
  onDismiss,
}: {
  message?: string;
  error?: boolean;
  onDismiss: () => void;
}) {
  return message ? (
    <div
      className={`mx-4 mt-4 flex min-h-11 items-center justify-between gap-3 rounded-control border p-2 pl-3 text-sm ${
        error
          ? "border-signal-red/60 bg-signal-red-soft text-[#ff9da1]"
          : "border-signal-green/60 bg-signal-green-soft text-[#abd2c8]"
      }`}
      role={error ? "alert" : "status"}
    >
      <span>{message}</span>
      <button
        aria-label="Dismiss topology notification"
        className="-my-1 grid size-10 shrink-0 place-items-center rounded-control border border-transparent text-current hover:border-current/35 hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange [&_svg]:size-4"
        onClick={onDismiss}
        type="button"
      >
        <X aria-hidden="true" />
      </button>
    </div>
  ) : null;
}

function DeviceIcon({ type }: { type: WorkshopTopologyDevice["type"] }) {
  if (type === "router") return <Router />;
  if (type === "server") return <Server />;
  if (type === "switch") return <Network />;
  return <Monitor />;
}

const devicePalette = [
  { type: "pc", label: "PC" },
  { type: "switch", label: "SWITCH" },
  { type: "router", label: "ROUTER" },
  { type: "server", label: "SERVER" },
] as const;

export function defaultTopology(workshopId: string): WorkshopTopologyRow {
  const stableId = `topology-${crypto.randomUUID()}`;
  return {
    id: "",
    workshop_id: workshopId,
    stable_id: stableId,
    definition: {
      schemaVersion: 2,
      id: stableId,
      title: "Lesson topology",
      accessibilityDescription:
        "A read-only network topology created by the instructor.",
      devices: [],
      links: [],
    },
  };
}

export function TopologyEditor({
  row,
  onSaved,
}: {
  row: WorkshopTopologyRow;
  onSaved: (value: WorkshopTopologyRow) => void;
}) {
  const [topology, setTopology] = useState(
    normalizeWorkshopTopology(row.definition as unknown as WorkshopTopology),
  );
  useEffect(() => {
    const title = String(row.definition.title ?? "Untitled topology");
    setTopology((current) =>
      current.title === title ? current : { ...current, title },
    );
  }, [row.definition.title]);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedLinkId, setSelectedLinkId] = useState<string>();
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string>();
  const [connectionKey, setConnectionKey] = useState(0);
  const [interfaceDeviceId, setInterfaceDeviceId] = useState<string>();
  const [resumeConnectionAfterInterface, setResumeConnectionAfterInterface] =
    useState(false);
  const [startersOpen, setStartersOpen] = useState(false);
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectionStartId, setConnectionStartId] = useState<string>();
  const [connectionPointer, setConnectionPointer] = useState<{
    x: number;
    y: number;
  }>();
  const [notice, setNotice] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [canvasPanning, setCanvasPanning] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const connectionJustCreatedRef = useRef(false);
  const [canvasViewport, setCanvasViewport] = useState({
    width: 0,
    height: 0,
    fontScale: 1,
  });
  useEffect(() => {
    if (!notice || notice.includes("error") || notice.includes("Resolve"))
      return;
    const timer = window.setTimeout(() => setNotice(undefined), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);
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
  const selected = topology.devices.find((device) => device.id === selectedId);
  const selectedLink = topology.links.find(
    (link) => link.id === selectedLinkId,
  );
  const issues = validateWorkshopTopology(topology);
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

  const addDevice = (type: WorkshopTopologyDevice["type"]) => {
    if (topology.devices.length >= 12)
      return setNotice("A topology can contain at most 12 devices.");
    const count =
      topology.devices.filter((device) => device.type === type).length + 1;
    const prefix =
      type === "switch"
        ? "SW"
        : type === "router"
          ? "R"
          : type === "server"
            ? "SERVER"
            : "PC";
    const id = `${type}-${crypto.randomUUID()}`;
    const device: WorkshopTopologyDevice = {
      id,
      type,
      name: `${prefix}${count}`,
      x: 0.15 + (topology.devices.length % 4) * 0.23,
      y: 0.2 + Math.floor(topology.devices.length / 4) * 0.3,
      interfaces: [
        {
          id: "e0",
          kind: "physical",
          name: type === "router" ? "G0/0" : type === "switch" ? "F0/1" : "E0",
          state: "up",
        },
      ],
      routes: [],
      configuration: {},
    };
    setTopology((value) => ({ ...value, devices: [...value.devices, device] }));
    setSelectedId(id);
  };
  const updateDevice = (patch: Partial<WorkshopTopologyDevice>) =>
    setTopology((value) => ({
      ...value,
      devices: value.devices.map((device) =>
        device.id === selectedId ? { ...device, ...patch } : device,
      ),
    }));
  const updateLink = (patch: Partial<WorkshopTopology["links"][number]>) =>
    setTopology((value) => ({
      ...value,
      links: value.links.map((link) =>
        link.id === selectedLinkId ? { ...link, ...patch } : link,
      ),
    }));
  const chooseDevice = (id: string) => {
    setSelectedId(id);
  };
  const openConnection = (deviceId?: string) => {
    if (deviceId) setSelectedId(deviceId);
    setEditingLinkId(undefined);
    setConnectionKey((value) => value + 1);
    setConnectionOpen(true);
  };
  const createAutomaticConnection = (
    fromDeviceId: string,
    toDeviceId: string,
  ) => {
    if (fromDeviceId === toDeviceId) {
      setConnectionStartId(fromDeviceId);
      return;
    }
    const linkId = `link-${crypto.randomUUID()}`;
    setTopology((current) => {
      let next = current;
      const getOrCreatePort = (deviceId: string) => {
        const available = getAvailableConnectionInterfaces(next, deviceId)[0];
        if (available) return available.id;
        const device = next.devices.find((item) => item.id === deviceId)!;
        const interfaceId = `interface-${crypto.randomUUID()}`;
        const networkInterface = {
          id: interfaceId,
          kind: "physical" as const,
          name: suggestWorkshopInterfaceName(device, "physical"),
          state: "up" as const,
        };
        next = {
          ...next,
          devices: next.devices.map((item) =>
            item.id === deviceId
              ? { ...item, interfaces: [...item.interfaces, networkInterface] }
              : item,
          ),
        };
        return interfaceId;
      };
      const fromInterfaceId = getOrCreatePort(fromDeviceId);
      const toInterfaceId = getOrCreatePort(toDeviceId);
      return {
        ...next,
        links: [
          ...next.links,
          {
            id: linkId,
            fromDeviceId,
            fromInterfaceId,
            toDeviceId,
            toInterfaceId,
            purpose: "basic",
            state: "up",
          },
        ],
      };
    });
    setConnectionStartId(undefined);
    setConnectionPointer(undefined);
    setSelectedLinkId(linkId);
    setNotice(
      "Devices connected. NetBite assigned the next available physical ports.",
    );
  };

  const connectionEndpoint = (
    link: WorkshopTopology["links"][number],
    side: "from" | "to",
  ) => {
    const deviceId = side === "from" ? link.fromDeviceId : link.toDeviceId;
    const interfaceId =
      side === "from" ? link.fromInterfaceId : link.toInterfaceId;
    const device = topology.devices.find((item) => item.id === deviceId);
    const networkInterface = device?.interfaces.find(
      (item) => item.id === interfaceId,
    );
    return {
      deviceName: device?.name ?? "Unknown device",
      interfaceName: networkInterface?.name ?? "Unknown port",
    };
  };
  const changeLinkPurpose = (purpose: WorkshopLinkPurpose) => {
    if (
      !selectedLink ||
      (deriveWorkshopLinkPurpose(selectedLink, topology) === purpose &&
        selectedLink.purpose)
    )
      return;
    const incompatible = [
      purpose !== "basic" && selectedLink.label,
      purpose !== "routed" && selectedLink.network,
      purpose !== "access" && selectedLink.accessVlan,
      purpose !== "trunk" && selectedLink.trunkVlans?.length,
    ].some(Boolean);
    if (
      incompatible &&
      !window.confirm(
        "Changing the connection purpose removes fields that do not apply. Continue?",
      )
    )
      return;
    updateLink({
      purpose,
      label: purpose === "basic" ? selectedLink.label : undefined,
      network: purpose === "routed" ? selectedLink.network : undefined,
      accessVlan: purpose === "access" ? selectedLink.accessVlan : undefined,
      trunkVlans: purpose === "trunk" ? selectedLink.trunkVlans : undefined,
    });
  };
  const handleConnectionPointerDown = (
    event: React.PointerEvent,
    deviceId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = canvasRef.current?.getBoundingClientRect();
    const originId =
      connectionStartId && connectionStartId !== deviceId
        ? connectionStartId
        : deviceId;
    const device = topology.devices.find((item) => item.id === originId);
    if (!bounds || !device) return;
    setConnectionStartId(originId);
    setConnectionPointer({ x: device.x, y: device.y });
    const move = (next: PointerEvent) =>
      setConnectionPointer({
        x: Math.max(
          0,
          Math.min(
            1,
            (next.clientX - bounds.left - canvasPan.x) / bounds.width,
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            1,
            (next.clientY - bounds.top - canvasPan.y) / bounds.height,
          ),
        ),
      });
    const stop = (next: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      const target = document
        .elementFromPoint(next.clientX, next.clientY)
        ?.closest<HTMLElement>("[data-topology-device-id]");
      const targetId = target?.dataset.topologyDeviceId;
      if (targetId && targetId !== originId) {
        connectionJustCreatedRef.current = true;
        createAutomaticConnection(originId, targetId);
      } else {
        setConnectionStartId(originId);
        setConnectionPointer(undefined);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
  const panCanvas = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || connectionMode) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-topology-interactive]")) return;
    event.preventDefault();
    const origin = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: canvasPan.x,
      panY: canvasPan.y,
    };
    const maximumX = Math.max(120, canvasViewport.width * 0.8);
    const maximumY = Math.max(120, canvasViewport.height * 0.8);
    setCanvasPanning(true);
    const move = (next: PointerEvent) =>
      setCanvasPan({
        x: Math.max(
          -maximumX,
          Math.min(maximumX, origin.panX + next.clientX - origin.pointerX),
        ),
        y: Math.max(
          -maximumY,
          Math.min(maximumY, origin.panY + next.clientY - origin.pointerY),
        ),
      });
    const stop = () => {
      setCanvasPanning(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };
  const drag = (event: React.PointerEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const nodeBounds = event.currentTarget.getBoundingClientRect();
    const minimumX = nodeBounds.width / 2 / bounds.width;
    const maximumX = 1 - minimumX;
    const minimumY = nodeBounds.height / 2 / bounds.height;
    const maximumY = 1 - minimumY;
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (next: PointerEvent) =>
      setTopology((value) => ({
        ...value,
        devices: value.devices.map((device) =>
          device.id === id
            ? {
                ...device,
                x: Math.max(
                  minimumX,
                  Math.min(
                    maximumX,
                    (next.clientX - bounds.left - canvasPan.x) / bounds.width,
                  ),
                ),
                y: Math.max(
                  minimumY,
                  Math.min(
                    maximumY,
                    (next.clientY - bounds.top - canvasPan.y) / bounds.height,
                  ),
                ),
              }
            : device,
        ),
      }));
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
  const save = async () => {
    if (saving) return;
    if (issues.some((issue) => issue.severity === "error"))
      return setNotice("Resolve the topology errors before saving.");
    setSaving(true);
    setNotice(undefined);
    try {
      const saved = await api.saveWorkshopTopology({
        ...row,
        definition: topology as unknown as Record<string, unknown>,
      });
      onSaved(saved);
      setNotice("Topology saved.");
    } catch (reason) {
      setNotice(
        reason instanceof Error
          ? reason.message
          : "The topology could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mt-2 grid">
      <div className="grid gap-3 border-b border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid min-w-[150px] gap-1">
            <strong>READ-ONLY TOPOLOGY</strong>
            <span className="text-[0.65rem] text-muted">
              {topology.devices.length} of 12 devices
            </span>
          </div>
          <Button disabled={saving} onClick={() => void save()} tone="primary">
            <Save />
            {saving ? "SAVING..." : "SAVE TOPOLOGY"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            aria-label="Add a device"
            className="flex flex-wrap items-center gap-1.5 rounded-control border border-line bg-canvas p-1.5"
            role="group"
          >
            {devicePalette.map(({ type, label }) => (
              <button
                aria-label={`Add ${label} to topology`}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] border border-transparent bg-raised px-3 text-[0.68rem] font-semibold text-copy transition-colors hover:border-signal-orange/60 hover:bg-signal-orange-soft hover:text-[#f1ae78] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                disabled={topology.devices.length >= 12}
                key={type}
                onClick={() => addDevice(type)}
                title={
                  topology.devices.length >= 12
                    ? "This topology already has 12 devices."
                    : `Add ${label}`
                }
                type="button"
              >
                <DeviceIcon type={type} />
                {label}
                <Plus aria-hidden="true" className="ml-0.5 size-3! text-muted" />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setStartersOpen(true)} tone="outline">
              <Sparkles /> USE NETWORK TEMPLATE
            </Button>
            <Button
              disabled={canvasPan.x === 0 && canvasPan.y === 0}
              onClick={() => setCanvasPan({ x: 0, y: 0 })}
              tone="ghost"
            >
              <RotateCcw /> RESET VIEW
            </Button>
            <Button
              disabled={topology.devices.length < 2}
              onClick={() => {
                setConnectionMode((value) => !value);
                setConnectionStartId(undefined);
                setConnectionPointer(undefined);
              }}
              tone={connectionMode ? "primary" : "secondary"}
            >
              <Cable /> {connectionMode ? "DONE CONNECTING" : "CONNECT DEVICES"}
            </Button>
          </div>
        </div>
      </div>
      <Notice
        message={notice}
        error={notice?.includes("error") || notice?.includes("Resolve")}
        onDismiss={() => setNotice(undefined)}
      />
      {connectionMode ? (
        <div
          className="border-b border-signal-orange/50 bg-signal-orange-soft px-4 py-3 text-xs text-[#f1ae78]"
          role="status"
        >
          Drag from one device to another, or tap the first device and then the
          second. Physical ports are assigned automatically.
        </div>
      ) : null}
      <div
        className={`mt-4 grid h-[clamp(480px,62vw,680px)] grid-cols-[minmax(0,1fr)_340px] items-stretch overflow-hidden border border-line max-xl:h-auto max-xl:grid-cols-1 ${
          topology.links.length ? "rounded-t-panel" : "rounded-panel"
        }`}
      >
        <div
          className={`relative h-full min-h-0 w-full touch-none overflow-hidden bg-canvas bg-[image:var(--nb-grid)] bg-[size:24px_24px] max-xl:h-[clamp(480px,62vw,680px)] max-sm:h-[clamp(400px,105vw,560px)] ${canvasPanning ? "cursor-grabbing" : "cursor-grab"}`}
          ref={canvasRef}
          aria-label={topology.accessibilityDescription}
          onPointerDown={panCanvas}
          style={{ backgroundPosition: `${canvasPan.x}px ${canvasPan.y}px` }}
        >
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `translate3d(${canvasPan.x}px, ${canvasPan.y}px, 0)`,
            }}
          >
            <svg
              aria-hidden="true"
              className="absolute inset-0 size-full overflow-visible [&_line]:[vector-effect:non-scaling-stroke]"
              viewBox={`0 0 ${Math.max(1, canvasViewport.width)} ${Math.max(1, canvasViewport.height)}`}
              preserveAspectRatio="none"
            >
              {cableGeometry.map((cable) => {
                const link = topology.links.find(
                  (item) => item.id === cable.linkId,
                );
                return link ? (
                  <g key={cable.linkId}>
                    <line
                      className={`pointer-events-none [stroke-width:1.5] ${
                        link.state === "down"
                          ? "stroke-signal-red"
                          : selectedLinkId === link.id
                            ? "stroke-signal-orange"
                            : "stroke-signal-green"
                      }`}
                      x1={cable.start.x}
                      y1={cable.start.y}
                      x2={cable.end.x}
                      y2={cable.end.y}
                    />
                    <line
                      className="cursor-pointer stroke-transparent [pointer-events:stroke] [stroke-width:18]"
                      data-topology-interactive="true"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedLinkId(link.id);
                      }}
                      x1={cable.start.x}
                      y1={cable.start.y}
                      x2={cable.end.x}
                      y2={cable.end.y}
                    />
                  </g>
                ) : null;
              })}
              {connectionStartId && connectionPointer
                ? (() => {
                    const from = topology.devices.find(
                      (device) => device.id === connectionStartId,
                    );
                    return from ? (
                      <line
                        className="pointer-events-none stroke-signal-orange [stroke-dasharray:2_1] [stroke-width:1.5]"
                        x1={from.x * canvasViewport.width}
                        y1={from.y * canvasViewport.height}
                        x2={connectionPointer.x * canvasViewport.width}
                        y2={connectionPointer.y * canvasViewport.height}
                      />
                    ) : null;
                  })()
                : null}
            </svg>
            {labels.map((label) => {
              const position = {
                left: label.x,
                top: label.y,
                minWidth: label.width,
                minHeight: label.height,
              };
              const baseClass =
                "absolute z-[3] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[3px] border py-1 font-mono text-[0.62rem] font-semibold leading-none text-white shadow-[0_1px_4px_rgba(0,0,0,.7)]";
              return label.kind === "endpoint" ? (
                <span
                  aria-hidden="true"
                  className={`${baseClass} pointer-events-none border-[#6f6673] bg-[#111013] px-1`}
                  key={label.id}
                  style={position}
                >
                  {label.text}
                </span>
              ) : (
                <button
                  aria-label={`Inspect connection ${label.text}`}
                  className={`${baseClass} px-2 ${label.tone === "warning" ? "border-signal-orange bg-[#2b1c12] hover:border-white" : "border-[#6f6673] bg-[#211d24] hover:border-signal-orange"}`}
                  data-topology-interactive="true"
                  key={label.id}
                  onClick={() => {
                    setSelectedLinkId(label.linkId);
                  }}
                  style={position}
                  type="button"
                >
                  {label.text}
                </button>
              );
            })}
            {topology.devices.map((device) => (
              <button
                data-topology-device-id={device.id}
                data-topology-interactive="true"
                key={device.id}
                className={`absolute z-[2] grid w-24 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center gap-1 rounded-control border p-2 text-copy active:cursor-grabbing ${selectedId === device.id ? "border-signal-orange bg-signal-orange-soft" : "border-line bg-raised"}`}
                style={{
                  left: `${device.x * 100}%`,
                  top: `${device.y * 100}%`,
                }}
                onPointerDown={(event) =>
                  connectionMode
                    ? handleConnectionPointerDown(event, device.id)
                    : drag(event, device.id)
                }
                onClick={() => {
                  if (connectionJustCreatedRef.current) {
                    connectionJustCreatedRef.current = false;
                    return;
                  }
                  if (!connectionMode) return chooseDevice(device.id);
                  if (!connectionStartId)
                    return setConnectionStartId(device.id);
                  if (connectionStartId !== device.id)
                    createAutomaticConnection(connectionStartId, device.id);
                }}
              >
                <DeviceIcon type={device.type} />
                <strong>{device.name}</strong>
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 z-[4] rounded-control border border-line bg-canvas/90 px-3 py-2 font-mono text-[0.58rem] text-muted shadow-sm">
            DRAG EMPTY SPACE TO PAN
          </div>
        </div>
        {selected ? (
          <TopologyDeviceEditor
            device={selected}
            update={updateDevice}
            onAddInterface={() => setInterfaceDeviceId(selected.id)}
            isInterfaceConnected={(interfaceId) =>
              topology.links.some(
                (link) =>
                  (link.fromDeviceId === selected.id &&
                    link.fromInterfaceId === interfaceId) ||
                  (link.toDeviceId === selected.id &&
                    link.toInterfaceId === interfaceId),
              )
            }
            onRemoveInterface={(interfaceId) =>
              updateDevice({
                interfaces: selected.interfaces.filter(
                  (item) => item.id !== interfaceId,
                ),
              })
            }
            onConnect={() => openConnection(selected.id)}
            onRemove={() => {
              setTopology((value) => ({
                ...value,
                devices: value.devices.filter(
                  (device) => device.id !== selected.id,
                ),
                links: value.links.filter(
                  (link) =>
                    link.fromDeviceId !== selected.id &&
                    link.toDeviceId !== selected.id,
                ),
              }));
              setSelectedId(undefined);
            }}
          />
        ) : (
          <aside className="grid h-full min-h-0 content-center justify-items-center gap-3 overflow-y-auto border-l border-line bg-sidebar p-8 text-center text-sm text-muted max-xl:h-auto max-xl:border-l-0 max-xl:border-t max-xl:overflow-visible">
            <Cable className="size-8" />
            <strong className="text-copy">Select a device or connection</strong>
            <p className="m-0 max-w-xs leading-6">
              Configure a device, inspect a cable, or use Connect Devices to
              draw a cable automatically.
            </p>
          </aside>
        )}
      </div>
      {topology.links.length ? (
        <section className="grid grid-cols-[280px_minmax(0,1fr)] overflow-hidden rounded-b-panel border border-t-0 border-line max-lg:grid-cols-1">
          <nav className="grid content-start gap-2 border-r border-line bg-sidebar p-4 max-lg:border-b max-lg:border-r-0" aria-label="Topology connections">
            <strong className="mb-1 font-mono text-[0.68rem] tracking-[0.08em] text-copy">CONNECTIONS</strong>
            {topology.links.map((link) => {
              const from = connectionEndpoint(link, "from");
              const to = connectionEndpoint(link, "to");
              const context = deriveWorkshopLinkContext(topology, link);
              return (
                <button
                  className={`grid min-h-16 gap-1 rounded-control border px-3 py-2 text-left ${
                    selectedLinkId === link.id
                      ? "border-signal-orange bg-signal-orange-soft text-copy"
                      : "border-transparent text-muted hover:border-line hover:bg-raised"
                  }`}
                  key={link.id}
                  onClick={() => {
                    setSelectedLinkId(link.id);
                  }}
                  type="button"
                >
                  <span className="text-xs font-semibold text-copy">
                    {from.deviceName} {from.interfaceName} — {to.deviceName}{" "}
                    {to.interfaceName}
                  </span>
                  <span className="font-mono text-[0.62rem] text-muted">
                    {context.label} · {(link.state ?? "up").toUpperCase()}
                  </span>
                </button>
              );
            })}
          </nav>
          {selectedLink ? (
            <div className="grid gap-5 p-5">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
                <div className="grid gap-1">
                  <span className="font-mono text-[0.62rem] tracking-[0.08em] text-signal-orange">SELECTED CONNECTION</span>
                  <strong className="text-base text-copy">
                    {connectionEndpoint(selectedLink, "from").deviceName}{" "}
                    {connectionEndpoint(selectedLink, "from").interfaceName} —{" "}
                    {connectionEndpoint(selectedLink, "to").deviceName}{" "}
                    {connectionEndpoint(selectedLink, "to").interfaceName}
                  </strong>
                  {hasWorkshopLinkPurposeConflict(selectedLink) ? (
                    <span className="text-xs text-[#f1ae78]">Needs attention: choose one connection purpose.</span>
                  ) : null}
                </div>
                <Button
                  onClick={() => {
                    setEditingLinkId(selectedLink.id);
                    setConnectionKey((value) => value + 1);
                    setConnectionOpen(true);
                  }}
                  size="compact"
                  tone="outline"
                >
                  <Cable />Change endpoints
                </Button>
              </header>

              <fieldset className="grid gap-3">
                <legend className="mb-2 text-xs font-semibold text-copy">What does this connection carry?</legend>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {(
                    [
                      ["basic", "Basic Ethernet link", "A physical link without routed or VLAN context."],
                      ["routed", "Routed network", "Show a network such as 192.168.10.0/24."],
                      ["access", "Access VLAN", "Connect one endpoint to a single VLAN."],
                      ["trunk", "VLAN trunk", "Carry multiple allowed VLANs."],
                    ] as const
                  ).map(([purpose, title, description]) => (
                    <button
                      aria-pressed={selectedLink.purpose === purpose || (!selectedLink.purpose && !hasWorkshopLinkPurposeConflict(selectedLink) && deriveWorkshopLinkPurpose(selectedLink, topology) === purpose)}
                      className={`grid min-h-20 gap-1 rounded-control border p-3 text-left ${
                        selectedLink.purpose === purpose || (!selectedLink.purpose && !hasWorkshopLinkPurposeConflict(selectedLink) && deriveWorkshopLinkPurpose(selectedLink, topology) === purpose)
                          ? "border-signal-green bg-signal-green-soft"
                          : "border-line bg-canvas hover:border-signal-orange"
                      }`}
                      key={purpose}
                      onClick={() => changeLinkPurpose(purpose)}
                      type="button"
                    >
                      <strong className="text-xs text-copy">{title}</strong>
                      <span className="text-[0.68rem] leading-4 text-muted">{description}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                {(selectedLink.purpose ?? deriveWorkshopLinkPurpose(selectedLink, topology)) === "basic" ? (
                  <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
                    Learner-facing caption (optional)
                    <input placeholder="WAN link" value={selectedLink.label ?? ""} onChange={(event) => updateLink({ label: event.target.value || undefined })} />
                    <small className="font-normal leading-5 text-muted">Use a short description only when it helps explain the diagram.</small>
                  </label>
                ) : null}
                {(selectedLink.purpose ?? deriveWorkshopLinkPurpose(selectedLink, topology)) === "routed" ? (
                  <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
                    Network and prefix
                    <input placeholder="192.168.10.0/24" value={selectedLink.network ?? ""} onChange={(event) => updateLink({ network: event.target.value || undefined })} />
                    <small className="font-normal leading-5 text-muted">Example: 10.0.12.0/30</small>
                  </label>
                ) : null}
                {(selectedLink.purpose ?? deriveWorkshopLinkPurpose(selectedLink, topology)) === "access" ? (
                  <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
                    Access VLAN ID
                    <input type="number" min="1" max="4094" placeholder="10" value={selectedLink.accessVlan ?? ""} onChange={(event) => updateLink({ accessVlan: event.target.value ? Number(event.target.value) : undefined })} />
                    <small className="font-normal leading-5 text-muted">One untagged VLAN for this access connection.</small>
                  </label>
                ) : null}
                {(selectedLink.purpose ?? deriveWorkshopLinkPurpose(selectedLink, topology)) === "trunk" ? (
                  <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
                    Allowed VLAN IDs
                    <input placeholder="10, 20" value={selectedLink.trunkVlans?.join(", ") ?? ""} onChange={(event) => updateLink({ trunkVlans: event.target.value.split(",").map((item) => Number(item.trim())).filter((value) => Number.isInteger(value) && value > 0) })} />
                    <small className="font-normal leading-5 text-muted">Separate multiple VLAN IDs with commas.</small>
                  </label>
                ) : null}
                <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
                  Connection state
                  <select value={selectedLink.state ?? "up"} onChange={(event) => updateLink({ state: event.target.value as "up" | "down" })}>
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                  </select>
                  <small className="font-normal leading-5 text-muted">Use Down only for an intentional fault or troubleshooting example.</small>
                </label>
              </div>

              <section className="mt-1 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                <div>
                  <strong className="block text-xs text-copy">Remove this connection</strong>
                  <span className="text-[0.68rem] text-muted">This removes only the cable, not either device.</span>
                </div>
                <Button
                  onClick={() => {
                    const from = connectionEndpoint(selectedLink, "from");
                    const to = connectionEndpoint(selectedLink, "to");
                    if (!window.confirm(`Remove the connection from ${from.deviceName} ${from.interfaceName} to ${to.deviceName} ${to.interfaceName}?`)) return;
                    setTopology((value) => ({ ...value, links: value.links.filter((link) => link.id !== selectedLink.id) }));
                    setSelectedLinkId(undefined);
                  }}
                  tone="destructive"
                >
                  Remove connection
                </Button>
              </section>
            </div>
          ) : (
            <p className="p-5 text-sm text-muted">
              Select a connection to add its learner-facing network or VLAN
              information.
            </p>
          )}
        </section>
      ) : null}
      {issues.length ? (
        <section className="grid gap-3 rounded-panel border border-line bg-canvas p-4">
          <div className="grid gap-2">
            {issues.map((issue) => (
              <div
                className="flex items-start gap-3 rounded-control border border-line bg-raised px-3 py-3"
                key={`${issue.path}-${issue.message}`}
              >
                <AlertTriangle
                  aria-hidden="true"
                  className={`mt-0.5 size-4 shrink-0 ${
                    issue.severity === "error"
                      ? "text-signal-red"
                      : "text-signal-orange"
                  }`}
                />
                <div className="grid min-w-0 gap-1">
                  <strong className="font-mono text-[0.62rem] tracking-[0.08em] text-signal-orange">
                    {issue.severity.toUpperCase()}
                  </strong>
                  <span className="text-xs leading-5 text-copy">
                    {issue.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {issues.some((issue) => issue.severity === "warning") ? (
            <div className="flex min-h-14 items-start gap-3 rounded-control border border-line bg-sidebar px-4 py-3">
              <Checkbox
                id="topology-warning-acknowledgment"
                checked={topology.warningsAcknowledged === true}
                onCheckedChange={(checked) =>
                  setTopology((value) => ({
                    ...value,
                    warningsAcknowledged: checked === true,
                  }))
                }
              />
              <label
                className="grid cursor-pointer gap-1 text-xs"
                htmlFor="topology-warning-acknowledgment"
              >
                <strong className="text-copy">Use this as a teaching example</strong>
                <span className="leading-5 text-muted">
                  I reviewed these warnings and intend to publish this configuration.
                </span>
              </label>
            </div>
          ) : null}
        </section>
      ) : null}
      <ConnectDevicesDialog
        key={connectionKey}
        editingLink={topology.links.find((link) => link.id === editingLinkId)}
        initialDeviceId={editingLinkId ? undefined : selectedId}
        onCreate={(link) => {
          setTopology((value) => ({
            ...value,
            links: editingLinkId
              ? value.links.map((item) => (item.id === editingLinkId ? link : item))
              : [...value.links, link],
          }));
          setSelectedLinkId(link.id);
          setEditingLinkId(undefined);
        }}
        onOpenChange={(open) => {
          setConnectionOpen(open);
          if (!open) setEditingLinkId(undefined);
        }}
        onRequestInterface={(deviceId) => {
          setConnectionOpen(false);
          setResumeConnectionAfterInterface(true);
          setInterfaceDeviceId(deviceId);
        }}
        open={connectionOpen}
        topology={topology}
      />
      {interfaceDeviceId ? (
        <AddInterfaceDialog
          device={topology.devices.find(
            (device) => device.id === interfaceDeviceId,
          )!}
          onAdd={(networkInterface) => {
            setTopology((value) => ({
              ...value,
              devices: value.devices.map((device) =>
                device.id === interfaceDeviceId
                  ? {
                      ...device,
                      interfaces: [...device.interfaces, networkInterface],
                    }
                  : device,
              ),
            }));
            setSelectedId(interfaceDeviceId);
            if (resumeConnectionAfterInterface) setConnectionOpen(true);
            setResumeConnectionAfterInterface(false);
          }}
          onOpenChange={(open) => {
            if (!open) {
              setInterfaceDeviceId(undefined);
              if (!resumeConnectionAfterInterface)
                setResumeConnectionAfterInterface(false);
            }
          }}
          open
        />
      ) : null}
      <StarterTopologyDialog
        onChoose={(starterId: WorkshopTopologyStarterId) => {
          if (
            topology.devices.length &&
            !window.confirm(
              "Replace the current draft topology with this editable starter? This cannot be undone after you save.",
            )
          )
            return;
          setTopology(createWorkshopTopologyStarter(starterId, topology.id));
          setCanvasPan({ x: 0, y: 0 });
          setSelectedId(undefined);
          setSelectedLinkId(undefined);
          setStartersOpen(false);
        }}
        onOpenChange={setStartersOpen}
        open={startersOpen}
      />
    </div>
  );
}
