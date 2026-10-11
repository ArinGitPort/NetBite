import { Image } from "expo-image";
import { useMemo,useState } from "react";
import { PixelRatio,Pressable,StyleSheet,View } from "react-native";
import { Gesture,GestureDetector } from "react-native-gesture-handler";
import Animated,{
useAnimatedStyle,
useSharedValue,
withTiming,
} from "react-native-reanimated";
import Svg,{ Line } from "react-native-svg";

import type {
WorkshopTopology,
WorkshopTopologyDevice,
} from "@/core/workshops/types";
import { Text } from "@/shared/components/console-text";
import { useCanvasColors,useCanvasThemeStyles } from "@/shared/theme-context";
import {
calculateWorkshopTopologyGeometry,
deriveWorkshopLinkContext,
normalizeWorkshopTopology,
} from "@netbite/workshops/topology-authoring";
import { DeviceInspector,SelectedConnection } from "./workshop-topology-inspector";
import { createStyles,topologyCanvasHeight } from "./workshop-topology-styles";

const artwork = {
  pc: require("@/assets/images/devices/device-pc-mobile.png"),
  switch: require("@/assets/images/devices/device-switch-mobile.png"),
  router: require("@/assets/images/devices/device-router-mobile.png"),
  server: require("@/assets/images/education/server-terminal-mobile.png"),
} as const;

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
