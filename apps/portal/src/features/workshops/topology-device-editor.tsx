import { Cable, Trash2 } from "lucide-react";
import type { WorkshopTopologyDevice } from "@netbite/workshops/contracts";
import { deriveIpv4Network, prefixToSubnetMask } from "@netbite/networking";
import { Button } from "@/components/ui/button";
import { InputField, TextareaField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select";
import { TopologyDeviceSection as Section } from "@/features/workshops/topology-device-section";
import { TopologyInterfacesEditor } from "@/features/workshops/topology-interfaces-editor";
import { TopologySwitchingEditor } from "@/features/workshops/topology-switching-editor";
import { TopologyDeviceRouting } from '@/features/workshops/topology-device-routing';
import { TopologyDeviceServices } from '@/features/workshops/topology-device-services';
import { TopologyDevicePolicies } from '@/features/workshops/topology-device-policies';
import { TopologyDeviceExpected } from '@/features/workshops/topology-device-expected';

export function TopologyDeviceEditor({
  device,
  update,
  onAddInterface,
  onRemoveInterface,
  isInterfaceConnected,
  onConnect,
  onRemove,
}: {
  device: WorkshopTopologyDevice;
  update: (patch: Partial<WorkshopTopologyDevice>) => void;
  onAddInterface: () => void;
  onRemoveInterface: (interfaceId: string) => void;
  isInterfaceConnected: (interfaceId: string) => boolean;
  onConnect: () => void;
  onRemove: () => void;
}) {
  const config = device.configuration ?? {};
  const setConfig = (
    patch: Partial<NonNullable<WorkshopTopologyDevice["configuration"]>>,
  ) => update({ configuration: { ...config, ...patch } });
  return (
    <aside className="grid h-full min-h-0 content-start gap-3 overflow-y-auto border-l border-line bg-sidebar p-5 max-xl:h-auto max-xl:border-l-0 max-xl:border-t max-xl:overflow-visible">
      <div>
        <span className="font-mono text-[0.6rem] tracking-[0.08em] text-signal-orange">
          SELECTED DEVICE
        </span>
        <h3 className="mt-1 text-lg">{device.name}</h3>
      </div>
      <Section title="Overview" open>
        <InputField
          label="Device name"
          value={device.name}
          onChange={(event) => update({ name: event.target.value })}
        />
        <TextareaField
          label="Instructor note"
          rows={3}
          value={device.notes ?? ""}
          onChange={(event) => update({ notes: event.target.value })}
        />
      </Section>
      <TopologyInterfacesEditor
        device={device}
        update={update}
        onAddInterface={onAddInterface}
        onRemoveInterface={onRemoveInterface}
        isInterfaceConnected={isInterfaceConnected}
      />      {device.type === "switch" ? (
        <TopologySwitchingEditor device={device} update={update} />
      ) : null}
      <TopologyDeviceRouting device={device} update={update} config={config} setConfig={setConfig} />
      <TopologyDeviceServices device={device} update={update} config={config} setConfig={setConfig} />
      <TopologyDevicePolicies device={device} update={update} config={config} setConfig={setConfig} />
      <TopologyDeviceExpected device={device} update={update} config={config} setConfig={setConfig} />
      <Button onClick={onConnect} tone="secondary">
        <Cable />
        Choose exact ports
      </Button>
      <Button onClick={onRemove} tone="destructive">
        <Trash2 />
        Remove device
      </Button>
    </aside>
  );
}
