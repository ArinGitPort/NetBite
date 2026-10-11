import type { DeviceConfigurationSectionProps } from '@/features/workshops/topology-device-editor-types';
import { Button } from '@/components/ui/button';
import { InputField, TextareaField } from '@/components/ui/form-field';
import { SelectField } from '@/components/ui/select';
import { TopologyDeviceSection as Section } from '@/features/workshops/topology-device-section';

export function TopologyDevicePolicies({ device, update, config, setConfig }: DeviceConfigurationSectionProps) {
  if (!(device.type === "router")) return null;
  return (
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
  );
}
