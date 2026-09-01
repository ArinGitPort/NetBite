import { Cable } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  WorkshopTopology,
  WorkshopTopologyDevice,
  WorkshopLinkPurpose,
} from "@netbite/workshops/contracts";
import { validateWorkshopTopology } from "@netbite/workshops/contracts";
import {
  calculateWorkshopTopologyGeometry,
  deriveWorkshopLinkPurpose,
  getAvailableConnectionInterfaces,
  normalizeWorkshopTopology,
  suggestWorkshopInterfaceName,
} from "@netbite/workshops/topology-authoring";
import type { WorkshopTopologyRow } from "@/lib/api/types";
import { TopologyConnectionWorkspace } from "@/features/workshops/topology-connection-workspace";
import { TopologyCanvas } from "@/features/workshops/topology-canvas";
import { TopologyDialogLayer } from "@/features/workshops/topology-dialog-layer";
import { TopologyNotice } from "@/features/workshops/topology-notice";
import { TopologyToolbar } from "@/features/workshops/topology-toolbar";
import { TopologyValidation } from "@/features/workshops/topology-validation";
import { useTopologyCanvasInteractions } from "@/features/workshops/hooks/use-topology-canvas-interactions";
import { useTopologyDraft } from "@/features/workshops/hooks/use-topology-draft";
export { defaultTopology } from "@/features/workshops/topology-model";

export function TopologyEditor({
  row,
  onSaved,
}: {
  row: WorkshopTopologyRow;
  onSaved: (value: WorkshopTopologyRow) => void;
}) {
  const initialTopology = normalizeWorkshopTopology(row.definition as unknown as WorkshopTopology);
  const [topology, setTopology] = useState(initialTopology);
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
  const { panCanvas, dragDevice } = useTopologyCanvasInteractions({
    canvasRef, connectionMode, pan: canvasPan, setPan: setCanvasPan,
    setPanning: setCanvasPanning, viewport: canvasViewport, setTopology,
  });
  const hasErrors = issues.some((issue) => issue.severity === "error");
  const { dirty, save, saving } = useTopologyDraft({
    row, topology, setTopology, hasErrors, setNotice, onSaved,
    clearSelection: () => {
      setSelectedId(undefined);
      setSelectedLinkId(undefined);
    },
  });
  return (
    <div className="mt-2 grid">
      <TopologyToolbar
        count={topology.devices.length}
        dirty={dirty}
        saving={saving}
        connectionMode={connectionMode}
        canReset={canvasPan.x !== 0 || canvasPan.y !== 0}
        onSave={() => void save()}
        onAdd={addDevice}
        onTemplate={() => setStartersOpen(true)}
        onReset={() => setCanvasPan({ x: 0, y: 0 })}
        onToggleConnection={() => {
          setConnectionMode((value) => !value);
          setConnectionStartId(undefined);
          setConnectionPointer(undefined);
        }}
      />
      <TopologyNotice
        message={notice}
        error={notice?.includes("error") || notice?.includes("Resolve")}
        onDismiss={() => setNotice(undefined)}
      />
      {connectionMode ? (
        <div
          className="border-b border-signal-orange/50 bg-signal-orange-soft px-4 py-3 text-xs text-signal-orange"
          role="status"
        >
          Drag from one device to another, or tap the first device and then the
          second. Physical ports are assigned automatically.
        </div>
      ) : null}
      <TopologyCanvas
        topology={topology}
        canvasRef={canvasRef}
        viewport={canvasViewport}
        pan={canvasPan}
        panning={canvasPanning}
        geometry={cableGeometry}
        labels={labels}
        selected={selected}
        selectedDeviceId={selectedId}
        selectedLinkId={selectedLinkId}
        connectionMode={connectionMode}
        connectionStartId={connectionStartId}
        connectionPointer={connectionPointer}
        onCanvasPointerDown={panCanvas}
        onLinkSelect={setSelectedLinkId}
        onDevicePointerDown={(event, id) =>
          connectionMode ? handleConnectionPointerDown(event, id) : dragDevice(event, id)
        }
        onDeviceClick={(id) => {
          if (connectionJustCreatedRef.current) {
            connectionJustCreatedRef.current = false;
            return;
          }
          if (!connectionMode) return chooseDevice(id);
          if (!connectionStartId) return setConnectionStartId(id);
          if (connectionStartId !== id) createAutomaticConnection(connectionStartId, id);
        }}
        onDeviceUpdate={updateDevice}
        onAddInterface={() => selected && setInterfaceDeviceId(selected.id)}
        isInterfaceConnected={(interfaceId) => Boolean(selected && topology.links.some(
          (link) => (link.fromDeviceId === selected.id && link.fromInterfaceId === interfaceId) ||
            (link.toDeviceId === selected.id && link.toInterfaceId === interfaceId),
        ))}
        onRemoveInterface={(interfaceId) => selected && updateDevice({
          interfaces: selected.interfaces.filter((item) => item.id !== interfaceId),
        })}
        onConnect={() => selected && openConnection(selected.id)}
        onRemoveDevice={() => {
          if (!selected) return;
          setTopology((value) => ({
            ...value,
            devices: value.devices.filter((device) => device.id !== selected.id),
            links: value.links.filter((link) => link.fromDeviceId !== selected.id && link.toDeviceId !== selected.id),
          }));
          setSelectedId(undefined);
        }}
      />      {topology.links.length ? (
        <TopologyConnectionWorkspace
          topology={topology}
          selectedLink={selectedLink}
          selectedLinkId={selectedLinkId}
          endpoint={connectionEndpoint}
          onSelect={setSelectedLinkId}
          onEditEndpoints={(linkId) => {
            setEditingLinkId(linkId);
            setConnectionKey((value) => value + 1);
            setConnectionOpen(true);
          }}
          onPurposeChange={changeLinkPurpose}
          onUpdate={updateLink}
          onRemove={(link) => {
            const from = connectionEndpoint(link, "from");
            const to = connectionEndpoint(link, "to");
            if (!window.confirm(`Remove the connection from ${from.deviceName} ${from.interfaceName} to ${to.deviceName} ${to.interfaceName}?`)) return;
            setTopology((value) => ({ ...value, links: value.links.filter((item) => item.id !== link.id) }));
            setSelectedLinkId(undefined);
          }}
        />
      ) : null}
      <TopologyValidation topology={topology} issues={issues} onChange={setTopology} />
      <TopologyDialogLayer
        topology={topology}
        setTopology={setTopology}
        connectionKey={connectionKey}
        editingLinkId={editingLinkId}
        selectedId={selectedId}
        connectionOpen={connectionOpen}
        setConnectionOpen={setConnectionOpen}
        setEditingLinkId={setEditingLinkId}
        setSelectedLinkId={setSelectedLinkId}
        setSelectedDeviceId={setSelectedId}
        interfaceDeviceId={interfaceDeviceId}
        setInterfaceDeviceId={setInterfaceDeviceId}
        resumeConnection={resumeConnectionAfterInterface}
        setResumeConnection={setResumeConnectionAfterInterface}
        startersOpen={startersOpen}
        setStartersOpen={setStartersOpen}
        setCanvasPan={setCanvasPan}
      />    </div>
  );
}
