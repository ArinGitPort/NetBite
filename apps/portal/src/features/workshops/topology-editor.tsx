import {
  Cable,
  Monitor,
  Network,
  Plus,
  Router,
  Save,
  Server,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import type {
  WorkshopTopology,
  WorkshopTopologyDevice,
} from "@netbite/workshops/contracts";
import { validateWorkshopTopology } from "@netbite/workshops/contracts";
import * as api from "../../lib/content-api";
import type { WorkshopTopologyRow } from "../../lib/content-api";

function Notice({
  message,
  error = false,
}: {
  message?: string;
  error?: boolean;
}) {
  return message ? (
    <div
      className={
        error
          ? "mb-4 rounded-control border border-signal-red/60 bg-signal-red-soft p-3 text-sm text-[#ff9da1]"
          : "mb-4 rounded-control border border-signal-green/60 bg-signal-green-soft p-3 text-sm text-[#abd2c8]"
      }
      role="status"
    >
      {message}
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
    row.definition as unknown as WorkshopTopology,
  );
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedLinkId, setSelectedLinkId] = useState<string>();
  const [connectFrom, setConnectFrom] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const selected = topology.devices.find((device) => device.id === selectedId);
  const selectedLink = topology.links.find(
    (link) => link.id === selectedLinkId,
  );
  const issues = validateWorkshopTopology(topology);

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
        { id: "e0", name: type === "router" ? "G0/0" : "E0", state: "up" },
      ],
      routes: [],
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
    if (connectFrom && connectFrom !== id) {
      const from = topology.devices.find(
        (device) => device.id === connectFrom,
      )!;
      const to = topology.devices.find((device) => device.id === id)!;
      const fromInterface = from.interfaces.find(
        (item) =>
          !topology.links.some(
            (link) =>
              (link.fromDeviceId === from.id &&
                link.fromInterfaceId === item.id) ||
              (link.toDeviceId === from.id && link.toInterfaceId === item.id),
          ),
      );
      const toInterface = to.interfaces.find(
        (item) =>
          !topology.links.some(
            (link) =>
              (link.fromDeviceId === to.id &&
                link.fromInterfaceId === item.id) ||
              (link.toDeviceId === to.id && link.toInterfaceId === item.id),
          ),
      );
      if (!fromInterface || !toInterface)
        setNotice(
          "Add an unused interface to both devices before connecting them.",
        );
      else
        setTopology((value) => ({
          ...value,
          links: [
            ...value.links,
            {
              id: `link-${crypto.randomUUID()}`,
              fromDeviceId: from.id,
              fromInterfaceId: fromInterface.id,
              toDeviceId: to.id,
              toInterfaceId: toInterface.id,
            },
          ],
        }));
      setConnectFrom(undefined);
    }
    setSelectedId(id);
  };
  const drag = (event: React.PointerEvent, id: string) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (next: PointerEvent) =>
      setTopology((value) => ({
        ...value,
        devices: value.devices.map((device) =>
          device.id === id
            ? {
                ...device,
                x: Math.max(
                  0.06,
                  Math.min(0.94, (next.clientX - bounds.left) / bounds.width),
                ),
                y: Math.max(
                  0.1,
                  Math.min(0.9, (next.clientY - bounds.top) / bounds.height),
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
    <div className="grid">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <div className="mr-auto grid min-w-[150px] gap-1">
          <strong>READ-ONLY TOPOLOGY</strong>
          <span className="text-[0.65rem] text-muted">
            {topology.devices.length} of 12 devices
          </span>
        </div>
        <div
          aria-label="Add a device"
          className="flex flex-wrap items-center gap-1.5 rounded-control border border-line bg-canvas p-1.5"
          role="group"
        >
          <span className="px-2 font-mono text-[0.58rem] font-semibold tracking-[0.08em] text-muted">
            ADD DEVICE
          </span>
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
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
          disabled={saving}
          onClick={() => void save()}
        >
          <Save />
          {saving ? "SAVING..." : "SAVE TOPOLOGY"}
        </button>
      </div>
      <Notice
        message={notice}
        error={notice?.includes("error") || notice?.includes("Resolve")}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_340px] overflow-hidden rounded-panel border border-line max-xl:grid-cols-1">
        <div
          className="relative min-h-[560px] touch-none overflow-hidden bg-canvas bg-[image:var(--nb-grid)] bg-[size:24px_24px] max-sm:min-h-[400px]"
          ref={canvasRef}
          aria-label={topology.accessibilityDescription}
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full overflow-visible [&_line]:stroke-signal-green [&_line]:[stroke-width:.55] [&_line]:[vector-effect:non-scaling-stroke]"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {topology.links.map((link) => {
              const from = topology.devices.find(
                (d) => d.id === link.fromDeviceId,
              );
              const to = topology.devices.find((d) => d.id === link.toDeviceId);
              return from && to ? (
                <line
                  key={link.id}
                  x1={from.x * 100}
                  y1={from.y * 100}
                  x2={to.x * 100}
                  y2={to.y * 100}
                />
              ) : null;
            })}
          </svg>
          {topology.devices.map((device) => (
            <button
              key={device.id}
              className={`absolute z-[2] grid w-24 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center gap-1 rounded-control border p-2 text-copy active:cursor-grabbing ${selectedId === device.id ? "border-signal-orange bg-signal-orange-soft" : "border-line bg-raised"}`}
              style={{ left: `${device.x * 100}%`, top: `${device.y * 100}%` }}
              onPointerDown={(event) => drag(event, device.id)}
              onClick={() => chooseDevice(device.id)}
            >
              <DeviceIcon type={device.type} />
              <strong>{device.name}</strong>
            </button>
          ))}
        </div>
        <aside className="grid content-start gap-4 border-l border-line bg-sidebar p-5 max-xl:border-l-0 max-xl:border-t">
          {selected ? (
            <>
              <h3>{selected.name}</h3>
              <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
                <span>Device name</span>
                <input
                  value={selected.name}
                  onChange={(event) =>
                    updateDevice({ name: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
                <span>Instructor note</span>
                <textarea
                  rows={3}
                  value={selected.notes ?? ""}
                  onChange={(event) =>
                    updateDevice({ notes: event.target.value })
                  }
                />
              </label>
              <h4>Interfaces</h4>
              {selected.interfaces.map((iface, index) => (
                <div
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
                  key={iface.id}
                >
                  <input
                    aria-label="Interface name"
                    value={iface.name}
                    onChange={(event) =>
                      updateDevice({
                        interfaces: selected.interfaces.map((item, i) =>
                          i === index
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label="IPv4 address"
                    placeholder="192.168.10.1"
                    value={iface.ipv4Address ?? ""}
                    onChange={(event) =>
                      updateDevice({
                        interfaces: selected.interfaces.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                ipv4Address: event.target.value || undefined,
                              }
                            : item,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label="Prefix"
                    type="number"
                    min="0"
                    max="32"
                    placeholder="24"
                    value={iface.prefix ?? ""}
                    onChange={(event) =>
                      updateDevice({
                        interfaces: selected.interfaces.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                prefix: event.target.value
                                  ? Number(event.target.value)
                                  : undefined,
                              }
                            : item,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label="Default gateway"
                    placeholder="Gateway"
                    value={iface.gateway ?? ""}
                    onChange={(event) =>
                      updateDevice({
                        interfaces: selected.interfaces.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                gateway: event.target.value || undefined,
                              }
                            : item,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label="Access VLAN"
                    type="number"
                    min="1"
                    max="4094"
                    placeholder="VLAN"
                    value={iface.vlan ?? ""}
                    onChange={(event) =>
                      updateDevice({
                        interfaces: selected.interfaces.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                vlan: event.target.value
                                  ? Number(event.target.value)
                                  : undefined,
                              }
                            : item,
                        ),
                      })
                    }
                  />
                  <select
                    aria-label="Interface state"
                    value={iface.state}
                    onChange={(event) =>
                      updateDevice({
                        interfaces: selected.interfaces.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                state: event.target.value as "up" | "down",
                              }
                            : item,
                        ),
                      })
                    }
                  >
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                  </select>
                </div>
              ))}
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                onClick={() =>
                  updateDevice({
                    interfaces: [
                      ...selected.interfaces,
                      {
                        id: `e${selected.interfaces.length}`,
                        name:
                          selected.type === "router"
                            ? `G0/${selected.interfaces.length}`
                            : `E${selected.interfaces.length}`,
                        state: "up",
                      },
                    ],
                  })
                }
              >
                <Plus />
                ADD INTERFACE
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-orange/60 bg-signal-orange-soft px-4 text-xs font-semibold text-[#f1ae78] hover:border-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                onClick={() => setConnectFrom(selected.id)}
              >
                <Cable />
                {connectFrom === selected.id
                  ? "SELECT OTHER DEVICE"
                  : "CONNECT DEVICE"}
              </button>
              {selected.type === "router" ? (
                <>
                  <h4>Static routes</h4>
                  {(selected.routes ?? []).map((route, index) => (
                    <div
                      className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_80px_1.2fr]"
                      key={`${route.destination}-${index}`}
                    >
                      <input
                        aria-label="Route destination"
                        placeholder="192.168.20.0"
                        value={route.destination}
                        onChange={(event) =>
                          updateDevice({
                            routes: (selected.routes ?? []).map(
                              (item, current) =>
                                current === index
                                  ? { ...item, destination: event.target.value }
                                  : item,
                            ),
                          })
                        }
                      />
                      <input
                        aria-label="Route prefix"
                        type="number"
                        min="0"
                        max="32"
                        value={route.prefix}
                        onChange={(event) =>
                          updateDevice({
                            routes: (selected.routes ?? []).map(
                              (item, current) =>
                                current === index
                                  ? {
                                      ...item,
                                      prefix: Number(event.target.value),
                                    }
                                  : item,
                            ),
                          })
                        }
                      />
                      <input
                        aria-label="Route next hop"
                        placeholder="10.0.0.2"
                        value={route.nextHop}
                        onChange={(event) =>
                          updateDevice({
                            routes: (selected.routes ?? []).map(
                              (item, current) =>
                                current === index
                                  ? { ...item, nextHop: event.target.value }
                                  : item,
                            ),
                          })
                        }
                      />
                    </div>
                  ))}
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                    onClick={() =>
                      updateDevice({
                        routes: [
                          ...(selected.routes ?? []),
                          { destination: "", prefix: 24, nextHop: "" },
                        ],
                      })
                    }
                  >
                    <Plus />
                    ADD ROUTE
                  </button>
                </>
              ) : null}
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-red/60 bg-signal-red-soft px-4 text-xs font-semibold text-[#ff858a] hover:border-signal-red disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                onClick={() => {
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
              >
                <Trash2 />
                REMOVE DEVICE
              </button>
            </>
          ) : (
            <p>
              Select a device to edit its display information. Students can
              inspect this information but cannot change it.
            </p>
          )}
        </aside>
      </div>
      {topology.links.length ? (
        <section className="grid grid-cols-[220px_minmax(0,1fr)] border border-t-0 border-line max-lg:grid-cols-1">
          <div className="grid content-start gap-2 border-r border-line bg-sidebar p-4 max-lg:border-b max-lg:border-r-0 [&>button]:min-h-10 [&>button]:rounded-control [&>button]:border [&>button]:border-transparent [&>button]:px-3 [&>button]:text-left [&>button]:text-muted">
            <strong>CONNECTIONS</strong>
            {topology.links.map((link, index) => (
              <button
                className={
                  selectedLinkId === link.id
                    ? "border-signal-green! bg-signal-green-soft! text-copy!"
                    : ""
                }
                key={link.id}
                onClick={() => setSelectedLinkId(link.id)}
              >
                CONNECTION {index + 1}
              </button>
            ))}
          </div>
          {selectedLink ? (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
                <span>Visible connection label</span>
                <input
                  value={selectedLink.label ?? ""}
                  onChange={(event) =>
                    updateLink({ label: event.target.value || undefined })
                  }
                />
              </label>
              <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
                <span>Connection state</span>
                <select
                  value={selectedLink.state ?? "up"}
                  onChange={(event) =>
                    updateLink({ state: event.target.value as "up" | "down" })
                  }
                >
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                </select>
              </label>
              <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
                <span>Network and prefix</span>
                <input
                  placeholder="192.168.10.0/24"
                  value={selectedLink.network ?? ""}
                  onChange={(event) =>
                    updateLink({ network: event.target.value || undefined })
                  }
                />
              </label>
              <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
                <span>Access VLAN</span>
                <input
                  type="number"
                  min="1"
                  max="4094"
                  value={selectedLink.accessVlan ?? ""}
                  onChange={(event) =>
                    updateLink({
                      accessVlan: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    })
                  }
                />
              </label>
              <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
                <span>Trunk VLANs</span>
                <input
                  placeholder="10, 20"
                  value={selectedLink.trunkVlans?.join(", ") ?? ""}
                  onChange={(event) =>
                    updateLink({
                      trunkVlans: event.target.value
                        .split(",")
                        .map((item) => Number(item.trim()))
                        .filter(
                          (value) => Number.isInteger(value) && value > 0,
                        ),
                    })
                  }
                />
              </label>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-red/60 bg-signal-red-soft px-4 text-xs font-semibold text-[#ff858a] hover:border-signal-red disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                onClick={() => {
                  setTopology((value) => ({
                    ...value,
                    links: value.links.filter(
                      (link) => link.id !== selectedLink.id,
                    ),
                  }));
                  setSelectedLinkId(undefined);
                }}
              >
                REMOVE CONNECTION
              </button>
            </div>
          ) : (
            <p>
              Select a connection to add its learner-facing network or VLAN
              information.
            </p>
          )}
        </section>
      ) : null}
      {issues.length ? (
        <div className="grid gap-2 rounded-control border border-line bg-canvas p-4 [&_p]:m-0 [&_strong]:mr-2 [&_strong]:text-signal-orange">
          {issues.map((issue) => (
            <p key={`${issue.path}-${issue.message}`}>
              <strong>{issue.severity.toUpperCase()}</strong> {issue.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
