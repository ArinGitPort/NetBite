import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
import {
  deriveIpv4Network,
  prefixToSubnetMask,
} from "../../../shared/workshop-command-generator";
import { Text } from "@/shared/components/console-text";
import { Fonts, Palette, Space } from "@/shared/theme";

const artwork = {
  pc: require("@/assets/images/devices/device-pc-mobile.png"),
  switch: require("@/assets/images/devices/device-switch-mobile.png"),
  router: require("@/assets/images/devices/device-router-mobile.png"),
  server: require("@/assets/images/education/server-terminal-mobile.png"),
} as const;

export function WorkshopTopologyView({
  topology,
}: {
  topology: WorkshopTopology;
}) {
  const [selectedId, setSelectedId] = useState(topology.devices[0]?.id);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedOffsetX = useSharedValue(0);
  const savedOffsetY = useSharedValue(0);
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
  const gesture = Gesture.Simultaneous(
    Gesture.Pan()
      .minDistance(8)
      .onStart(() => {
        savedOffsetX.set(offsetX.get());
        savedOffsetY.set(offsetY.get());
      })
      .onUpdate((event) => {
        offsetX.set(
          Math.max(
            -420,
            Math.min(420, savedOffsetX.get() + event.translationX),
          ),
        );
        offsetY.set(
          Math.max(
            -280,
            Math.min(280, savedOffsetY.get() + event.translationY),
          ),
        );
      }),
    Gesture.Pinch()
      .onStart(() => {
        savedScale.set(scale.get());
      })
      .onUpdate((event) => {
        scale.set(Math.max(1, Math.min(2.5, savedScale.get() * event.scale)));
      }),
  );
  const canvasTransform = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.get() },
      { translateY: offsetY.get() },
      { scale: scale.get() },
    ],
  }));
  const zoom = (direction: 1 | -1) =>
    scale.set(
      withTiming(Math.max(1, Math.min(2.5, scale.get() + direction * 0.25))),
    );
  const resetView = () => {
    scale.set(withTiming(1));
    offsetX.set(withTiming(0));
    offsetY.set(withTiming(0));
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
          style={styles.canvas}
        >
          <Animated.View style={[styles.panZoomCanvas, canvasTransform]}>
            <Svg
              accessible={false}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {links.map(({ link, from, to }) => (
                <Line
                  key={link.id}
                  x1={from.x * 100}
                  y1={from.y * 100}
                  x2={to.x * 100}
                  y2={to.y * 100}
                  stroke={
                    link.state === "down" ? Palette.danger : Palette.green
                  }
                  strokeWidth={0.7}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </Svg>
            {topology.devices.map((device) => (
              <Pressable
                key={device.id}
                accessibilityHint="Shows this device's instructor-provided configuration"
                accessibilityLabel={`${device.name}, ${device.type}`}
                accessibilityRole="button"
                accessibilityState={{ selected: device.id === selectedId }}
                onPress={() => setSelectedId(device.id)}
                style={[
                  styles.device,
                  { left: `${device.x * 100}%`, top: `${device.y * 100}%` },
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
          </Animated.View>
        </View>
      </GestureDetector>
      {selected ? <DeviceInspector device={selected} /> : null}
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
          const context =
            link.network ??
            (link.trunkVlans?.length
              ? `TRUNK VLANs ${link.trunkVlans.join(", ")}`
              : link.accessVlan
                ? `ACCESS VLAN ${link.accessVlan}`
                : (link.label ?? "CONNECTED"));
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

function DeviceInspector({ device }: { device: WorkshopTopologyDevice }) {
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
              INTERFACE {item.name}
            </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: Space.md,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Space.md,
    backgroundColor: Palette.surface,
  },
  muted: { color: Palette.textMuted },
  viewTools: { gap: Space.sm },
  viewHint: { color: Palette.textMuted },
  zoomActions: { flexDirection: "row", gap: Space.sm, alignItems: "center" },
  zoomButton: {
    minWidth: 44,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButton: {
    minHeight: 44,
    paddingHorizontal: Space.md,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {
    height: 360,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.background,
  },
  panZoomCanvas: { width: "100%", height: "100%" },
  device: {
    position: "absolute",
    width: 86,
    minHeight: 78,
    marginLeft: -43,
    marginTop: -39,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    padding: Space.xs,
    zIndex: 2,
  },
  deviceSelected: {
    borderColor: Palette.orange,
    backgroundColor: Palette.orangeSoft,
  },
  artwork: { width: 46, height: 42 },
  deviceName: { fontFamily: Fonts.semibold, textAlign: "center" },
  inspector: {
    borderWidth: 1,
    borderColor: Palette.green,
    backgroundColor: Palette.greenSoft,
    padding: Space.md,
    gap: Space.sm,
  },
  label: { color: Palette.green },
  record: {
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingTop: Space.sm,
    gap: 3,
  },
  recordTitle: { color: Palette.orange, fontFamily: Fonts.semibold },
  note: { gap: Space.xs, marginTop: Space.sm },
  links: { gap: Space.sm },
  link: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Space.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  endpoint: { width: 86 },
  endpointRight: { alignItems: "flex-end" },
  endpointDevice: { color: Palette.white, fontFamily: Fonts.semibold },
  connection: { flex: 1, alignItems: "center", gap: 5 },
  line: { width: "100%", height: 1, backgroundColor: Palette.green },
  lineDown: { backgroundColor: Palette.danger },
  context: { color: Palette.orange, textAlign: "center" },
  up: { color: Palette.green },
  down: { color: Palette.danger },
});
