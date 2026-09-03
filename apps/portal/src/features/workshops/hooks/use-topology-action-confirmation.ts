import { useState, type Dispatch, type SetStateAction } from "react";
import type { WorkshopLinkPurpose, WorkshopTopology, WorkshopTopologyDevice } from "@netbite/workshops/contracts";
import { deriveWorkshopLinkPurpose } from "@netbite/workshops/topology-authoring";

interface PendingTopologyAction {
  title: string;
  description: string;
  confirmLabel: string;
  intent: "warning" | "destructive";
  action: () => void;
}

export function useTopologyActionConfirmation({
  topology,
  setTopology,
  setSelectedDeviceId,
  setSelectedLinkId,
}: {
  topology: WorkshopTopology;
  setTopology: Dispatch<SetStateAction<WorkshopTopology>>;
  setSelectedDeviceId: (id?: string) => void;
  setSelectedLinkId: (id?: string) => void;
}) {
  const [pending, setPending] = useState<PendingTopologyAction>();

  const changeLinkPurpose = (link: WorkshopTopology["links"][number] | undefined, purpose: WorkshopLinkPurpose) => {
    if (!link || (deriveWorkshopLinkPurpose(link, topology) === purpose && link.purpose)) return;
    const incompatible = [
      purpose !== "basic" && link.label,
      purpose !== "routed" && link.network,
      purpose !== "access" && link.accessVlan,
      purpose !== "trunk" && link.trunkVlans?.length,
    ].some(Boolean);
    const apply = () => setTopology((value) => ({
      ...value,
      links: value.links.map((item) => item.id === link.id ? {
        ...item,
        purpose,
        label: purpose === "basic" ? link.label : undefined,
        network: purpose === "routed" ? link.network : undefined,
        accessVlan: purpose === "access" ? link.accessVlan : undefined,
        trunkVlans: purpose === "trunk" ? link.trunkVlans : undefined,
      } : item),
    }));
    if (!incompatible) return apply();
    setPending({
      title: "Change this connection purpose?",
      description: "Fields that do not apply to the new purpose will be removed from this connection. Other topology data is unchanged.",
      confirmLabel: "CHANGE PURPOSE",
      intent: "warning",
      action: apply,
    });
  };

  const removeInterface = (device: WorkshopTopologyDevice, interfaceId: string) => {
    const networkInterface = device.interfaces.find((item) => item.id === interfaceId);
    setPending({
      title: "Remove this interface?",
      description: `${device.name} ${networkInterface?.name ?? "interface"} will be removed from the draft topology. This action is not saved until you save the topology.`,
      confirmLabel: "REMOVE INTERFACE",
      intent: "destructive",
      action: () => setTopology((value) => ({
        ...value,
        devices: value.devices.map((item) => item.id === device.id
          ? { ...item, interfaces: item.interfaces.filter((networkInterface) => networkInterface.id !== interfaceId) }
          : item),
      })),
    });
  };

  const removeDevice = (device: WorkshopTopologyDevice) => {
    const connectionCount = topology.links.filter((link) => link.fromDeviceId === device.id || link.toDeviceId === device.id).length;
    setPending({
      title: `Remove ${device.name}?`,
      description: `${device.name} and ${connectionCount} connected cable${connectionCount === 1 ? "" : "s"} will be removed from the draft topology.`,
      confirmLabel: "REMOVE DEVICE",
      intent: "destructive",
      action: () => {
        setTopology((value) => ({
          ...value,
          devices: value.devices.filter((item) => item.id !== device.id),
          links: value.links.filter((link) => link.fromDeviceId !== device.id && link.toDeviceId !== device.id),
        }));
        setSelectedDeviceId(undefined);
      },
    });
  };

  const removeConnection = (link: WorkshopTopology["links"][number], from: string, to: string) => setPending({
    title: "Remove this connection?",
    description: `The cable from ${from} to ${to} will be removed. Both devices remain in the topology.`,
    confirmLabel: "REMOVE CONNECTION",
    intent: "destructive",
    action: () => {
      setTopology((value) => ({ ...value, links: value.links.filter((item) => item.id !== link.id) }));
      setSelectedLinkId(undefined);
    },
  });

  return { pending, close: () => setPending(undefined), changeLinkPurpose, removeInterface, removeDevice, removeConnection };
}
