import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileClock,
  FileText,
  Image,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../../lib/content-api";
import type {
  AssetRow,
  ChapterRow,
  FlashcardRow,
  LessonRow,
  QuizRow,
  ReleaseRow,
  SafeAuditEntry,
  SourceRow,
} from "../../lib/content-api";
import {
  ConfirmAction,
  DialogFrame,
  EmptyState as Empty,
  Field,
  LoadingState as Loading,
  PageIntro,
  StatusBadge as Badge,
} from "../../components/ui/admin-primitives";

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] =
    useState<Awaited<ReturnType<typeof api.getCurriculum>>>();
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void Promise.all([api.getCurriculum(), api.getReleases()])
      .then(([nextData, nextReleases]) => {
        setData(nextData);
        setReleases(nextReleases);
      })
      .catch((next) => setError(next.message));
  }, []);
  if (!data && !error) return <Loading />;
  if (error)
    return (
      <Empty
        title="Curriculum workspace unavailable"
        detail="The instructor workspace could not be loaded. Check your connection and try again."
      />
    );
  const supplemental = data!.lessons.filter(
    ({ requirement, archived }) => requirement === "supplemental" && !archived,
  ).length;
  return (
    <>
      <PageIntro
        eyebrow="CURRICULUM STATUS"
        title="Curriculum overview"
        detail="Review drafts and published materials before sending an update to Android learners."
        action={
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
            onClick={() => navigate("/admin/publishing")}
          >
            <Rocket />
            OPEN PUBLISHING
          </button>
        }
      />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Courses"
          value={data!.courses.length}
          note="Fixed structure"
        />
        <Metric
          label="Chapters"
          value={data!.chapters.length}
          note="12 Foundations + 11 Operations"
        />
        <Metric
          label="Active lessons"
          value={data!.lessons.filter(({ archived }) => !archived).length}
          note={`${supplemental} supplemental`}
        />
        <Metric
          label="Published versions"
          value={releases.length}
          note={
            releases[0]
              ? `Latest: v${releases[0].release_version}`
              : "No published version"
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-panel border border-line bg-surface p-5 shadow-panel">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 [&_h2]:m-0 [&_h3]:m-0 [&_p]:mb-0">
            <div>
              <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
                PUBLISHING WORKFLOW
              </p>
              <h2>Content readiness</h2>
            </div>
            <Badge tone="green">OFFLINE COPY AVAILABLE</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PipelineStep
              number="01"
              title="Edit drafts"
              detail="Revise lessons and assessments without affecting learners."
            />
            <PipelineStep
              number="02"
              title="Validate"
              detail="Check required fields, lesson links, assessments, and images."
            />
            <PipelineStep
              number="03"
              title="Publish"
              detail="Publish one complete curriculum update."
            />
            <PipelineStep
              number="04"
              title="Android delivery"
              detail="Connected devices verify and save the update for offline use."
            />
          </div>
        </section>
        <section className="rounded-panel border border-line bg-surface p-5 shadow-panel">
          <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
            LATEST PUBLISHED VERSION
          </p>
          {releases[0] ? (
            <>
              <h2>Release {releases[0].release_version}</h2>
              <p>{releases[0].changelog}</p>
              <dl className="mt-5 grid [&>div]:grid [&>div]:grid-cols-[120px_minmax(0,1fr)] [&>div]:border-t [&>div]:border-line [&>div]:py-3 [&_dt]:text-sm [&_dt]:text-muted [&_dd]:m-0 [&_dd]:text-sm">
                <div>
                  <dt>Published</dt>
                  <dd>{new Date(releases[0].published_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Minimum app</dt>
                  <dd>{releases[0].minimum_app_version}</dd>
                </div>
              </dl>
            </>
          ) : (
            <Empty
              title="No version published"
              detail="Import and check the current curriculum, then publish the first version."
            />
          )}
        </section>
      </div>
    </>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <article className="grid min-h-32 gap-2 rounded-control border border-line border-t-[3px] border-t-signal-green bg-surface p-4 [&>span]:font-mono [&>span]:text-[0.68rem] [&>span]:uppercase [&>span]:text-muted [&>strong]:text-3xl [&>small]:text-muted">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
function PipelineStep({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="min-h-36 rounded-control border border-line bg-canvas p-4 [&>span]:mb-4 [&>span]:grid [&>span]:size-8 [&>span]:place-items-center [&>span]:border [&>span]:border-signal-orange [&>span]:font-mono [&>span]:text-xs [&>span]:text-signal-orange [&>p]:mb-0 [&>p]:mt-2 [&>p]:text-sm">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}
