import type { DeviceConfigurationSectionProps } from '@/features/workshops/topology-device-editor-types';
import { Button } from '@/components/ui/button';
import { InputField, TextareaField } from '@/components/ui/form-field';
import { SelectField } from '@/components/ui/select';
import { TopologyDeviceSection as Section } from '@/features/workshops/topology-device-section';

export function TopologyDeviceServices({ device, update, config, setConfig }: DeviceConfigurationSectionProps) {
  if (!(device.type === "pc" || device.type === "server")) return null;
  return (
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
  );
}
