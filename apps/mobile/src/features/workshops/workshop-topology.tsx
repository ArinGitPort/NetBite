import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { PixelRatio, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";

import type {
  WorkshopTopology,
  WorkshopTopologyDevice,
} from "@/core/workshops/types";
import { deriveIpv4Network, prefixToSubnetMask } from "@netbite/networking";
import {
  calculateWorkshopTopologyGeometry,
  deriveWorkshopLinkContext,
  normalizeWorkshopTopology,
} from "@netbite/workshops/topology-authoring";
import { Text } from "@/shared/components/console-text";
import { Fonts, Space, Typography, type ThemeColors } from "@/shared/theme";
import { useCanvasColors, useCanvasThemeStyles } from "@/shared/theme-context";

const artwork = {
  pc: require("@/assets/images/devices/device-pc-mobile.png"),
  switch: require("@/assets/images/devices/device-switch-mobile.png"),
  router: require("@/assets/images/devices/device-router-mobile.png"),
  server: require("@/assets/images/education/server-terminal-mobile.png"),
} as const;

const topologyCanvasHeight = 420;
const minimumWorldWidth = 720;
const minimumWorldHeight = 600;
const nodeHorizontalPadding = 52;
const nodeVerticalPadding = 46;

function clampPan(value: number, viewportSize: number, contentSize: number) {
  "worklet";
  return Math.max(Math.min(0, value), Math.min(0, viewportSize - contentSize));
}

function centeredPan(viewportSize: number, contentSize: number) {
  return Math.min(0, (viewportSize - contentSize) / 2);
}

function canvasCoordinate(value: number, size: number, padding: number) {
  return padding + value * Math.max(0, size - padding * 2);
}

export function WorkshopTopologyView({
  topology: rawTopology,
}: {
  topology: WorkshopTopology;
}) {
  const colors = useCanvasColors();
  const styles = useCanvasThemeStyles(createStyles);
  const topology = useMemo(
    () => normalizeWorkshopTopology(rawTopology),
    [rawTopology],
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(
    topology.devices[0]?.id,
  );
  const [selectedLinkId, setSelectedLinkId] = useState<string>();
  const [viewport, setViewport] = useState({
    width: 0,
    height: topologyCanvasHeight,
    fontScale: PixelRatio.getFontScale(),
  });
  const [nodeSizes, setNodeSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedOffsetX = useSharedValue(0);
  const savedOffsetY = useSharedValue(0);
  const worldWidth = Math.max(minimumWorldWidth, viewport.width);
  const worldHeight = Math.max(minimumWorldHeight, viewport.height);
  const worldViewport = useMemo(
    () => ({
      width: worldWidth,
      height: worldHeight,
      fontScale: viewport.fontScale,
    }),
    [viewport.fontScale, worldHeight, worldWidth],
  );
  const selected = topology.devices.find((device) => device.id === selectedId);
  const links = useMemo(
    () =>
      topology.links
        .map((link) => ({
          link,
          from: topology.devices.find(
            (device) => device.id === link.fromDeviceId,
          ),
          to: topology.devices.find((device) => device.id === link.toDeviceId),
        }))
        .filter(
          (
            value,
          ): value is typeof value & {
            from: WorkshopTopologyDevice;
            to: WorkshopTopologyDevice;
          } => Boolean(value.from && value.to),
        ),
    [topology],
  );
  const cableGeometry = useMemo(
    () =>
      calculateWorkshopTopologyGeometry(
        topology,
        worldViewport,
        topology.devices.map((device) => ({
          deviceId: device.id,
          x: canvasCoordinate(device.x, worldWidth, nodeHorizontalPadding),
          y: canvasCoordinate(device.y, worldHeight, nodeVerticalPadding),
          width: nodeSizes[device.id]?.width ?? 86,
          height: nodeSizes[device.id]?.height ?? 78,
        })),
      ),
    [nodeSizes, topology, worldHeight, worldViewport, worldWidth],
  );
  const labels = cableGeometry.flatMap((cable) => [
    ...cable.endpointLabels,
    cable.contextLabel,
  ]);
  const gesture = Gesture.Simultaneous(
    Gesture.Pan()
      .minDistance(8)
      .onStart(() => {
        savedOffsetX.set(offsetX.get());
        savedOffsetY.set(offsetY.get());
      })
      .onUpdate((event) => {
        offsetX.set(
          clampPan(
            savedOffsetX.get() + event.translationX,
            viewport.width,
            worldWidth * scale.get(),
          ),
        );
        offsetY.set(
          clampPan(
            savedOffsetY.get() + event.translationY,
            viewport.height,
            worldHeight * scale.get(),
          ),
        );
      }),
    Gesture.Pinch()
      .onStart(() => {
        savedScale.set(scale.get());
        savedOffsetX.set(offsetX.get());
        savedOffsetY.set(offsetY.get());
      })
      .onUpdate((event) => {
        const nextScale = Math.max(
          1,
          Math.min(2.5, savedScale.get() * event.scale),
        );
        const contentX =
          (event.focalX - savedOffsetX.get()) / savedScale.get();
        const contentY =
          (event.focalY - savedOffsetY.get()) / savedScale.get();
        offsetX.set(
          clampPan(
            event.focalX - contentX * nextScale,
            viewport.width,
            worldWidth * nextScale,
          ),
        );
        offsetY.set(
          clampPan(
            event.focalY - contentY * nextScale,
            viewport.height,
            worldHeight * nextScale,
          ),
        );
        scale.set(nextScale);
      }),
  );
  const panTransform = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.get() },
      { translateY: offsetY.get() },
    ],
  }));
  const zoomTransform = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    transformOrigin: "top left",
  }));
  const zoom = (direction: 1 | -1) => {
    const currentScale = scale.get();
    const nextScale = Math.max(
      1,
      Math.min(2.5, currentScale + direction * 0.25),
    );
    const focusX = viewport.width / 2;
    const focusY = viewport.height / 2;
    const nextOffsetX =
      focusX - ((focusX - offsetX.get()) / currentScale) * nextScale;
    const nextOffsetY =
      focusY - ((focusY - offsetY.get()) / currentScale) * nextScale;
    offsetX.set(
      withTiming(
        clampPan(nextOffsetX, viewport.width, worldWidth * nextScale),
      ),
    );
    offsetY.set(
      withTiming(
        clampPan(nextOffsetY, viewport.height, worldHeight * nextScale),
      ),
    );
    scale.set(withTiming(nextScale));
  };
  const resetView = () => {
    scale.set(withTiming(1));
    offsetX.set(withTiming(centeredPan(viewport.width, worldWidth)));
    offsetY.set(withTiming(centeredPan(viewport.height, worldHeight)));
  };
  return (
    <View style={styles.shell}>
      <Text variant="sectionHeading">{topology.title.toUpperCase()}</Text>
      <Text variant="bodySmall" style={styles.muted}>
        {topology.accessibilityDescription}
      </Text>
      <View style={styles.viewTools}>
        <Text variant="technical" style={styles.viewHint}>
          DRAG TO PAN · PINCH OR USE BUTTONS TO ZOOM
        </Text>
        <View style={styles.zoomActions}>
          <Pressable
            accessibilityLabel="Zoom out"
            accessibilityRole="button"
            onPress={() => zoom(-1)}
            style={styles.zoomButton}
          >
            <Text variant="sectionHeading">−</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Reset topology view"
            accessibilityRole="button"
            onPress={resetView}
            style={styles.resetButton}
          >
            <Text variant="technical">RESET VIEW</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Zoom in"
            accessibilityRole="button"
            onPress={() => zoom(1)}
            style={styles.zoomButton}
          >
            <Text variant="sectionHeading">+</Text>
          </Pressable>
        </View>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          accessibilityLabel={topology.accessibilityDescription}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            const fontScale = PixelRatio.getFontScale();
            if (viewport.width === 0) {
              offsetX.set(
                centeredPan(width, Math.max(minimumWorldWidth, width)),
              );
              offsetY.set(
                centeredPan(height, Math.max(minimumWorldHeight, height)),
              );
            }
            setViewport((current) =>
              current.width === width &&
              current.height === height &&
              current.fontScale === fontScale
                ? current
                : {
                    width,
                    height,
                    fontScale,
                  },
            );
          }}
          style={styles.canvas}
        >
          <Animated.View
            style={[
              styles.worldCanvas,
              { width: worldWidth, height: worldHeight },
              panTransform,
            ]}
          >
            <Animated.View
              style={[
                styles.worldCanvas,
                { width: worldWidth, height: worldHeight },
                zoomTransform,
              ]}
            >
            <Svg
              accessible={false}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              viewBox={`0 0 ${worldWidth} ${worldHeight}`}
              preserveAspectRatio="none"
            >
              {cableGeometry.map((cable) => {
                const link = topology.links.find(
                  (candidate) => candidate.id === cable.linkId,
                );
                return (
                  <Line
                    key={cable.linkId}
                    x1={cable.start.x}
                    y1={cable.start.y}
                    x2={cable.end.x}
                    y2={cable.end.y}
                    stroke={
                      link?.state === "down"
                        ? colors.danger
                        : link?.id === selectedLinkId
                          ? colors.orange
                          : colors.green
                    }
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </Svg>
            {topology.devices.map((device) => (
              <Pressable
                key={device.id}
                accessibilityHint="Shows this device's instructor-provided configuration"
                accessibilityLabel={`${device.name}, ${device.type}`}
                accessibilityRole="button"
                accessibilityState={{ selected: device.id === selectedId }}
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setNodeSizes((current) => {
                    const previous = current[device.id];
                    if (
                      previous?.width === width &&
                      previous.height === height
                    ) {
                      return current;
                    }
                    return { ...current, [device.id]: { width, height } };
                  });
                }}
                onPress={() => {
                  setSelectedId(device.id);
                  setSelectedLinkId(undefined);
                }}
                style={[
                  styles.device,
                  {
                    left: canvasCoordinate(
                      device.x,
                      worldWidth,
                      nodeHorizontalPadding,
                    ),
                    top: canvasCoordinate(
                      device.y,
                      worldHeight,
                      nodeVerticalPadding,
                    ),
                  },
                  device.id === selectedId && styles.deviceSelected,
                ]}
              >
                <Image
                  accessible={false}
                  contentFit="contain"
                  source={artwork[device.type]}
                  style={styles.artwork}
                />
                <Text variant="technical" style={styles.deviceName}>
                  {device.name}
                </Text>
              </Pressable>
            ))}
            {labels.map((label) =>
              label.kind === "endpoint" ? (
                <View
                  accessible={false}
                  key={label.id}
                  pointerEvents="none"
                  style={[
                    styles.endpointPlate,
                    {
                      left: label.x - label.width / 2,
                      top: label.y - label.height / 2,
                      minWidth: label.width,
                      minHeight: label.height,
                    },
                  ]}
                >
                  <Text variant="technical" style={styles.endpointPlateText}>
                    {label.text}
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityLabel={`Inspect connection ${label.text}`}
                  accessibilityRole="button"
                  key={label.id}
                  onPress={() => {
                    setSelectedId(undefined);
                    setSelectedLinkId(label.linkId);
                  }}
                  style={[
                    styles.contextPlate,
                    selectedLinkId === label.linkId &&
                      styles.contextPlateSelected,
                    label.tone === "warning" && styles.contextPlateWarning,
                    {
                      left: label.x - label.width / 2,
                      top: label.y - label.height / 2,
                      minWidth: label.width,
                      minHeight: label.height,
                    },
                  ]}
                >
                  <Text variant="technical" style={styles.contextPlateText}>
                    {label.text}
                  </Text>
                </Pressable>
              ),
            )}
            </Animated.View>
          </Animated.View>
        </View>
      </GestureDetector>
      {selected ? <DeviceInspector device={selected} /> : null}
      {selectedLinkId ? (
        <SelectedConnection topology={topology} linkId={selectedLinkId} />
      ) : null}
      <View style={styles.links}>
        <Text variant="label" style={styles.label}>
          CABLE DETAILS
        </Text>
        {links.map(({ link, from, to }) => {
          const fromInterface = from.interfaces.find(
            (item) => item.id === link.fromInterfaceId,
          );
          const toInterface = to.interfaces.find(
            (item) => item.id === link.toInterfaceId,
          );
          const context = deriveWorkshopLinkContext(topology, link).label;
          return (
            <View key={link.id} style={styles.link}>
              <View style={styles.endpoint}>
                <Text variant="technical" style={styles.endpointDevice}>
                  {from.name}
                </Text>
                <Text variant="technical">
                  {fromInterface?.name ?? "INTERFACE"}
                </Text>
              </View>
              <View style={styles.connection}>
                <View
                  style={[
                    styles.line,
                    link.state === "down" && styles.lineDown,
                  ]}
                />
                <Text variant="technical" style={styles.context}>
                  {context}
                </Text>
                <Text
                  variant="technical"
                  style={link.state === "down" ? styles.down : styles.up}
                >
                  {link.state === "down" ? "LINK DOWN" : "LINK UP"}
                </Text>
              </View>
              <View style={[styles.endpoint, styles.endpointRight]}>
                <Text variant="technical" style={styles.endpointDevice}>
                  {to.name}
                </Text>
                <Text variant="technical">
                  {toInterface?.name ?? "INTERFACE"}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SelectedConnection({
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

function DeviceInspector({ device }: { device: WorkshopTopologyDevice }) {
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  shell: {
    gap: Space.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Space.md,
    backgroundColor: colors.surface,
  },
  muted: { color: colors.textMuted },
  viewTools: { gap: Space.sm },
  viewHint: { color: colors.textMuted },
  zoomActions: { flexDirection: "row", gap: Space.sm, alignItems: "center" },
  zoomButton: {
    minWidth: 44,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButton: {
    minHeight: 44,
    paddingHorizontal: Space.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {
    height: topologyCanvasHeight,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  worldCanvas: { position: "absolute", left: 0, top: 0 },
  device: {
    position: "absolute",
    width: 86,
    minHeight: 78,
    marginLeft: -43,
    marginTop: -39,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    padding: Space.xs,
    zIndex: 2,
  },
  deviceSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  endpointPlate: {
    position: "absolute",
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: colors.textMuted,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  endpointPlateText: { color: colors.text, ...Typography.technical },
  contextPlate: {
    position: "absolute",
    paddingHorizontal: Space.sm,
    borderWidth: 1,
    borderColor: colors.textMuted,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  contextPlateSelected: { borderColor: colors.orange },
  contextPlateWarning: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  contextPlateText: { color: colors.text, textAlign: "center", ...Typography.technical },
  artwork: { width: 46, height: 42 },
  deviceName: { fontFamily: Fonts.semibold, textAlign: "center" },
  inspector: {
    borderWidth: 1,
    borderColor: colors.green,
    backgroundColor: colors.greenSoft,
    padding: Space.md,
    gap: Space.sm,
  },
  label: { color: colors.green },
  record: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: Space.sm,
    gap: 3,
  },
  recordTitle: { color: colors.orange, fontFamily: Fonts.semibold },
  note: { gap: Space.xs, marginTop: Space.sm },
  linkRecordGrid: { flexDirection: "row", gap: Space.md },
  linkRecordEndpoint: { flex: 1, gap: 3 },
  links: { gap: Space.sm },
  link: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Space.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  endpoint: { width: 86 },
  endpointRight: { alignItems: "flex-end" },
  endpointDevice: { color: colors.text, fontFamily: Fonts.semibold },
  connection: { flex: 1, alignItems: "center", gap: 5 },
  line: { width: "100%", height: 1, backgroundColor: colors.green },
  lineDown: { backgroundColor: colors.danger },
  context: { color: colors.orange, textAlign: "center" },
  up: { color: colors.green },
  down: { color: colors.danger },
});
