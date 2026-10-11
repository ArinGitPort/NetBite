import { Plus } from 'lucide-react';
import type { DeviceConfigurationSectionProps } from '@/features/workshops/topology-device-editor-types';
import { Button } from '@/components/ui/button';
import { InputField, TextareaField } from '@/components/ui/form-field';
import { SelectField } from '@/components/ui/select';
import { TopologyDeviceSection as Section } from '@/features/workshops/topology-device-section';

export function TopologyDeviceRouting({ device, update, config, setConfig }: DeviceConfigurationSectionProps) {
  if (!(device.type === "router")) return null;
  return (
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
  );
}
