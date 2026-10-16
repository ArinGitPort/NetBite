import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { getAdminAccess } from "@/lib/api/access-service";
import type { AdminAccess } from "@/lib/api/types";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null | undefined;
  access: AdminAccess | null;
  loading: boolean;
  refreshAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>();
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const currentUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    let active = true;
    void supabase.auth.getSession()
      .then(({ data }) => { if (active) setSession(data.session); })
      .catch(() => { if (active) setSession(null); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const userId = session?.user.id;
  currentUserId.current = userId;
  const accessToken = session?.access_token;
  const refreshAccess = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await getAdminAccess(userId);
      if (currentUserId.current === userId) setAccess(result);
    } catch {
      if (currentUserId.current === userId) {
        setAccess({ userId, authorized: false, accessLevel: "none" });
      }
    }
  }, [userId]);
  useEffect(() => {
    if (!userId) {
      setAccess(null);
      return;
    }
    void refreshAccess();
  }, [accessToken, refreshAccess, userId]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    access,
    loading: session === undefined || Boolean(session && access?.userId !== session.user.id),
    refreshAccess,
  }), [access, refreshAccess, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function usePortalAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("usePortalAuth must be used inside AuthProvider.");
  return value;
}
