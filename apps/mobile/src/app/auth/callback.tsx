import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';

export default function AuthCallbackScreen() {
  useEffect(() => { const timer = setTimeout(() => router.replace('/'), 400); return () => clearTimeout(timer); }, []);
  return <Screen><Text accessibilityRole="alert" variant="body">Completing secure sign-in…</Text></Screen>;
}
