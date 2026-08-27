import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { LoadingState } from "../../components/ui/admin-primitives";
import { Login, SetupRequired } from "../../features/auth/auth-pages";
import { configured } from "../../lib/supabase";
import { defaultPathForAccess, normalizeLegacyHash } from "../navigation";
import { AuthProvider, usePortalAuth } from "../providers/auth-provider";
import { RoleGuard, WorkspaceGuard } from "../route-guards/workspace-guard";

const Dashboard = lazy(() => import("../../features/dashboard/dashboard-page").then((module) => ({ default: module.Dashboard })));
const InstructorApprovals = lazy(() => import("../../features/instructors/instructor-access-page").then((module) => ({ default: module.InstructorApprovals })));
const Curriculum = lazy(() => import("../../features/curriculum/curriculum-page").then((module) => ({ default: module.Curriculum })));
const Assessments = lazy(() => import("../../features/assessments/assessments-page").then((module) => ({ default: module.Assessments })));
const Sources = lazy(() => import("../../features/sources/sources-page").then((module) => ({ default: module.Sources })));
const Assets = lazy(() => import("../../features/media/media-page").then((module) => ({ default: module.Assets })));
const Releases = lazy(() => import("../../features/publishing/publishing-page").then((module) => ({ default: module.Releases })));
const Audit = lazy(() => import("../../features/activity/activity-page").then((module) => ({ default: module.Audit })));
const WorkshopStudio = lazy(() => import("../../features/workshops/workshops-page").then((module) => ({ default: module.WorkshopStudio })));

function PortalRoutes() {
  const { session, access, loading } = usePortalAuth();
  const fallback = access?.authorized ? defaultPathForAccess(access.accessLevel) : "/login";
  if (!configured) return <SetupRequired />;

  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/login" element={loading ? <LoadingState /> : session ? <Navigate replace to={fallback} /> : <Login />} />
        <Route element={<WorkspaceGuard />}>
          <Route element={<RoleGuard role="administrator" />}>
            <Route path="/admin/overview" element={<Dashboard />} />
            <Route path="/admin/instructors" element={<InstructorApprovals />} />
            <Route path="/admin/curriculum" element={<Curriculum />} />
            <Route path="/admin/assessments" element={<Assessments />} />
            <Route path="/admin/sources" element={<Sources />} />
            <Route path="/admin/media" element={<Assets />} />
            <Route path="/admin/publishing" element={<Releases />} />
            <Route path="/admin/activity" element={<Audit />} />
          </Route>
          <Route element={<RoleGuard role="instructor" />}>
            <Route path="/instructor/workshops" element={<WorkshopStudio area="workshops" />} />
            <Route path="/instructor/classes" element={<WorkshopStudio area="classes" />} />
            <Route path="/instructor/assessments" element={<WorkshopStudio area="workshop-assessments" />} />
            <Route path="/instructor/gradebook" element={<WorkshopStudio area="gradebook" />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate replace to={fallback} />} />
      </Routes>
    </Suspense>
  );
}

function normalizeInitialHash() {
  const normalized = normalizeLegacyHash(window.location.hash);
  if (normalized && window.location.hash !== `#${normalized}`) {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${normalized}`);
  }
}

export function PortalRouter() {
  normalizeInitialHash();
  return <HashRouter><AuthProvider><PortalRoutes /></AuthProvider></HashRouter>;
}
