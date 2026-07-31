import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { applyLearningProgress, emptyLearningProgress, hasLearningProgress, mergeLearningProgress, serializeLearningProgress } from '@/core/account/progress';
import type { CloudProgressSnapshot, Entitlement, ProgressMergeChoice, SyncStatus, UserProfile } from '@/core/account/types';
import { describeOperationError, withTimeout } from '@/core/reliability/recoverable-operation';
import { fetchProfile, pullCloudProgress, pushCloudProgress, refreshEntitlement as fetchEntitlement } from '@/services/cloud-progress';
import { createSessionFromUrl, isCloudConfigured, supabase } from '@/services/supabase';
import { useGameStore } from '@/store/use-game-store';
import { usePresentationStore } from '@/store/use-presentation-store';
import { useResearchStore } from '@/store/use-research-store';

type AuthStatus = 'loading' | 'guest' | 'authenticated';
interface MergeRequest { local: CloudProgressSnapshot; cloud: CloudProgressSnapshot; userId: string }

interface AuthContextValue {
  status: AuthStatus;
  configured: boolean;
  accountEntryResolved: boolean;
  user?: User;
  profile?: UserProfile;
  entitlement?: Entitlement;
  hasPro: boolean;
  hasContentAccess: boolean;
  presentationActive: boolean;
  syncStatus: SyncStatus;
  error?: string;
  mergeRequest?: MergeRequest;
  continueAsGuest: () => void;
  completeGuestEntry: () => void;
  resetAccountEntry: () => void;
  signInEmail: (email: string, password: string) => Promise<string | undefined>;
  registerEmail: (email: string, password: string, displayName: string) => Promise<{ error?: string; verificationRequired?: boolean }>;
  signInGoogle: () => Promise<string | undefined>;
  sendPasswordReset: (email: string) => Promise<string | undefined>;
  updatePassword: (password: string) => Promise<string | undefined>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | undefined>;
  resolveProgressMerge: (choice: ProgressMergeChoice) => Promise<void>;
  refreshEntitlement: () => Promise<boolean>;
  syncNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const GUEST_SNAPSHOT_KEY = 'netbite-guest-progress-v1';
const OWNER_KEY = 'netbite-progress-owner-v1';
const UPDATED_KEY = 'netbite-progress-updated-v1';
const ACCOUNT_ENTRY_KEY = 'netbite-account-entry-v1';
const accountSnapshotKey = (userId: string) => `netbite-account-progress-v1-${userId}`;

WebBrowser.maybeCompleteAuthSession();

function readSnapshot(key: string) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as CloudProgressSnapshot : undefined;
  } catch {
    return undefined;
  }
}

function writeSnapshot(key: string, snapshot: CloudProgressSnapshot) {
  localStorage.setItem(key, JSON.stringify(snapshot));
}

function replaceProgress(snapshot: CloudProgressSnapshot) {
  useGameStore.setState(applyLearningProgress(snapshot));
}

function currentProgress(updatedAt?: string) {
  return serializeLearningProgress(useGameStore.getState(), updatedAt ?? localStorage.getItem(UPDATED_KEY) ?? new Date().toISOString());
}

function progressFingerprint(state: Parameters<typeof serializeLearningProgress>[0]) {
  return JSON.stringify(serializeLearningProgress(state, ''));
}

function operationMessage(error: unknown, fallback: string) {
  return describeOperationError(error, fallback).message;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const presentationActive = usePresentationStore((state) => state.active);
  const researchActive = useResearchStore((state) => state.active);
  const localSessionActive = presentationActive || researchActive;
  const [status, setStatus] = useState<AuthStatus>(isCloudConfigured ? 'loading' : 'guest');
  const [session, setSession] = useState<Session>();
  const [profile, setProfile] = useState<UserProfile>();
  const [entitlement, setEntitlement] = useState<Entitlement>();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [error, setError] = useState<string>();
  const [mergeRequest, setMergeRequest] = useState<MergeRequest>();
  const [accountEntryResolved, setAccountEntryResolved] = useState(() => localStorage.getItem(ACCOUNT_ENTRY_KEY) === 'complete');
  const applyingRemote = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSerialized = useRef('');
  const syncInFlight = useRef<Promise<void> | undefined>(undefined);

  const markAccountEntryResolved = useCallback(() => {
    localStorage.setItem(ACCOUNT_ENTRY_KEY, 'complete');
    setAccountEntryResolved(true);
  }, []);

  const resetAccountEntry = useCallback(() => {
    localStorage.removeItem(ACCOUNT_ENTRY_KEY);
    setAccountEntryResolved(false);
  }, []);

  const applyOwnedProgress = useCallback((snapshot: CloudProgressSnapshot, owner: string) => {
    applyingRemote.current = true;
    replaceProgress(snapshot);
    localStorage.setItem(OWNER_KEY, owner);
    localStorage.setItem(UPDATED_KEY, snapshot.updatedAt);
    if (owner !== 'guest') writeSnapshot(accountSnapshotKey(owner), snapshot);
    lastSerialized.current = progressFingerprint(useGameStore.getState());
    setTimeout(() => { applyingRemote.current = false; }, 0);
  }, []);

  const loadSession = useCallback(async (nextSession: Session) => {
    const user = nextSession.user;
    markAccountEntryResolved();
    setSession(nextSession);
    setStatus('authenticated');
    setSyncStatus('syncing');
    setError(undefined);
    try {
      const [cloudRecord, nextProfile, nextEntitlement] = await withTimeout(Promise.all([
        pullCloudProgress(user.id),
        fetchProfile(user.id, user.email),
        fetchEntitlement(user.id),
      ]));
      setProfile(nextProfile);
      setEntitlement(nextEntitlement);
      const owner = localStorage.getItem(OWNER_KEY) ?? 'guest';
      const local = currentProgress();
      const savedAccount = readSnapshot(accountSnapshotKey(user.id));
      const cloud = cloudRecord ?? emptyLearningProgress();
      const remote = savedAccount ? mergeLearningProgress(savedAccount, cloud) : cloud;

      if (owner === 'guest' && hasLearningProgress(local)) {
        writeSnapshot(GUEST_SNAPSHOT_KEY, local);
        setMergeRequest({ local, cloud: remote, userId: user.id });
        setSyncStatus('action-needed');
        return;
      }

      const resolved = owner === user.id ? mergeLearningProgress(local, remote) : remote;
      applyOwnedProgress(resolved, user.id);
      await withTimeout(pushCloudProgress(user.id, { ...resolved, updatedAt: new Date().toISOString() }));
      setSyncStatus('synced');
    } catch {
      setSyncStatus('action-needed');
      setError('Cloud progress could not be loaded. Local learning remains available.');
    }
  }, [applyOwnedProgress, markAccountEntryResolved]);

  useEffect(() => {
    let active = true;
    if (!supabase) return;
    supabase.auth.startAutoRefresh();
    void (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) await withTimeout(createSessionFromUrl(initialUrl));
      } catch (nextError) {
        if (active) setError(operationMessage(nextError, 'The sign-in link could not be completed.'));
      }
      try {
        const { data } = await withTimeout(supabase.auth.getSession());
        if (!active) return;
        if (data.session) void loadSession(data.session);
        else { setStatus('guest'); setSyncStatus('local'); }
      } catch (nextError) {
        if (!active) return;
        setStatus('guest');
        setSyncStatus('local');
        setError(operationMessage(nextError, 'Cloud accounts are temporarily unavailable. Local learning is ready.'));
      }
    })();
    const deepLink = Linking.addEventListener('url', ({ url }) => {
      void withTimeout(createSessionFromUrl(url)).catch((nextError) => {
        if (active) setError(operationMessage(nextError, 'The sign-in link could not be completed.'));
      });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      if (nextSession && nextSession.user.id !== session?.user.id) void loadSession(nextSession);
      if (!nextSession) {
        setSession(undefined);
        setProfile(undefined);
        setEntitlement(undefined);
        setMergeRequest(undefined);
        setStatus('guest');
        setSyncStatus('local');
      }
    });
    return () => {
      active = false;
      supabase?.auth.stopAutoRefresh();
      deepLink.remove();
      listener.subscription.unsubscribe();
    };
  }, [loadSession, session?.user.id]);

  const syncNow = useCallback(async () => {
    if (localSessionActive) {
      setSyncStatus('local');
      return;
    }
    if (syncInFlight.current) return syncInFlight.current;
    const userId = session?.user.id;
    if (!userId || mergeRequest) return;
    const operation = (async () => {
      const now = new Date().toISOString();
      const snapshot = serializeLearningProgress(useGameStore.getState(), now);
      writeSnapshot(accountSnapshotKey(userId), snapshot);
      setSyncStatus('syncing');
      try {
        await withTimeout(pushCloudProgress(userId, snapshot));
        localStorage.setItem(UPDATED_KEY, now);
        localStorage.setItem(OWNER_KEY, userId);
        lastSerialized.current = progressFingerprint(useGameStore.getState());
        setSyncStatus('synced');
        setError(undefined);
      } catch {
        setSyncStatus('action-needed');
        setError('Changes are safe on this device and will retry later.');
      }
    })();
    syncInFlight.current = operation;
    try {
      await operation;
    } finally {
      syncInFlight.current = undefined;
    }
  }, [localSessionActive, mergeRequest, session?.user.id]);

  useEffect(() => {
    if (localSessionActive || status !== 'authenticated' || !session || mergeRequest) return;
    const unsubscribe = useGameStore.subscribe((state) => {
      if (applyingRemote.current) return;
      const comparable = progressFingerprint(state);
      if (comparable === lastSerialized.current) return;
      const updatedAt = new Date().toISOString();
      localStorage.setItem(UPDATED_KEY, updatedAt);
      writeSnapshot(accountSnapshotKey(session.user.id), serializeLearningProgress(state, updatedAt));
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => void syncNow(), 900);
    });
    const appState = AppState.addEventListener('change', (next) => { if (next === 'active') void syncNow(); });
    const network = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void syncNow();
    });
    return () => {
      unsubscribe();
      appState.remove();
      network();
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [localSessionActive, mergeRequest, session, status, syncNow]);

  const resolveProgressMerge = useCallback(async (choice: ProgressMergeChoice) => {
    if (!mergeRequest) return;
    if (choice === 'cancel') {
      await supabase?.auth.signOut();
      const guest = readSnapshot(GUEST_SNAPSHOT_KEY) ?? mergeRequest.local;
      applyOwnedProgress(guest, 'guest');
      markAccountEntryResolved();
      setMergeRequest(undefined);
      return;
    }
    const resolved = choice === 'merge'
      ? mergeLearningProgress(mergeRequest.local, mergeRequest.cloud)
      : mergeRequest.cloud;
    const next = { ...resolved, updatedAt: new Date().toISOString() };
    applyOwnedProgress(next, mergeRequest.userId);
    setMergeRequest(undefined);
    setSyncStatus('syncing');
    try {
      await withTimeout(pushCloudProgress(mergeRequest.userId, next));
      setSyncStatus('synced');
    } catch {
      setSyncStatus('action-needed');
    }
  }, [applyOwnedProgress, markAccountEntryResolved, mergeRequest]);

  const signInEmail = async (email: string, password: string) => {
    if (!supabase) return 'Add the Supabase project variables before signing in.';
    try {
      const { data, error: authError } = await withTimeout(supabase.auth.signInWithPassword({ email: email.trim(), password }));
      if (data.session) markAccountEntryResolved();
      return authError?.message;
    } catch (nextError) { return operationMessage(nextError, 'Sign-in is temporarily unavailable.'); }
  };
  const registerEmail = async (email: string, password: string, displayName: string) => {
    if (!supabase) return { error: 'Add the Supabase project variables before registering.' };
    const redirectTo = Linking.createURL('/auth/callback');
    try {
      const { data, error: authError } = await withTimeout(supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectTo, data: { display_name: displayName.trim() } },
      }));
      if (data.session) markAccountEntryResolved();
      return { error: authError?.message, verificationRequired: Boolean(data.user && !data.session) };
    } catch (nextError) { return { error: operationMessage(nextError, 'Registration is temporarily unavailable.') }; }
  };
  const signInGoogle = async () => {
    if (!supabase) return 'Add the Supabase project variables before signing in.';
    const redirectTo = Linking.createURL('/auth/callback');
    let oauthResult;
    try { oauthResult = await withTimeout(supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })); }
    catch (nextError) { return operationMessage(nextError, 'Google sign-in is temporarily unavailable.'); }
    const { data, error: oauthError } = oauthResult;
    if (oauthError || !data.url) return oauthError?.message ?? 'Google sign-in could not start.';
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return result.type === 'cancel' ? 'Google sign-in canceled.' : 'Google sign-in did not complete.';
    try {
      const session = await withTimeout(createSessionFromUrl(result.url));
      if (session) markAccountEntryResolved();
      return session ? undefined : 'Google did not return a Supabase session.';
    } catch (nextError) {
      return operationMessage(nextError, 'Google sign-in did not complete.');
    }
  };
  const sendPasswordReset = async (email: string) => {
    if (!supabase) return 'Add the Supabase project variables before resetting a password.';
    try {
      const { error: resetError } = await withTimeout(supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('/auth/reset-password') }));
      return resetError?.message;
    } catch (nextError) { return operationMessage(nextError, 'Password reset is temporarily unavailable.'); }
  };
  const updatePassword = async (password: string) => {
    if (!supabase) return 'Cloud services are unavailable.';
    try {
      const { error: updateError } = await withTimeout(supabase.auth.updateUser({ password }));
      return updateError?.message;
    } catch (nextError) { return operationMessage(nextError, 'Password update is temporarily unavailable.'); }
  };
  const signOut = async () => {
    if (session) await syncNow();
    try { if (supabase) await withTimeout(supabase.auth.signOut()); }
    catch { setError('Cloud sign-out timed out. This device has returned to guest mode.'); }
    const guest = readSnapshot(GUEST_SNAPSHOT_KEY) ?? emptyLearningProgress();
    applyOwnedProgress(guest, 'guest');
    resetAccountEntry();
  };
  const deleteAccount = async () => {
    if (!supabase || !session) return 'Sign in before deleting an account.';
    let functionResult;
    try { functionResult = await withTimeout(supabase.functions.invoke('delete-account')); }
    catch (nextError) { return operationMessage(nextError, 'Account deletion is temporarily unavailable.'); }
    const { error: functionError } = functionResult;
    if (functionError) return functionError.message;
    localStorage.removeItem(OWNER_KEY);
    await supabase.auth.signOut();
    applyOwnedProgress(readSnapshot(GUEST_SNAPSHOT_KEY) ?? emptyLearningProgress(), 'guest');
    resetAccountEntry();
    return undefined;
  };
  const refreshEntitlement = async () => {
    if (!session) {
      setEntitlement(undefined);
      return false;
    }
    try {
      const nextEntitlement = await withTimeout(fetchEntitlement(session.user.id));
      setEntitlement(nextEntitlement);
      return nextEntitlement?.status === 'active';
    } catch (nextError) {
      setError(operationMessage(nextError, 'Entitlement refresh is temporarily unavailable.'));
      return entitlement?.status === 'active';
    }
  };

  const hasPro = entitlement?.status === 'active';
  const value: AuthContextValue = {
    status,
    configured: isCloudConfigured,
    accountEntryResolved,
    user: session?.user,
    profile,
    entitlement,
    hasPro,
    hasContentAccess: hasPro || presentationActive || researchActive,
    presentationActive,
    syncStatus,
    error,
    mergeRequest,
    continueAsGuest: () => {
      markAccountEntryResolved();
      setStatus('guest');
    },
    completeGuestEntry: () => {
      markAccountEntryResolved();
      setStatus('guest');
    },
    resetAccountEntry,
    signInEmail,
    registerEmail,
    signInGoogle,
    sendPasswordReset,
    updatePassword,
    signOut,
    deleteAccount,
    resolveProgressMerge,
    refreshEntitlement,
    syncNow,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
