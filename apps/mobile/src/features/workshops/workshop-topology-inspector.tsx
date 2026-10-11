import type { WorkshopTopology,WorkshopTopologyDevice } from "@/core/workshops/types";
import { Text } from "@/shared/components/console-text";
import { useCanvasThemeStyles } from "@/shared/theme-context";
import { deriveIpv4Network,prefixToSubnetMask } from "@netbite/networking";
import { deriveWorkshopLinkContext } from "@netbite/workshops/topology-authoring";
import { View } from "react-native";
import { createStyles } from "./workshop-topology-styles";

export function SelectedConnection({
  topology,
  linkId,
}: {
  topology: WorkshopTopology;
  linkId: string;
}) {
  const styles = useCanvasThemeStyles(createStyles);
  const link = topology.links.find((candidate) => candidate.id === linkId);
  if (!link) return null;
  const from = topology.devices.find(
    (device) => device.id === link.fromDeviceId,
  );
  const to = topology.devices.find((device) => device.id === link.toDeviceId);
  const fromInterface = from?.interfaces.find(
    (item) => item.id === link.fromInterfaceId,
  );
  const toInterface = to?.interfaces.find(
    (item) => item.id === link.toInterfaceId,
  );
  return (
    <View style={styles.inspector}>
      <Text variant="label" style={styles.label}>
        SELECTED CONNECTION
      </Text>
      <View style={styles.linkRecordGrid}>
        <View style={styles.linkRecordEndpoint}>
          <Text variant="technical" style={styles.endpointDevice}>
            {from?.name ?? "DEVICE"}
          </Text>
          <Text variant="bodySmall">
            Port {fromInterface?.name ?? "NOT FOUND"}
          </Text>
        </View>
        <View style={styles.linkRecordEndpoint}>
          <Text variant="technical" style={styles.endpointDevice}>
            {to?.name ?? "DEVICE"}
          </Text>
          <Text variant="bodySmall">
            Port {toInterface?.name ?? "NOT FOUND"}
          </Text>
        </View>
      </View>
      <Text variant="bodySmall">
        Context: {deriveWorkshopLinkContext(topology, link).label}
      </Text>
      <Text variant="bodySmall">
        State: {(link.state ?? "up").toUpperCase()}
      </Text>
      {link.label ? (
        <Text variant="bodySmall">Instructor label: {link.label}</Text>
      ) : null}
    </View>
  );
}

export function DeviceInspector({ device }: { device: WorkshopTopologyDevice }) {
  const styles = useCanvasThemeStyles(createStyles);
  return (
    <View style={styles.inspector}>
      <Text variant="label" style={styles.label}>
        SELECTED DEVICE / {device.name.toUpperCase()}
      </Text>
      {device.interfaces.map((item) => {
        const mask =
          item.prefix == null ? null : prefixToSubnetMask(item.prefix);
        const network = deriveIpv4Network(item.ipv4Address, item.prefix);
        return (
          <View key={item.id} style={styles.record}>
            <Text variant="technical" style={styles.recordTitle}>
              {item.kind === "subinterface"
                ? "SUBINTERFACE"
                : item.kind === "svi"
                  ? "SWITCH VIRTUAL INTERFACE"
                  : item.kind === "port-channel"
                    ? "PORT-CHANNEL"
                    : "INTERFACE"}{" "}
              {item.name}
            </Text>
            {item.parentInterfaceId ? (
              <Text variant="bodySmall">
                Parent:{" "}
                {device.interfaces.find(
                  (candidate) => candidate.id === item.parentInterfaceId,
                )?.name ?? "NOT CONFIGURED"}
              </Text>
            ) : null}
            {item.encapsulationVlan ? (
              <Text variant="bodySmall">
                802.1Q VLAN: {item.encapsulationVlan}
              </Text>
            ) : null}
            <Text variant="bodySmall">State: {item.state.toUpperCase()}</Text>
            <Text variant="bodySmall">
              IPv4 address: {item.ipv4Address ?? "NOT CONFIGURED"}
            </Text>
            <Text variant="bodySmall">
              Prefix length:{" "}
              {item.prefix == null ? "NOT CONFIGURED" : `/${item.prefix}`}
            </Text>
            <Text variant="bodySmall">
              Subnet mask: {mask ?? "NOT CONFIGURED"}
            </Text>
            <Text variant="bodySmall">
              Network: {network ?? "NOT CONFIGURED"}
            </Text>
            <Text variant="bodySmall">
              Default gateway: {item.gateway ?? "NOT CONFIGURED"}
            </Text>
            <Text variant="bodySmall">
              VLAN: {item.vlan ?? "NOT CONFIGURED"}
            </Text>
            {item.switchport ? (
              <Text variant="bodySmall">
                Switchport:{" "}
                {item.switchport.mode === "trunk"
                  ? `TRUNK / VLANs ${item.switchport.allowedVlans?.join(", ") || "NOT CONFIGURED"}`
                  : `ACCESS VLAN ${item.switchport.accessVlan ?? "NOT CONFIGURED"}`}
              </Text>
            ) : null}
            {item.protocolSettings?.dhcpRelayAddress ? (
              <Text variant="bodySmall">
                DHCP relay: {item.protocolSettings.dhcpRelayAddress}
              </Text>
            ) : null}
            {item.protocolSettings?.natRole ? (
              <Text variant="bodySmall">
                NAT role: {item.protocolSettings.natRole.toUpperCase()}
              </Text>
            ) : null}
            {(item.ipv6Addresses ?? []).map((assignment) => (
              <Text key={assignment.id} variant="bodySmall">
                IPv6 address: {assignment.address}/{assignment.prefix}{" "}
                {assignment.scope ? `(${assignment.scope})` : ""}
              </Text>
            ))}
          </View>
        );
      })}
      {device.routes?.map((route, index) => (
        <View key={`${route.destination}-${index}`} style={styles.record}>
          <Text variant="technical" style={styles.recordTitle}>
            STATIC ROUTE
          </Text>
          <Text variant="bodySmall">
            Destination: {route.destination}/{route.prefix}
          </Text>
          <Text variant="bodySmall">
            Subnet mask: {prefixToSubnetMask(route.prefix) ?? "INVALID PREFIX"}
          </Text>
          <Text variant="bodySmall">Next hop: {route.nextHop}</Text>
        </View>
      ))}
      {device.notes ? (
        <View style={styles.note}>
          <Text variant="label" style={styles.label}>
            INSTRUCTOR NOTE
          </Text>
          <Text variant="bodySmall">{device.notes}</Text>
        </View>
      ) : null}
      {(device.configuration?.vlans?.length ?? 0) > 0 ? (
        <View style={styles.record}>
          <Text variant="technical" style={styles.recordTitle}>
            VLAN DATABASE
          </Text>
          <Text variant="bodySmall">
            {device
              .configuration!.vlans!.map(
                (vlan) => `${vlan.id}${vlan.name ? ` ${vlan.name}` : ""}`,
              )
              .join(", ")}
          </Text>
        </View>
      ) : null}
      {device.configuration?.ospf ? (
        <View style={styles.record}>
          <Text variant="technical" style={styles.recordTitle}>
            OSPF
          </Text>
          <Text variant="bodySmall">
            Router ID: {device.configuration.ospf.routerId}
          </Text>
          <Text variant="bodySmall">
            Process: {device.configuration.ospf.processId}
          </Text>
          {device.configuration.ospf.networks.map((network) => (
            <Text key={network.id} variant="bodySmall">
              {network.network} / Area {network.area}
            </Text>
          ))}
        </View>
      ) : null}
      {device.configuration?.acl ? (
        <View style={styles.record}>
          <Text variant="technical" style={styles.recordTitle}>
            IPv4 ACL / {device.configuration.acl.name}
          </Text>
          {device.configuration.acl.rules.map((rule) => (
            <Text key={rule.id} variant="bodySmall">
              {rule.sequence} {rule.action.toUpperCase()}{" "}
              {rule.protocol.toUpperCase()} {rule.source} → {rule.destination}
              {rule.destinationPort ? ` PORT ${rule.destinationPort}` : ""}
            </Text>
          ))}
        </View>
      ) : null}
      {device.configuration?.nat ? (
        <View style={styles.record}>
          <Text variant="technical" style={styles.recordTitle}>
            NAT / PAT
          </Text>
          <Text variant="bodySmall">
            Eligible networks:{" "}
            {device.configuration.nat.eligibleNetworks?.join(", ") ||
              "NOT CONFIGURED"}
          </Text>
        </View>
      ) : null}
      {device.configuration?.services ? (
        <View style={styles.record}>
          <Text variant="technical" style={styles.recordTitle}>
            SERVICES
          </Text>
          <Text variant="bodySmall">
            Address assignment:{" "}
            {device.configuration.services.addressMode?.toUpperCase() ??
              "NOT CONFIGURED"}
          </Text>
          <Text variant="bodySmall">
            DNS resolver:{" "}
            {device.configuration.services.resolver ?? "NOT CONFIGURED"}
          </Text>
          {device.configuration.services.dhcpPools?.map((pool) => (
            <Text key={pool.id} variant="bodySmall">
              DHCP pool {pool.name}: {pool.network}/{pool.prefix}
            </Text>
          ))}
          {device.configuration.services.dnsRecords?.map((record) => (
            <Text key={record.id} variant="bodySmall">
              DNS {record.type}: {record.name} = {record.value}
            </Text>
          ))}
        </View>
      ) : null}
      {(device.configuration?.expectedState?.notes?.length ?? 0) > 0 ? (
        <View style={styles.record}>
          <Text variant="technical" style={styles.recordTitle}>
            EXPECTED PROTOCOL STATE
          </Text>
          {device.configuration!.expectedState!.notes!.map((note, index) => (
            <Text key={`${note}-${index}`} variant="bodySmall">
              • {note}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

