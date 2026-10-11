import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fetchWorkshopInbox, markWorkshopInboxRead, type WorkshopInboxItem } from '@/core/workshops/workshop-service';
import { disableWorkshopPush, enableWorkshopPush, workshopPushEnabled } from '@/core/workshops/workshop-push';
import { useAuth } from '@/features/account/auth-context';
import { ActionCard } from '@/shared/components/action-card';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { workshopRoute } from '@/shared/routes';
import { Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';
import { useWorkshopStore } from '@/store/use-workshop-store';

export default function WorkshopInboxScreen() {
  const styles = useThemeStyles(createStyles);
  const { status } = useAuth();
  const library = useWorkshopStore((state) => state.library);
  const [items, setItems] = useState<WorkshopInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [savingPush, setSavingPush] = useState(false);
  const refresh = useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true); setError(undefined);
    try { setItems(await fetchWorkshopInbox()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Messages could not be loaded.'); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 0); return () => clearTimeout(timer); }, [refresh]);
  useEffect(() => { if (status === 'authenticated') void workshopPushEnabled().then(setPushEnabled); }, [status]);
  const togglePush = async () => {
    if (savingPush) return;
    setSavingPush(true); setError(undefined);
    try {
      if (pushEnabled) await disableWorkshopPush(); else await enableWorkshopPush();
      setPushEnabled(!pushEnabled);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Notification preference could not be changed.'); }
    finally { setSavingPush(false); }
  };
  const open = async (item: WorkshopInboxItem) => {
    if (!library.some((entry) => entry.classId === item.classId)) {
      setError('Refresh My Classes before opening this message. You may no longer have access to its class.');
      return;
    }
    if (!item.readAt) {
      try {
        await markWorkshopInboxRead(item.id);
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Message read state could not be updated.'); }
    }
    router.push(workshopRoute(item.classId));
  };
  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to My Classes', icon: 'arrow-left', label: 'BACK / CLASSES', onPress: () => router.back() }} />}>
    <Text variant="label" style={styles.eyebrow}>CLASS COMMUNICATION</Text>
    <Text variant="screenTitle">INBOX</Text>
    <Text variant="bodySmall" style={styles.description}>Announcements stay here even if you choose not to receive push notifications.</Text>
    <View style={styles.refresh}><AppButton disabled={loading || status !== 'authenticated'} label={loading ? 'Refreshing messages' : 'Refresh messages'} onPress={() => void refresh()} variant="utility" /></View>
    {status === 'authenticated' ? <View style={styles.refresh}><AppButton disabled={savingPush} label={savingPush ? 'Saving preference' : pushEnabled ? 'Turn off push notifications' : 'Enable push notifications'} onPress={() => void togglePush()} variant="utility" /></View> : null}
    {loading ? <Text accessibilityLiveRegion="polite" variant="technical" style={styles.description}>LOADING MESSAGES...</Text> : null}
    {error ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.error}>{error}</Text> : null}
    <View style={styles.list}>{items.map((item) => <ActionCard key={item.id} icon="learn" status={`${item.readAt ? 'READ' : 'NEW'} / ${new Date(item.createdAt).toLocaleDateString()}`} title={item.title} detail={item.body} onPress={() => void open(item)} />)}</View>
    {!loading && !items.length ? <Text variant="bodySmall" style={styles.description}>No class messages yet.</Text> : null}
    {status !== 'authenticated' ? <Text variant="bodySmall" style={styles.error}>Sign in to view your class messages.</Text> : null}
  </Screen>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  eyebrow: { color: colors.orange, marginTop: Space.lg, marginBottom: Space.sm },
  description: { color: colors.textMuted, marginTop: Space.md },
  error: { color: colors.danger, marginTop: Space.md },
  list: { gap: Space.sm, marginTop: Space.xl, paddingBottom: Space.xl },
  refresh: { marginTop: Space.lg },
});
