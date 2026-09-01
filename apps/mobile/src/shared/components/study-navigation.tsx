import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppButton } from '@/shared/components/app-button';
import { Space } from '@/shared/theme';

interface StudyNavigationAction {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}

interface StudyNavigationProps {
  previous: StudyNavigationAction;
  next: StudyNavigationAction & { complete?: boolean };
  style?: StyleProp<ViewStyle>;
}

export function StudyNavigation({ previous, next, style }: StudyNavigationProps) {
  return (
    <View accessibilityLabel="Study navigation" style={[styles.row, style]}>
      <AppButton
        disabled={previous.disabled}
        label={previous.label}
        leadingIcon="arrow-left"
        onPress={previous.onPress}
        style={styles.action}
        variant="quiet"
      />
      <AppButton
        disabled={next.disabled}
        label={next.label}
        onPress={next.onPress}
        style={styles.action}
        trailingIcon={next.complete ? 'check' : 'arrow-right'}
        variant="quiet"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  action: { flex: 1, minWidth: 0, paddingHorizontal: Space.sm, borderWidth: 0, backgroundColor: 'transparent' },
});
