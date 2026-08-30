import { Navigate, Outlet } from "react-router-dom";

import { PortalShell } from "@/components/layout/portal-shell";
import { LoadingState } from "@/components/ui/admin-primitives";
import { Unauthorized } from "@/features/auth";
import { supabase } from "@/lib/supabase";
import { defaultPathForAccess } from "@/app/navigation";
import { usePortalAuth } from "@/app/providers/auth-provider";

export function WorkspaceGuard() {
  const { session, access, loading } = usePortalAuth();
  if (loading) return <LoadingState />;
  if (!session) return <Navigate replace to="/login" />;
  if (!access?.authorized) {
    return <Unauthorized email={session.user.email ?? "Signed-in account"} onLogout={() => void supabase?.auth.signOut()} />;
  }
  return <PortalShell access={access} session={session} />;
}

export function RoleGuard({ role }: { role: "administrator" | "instructor" }) {
  const { access } = usePortalAuth();
  if (!access?.authorized) return null;
  if (access.accessLevel !== role) return <Navigate replace to={defaultPathForAccess(access.accessLevel)} />;
  return <Outlet />;
}
