import {
  BookOpen,
  ChartNoAxesColumn,
  ClipboardCheck,
  FileClock,
  Image,
  LayoutDashboard,
  Library,
  Rocket,
  School,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { AdminAccess, AdminView } from "@/lib/api/types";

export interface NavigationItem {
  id: AdminView;
  label: string;
  path: string;
  icon: LucideIcon;
  group?: "Create" | "Deliver and review";
}

export const instructorNavigation: NavigationItem[] = [
  {
    id: "workshops",
    label: "Lesson collections",
    path: "/instructor/workshops",
    icon: School,
    group: "Create",
  },
  {
    id: "workshop-assessments",
    label: "Assessments",
    path: "/instructor/assessments",
    icon: ClipboardCheck,
    group: "Create",
  },
  {
    id: "classes",
    label: "Classes",
    path: "/instructor/classes",
    icon: Users,
    group: "Deliver and review",
  },
  {
    id: "gradebook",
    label: "Gradebook",
    path: "/instructor/gradebook",
    icon: ChartNoAxesColumn,
    group: "Deliver and review",
  },
];

export const administratorNavigation: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Overview",
    path: "/admin/overview",
    icon: LayoutDashboard,
  },
  {
    id: "instructors",
    label: "Instructor access",
    path: "/admin/instructors",
    icon: ShieldCheck,
  },
  {
    id: "curriculum",
    label: "Curriculum",
    path: "/admin/curriculum",
    icon: Library,
  },
  {
    id: "assessments",
    label: "Assessments",
    path: "/admin/assessments",
    icon: ClipboardCheck,
  },
  { id: "sources", label: "Sources", path: "/admin/sources", icon: BookOpen },
  { id: "assets", label: "Media library", path: "/admin/media", icon: Image },
  {
    id: "releases",
    label: "Publishing",
    path: "/admin/publishing",
    icon: Rocket,
  },
  {
    id: "audit",
    label: "Activity history",
    path: "/admin/activity",
    icon: FileClock,
  },
];

export function getNavigationForAccess(
  accessLevel: AdminAccess["accessLevel"],
) {
  return accessLevel === "administrator"
    ? administratorNavigation
    : accessLevel === "instructor"
      ? instructorNavigation
      : [];
}

export const legacyHashRoutes: Record<string, string> = {
  dashboard: "/admin/overview",
  instructors: "/admin/instructors",
  curriculum: "/admin/curriculum",
  assessments: "/admin/assessments",
  sources: "/admin/sources",
  assets: "/admin/media",
  releases: "/admin/publishing",
  audit: "/admin/activity",
  workshops: "/instructor/workshops",
  classes: "/instructor/classes",
  "workshop-assessments": "/instructor/assessments",
  gradebook: "/instructor/gradebook",
};

export function normalizeLegacyHash(hash: string) {
  const value = hash.replace(/^#/, "");
  return legacyHashRoutes[value] ?? (value.startsWith("/") ? value : undefined);
}

export function defaultPathForAccess(accessLevel: AdminAccess["accessLevel"]) {
  return accessLevel === "administrator"
    ? "/admin/overview"
    : "/instructor/workshops";
}

export function isPathAllowedForAccess(
  accessLevel: AdminAccess["accessLevel"],
  path: string,
) {
  return getNavigationForAccess(accessLevel).some((item) => item.path === path);
}
