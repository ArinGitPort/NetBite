import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { LoadingState } from "@/components/ui/admin-primitives";
import { Login, SetupRequired } from "@/features/auth";
import { configured } from "@/lib/supabase";
import { defaultPathForAccess, normalizeLegacyHash } from "@/app/navigation";
import { AuthProvider, usePortalAuth } from "@/app/providers/auth-provider";
import { RoleGuard, WorkspaceGuard } from "@/app/route-guards/workspace-guard";

const Dashboard = lazy(() => import("@/features/dashboard").then((module) => ({ default: module.Dashboard })));
const InstructorApprovals = lazy(() => import("@/features/instructors").then((module) => ({ default: module.InstructorApprovals })));
const Curriculum = lazy(() => import("@/features/curriculum").then((module) => ({ default: module.Curriculum })));
const Assessments = lazy(() => import("@/features/assessments").then((module) => ({ default: module.Assessments })));
const Sources = lazy(() => import("@/features/sources").then((module) => ({ default: module.Sources })));
const Assets = lazy(() => import("@/features/media").then((module) => ({ default: module.Assets })));
const Releases = lazy(() => import("@/features/publishing").then((module) => ({ default: module.Releases })));
const Audit = lazy(() => import("@/features/activity").then((module) => ({ default: module.Audit })));
const CollectionsPage = lazy(() => import("@/features/workshops").then((module) => ({ default: module.CollectionsPage })));
const WorkshopClassesPage = lazy(() => import("@/features/workshops").then((module) => ({ default: module.WorkshopClassesPage })));
const WorkshopAssessmentsPage = lazy(() => import("@/features/workshops").then((module) => ({ default: module.WorkshopAssessmentsPage })));
const WorkshopGradebookPage = lazy(() => import("@/features/workshops").then((module) => ({ default: module.WorkshopGradebookPage })));

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
            <Route path="/instructor/workshops" element={<CollectionsPage />} />
            <Route path="/instructor/classes" element={<WorkshopClassesPage />} />
            <Route path="/instructor/assessments" element={<WorkshopAssessmentsPage />} />
            <Route path="/instructor/gradebook" element={<WorkshopGradebookPage />} />
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
