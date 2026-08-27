import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { prepareWorkshopLibraryAssets } from '@/core/workshops/workshop-assets';
import { fetchWorkshopLibrary, joinWorkshopClass } from '@/core/workshops/workshop-service';
import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { AppRoutes, workshopRoute } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useWorkshopStore } from '@/store/use-workshop-store';

export default function JoinClassScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(typeof params.code === 'string' ? params.code.toUpperCase() : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const { status } = useAuth();
  const replaceLibrary = useWorkshopStore((state) => state.replaceLibrary);
  const assetUris = useWorkshopStore((state) => state.assetUris);
  const join = async () => {
    setBusy(true); setError(undefined);
    try {
      const result = await joinWorkshopClass(code);
      const library = await fetchWorkshopLibrary();
      const assets = await prepareWorkshopLibraryAssets(library, assetUris);
      replaceLibrary(library, assets);
      router.replace(workshopRoute(result.classId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The class could not be joined.');
    } finally { setBusy(false); }
  };
  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to My Classes', icon: 'arrow-left', label: 'BACK / CLASSES', onPress: () => router.replace(AppRoutes.workshops) }} />}>
    <Text variant="label" style={styles.eyebrow}>PRIVATE CLASS</Text><Text variant="screenTitle">JOIN A CLASS</Text><Text variant="body" style={styles.copy}>Enter the code shown by your instructor. NetBite will download the class’s published lessons for offline study.</Text>
    <View style={styles.panel}><Text variant="label">CLASS CODE</Text><TextInput autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Class code" maxLength={10} onChangeText={(value) => setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABC234XY" placeholderTextColor={Palette.textMuted} style={styles.input} value={code} /><Text variant="bodySmall" style={styles.hint}>Class codes contain 6–10 letters or numbers.</Text>{status === 'authenticated' ? <AppButton label={busy ? 'Joining class' : 'Join class'} loading={busy} disabled={busy || code.length < 6} onPress={() => void join()} /> : <><Text variant="bodySmall" style={styles.hint}>Sign in first so NetBite can connect this class and graded work to the correct student.</Text><AppButton label="Sign in to continue" onPress={() => router.push({ pathname: '/auth', params: { returnTo: '/workshops/join', code } })} /></>}{error ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.error}>{error}</Text> : null}</View>
  </Screen>;
}
const styles = StyleSheet.create({ eyebrow: { color: Palette.orange }, copy: { color: Palette.textMuted, marginVertical: Space.md }, panel: { gap: Space.md, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg }, input: { minHeight: 52, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background, paddingHorizontal: Space.md, color: Palette.white, fontFamily: Fonts.semibold, fontSize: 18, letterSpacing: 3 }, hint: { color: Palette.textMuted }, error: { color: Palette.danger } });
