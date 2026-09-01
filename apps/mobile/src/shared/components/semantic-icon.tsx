import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme-context';

export type SemanticIconName = 'learn' | 'sandbox' | 'account' | 'settings' | 'lesson' | 'lab' | 'quiz' | 'flashcards' | 'add' | 'refresh' | 'connect' | 'configure' | 'test' | 'more' | 'bookmark' | 'saved' | 'backup' | 'appearance' | 'haptics' | 'motion' | 'help' | 'diagnostics' | 'presentation' | 'reset' | 'status-pending' | 'status-complete' | 'status-attention' | 'status-locked' | 'status-info';

const symbols: Record<SemanticIconName, SymbolViewProps['name']> = {
  learn: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' },
  sandbox: { ios: 'network', android: 'hub', web: 'hub' },
  account: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  lesson: { ios: 'doc.text.fill', android: 'description', web: 'description' },
  lab: { ios: 'wrench.and.screwdriver.fill', android: 'construction', web: 'construction' },
  quiz: { ios: 'checklist', android: 'quiz', web: 'quiz' },
  flashcards: { ios: 'rectangle.on.rectangle.angled', android: 'style', web: 'style' },
  add: { ios: 'plus.square.fill', android: 'add_box', web: 'add_box' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  connect: { ios: 'cable.connector', android: 'cable', web: 'cable' },
  configure: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  test: { ios: 'network', android: 'network_ping', web: 'network_ping' },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
  bookmark: { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' },
  saved: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  backup: { ios: 'icloud.and.arrow.up', android: 'cloud_upload', web: 'cloud_upload' },
  appearance: { ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' },
  haptics: { ios: 'hand.tap.fill', android: 'vibration', web: 'vibration' },
  motion: { ios: 'figure.walk.motion', android: 'animation', web: 'animation' },
  help: { ios: 'questionmark.circle.fill', android: 'help', web: 'help' },
  diagnostics: { ios: 'stethoscope', android: 'troubleshoot', web: 'troubleshoot' },
  presentation: { ios: 'play.rectangle.fill', android: 'present_to_all', web: 'present_to_all' },
  reset: { ios: 'trash.fill', android: 'delete', web: 'delete' },
  'status-pending': { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' },
  'status-complete': { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  'status-attention': { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  'status-locked': { ios: 'lock.fill', android: 'lock', web: 'lock' },
  'status-info': { ios: 'info.circle.fill', android: 'info', web: 'info' },
};

export function SemanticIcon({ name, size = 24, color }: { name: SemanticIconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <View accessible={false} style={[styles.frame, { width: size, height: size }]}><SymbolView name={symbols[name]} size={size} tintColor={color ?? colors.text} style={{ width: size, height: size }} /></View>;
}

const styles = StyleSheet.create({ frame: { alignItems: 'center', justifyContent: 'center' } });
