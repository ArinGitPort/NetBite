import {
  ArrowRight,
  BookOpen,
  ChartNoAxesColumn,
  ClipboardCheck,
  Clock3,
  ListChecks,
  PencilLine,
  RadioTower,
  Send,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { instructorNavigation } from "@/app/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, LoadingState, StatusBadge } from "@/components/ui/admin-primitives";
import { Button } from "@/components/ui/button";
import {
  DashboardMetricCard,
  DashboardQuickAccess,
  DashboardWorkflowPanel,
} from "@/features/dashboard";
import * as workshopApi from "@/lib/api/workshop-service";

const quickAccessItems = instructorNavigation.filter(({ id }) => id !== "instructor-dashboard");

const workflow = [
  {
    detail: "Create a focused lesson collection and add lessons, activities, and network topologies.",
    icon: PencilLine,
    number: "01",
    title: "Build the material",
  },
  {
    detail: "Add practice checks or graded assessments with the feedback and attempt rules you need.",
    icon: ListChecks,
    number: "02",
    title: "Check understanding",
  },
  {
    detail: "Publish a stable version, create a class, and share its join code with learners.",
    icon: Send,
    number: "03",
    title: "Deliver to a class",
  },
  {
    detail: "Review submissions and class progress without changing the published learner copy.",
    icon: ChartNoAxesColumn,
    number: "04",
    title: "Review progress",
  },
];

type Overview = Awaited<ReturnType<typeof workshopApi.getInstructorOverview>>;

export function InstructorDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<Overview>();
  const [error, setError] = useState("");

  useEffect(() => {
    void workshopApi.getInstructorOverview()
      .then(setData)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  if (!data && !error) return <LoadingState />;
  if (error) {
    return <EmptyState detail="Your teaching summary could not be loaded. Check your connection and try again." title="Instructor overview unavailable" />;
  }

  const activeCollections = data!.workshops.filter(({ archived }) => !archived);
  const publishedCollections = activeCollections.filter(({ current_version_id }) => Boolean(current_version_id));
  const activeClasses = data!.classes.filter(({ archived }) => !archived);
  const openClasses = activeClasses.filter(({ join_enabled }) => join_enabled);
  const activeAssessments = data!.assessments.filter(({ archived }) => !archived);
  const gradedAssessments = activeAssessments.filter(({ mode }) => mode === "graded");
  const recentCollection = data!.workshops[0];

  return (
    <>
      <PageHeader
        actions={<Button onClick={() => navigate("/instructor/workshops")} tone="primary"><BookOpen /> OPEN COLLECTIONS</Button>}
        description="See the teaching material, active classes, and assessments currently available in your private workspace."
        label="TEACHING STATUS"
        title="Instructor overview"
      />

      <DashboardQuickAccess items={quickAccessItems} />

      <section aria-label="Instructor summary" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard icon={BookOpen} label="Lesson collections" note={`${publishedCollections.length} published · ${activeCollections.length - publishedCollections.length} draft`} value={activeCollections.length} />
        <DashboardMetricCard icon={RadioTower} label="Published collections" note="Stable copies available for classes" value={publishedCollections.length} />
        <DashboardMetricCard icon={Users} label="Active classes" note={`${openClasses.length} accepting new learners`} value={activeClasses.length} />
        <DashboardMetricCard accent="orange" icon={ClipboardCheck} label="Assessments" note={`${gradedAssessments.length} graded · ${activeAssessments.length - gradedAssessments.length} practice`} value={activeAssessments.length} />
      </section>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.75fr)]">
        <DashboardWorkflowPanel
          description="Keep private drafts separate from the stable versions already assigned to learners."
          eyebrow="TEACHING WORKFLOW"
          status={<StatusBadge tone={activeClasses.length ? "green" : "orange"}>{activeClasses.length ? "CLASSROOM READY" : "FIRST CLASS NEEDED"}</StatusBadge>}
          steps={workflow}
          title="From lesson idea to class progress"
        />
        <RecentCollection onOpen={() => navigate("/instructor/workshops")} collection={recentCollection} />
      </div>
    </>
  );
}

function RecentCollection({ collection, onOpen }: {
  collection?: Overview["workshops"][number];
  onOpen: () => void;
}) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-panel">
      <header className="flex items-center justify-between gap-4 border-b border-line p-5">
        <div className="grid gap-1">
          <p className="m-0 font-mono text-[0.62rem] font-semibold tracking-[0.13em] text-signal-orange">RECENT ACTIVITY</p>
          <h2 className="m-0 text-lg">Recently updated</h2>
        </div>
        {collection ? <StatusBadge tone={collection.current_version_id ? "green" : "orange"}>{collection.current_version_id ? "PUBLISHED" : "DRAFT"}</StatusBadge> : null}
      </header>
      {collection ? (
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-5 flex items-start gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-panel border border-signal-green/60 bg-signal-green-soft text-signal-green"><BookOpen className="size-6" /></span>
            <div className="min-w-0">
              <span className="text-xs text-muted">Lesson collection</span>
              <h3 className="m-0 mt-1 break-words text-lg">{collection.title}</h3>
              <p className="m-0 mt-2 line-clamp-3 text-xs leading-5 text-muted">{collection.description || "No collection description yet."}</p>
            </div>
          </div>
          <dl className="m-0 grid border-y border-line">
            <div className="grid grid-cols-[20px_100px_minmax(0,1fr)] items-center gap-2 py-3 text-sm">
              <Clock3 className="size-4 text-signal-green" />
              <dt className="text-muted">Updated</dt>
              <dd className="m-0 break-words font-medium text-copy">{formatDate(collection.updated_at)}</dd>
            </div>
            <div className="grid grid-cols-[20px_100px_minmax(0,1fr)] items-center gap-2 border-t border-line py-3 text-sm">
              <RadioTower className="size-4 text-signal-green" />
              <dt className="text-muted">Availability</dt>
              <dd className="m-0 break-words font-medium text-copy">{collection.current_version_id ? "Published for classes" : "Private draft"}</dd>
            </div>
          </dl>
          <Button className="mt-auto" onClick={onOpen} tone="ghost">OPEN COLLECTION <ArrowRight /></Button>
        </div>
      ) : (
        <div className="grid flex-1 content-center">
          <EmptyState detail="Create your first lesson collection, then add lessons and activities before publishing it." title="No collections yet" />
          <div className="px-5 pb-5"><Button className="w-full" onClick={onOpen} tone="secondary">CREATE A COLLECTION <ArrowRight /></Button></div>
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
