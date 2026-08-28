import { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';

export type ResponsiveMode = 'compact' | 'regular' | 'wide';

export const RESPONSIVE_BREAKPOINTS = {
  regular: 480,
  wide: 640,
} as const;

export function getEffectiveWidth(width: number, fontScale: number) {
  return width / Math.max(fontScale, 1);
}

export function getResponsiveMode(effectiveWidth: number): ResponsiveMode {
  if (effectiveWidth < RESPONSIVE_BREAKPOINTS.regular) return 'compact';
  if (effectiveWidth < RESPONSIVE_BREAKPOINTS.wide) return 'regular';
  return 'wide';
}

export function useMeasuredResponsiveLayout() {
  const window = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const width = measuredWidth || window.width;
  const effectiveWidth = getEffectiveWidth(width, window.fontScale);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setMeasuredWidth((currentWidth) => currentWidth === nextWidth ? currentWidth : nextWidth);
  }, []);

  return useMemo(() => ({
    width,
    effectiveWidth,
    fontScale: window.fontScale,
    mode: getResponsiveMode(effectiveWidth),
    onLayout,
  }), [effectiveWidth, onLayout, width, window.fontScale]);
}
