import type { DeviceNode,Position } from '@/core/network/models';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { Text } from '@/shared/components/console-text';
import { useCanvasThemeStyles } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';
import { memo } from 'react';
import { Pressable } from 'react-native';
import { Gesture,GestureDetector } from 'react-native-gesture-handler';
import Animated,{ useAnimatedStyle,useSharedValue } from 'react-native-reanimated';
import { CANVAS_HEIGHT,NODE_SIZE } from './topology-canvas-layout';
import { createStyles } from './topology-canvas-styles';

interface DraggableDeviceProps {
  device: DeviceNode;
  canvasWidth: number;
  connectionMode: boolean;
  selected: boolean;
  onConnect: (deviceId: string) => void;
  onDrag: (deviceId: string, position: Position) => void;
  onDragEnd: (deviceId: string) => void;
  onSelect: (deviceId: string) => void;
}

export function clampPosition(position: Position, canvasWidth: number): Position {
  return {
    x: Math.max(0, Math.min(canvasWidth - NODE_SIZE, position.x)),
    y: Math.max(0, Math.min(CANVAS_HEIGHT - NODE_SIZE, position.y)),
  };
}

export const DraggableDevice = memo(function DraggableDevice({
  device,
  canvasWidth,
  connectionMode,
  selected,
  onConnect,
  onDrag,
  onDragEnd,
  onSelect,
}: DraggableDeviceProps) {
  const styles = useCanvasThemeStyles(createStyles);
  const moveDevice = useGameStore((state) => state.moveDevice);
  const selectedConnectionId = useGameStore((state) => state.selectedConnectionStartId);
  const x = useSharedValue(device.position.x);
  const y = useSharedValue(device.position.y);
  const originX = useSharedValue(device.position.x);
  const originY = useSharedValue(device.position.y);

  const pan = Gesture.Pan()
    .minDistance(5)
    .runOnJS(true)
    .onBegin(() => {
      originX.value = x.value;
      originY.value = y.value;
    })
    .onUpdate((event) => {
      const next = clampPosition(
        { x: originX.value + event.translationX, y: originY.value + event.translationY },
        canvasWidth,
      );
      x.value = next.x;
      y.value = next.y;
      onDrag(device.id, next);
    })
    .onEnd((_event, success) => {
      if (success) moveDevice(device.id, { x: x.value, y: y.value });
    })
    .onFinalize((_event, success) => {
      if (!success) {
        x.value = device.position.x;
        y.value = device.position.y;
      }
      onDragEnd(device.id);
    });

  const animatedPosition = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.nodePosition, animatedPosition]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${device.name}${connectionMode ? ', tap to connect' : ', drag to move or tap for device actions'}`}
          onPress={() => connectionMode ? onConnect(device.id) : onSelect(device.id)}
          style={[
            styles.node,
            selectedConnectionId === device.id && styles.selectedConnectionNode,
            selected && styles.selectedNode,
          ]}>
          <DeviceGlyph type={device.type} size={64} />
          <Text variant="label" numberOfLines={1} style={styles.nodeLabel}>{device.name}</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
});

