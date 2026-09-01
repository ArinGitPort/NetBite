import { Cable, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  WorkshopDeviceInterface,
  WorkshopInterfaceKind,
  WorkshopTopology,
  WorkshopTopologyDevice,
  WorkshopTopologyLink,
  WorkshopTopologyStarterId,
} from "@netbite/workshops/contracts";
import {
  getAvailableConnectionInterfaces,
  suggestWorkshopInterfaceName,
  topologyStarters,
  validateWorkshopConnection,
} from "@netbite/workshops/topology-authoring";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InputField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select";

export function AddInterfaceDialog({
  device,
  open,
  onOpenChange,
  onAdd,
}: {
  device: WorkshopTopologyDevice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (networkInterface: WorkshopDeviceInterface) => void;
}) {
  const [kind, setKind] = useState<WorkshopInterfaceKind>("physical");
  const [parentInterfaceId, setParentInterfaceId] = useState("");
  const [vlan, setVlan] = useState("10");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [prefix, setPrefix] = useState("24");
  const suggestedName = suggestWorkshopInterfaceName(device, kind, parentInterfaceId || undefined, Number(vlan) || undefined);
  const physicalParents = device.interfaces.filter((item) => (item.kind ?? "physical") === "physical");
  const allowedKinds: Array<{ value: WorkshopInterfaceKind; label: string }> = [
    { value: "physical", label: "Physical interface" },
    ...(device.type === "router" ? [{ value: "subinterface" as const, label: "Router subinterface" }] : []),
    ...(device.type === "switch" ? [{ value: "svi" as const, label: "Switch virtual interface (SVI)" }, { value: "port-channel" as const, label: "Port-channel" }] : []),
  ];
  const canAdd = Boolean((name || suggestedName).trim()) && (kind !== "subinterface" || (parentInterfaceId && Number(vlan) >= 1 && Number(vlan) <= 4094));
  const submit = () => {
    if (!canAdd) return;
    onAdd({
      id: `interface-${crypto.randomUUID()}`,
      kind,
      name: (name || suggestedName).trim(),
      parentInterfaceId: kind === "subinterface" ? parentInterfaceId : undefined,
      encapsulationVlan: kind === "subinterface" || kind === "svi" ? Number(vlan) : undefined,
      ipv4Address: address.trim() || undefined,
      prefix: address.trim() && prefix ? Number(prefix) : undefined,
      state: "up",
    });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Add an interface to ${device.name}`} description="Choose the interface role first. NetBite will show only the settings that apply to it.">
      <label className="grid gap-1.5 text-[0.68rem] font-semibold text-copy">
        Interface type
        <SelectField
          allowEmpty={false}
          ariaLabel="Interface type"
          onValueChange={(value) => {
            setKind(value as WorkshopInterfaceKind);
            setName("");
          }}
          options={allowedKinds}
          placeholder="Choose interface type"
          value={kind}
        />
      </label>
      {kind === "subinterface" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-[0.68rem] font-semibold text-copy">
            Physical parent
            <SelectField
              ariaLabel="Physical parent"
              onValueChange={setParentInterfaceId}
              options={physicalParents.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              placeholder="Choose a physical interface"
              value={parentInterfaceId}
            />
          </label>
          <InputField label="802.1Q VLAN" min={1} max={4094} type="number" value={vlan} onChange={(event) => setVlan(event.target.value)} />
        </div>
      ) : kind === "svi" ? <InputField label="VLAN" min={1} max={4094} type="number" value={vlan} onChange={(event) => setVlan(event.target.value)} /> : null}
      <InputField label="Interface name" hint={`Suggested: ${suggestedName}`} placeholder={suggestedName} value={name} onChange={(event) => setName(event.target.value)} />
      {kind !== "port-channel" ? <div className="grid gap-4 sm:grid-cols-[1fr_120px]"><InputField label="IPv4 address (optional)" placeholder="192.168.10.1" value={address} onChange={(event) => setAddress(event.target.value)} /><InputField label="Prefix" min={0} max={32} type="number" value={prefix} onChange={(event) => setPrefix(event.target.value)} /></div> : null}
      {kind === "subinterface" ? <p className="rounded-control border border-line bg-canvas p-3 text-xs leading-5 text-muted">The physical parent owns the cable. This subinterface represents one tagged VLAN and cannot be connected separately.</p> : null}
      <div className="flex justify-end gap-3"><Button onClick={() => onOpenChange(false)} tone="outline">Cancel</Button><Button disabled={!canAdd} onClick={submit} tone="primary"><Plus />Add interface</Button></div>
    </Dialog>
  );
}

export function ConnectDevicesDialog({
  topology,
  initialDeviceId,
  editingLink,
  open,
  onOpenChange,
  onCreate,
  onRequestInterface,
}: {
  topology: WorkshopTopology;
  initialDeviceId?: string;
  editingLink?: WorkshopTopologyLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (link: WorkshopTopology["links"][number]) => void;
  onRequestInterface: (deviceId: string) => void;
}) {
  const editableTopology = useMemo(
    () =>
      editingLink
        ? {
            ...topology,
            links: topology.links.filter((link) => link.id !== editingLink.id),
          }
        : topology,
    [editingLink, topology],
  );
  const [fromDeviceId, setFromDeviceId] = useState(editingLink?.fromDeviceId ?? initialDeviceId ?? topology.devices[0]?.id ?? "");
  const [fromInterfaceId, setFromInterfaceId] = useState(editingLink?.fromInterfaceId ?? "");
  const [toDeviceId, setToDeviceId] = useState(editingLink?.toDeviceId ?? "");
  const [toInterfaceId, setToInterfaceId] = useState(editingLink?.toInterfaceId ?? "");
  const fromInterfaces = getAvailableConnectionInterfaces(editableTopology, fromDeviceId);
  const toInterfaces = getAvailableConnectionInterfaces(editableTopology, toDeviceId);
  const error = useMemo(() => fromInterfaceId && toInterfaceId ? validateWorkshopConnection(editableTopology, fromDeviceId, fromInterfaceId, toDeviceId, toInterfaceId) : undefined, [editableTopology, fromDeviceId, fromInterfaceId, toDeviceId, toInterfaceId]);
  const submit = () => {
    if (!fromInterfaceId || !toInterfaceId || error) return;
    onCreate({
      ...(editingLink ?? {
        id: `link-${crypto.randomUUID()}`,
        purpose: "basic" as const,
        state: "up" as const,
      }),
      fromDeviceId,
      fromInterfaceId,
      toDeviceId,
      toInterfaceId,
    });
    onOpenChange(false);
  };
  const endpoint = (title: string, deviceId: string, setDeviceId: (value: string) => void, interfaceId: string, setInterfaceId: (value: string) => void, interfaces: WorkshopDeviceInterface[]) => (
    <section className="grid gap-3 rounded-control border border-line bg-canvas p-4">
      <strong className="font-mono text-[0.65rem] tracking-[0.08em] text-signal-orange">{title}</strong>
      <label className="grid gap-1.5 text-[0.68rem] font-semibold text-copy">
        Device
        <SelectField
          ariaLabel={`${title} device`}
          onValueChange={(value) => {
            setDeviceId(value);
            setInterfaceId("");
          }}
          options={topology.devices
            .filter((device) => title === "FIRST END" || device.id !== fromDeviceId)
            .map((device) => ({ value: device.id, label: device.name }))}
          placeholder="Choose a device"
          value={deviceId}
        />
      </label>
      <label className="grid gap-1.5 text-[0.68rem] font-semibold text-copy">
        Physical interface
        <SelectField
          ariaLabel={`${title} physical interface`}
          onValueChange={setInterfaceId}
          options={interfaces.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          placeholder="Choose an unused port"
          value={interfaceId}
        />
      </label>
      {deviceId ? <Button onClick={() => onRequestInterface(deviceId)} size="compact" tone="secondary"><Plus />Add a physical interface</Button> : null}
    </section>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={editingLink ? "Change connection endpoints" : "Choose exact connection ports"} description="Choose the physical port at each end. Logical interfaces such as subinterfaces use their parent's cable.">
      <div className="grid gap-4 sm:grid-cols-2">{endpoint("FIRST END", fromDeviceId, setFromDeviceId, fromInterfaceId, setFromInterfaceId, fromInterfaces)}{endpoint("SECOND END", toDeviceId, setToDeviceId, toInterfaceId, setToInterfaceId, toInterfaces)}</div>
      {error ? <p className="m-0 rounded-control border border-signal-red/60 bg-signal-red-soft p-3 text-xs text-signal-red">{error}</p> : null}
      <div className="flex justify-end gap-3"><Button onClick={() => onOpenChange(false)} tone="outline">Cancel</Button><Button disabled={!fromInterfaceId || !toInterfaceId || Boolean(error)} onClick={submit} tone="primary"><Cable />{editingLink ? "Save endpoints" : "Create cable"}</Button></div>
    </Dialog>
  );
}

export function StarterTopologyDialog({ open, onOpenChange, onChoose }: { open: boolean; onOpenChange: (open: boolean) => void; onChoose: (id: WorkshopTopologyStarterId) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange} title="Start from a curriculum example" description="Choose an editable starting network. You can change every device, cable, and setting before publishing."><div className="grid gap-2 sm:grid-cols-2">{topologyStarters.map((starter) => <button className="min-h-20 rounded-control border border-line bg-canvas p-3 text-left hover:border-signal-orange focus-visible:outline-2 focus-visible:outline-signal-orange" key={starter.id} onClick={() => onChoose(starter.id)}><strong className="block text-sm text-copy">{starter.title}</strong><span className="mt-1 block text-xs leading-5 text-muted">{starter.description}</span></button>)}</div></Dialog>;
}
