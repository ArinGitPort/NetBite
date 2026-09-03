import { useState, type Dispatch, type SetStateAction } from "react";
import type { WorkshopTopology, WorkshopTopologyStarterId } from "@netbite/workshops/contracts";
import { createWorkshopTopologyStarter } from "@netbite/workshops/topology-authoring";
import { AddInterfaceDialog, ConnectDevicesDialog, StarterTopologyDialog } from "@/features/workshops/topology-dialogs";
import { ConfirmationDialog } from "@/components/ui/dialog";

export function TopologyDialogLayer({ topology, setTopology, connectionKey, editingLinkId, selectedId, connectionOpen, setConnectionOpen, setEditingLinkId, setSelectedLinkId, setSelectedDeviceId, interfaceDeviceId, setInterfaceDeviceId, resumeConnection, setResumeConnection, startersOpen, setStartersOpen, setCanvasPan }: {
  topology: WorkshopTopology; setTopology: Dispatch<SetStateAction<WorkshopTopology>>;
  connectionKey: number; editingLinkId?: string; selectedId?: string; connectionOpen: boolean;
  setConnectionOpen: (open: boolean) => void; setEditingLinkId: (id?: string) => void;
  setSelectedLinkId: (id?: string) => void; setSelectedDeviceId: (id?: string) => void; interfaceDeviceId?: string;
  setInterfaceDeviceId: (id?: string) => void; resumeConnection: boolean;
  setResumeConnection: (value: boolean) => void; startersOpen: boolean;
  setStartersOpen: (open: boolean) => void; setCanvasPan: (value: { x: number; y: number }) => void;
}) {
  const [pendingStarterId, setPendingStarterId] = useState<WorkshopTopologyStarterId>();
  const applyStarter = (starterId: WorkshopTopologyStarterId) => {
    setTopology(createWorkshopTopologyStarter(starterId, topology.id));
    setCanvasPan({ x: 0, y: 0 });
    setSelectedDeviceId(undefined);
    setSelectedLinkId(undefined);
    setStartersOpen(false);
  };
  return <>
    <ConnectDevicesDialog key={connectionKey} editingLink={topology.links.find((link) => link.id === editingLinkId)} initialDeviceId={editingLinkId ? undefined : selectedId} onCreate={(link) => { setTopology((value) => ({ ...value, links: editingLinkId ? value.links.map((item) => item.id === editingLinkId ? link : item) : [...value.links, link] })); setSelectedLinkId(link.id); setEditingLinkId(undefined); }} onOpenChange={(open) => { setConnectionOpen(open); if (!open) setEditingLinkId(undefined); }} onRequestInterface={(deviceId) => { setConnectionOpen(false); setResumeConnection(true); setInterfaceDeviceId(deviceId); }} open={connectionOpen} topology={topology} />
    {interfaceDeviceId ? <AddInterfaceDialog device={topology.devices.find((device) => device.id === interfaceDeviceId)!} onAdd={(networkInterface) => { setTopology((value) => ({ ...value, devices: value.devices.map((device) => device.id === interfaceDeviceId ? { ...device, interfaces: [...device.interfaces, networkInterface] } : device) })); setSelectedDeviceId(interfaceDeviceId); if (resumeConnection) setConnectionOpen(true); setResumeConnection(false); }} onOpenChange={(open) => { if (!open) { setInterfaceDeviceId(undefined); if (!resumeConnection) setResumeConnection(false); } }} open /> : null}
    <StarterTopologyDialog onChoose={(starterId: WorkshopTopologyStarterId) => { if (topology.devices.length) setPendingStarterId(starterId); else applyStarter(starterId); }} onOpenChange={setStartersOpen} open={startersOpen} />
    <ConfirmationDialog
      confirmLabel="REPLACE TOPOLOGY"
      description="Every device, interface, cable, and configuration in the current draft topology will be replaced by the selected starter. Published versions remain unchanged."
      intent="warning"
      onConfirm={() => { if (pendingStarterId) applyStarter(pendingStarterId); }}
      onOpenChange={(open) => { if (!open) setPendingStarterId(undefined); }}
      open={Boolean(pendingStarterId)}
      title="Replace the current topology?"
    />
  </>;
}
