import { Cable, Plus, Trash2 } from "lucide-react";
import type { WorkshopTopologyDevice } from "@netbite/workshops/contracts";
import { deriveIpv4Network, prefixToSubnetMask } from "@netbite/networking";
import { Button } from "../../components/ui/button";
import { InputField, TextareaField } from "../../components/ui/form-field";
import { SelectField } from "@/components/ui/select";

function Section({
  title,
  children,
  open = false,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details className="group border-b border-line pb-3" open={open}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-bold text-copy after:content-['+'] group-open:after:content-['−']">
        {title}
      </summary>
      <div className="grid gap-3 pt-2">{children}</div>
    </details>
  );
}

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
  const setInterface = (
    index: number,
    patch: Partial<WorkshopTopologyDevice["interfaces"][number]>,
  ) =>
    update({
      interfaces: device.interfaces.map((item, current) =>
        current === index ? { ...item, ...patch } : item,
      ),
    });
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
      <Section title={`Interfaces (${device.interfaces.length})`} open>
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
      {device.type === "switch" ? (
        <Section title="Switching">
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
      ) : null}
      {device.type === "router" ? (
        <Section title="Routing">
          <h4 className="m-0 text-xs">Static routes</h4>
          {(device.routes ?? []).map((route, index) => (
            <div
              className="grid gap-2 sm:grid-cols-[92px_1fr_76px_1fr]"
              key={`${route.destination}-${index}`}
            >
              <SelectField
                allowEmpty={false}
                ariaLabel="Route address family"
                onValueChange={(addressFamily) =>
                  update({
                    routes: (device.routes ?? []).map((item, current) =>
                      current === index
                        ? {
                            ...item,
                            addressFamily: addressFamily as "ipv4" | "ipv6",
                            prefix: addressFamily === "ipv6" ? 64 : 24,
                          }
                        : item,
                    ),
                  })
                }
                options={[
                  { value: "ipv4", label: "IPv4" },
                  { value: "ipv6", label: "IPv6" },
                ]}
                placeholder="Address family"
                value={route.addressFamily ?? "ipv4"}
              />
              <input
                aria-label="Route destination"
                placeholder={
                  route.addressFamily === "ipv6"
                    ? "2001:db8:20::"
                    : "192.168.20.0"
                }
                value={route.destination}
                onChange={(event) =>
                  update({
                    routes: (device.routes ?? []).map((item, current) =>
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
                min={0}
                max={route.addressFamily === "ipv6" ? 128 : 32}
                value={route.prefix}
                onChange={(event) =>
                  update({
                    routes: (device.routes ?? []).map((item, current) =>
                      current === index
                        ? { ...item, prefix: Number(event.target.value) }
                        : item,
                    ),
                  })
                }
              />
              <input
                aria-label="Route next hop"
                placeholder={
                  route.addressFamily === "ipv6" ? "2001:db8:12::2" : "10.0.0.2"
                }
                value={route.nextHop}
                onChange={(event) =>
                  update({
                    routes: (device.routes ?? []).map((item, current) =>
                      current === index
                        ? { ...item, nextHop: event.target.value }
                        : item,
                    ),
                  })
                }
              />
            </div>
          ))}
          <Button
            onClick={() =>
              update({
                routes: [
                  ...(device.routes ?? []),
                  {
                    destination: "",
                    prefix: 24,
                    nextHop: "",
                    addressFamily: "ipv4",
                  },
                ],
              })
            }
            tone="ghost"
          >
            <Plus />
            Add route
          </Button>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="OSPF router ID"
              placeholder="1.1.1.1"
              value={config.ospf?.routerId ?? ""}
              onChange={(event) =>
                setConfig({
                  ospf: {
                    processId: config.ospf?.processId ?? 1,
                    routerId: event.target.value,
                    networks: config.ospf?.networks ?? [],
                  },
                })
              }
            />
            <InputField
              label="OSPF process"
              type="number"
              value={config.ospf?.processId ?? 1}
              onChange={(event) =>
                setConfig({
                  ospf: {
                    processId: Number(event.target.value),
                    routerId: config.ospf?.routerId ?? "",
                    networks: config.ospf?.networks ?? [],
                  },
                })
              }
            />
          </div>
          <TextareaField
            label="OSPF networks"
            hint="One network/prefix and area per line, for example: 10.0.12.0/30 area 0"
            rows={3}
            value={(config.ospf?.networks ?? [])
              .map((item) => `${item.network} area ${item.area}`)
              .join("\n")}
            onChange={(event) =>
              setConfig({
                ospf: {
                  processId: config.ospf?.processId ?? 1,
                  routerId: config.ospf?.routerId ?? "",
                  networks: event.target.value
                    .split("\n")
                    .map((line, index) => {
                      const match = line
                        .trim()
                        .match(/^(\S+)\s+area\s+(\d+)$/i);
                      return match
                        ? {
                            id: `network-${index}`,
                            network: match[1],
                            area: Number(match[2]),
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
      ) : null}
      {device.type === "pc" || device.type === "server" ? (
        <Section title="Services">
          <label className="grid gap-1.5 text-[0.68rem] font-semibold">
            Address assignment
            <SelectField
              allowEmpty={false}
              ariaLabel="Address assignment"
              onValueChange={(addressMode) =>
                setConfig({
                  services: {
                    ...config.services,
                    addressMode: addressMode as "static" | "dhcp",
                  },
                })
              }
              options={[
                { value: "static", label: "Static" },
                { value: "dhcp", label: "DHCP" },
              ]}
              placeholder="Choose address assignment"
              value={config.services?.addressMode ?? "static"}
            />
          </label>
          <InputField
            label="DNS resolver"
            placeholder="192.168.10.5"
            value={config.services?.resolver ?? ""}
            onChange={(event) =>
              setConfig({
                services: {
                  ...config.services,
                  resolver: event.target.value || undefined,
                },
              })
            }
          />
          <TextareaField
            label="Listening services"
            hint="One per line: TCP 443 HTTPS"
            placeholder="TCP 443 HTTPS"
            rows={3}
            value={(config.services?.transportListeners ?? [])
              .map(
                (item) =>
                  `${item.protocol.toUpperCase()} ${item.port} ${item.service}`,
              )
              .join("\n")}
            onChange={(event) =>
              setConfig({
                services: {
                  ...config.services,
                  transportListeners: event.target.value
                    .split("\n")
                    .map((line, index) => {
                      const [protocol, port, ...service] = line
                        .trim()
                        .split(/\s+/);
                      return ["tcp", "udp"].includes(protocol?.toLowerCase()) &&
                        Number(port)
                        ? {
                            id: `listener-${index}`,
                            protocol: protocol.toLowerCase() as "tcp" | "udp",
                            port: Number(port),
                            service: service.join(" "),
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
            label="DNS records"
            hint="One per line: A app.example 192.168.10.5 300"
            placeholder="A app.example 192.168.10.5 300"
            rows={3}
            value={(config.services?.dnsRecords ?? [])
              .map(
                (item) =>
                  `${item.type} ${item.name} ${item.value}${item.ttl != null ? ` ${item.ttl}` : ""}`,
              )
              .join("\n")}
            onChange={(event) =>
              setConfig({
                services: {
                  ...config.services,
                  dnsRecords: event.target.value
                    .split("\n")
                    .map((line, index) => {
                      const [type, name, value, ttl] = line.trim().split(/\s+/);
                      return ["A", "AAAA"].includes(type) && name && value
                        ? {
                            id: `dns-${index}`,
                            type: type as "A" | "AAAA",
                            name,
                            value,
                            ttl: ttl ? Number(ttl) : undefined,
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
      ) : null}
      {device.type === "router" ? (
        <Section title="Policies">
          <InputField
            label="Named ACL"
            placeholder="OFFICE-POLICY"
            value={config.acl?.name ?? ""}
            onChange={(event) =>
              setConfig({
                acl: {
                  name: event.target.value,
                  rules: config.acl?.rules ?? [],
                  applications: config.acl?.applications ?? [],
                },
              })
            }
          />
          <TextareaField
            label="ACL rules"
            hint="One per line: 10 permit tcp any 192.168.20.10 443"
            placeholder="10 permit ip 192.168.10.0/24 any"
            rows={3}
            value={(config.acl?.rules ?? [])
              .map(
                (rule) =>
                  `${rule.sequence} ${rule.action} ${rule.protocol} ${rule.source} ${rule.destination}${rule.destinationPort ? ` ${rule.destinationPort}` : ""}`,
              )
              .join("\n")}
            onChange={(event) =>
              setConfig({
                acl: {
                  name: config.acl?.name ?? "",
                  applications: config.acl?.applications ?? [],
                  rules: event.target.value
                    .split("\n")
                    .map((line, index) => {
                      const [
                        sequence,
                        action,
                        protocol,
                        source,
                        destination,
                        port,
                      ] = line.trim().split(/\s+/);
                      return Number(sequence) &&
                        ["permit", "deny"].includes(action) &&
                        ["ip", "tcp", "udp", "icmp"].includes(protocol) &&
                        source &&
                        destination
                        ? {
                            id: `acl-${index}`,
                            sequence: Number(sequence),
                            action: action as "permit" | "deny",
                            protocol: protocol as "ip" | "tcp" | "udp" | "icmp",
                            source,
                            destination,
                            destinationPort: port ? Number(port) : undefined,
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
          <InputField
            label="PAT eligible networks"
            placeholder="192.168.10.0/24"
            value={config.nat?.eligibleNetworks?.join(", ") ?? ""}
            onChange={(event) =>
              setConfig({
                nat: {
                  ...config.nat,
                  eligibleNetworks: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                },
              })
            }
          />
          <TextareaField
            label="Static NAT mappings"
            hint="One per line: 192.168.10.10 203.0.113.10"
            placeholder="192.168.10.10 203.0.113.10"
            rows={3}
            value={(config.nat?.staticMappings ?? [])
              .map((item) => `${item.insideLocal} ${item.insideGlobal}`)
              .join("\n")}
            onChange={(event) =>
              setConfig({
                nat: {
                  ...config.nat,
                  staticMappings: event.target.value
                    .split("\n")
                    .map((line, index) => {
                      const [insideLocal, insideGlobal] = line
                        .trim()
                        .split(/\s+/);
                      return insideLocal && insideGlobal
                        ? { id: `nat-${index}`, insideLocal, insideGlobal }
                        : null;
                    })
                    .filter((item): item is NonNullable<typeof item> =>
                      Boolean(item),
                    ),
                },
              })
            }
          />
          <p className="m-0 text-xs leading-5 text-muted">
            These policies describe a teaching example. NetBite does not execute
            them in workshop lessons.
          </p>
        </Section>
      ) : null}
      <Section title="Expected protocol state">
        <TextareaField
          label="What students should observe"
          hint="Add one result per line, such as an installed route, STP role, translation, neighbor, or ACL result."
          rows={4}
          value={config.expectedState?.notes?.join("\n") ?? ""}
          onChange={(event) =>
            setConfig({
              expectedState: {
                ...config.expectedState,
                notes: event.target.value.split("\n").filter(Boolean),
              },
            })
          }
        />
      </Section>
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
