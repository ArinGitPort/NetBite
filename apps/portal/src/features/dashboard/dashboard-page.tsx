import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Layers3,
  LibraryBig,
  PencilLine,
  Rocket,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { administratorNavigation } from "@/app/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardMetricCard as MetricCard, DashboardQuickAccess, DashboardWorkflowPanel } from "@/features/dashboard/dashboard-primitives";
import {
  EmptyState,
  LoadingState,
  StatusBadge,
} from "@/components/ui/admin-primitives";
import { Button } from "@/components/ui/button";
import * as curriculumApi from "@/lib/api/curriculum-service";
import * as publishingApi from "@/lib/api/publishing-service";
import type { ReleaseRow } from "@/lib/api/types";

const workflow = [
  {
    detail: "Revise lessons and assessments without changing what learners currently see.",
    icon: PencilLine,
    number: "01",
    title: "Prepare drafts",
  },
  {
    detail: "Check required content, lesson links, assessments, and media references.",
    icon: ClipboardCheck,
    number: "02",
    title: "Validate content",
  },
  {
    detail: "Create one complete, immutable curriculum version for learner devices.",
    icon: Rocket,
    number: "03",
    title: "Publish version",
  },
  {
    detail: "Android devices verify and retain the curriculum for reliable offline use.",
    icon: Smartphone,
    number: "04",
    title: "Deliver offline",
  },
];

const quickAccessIds = new Set(["curriculum", "assessments", "assets", "releases"]);
const quickAccessItems = administratorNavigation.filter(({ id }) => quickAccessIds.has(id));

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] =
    useState<Awaited<ReturnType<typeof curriculumApi.getCurriculum>>>();
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      curriculumApi.getCurriculum(),
      publishingApi.getReleases(),
    ])
      .then(([nextData, nextReleases]) => {
        setData(nextData);
        setReleases(nextReleases);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  if (!data && !error) return <LoadingState />;
  if (error) {
    return (
      <EmptyState
        detail="The administrator workspace could not be loaded. Check your connection and try again."
        title="Curriculum workspace unavailable"
      />
    );
  }

  const activeLessons = data!.lessons.filter(({ archived }) => !archived);
  const supplemental = activeLessons.filter(
    ({ requirement }) => requirement === "supplemental",
  ).length;
  const latestRelease = releases[0];

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={() => navigate("/admin/publishing")} tone="primary">
            <Rocket /> OPEN PUBLISHING
          </Button>
        }
        description="Review curriculum scale, publishing readiness, and the version currently available to Android learners."
        label="CURRICULUM STATUS"
        title="Curriculum overview"
      />

      <DashboardQuickAccess items={quickAccessItems} />

      <section aria-label="Curriculum summary" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BookOpen}
          label="Courses"
          note="Foundations and Operations"
          value={data!.courses.length}
        />
        <MetricCard
          icon={Layers3}
          label="Chapters"
          note="12 Foundations · 11 Operations"
          value={data!.chapters.length}
        />
        <MetricCard
          icon={LibraryBig}
          label="Active lessons"
          note={`${supplemental} supplemental · ${activeLessons.length - supplemental} core`}
          value={activeLessons.length}
        />
        <MetricCard
          accent="orange"
          icon={Rocket}
          label="Published versions"
          note={latestRelease ? `Current release · v${latestRelease.release_version}` : "No learner release yet"}
          value={releases.length}
        />
      </section>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.75fr)]">
        <DashboardWorkflowPanel description="Every release follows the same controlled path before it reaches Android." eyebrow="PUBLISHING WORKFLOW" status={<StatusBadge tone={latestRelease ? "green" : "orange"}>{latestRelease ? "OFFLINE COPY AVAILABLE" : "FIRST RELEASE NEEDED"}</StatusBadge>} steps={workflow} title="From draft to learner device" />

        <LatestRelease
          onOpenPublishing={() => navigate("/admin/publishing")}
          release={latestRelease}
        />
      </div>
    </>
  );
}

function LatestRelease({
  onOpenPublishing,
  release,
}: {
  onOpenPublishing: () => void;
  release?: ReleaseRow;
}) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-panel">
      <header className="flex items-center justify-between gap-4 border-b border-line p-5">
        <div className="grid gap-1">
          <p className="m-0 font-mono text-[0.62rem] font-semibold tracking-[0.13em] text-signal-orange">
            LEARNER RELEASE
          </p>
          <h2 className="m-0 text-lg">Currently published</h2>
        </div>
        {release ? <StatusBadge tone="green">LIVE</StatusBadge> : null}
      </header>
      {release ? (
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-5 flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-panel border border-signal-green/60 bg-signal-green-soft font-mono text-base font-semibold text-signal-green">
              V{release.release_version}
            </span>
            <div className="min-w-0">
              <span className="text-xs text-muted">Release notes</span>
              <h3 className="m-0 mt-1 break-words text-lg">{release.changelog}</h3>
            </div>
          </div>
          <dl className="m-0 grid border-y border-line">
            <ReleaseMetadata
              icon={CalendarDays}
              label="Published"
              value={formatDate(release.published_at)}
            />
            <ReleaseMetadata
              icon={Smartphone}
              label="Android support"
              value={`${release.minimum_app_version} or newer`}
            />
          </dl>
          <Button className="mt-auto" onClick={onOpenPublishing} tone="ghost">
            VIEW ALL VERSIONS <ArrowRight />
          </Button>
        </div>
      ) : (
        <div className="grid flex-1 content-center">
          <EmptyState
            detail="Validate the current curriculum, then publish the first version for Android learners."
            title="No version published"
          />
          <div className="px-5 pb-5">
            <Button className="w-full" onClick={onOpenPublishing} tone="secondary">
              <Rocket /> PREPARE FIRST RELEASE
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function ReleaseMetadata({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[20px_100px_minmax(0,1fr)] items-center gap-2 border-t border-line py-3 first:border-t-0 text-sm">
      <Icon className="size-4 text-signal-green" />
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 break-words font-medium text-copy">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
