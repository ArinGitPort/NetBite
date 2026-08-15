import { StyleSheet, View } from 'react-native';

import { SelectionControl } from '@/shared/components/selection-control';
import { Space } from '@/shared/theme';

export interface SegmentedControlOption<T extends string> {
  id: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.group}>
      {options.map((option) => (
        <SelectionControl
          description={option.description}
          disabled={option.disabled}
          key={option.id}
          label={option.label}
          onPress={() => onChange(option.id)}
          selected={option.id === value}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ group: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm } });
