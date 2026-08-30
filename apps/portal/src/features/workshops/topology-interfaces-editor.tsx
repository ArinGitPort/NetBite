import { Plus, Trash2 } from "lucide-react";
import type { WorkshopTopologyDevice } from "@netbite/workshops/contracts";
import { deriveIpv4Network, prefixToSubnetMask } from "@netbite/networking";
import { Button } from "@/components/ui/button";
import { InputField, TextareaField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select";
import { TopologyDeviceSection as Section } from "@/features/workshops/topology-device-section";

export function TopologyInterfacesEditor({ device, update, onAddInterface, onRemoveInterface, isInterfaceConnected }: {
  device: WorkshopTopologyDevice;
  update: (patch: Partial<WorkshopTopologyDevice>) => void;
  onAddInterface: () => void;
  onRemoveInterface: (interfaceId: string) => void;
  isInterfaceConnected: (interfaceId: string) => boolean;
}) {
  const setInterface = (index: number, patch: Partial<WorkshopTopologyDevice["interfaces"][number]>) => update({
    interfaces: device.interfaces.map((item, current) => current === index ? { ...item, ...patch } : item),
  });
  return (<Section title={`Interfaces (${device.interfaces.length})`} open>
        {device.interfaces.map((networkInterface, index) => {
          const network = deriveIpv4Network(
            networkInterface.ipv4Address,
            networkInterface.prefix,
          );
          const mask =
            networkInterface.prefix == null
              ? undefined
              : prefixToSubnetMask(networkInterface.prefix);
          const parent = device.interfaces.find(
            (item) => item.id === networkInterface.parentInterfaceId,
          );
          return (
            <div
              className="grid gap-3 rounded-control border border-line bg-canvas p-3"
              key={networkInterface.id}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <strong className="text-sm">{networkInterface.name}</strong>
                  <span className="ml-2 font-mono text-[0.58rem] uppercase text-muted">
                    {networkInterface.kind ?? "physical"}
                  </span>
                </div>
                <Button
                  aria-label={`Remove interface ${networkInterface.name}`}
                  disabled={
                    isInterfaceConnected(networkInterface.id) ||
                    device.interfaces.some(
                      (item) => item.parentInterfaceId === networkInterface.id,
                    )
                  }
                  onClick={() => onRemoveInterface(networkInterface.id)}
                  size="compact"
                  title={
                    isInterfaceConnected(networkInterface.id)
                      ? "Disconnect this cable first."
                      : "Remove interface"
                  }
                  tone="ghost"
                >
                  <Trash2 />
                </Button>
              </div>
              {parent ? (
                <p className="m-0 text-xs text-muted">
                  Parent {parent.name} · VLAN{" "}
                  {networkInterface.encapsulationVlan}
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <InputField
                  label="Interface name"
                  value={networkInterface.name}
                  onChange={(event) =>
                    setInterface(index, { name: event.target.value })
                  }
                />
                <label className="grid gap-1.5 text-[0.68rem] font-semibold text-copy">
                  State
                  <SelectField
                    allowEmpty={false}
                    ariaLabel={`${networkInterface.name} state`}
                    onValueChange={(state) =>
                      setInterface(index, { state: state as "up" | "down" })
                    }
                    options={[
                      { value: "up", label: "Up" },
                      { value: "down", label: "Down" },
                    ]}
                    placeholder="Choose interface state"
                    value={networkInterface.state}
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_92px]">
                <InputField
                  label="IPv4 address"
                  placeholder="192.168.10.1"
                  value={networkInterface.ipv4Address ?? ""}
                  onChange={(event) =>
                    setInterface(index, {
                      ipv4Address: event.target.value || undefined,
                    })
                  }
                />
                <InputField
                  label="Prefix"
                  type="number"
                  min={0}
                  max={32}
                  value={networkInterface.prefix ?? ""}
                  onChange={(event) =>
                    setInterface(index, {
                      prefix: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <TextareaField
                label="IPv6 addresses"
                hint="One address and prefix per line, for example: 2001:db8:10::1/64"
                rows={2}
                value={(networkInterface.ipv6Addresses ?? [])
                  .map(
                    (assignment) =>
                      `${assignment.address}/${assignment.prefix}`,
                  )
                  .join("\n")}
                onChange={(event) =>
                  setInterface(index, {
                    ipv6Addresses: event.target.value
                      .split("\n")
                      .map((line, current) => {
                        const separator = line.lastIndexOf("/");
                        if (separator < 0) return null;
                        return {
                          id: `ipv6-${current}`,
                          address: line.slice(0, separator).trim(),
                          prefix: Number(line.slice(separator + 1)),
                        };
                      })
                      .filter(
                        (
                          assignment,
                        ): assignment is NonNullable<typeof assignment> =>
                          Boolean(assignment),
                      ),
                  })
                }
              />
              {network || mask ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-control bg-raised p-3 text-xs">
                  <dt className="text-muted">Subnet mask</dt>
                  <dd className="m-0 font-mono">{mask ?? "Not configured"}</dd>
                  <dt className="text-muted">Network</dt>
                  <dd className="m-0 font-mono">
                    {network ?? "Not configured"}
                  </dd>
                </dl>
              ) : null}
              {device.type === "pc" || device.type === "server" ? (
                <InputField
                  label="Default gateway"
                  placeholder="192.168.10.1"
                  value={networkInterface.gateway ?? ""}
                  onChange={(event) =>
                    setInterface(index, {
                      gateway: event.target.value || undefined,
                    })
                  }
                />
              ) : null}
              {device.type === "switch" &&
              (networkInterface.kind ?? "physical") === "physical" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-[0.68rem] font-semibold">
                    Switchport mode
                    <SelectField
                      allowEmpty={false}
                      ariaLabel={`${networkInterface.name} switchport mode`}
                      onValueChange={(mode) =>
                        setInterface(index, {
                          switchport: {
                            ...networkInterface.switchport,
                            mode: mode as "access" | "trunk",
                          },
                        })
                      }
                      options={[
                        { value: "access", label: "Access" },
                        { value: "trunk", label: "Trunk" },
                      ]}
                      placeholder="Choose switchport mode"
                      value={networkInterface.switchport?.mode ?? "access"}
                    />
                  </label>
                  <InputField
                    label={
                      networkInterface.switchport?.mode === "trunk"
                        ? "Allowed VLANs"
                        : "Access VLAN"
                    }
                    placeholder={
                      networkInterface.switchport?.mode === "trunk"
                        ? "10, 20"
                        : "10"
                    }
                    value={
                      networkInterface.switchport?.mode === "trunk"
                        ? (networkInterface.switchport.allowedVlans?.join(
                            ", ",
                          ) ?? "")
                        : (networkInterface.switchport?.accessVlan ?? "")
                    }
                    onChange={(event) =>
                      setInterface(index, {
                        switchport:
                          networkInterface.switchport?.mode === "trunk"
                            ? {
                                mode: "trunk",
                                allowedVlans: event.target.value
                                  .split(",")
                                  .map((item) => Number(item.trim()))
                                  .filter(Boolean),
                              }
                            : {
                                mode: "access",
                                accessVlan:
                                  Number(event.target.value) || undefined,
                              },
                      })
                    }
                  />
                </div>
              ) : null}
              {device.type === "router" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField
                    label="DHCP relay"
                    placeholder="192.168.20.5"
                    value={
                      networkInterface.protocolSettings?.dhcpRelayAddress ?? ""
                    }
                    onChange={(event) =>
                      setInterface(index, {
                        protocolSettings: {
                          ...networkInterface.protocolSettings,
                          dhcpRelayAddress: event.target.value || undefined,
                        },
                      })
                    }
                  />
                  <label className="grid gap-1.5 text-[0.68rem] font-semibold">
                    NAT role
                    <SelectField
                      ariaLabel={`${networkInterface.name} NAT role`}
                      onValueChange={(natRole) =>
                        setInterface(index, {
                          protocolSettings: {
                            ...networkInterface.protocolSettings,
                            natRole: (natRole || undefined) as
                              | "inside"
                              | "outside"
                              | undefined,
                          },
                        })
                      }
                      options={[
                        { value: "inside", label: "Inside" },
                        { value: "outside", label: "Outside" },
                      ]}
                      placeholder="Not assigned"
                      value={networkInterface.protocolSettings?.natRole ?? ""}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
        <Button onClick={onAddInterface} tone="ghost">
          <Plus />
          Add interface
        </Button>
      </Section>
  );
}