import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';

const PUSH_OPT_IN_KEY = 'netbite-workshop-push-enabled-v1';
const DEVICE_ID_KEY = 'netbite-workshop-push-device-v1';
export function workshopPushEnabledLocally() { return localStorage.getItem(PUSH_OPT_IN_KEY) === '1'; }
function deviceId() {
  const stored = localStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;
  const created = Crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function enableWorkshopPush(): Promise<void> {
  if (Platform.OS !== 'android' || isRunningInExpoGo()) throw new Error('Push notifications need a NetBite Android development or release build. Your in-app inbox still works.');
  const Notifications = await import('expo-notifications');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Push notifications are not configured for this build. Your in-app inbox still works.');
  if (!supabase) throw new Error('Connect to NetBite before enabling notifications.');
  await Notifications.setNotificationChannelAsync('class-updates', { name: 'Class updates', importance: Notifications.AndroidImportance.DEFAULT });
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications are off in Android settings. Your in-app inbox still works.');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Sign in before enabling notifications.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  // A stable per-install ID rotates this device's token without disabling
  // another device owned by the same student.
  const { error } = await supabase.from('workshop_push_tokens').upsert({ student_id: userData.user.id, device_id: deviceId(), token, enabled: true, invalidated_at: null, updated_at: new Date().toISOString() }, { onConflict: 'student_id,device_id' });
  if (error) throw new Error('Notification preferences could not be saved.');
  localStorage.setItem(PUSH_OPT_IN_KEY, '1');
}

export async function disableWorkshopPush(): Promise<void> {
  if (!supabase) throw new Error('Connect to NetBite before changing notifications.');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Sign in before changing notifications.');
  const { error } = await supabase.from('workshop_push_tokens').delete().eq('student_id', userData.user.id).eq('device_id', deviceId());
  if (error) throw new Error('Notification preferences could not be saved.');
  localStorage.removeItem(PUSH_OPT_IN_KEY);
}

export async function workshopPushEnabled(): Promise<boolean> {
  if (!supabase || !workshopPushEnabledLocally()) return false;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const { data, error } = await supabase.from('workshop_push_tokens').select('id').eq('student_id', userData.user.id).eq('device_id', deviceId()).eq('enabled', true).is('invalidated_at', null).limit(1);
  return !error && Boolean(data?.length);
}
