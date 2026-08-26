import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { contentRepository } from '@/core/content-delivery/content-repository';
import { activateRemoteCurriculum, restoreBundledCurriculum } from '@/core/content-delivery/runtime-curriculum';
import type { ContentUpdateResult, ContentUpdateStatus, RemoteCurriculumManifest } from '@/core/content-delivery/types';
import { isRemoteCurriculumPackage } from '@/core/content-delivery/validation';
import { supabase } from '@/services/supabase';

interface ContentContextValue {
  resolved: boolean;
  status: ContentUpdateStatus;
  manifest?: RemoteCurriculumManifest;
  message: string;
  runtimeKey: string;
  checkNow: () => Promise<ContentUpdateResult>;
  restorePrevious: () => Promise<ContentUpdateResult>;
}

const ContentContext = createContext<ContentContextValue | undefined>(undefined);

export function ContentProvider({ children }: PropsWithChildren) {
  const [resolved, setResolved] = useState(false);
  const [status, setStatus] = useState<ContentUpdateStatus>('bundled');
  const [manifest, setManifest] = useState<RemoteCurriculumManifest>();
  const [message, setMessage] = useState('Bundled learning materials are ready.');
  const [runtimeKey, setRuntimeKey] = useState('bundled');
  const inFlight = useRef<Promise<ContentUpdateResult> | undefined>(undefined);
  const manifestRef = useRef<RemoteCurriculumManifest | undefined>(undefined);

  const applyStored = useCallback(async () => {
    const stored = await contentRepository.getActiveCurriculum();
    if (stored && isRemoteCurriculumPackage(stored)) {
      activateRemoteCurriculum(stored); manifestRef.current = stored.manifest; setManifest(stored.manifest); setRuntimeKey(stored.manifest.releaseId); setStatus('current'); setMessage(`Curriculum release ${stored.manifest.releaseVersion} is stored locally.`);
    } else restoreBundledCurriculum();
    setResolved(true);
  }, []);

  const checkNow = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const task = (async (): Promise<ContentUpdateResult> => {
      setStatus('checking'); setMessage('Checking for published learning materials.');
      try {
        const latest = await contentRepository.checkForUpdate();
        if (!latest || latest.releaseId === manifestRef.current?.releaseId) {
          const result = { status: 'current' as const, changed: false, message: latest ? `Curriculum release ${latest.releaseVersion} is current.` : 'Bundled learning materials are current.', manifest: latest ?? manifestRef.current };
          setStatus(result.status); setMessage(result.message); if (latest) { manifestRef.current = latest; setManifest(latest); } return result;
        }
        setStatus('updating'); setMessage('Downloading and validating published learning materials.');
        const result = await contentRepository.downloadAndActivate(latest);
        setStatus(result.status); setMessage(result.message);
        if (result.changed) {
          const stored = await contentRepository.getActiveCurriculum();
          if (stored) { activateRemoteCurriculum(stored); manifestRef.current = stored.manifest; setManifest(stored.manifest); setRuntimeKey(stored.manifest.releaseId); }
        }
        return result;
      } catch {
        const result = { status: 'offline' as const, changed: false, message: 'Published materials are unavailable. The local curriculum remains ready.' };
        setStatus(result.status); setMessage(result.message); return result;
      } finally { inFlight.current = undefined; }
    })();
    inFlight.current = task; return task;
  }, []);

  const restorePrevious = useCallback(async () => {
    const result = await contentRepository.restorePreviousRelease(); setStatus(result.status); setMessage(result.message);
    if (result.changed) { const stored = await contentRepository.getActiveCurriculum(); if (stored) { activateRemoteCurriculum(stored); manifestRef.current = stored.manifest; setManifest(stored.manifest); setRuntimeKey(stored.manifest.releaseId); } }
    return result;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void applyStored().then(() => checkNow()); }, 0);
    return () => clearTimeout(timer);
  }, [applyStored, checkNow]);
  useEffect(() => {
    const appState = AppState.addEventListener('change', (next) => { if (next === 'active') void checkNow(); });
    const network = NetInfo.addEventListener((state) => { if (state.isConnected) void checkNow(); });
    const channel = supabase?.channel('netbite-content-publication').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'content_publication_notice' }, () => { void checkNow(); }).subscribe();
    return () => { appState.remove(); network(); if (channel) void supabase?.removeChannel(channel); };
  }, [checkNow]);

  return <ContentContext.Provider value={{ resolved, status, manifest, message, runtimeKey, checkNow, restorePrevious }}>{children}</ContentContext.Provider>;
}

export function useContentDelivery() {
  const value = useContext(ContentContext);
  if (!value) throw new Error('useContentDelivery must be used inside ContentProvider.');
  return value;
}
