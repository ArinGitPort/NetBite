import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { getAdminAccess } from "@/lib/api/access-service";
import type { AdminAccess } from "@/lib/api/types";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null | undefined;
  access: AdminAccess | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>();
  const [access, setAccess] = useState<AdminAccess | null>(null);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const accessToken = session?.access_token;
  useEffect(() => {
    if (!userId) {
      setAccess(null);
      return;
    }
    let active = true;
    void getAdminAccess(userId)
      .then((result) => { if (active) setAccess(result); })
      .catch(() => { if (active) setAccess({ userId, authorized: false, accessLevel: "none" }); });
    return () => { active = false; };
  }, [accessToken, userId]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    access,
    loading: session === undefined || Boolean(session && access?.userId !== session.user.id),
  }), [access, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function usePortalAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("usePortalAuth must be used inside AuthProvider.");
  return value;
}
