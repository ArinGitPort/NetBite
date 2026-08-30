import type { WorkshopTopologyDevice } from "@netbite/workshops/contracts";
import { InputField, TextareaField } from "@/components/ui/form-field";
import { TopologyDeviceSection as Section } from "@/features/workshops/topology-device-section";

export function TopologySwitchingEditor({ device, update }: { device: WorkshopTopologyDevice; update: (patch: Partial<WorkshopTopologyDevice>) => void }) {
  const config = device.configuration ?? {};
  const setConfig = (patch: Partial<NonNullable<WorkshopTopologyDevice["configuration"]>>) => update({ configuration: { ...config, ...patch } });
  return (<Section title="Switching">
          <InputField
            label="VLAN database"
            hint="Comma-separated VLAN IDs used in this example."
            placeholder="10, 20"
            value={(config.vlans ?? []).map((item) => item.id).join(", ")}
            onChange={(event) =>
              setConfig({
                vlans: event.target.value
                  .split(",")
                  .map((item) => Number(item.trim()))
                  .filter(Boolean)
                  .map((id) => ({ id })),
              })
            }
          />
          <InputField
            label="STP bridge priority"
            type="number"
            placeholder="32768"
            value={config.stp?.bridgePriority ?? ""}
            onChange={(event) =>
              setConfig({
                stp: {
                  ...config.stp,
                  bridgePriority: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                },
              })
            }
          />
          <TextareaField
            label="STP port roles"
            hint="One per line: F0/1 root forwarding 19"
            placeholder="F0/1 root forwarding 19"
            rows={3}
            value={(config.stp?.portStates ?? [])
              .map(
                (item) =>
                  `${device.interfaces.find((entry) => entry.id === item.interfaceId)?.name ?? item.interfaceId} ${item.role} ${item.state}${item.cost ? ` ${item.cost}` : ""}`,
              )
              .join("\n")}
            onChange={(event) =>
              setConfig({
                stp: {
                  ...config.stp,
                  portStates: event.target.value
                    .split("\n")
                    .map((line) => {
                      const [name, role, state, cost] = line
                        .trim()
                        .split(/\s+/);
                      const networkInterface = device.interfaces.find(
                        (item) => item.name === name,
                      );
                      return networkInterface &&
                        ["root", "designated", "alternate"].includes(role) &&
                        ["forwarding", "discarding"].includes(state)
                        ? {
                            interfaceId: networkInterface.id,
                            role: role as "root" | "designated" | "alternate",
                            state: state as "forwarding" | "discarding",
                            cost: cost ? Number(cost) : undefined,
                          }
                        : null;
                    })
                    .filter((item): item is NonNullable<typeof item> =>
                      Boolean(item),
                    ),
                },
              })
            }
          />
          <TextareaField
            label="LACP groups"
            hint="One per line: 1 Po1 F0/1,F0/2 active"
            placeholder="1 Po1 F0/1,F0/2 active"
            rows={3}
            value={(config.etherChannel?.groups ?? [])
              .map(
                (group) =>
                  `${group.number} ${device.interfaces.find((item) => item.id === group.portChannelInterfaceId)?.name ?? group.portChannelInterfaceId} ${group.memberInterfaceIds.map((id) => device.interfaces.find((item) => item.id === id)?.name ?? id).join(",")} ${group.lacpMode}`,
              )
              .join("\n")}
            onChange={(event) =>
              setConfig({
                etherChannel: {
                  groups: event.target.value
                    .split("\n")
                    .map((line, index) => {
                      const [number, portChannelName, members, mode] = line
                        .trim()
                        .split(/\s+/);
                      const portChannel = device.interfaces.find(
                        (item) => item.name === portChannelName,
                      );
                      const memberIds = (members ?? "")
                        .split(",")
                        .map(
                          (name) =>
                            device.interfaces.find((item) => item.name === name)
                              ?.id,
                        )
                        .filter((id): id is string => Boolean(id));
                      return portChannel && Number(number) > 0
                        ? {
                            id: `channel-${index}`,
                            number: Number(number),
                            portChannelInterfaceId: portChannel.id,
                            memberInterfaceIds: memberIds,
                            lacpMode: (mode === "passive"
                              ? "passive"
                              : "active") as "active" | "passive",
                          }
                        : null;
                    })
                    .filter((item): item is NonNullable<typeof item> =>
                      Boolean(item),
                    ),
                },
              })
            }
          />
        </Section>
  );
}