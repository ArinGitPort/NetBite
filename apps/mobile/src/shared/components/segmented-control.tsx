import { StyleSheet, View } from 'react-native';

import { SelectionControl } from '@/shared/components/selection-control';
import { Space } from '@/shared/theme';

export interface SegmentedControlOption<T extends string> {
  id: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({ label, options, value, onChange, grow = true, wrap = true, optionWidth }: {
  label: string;
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  grow?: boolean;
  wrap?: boolean;
  optionWidth?: number;
}) {
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" style={[styles.group, !wrap && styles.noWrap]}>
      {options.map((option) => {
        const control = <SelectionControl
          description={option.description}
          disabled={option.disabled}
          label={option.label}
          grow={grow}
          onPress={() => onChange(option.id)}
          selected={option.id === value}
        />;
        if (optionWidth) return <View key={option.id} style={{ width: optionWidth }}>{control}</View>;
        return <SelectionControl
          description={option.description}
          disabled={option.disabled}
          key={option.id}
          label={option.label}
          grow={grow}
          onPress={() => onChange(option.id)}
          selected={option.id === value}
        />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  noWrap: { flexWrap: 'nowrap' },
});
