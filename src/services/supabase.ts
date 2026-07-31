import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isCloudConfigured = Boolean(url && publishableKey && /^https:\/\//.test(url));

export const supabase = isCloudConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : undefined;

export async function createSessionFromUrl(returnUrl: string) {
  if (!supabase) return undefined;
  const parsed = new URL(returnUrl);
  const query = parsed.searchParams;
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const errorDescription = query.get('error_description') ?? fragment.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  const code = query.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }

  const accessToken = query.get('access_token') ?? fragment.get('access_token');
  const refreshToken = query.get('refresh_token') ?? fragment.get('refresh_token');
  if (!accessToken || !refreshToken) return undefined;
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return data.session;
}
