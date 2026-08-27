import {
  BookOpen,
  Cable,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Pencil,
  Plus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Classes, Gradebook } from "../classes/classes-page";
import * as api from "../../lib/content-api";
import type {
  WorkshopAssessmentRow,
  WorkshopClassRow,
  WorkshopLessonRow,
  WorkshopRow,
  WorkshopTopologyRow,
  WorkshopVersionRow,
} from "../../lib/content-api";
import { AssessmentEditor } from "./assessment-editor";
import { LessonEditor } from "./lesson-editor";
import { TopologyEditor, defaultTopology } from "./topology-editor";
import { WorkshopDetailsDialog } from "./workshop-details-dialog";
import type { WorkshopDetailsMode } from "./workshop-details-dialog";

type Area = "workshops" | "classes" | "workshop-assessments" | "gradebook";
export { InstructorApprovals } from "../instructors/instructor-access-page";
function Notice({
  message,
  error = false,
}: {
  message?: string;
  error?: boolean;
}) {
  return message ? (
    <div
      className={
        error
          ? "mb-4 rounded-control border border-signal-red/60 bg-signal-red-soft p-3 text-sm text-[#ff9da1]"
          : "mb-4 rounded-control border border-signal-green/60 bg-signal-green-soft p-3 text-sm text-[#abd2c8]"
      }
      role="status"
    >
      {message}
    </div>
  ) : null;
}

export function WorkshopStudio({ area }: { area: Area }) {
  const [loading, setLoading] = useState(true);
  const [workshops, setWorkshops] = useState<WorkshopRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [lessons, setLessons] = useState<WorkshopLessonRow[]>([]);
  const [topologies, setTopologies] = useState<WorkshopTopologyRow[]>([]);
  const [assessments, setAssessments] = useState<WorkshopAssessmentRow[]>([]);
  const [classes, setClasses] = useState<WorkshopClassRow[]>([]);
  const [versions, setVersions] = useState<WorkshopVersionRow[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>();
  const [selectedAssessment, setSelectedAssessment] = useState<string>();
  const [selectedTopology, setSelectedTopology] = useState<string>();
  const [gradeRows, setGradeRows] = useState<Array<Record<string, unknown>>>(
    [],
  );
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [detailsMode, setDetailsMode] = useState<WorkshopDetailsMode>();
  const selectedWorkshop = workshops.find((item) => item.id === selectedId);

  const load = useCallback(async () => {
    try {
      setError(undefined);
      const [workshopRows, classRows] = await Promise.all([
        api.getWorkshops(),
        api.getWorkshopClasses(),
      ]);
      setWorkshops(workshopRows);
      setClasses(classRows);
      setSelectedId((current) =>
        current && workshopRows.some((row) => row.id === current)
          ? current
          : workshopRows[0]?.id,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The workspace could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!selectedId) return;
    void Promise.all([
      api.getWorkshopContent(selectedId),
      api.getWorkshopVersions(selectedId),
    ])
      .then(([content, versionRows]) => {
        setLessons(content.lessons);
        setTopologies(content.topologies);
        setAssessments(content.assessments);
        setVersions(versionRows);
        setSelectedLesson((current) =>
          current && content.lessons.some((row) => row.id === current)
            ? current
            : content.lessons[0]?.id,
        );
        setSelectedAssessment((current) =>
          current && content.assessments.some((row) => row.id === current)
            ? current
            : content.assessments[0]?.id,
        );
      })
      .catch((reason) => setError(reason.message));
  }, [selectedId]);
  const create = async (title: string, description: string) => {
    const row = await api.createWorkshop(title, description);
    setWorkshops((value) => [row, ...value]);
    setSelectedId(row.id);
    setNotice("Workshop created as a private draft.");
  };
  const saveDetails = async (workshop: WorkshopRow) => {
    const saved = await api.saveWorkshop(workshop);
    setWorkshops((value) =>
      value.map((item) => (item.id === saved.id ? saved : item)),
    );
    setNotice("Workshop details saved.");
  };
  const deleteDraft = async (workshop: WorkshopRow) => {
    await api.deleteWorkshop(workshop.id);
    setSelectedId(undefined);
    setLessons([]);
    setTopologies([]);
    setAssessments([]);
    setVersions([]);
    await load();
    setNotice("Private workshop deleted.");
  };
  const selectedClass = classes.find((item) => item.workshop_id === selectedId);
  useEffect(() => {
    if (area !== "gradebook" || !selectedClass) return;
    void api
      .getWorkshopGradebook(selectedClass.id)
      .then((result) => setGradeRows(result.rows))
      .catch((reason) => setError(reason.message));
  }, [area, selectedClass?.id]);
  const updateLesson = (row: WorkshopLessonRow) =>
    setLessons((value) =>
      value.map((item) => (item.id === row.id ? row : item)),
    );
  const updateAssessment = (row: WorkshopAssessmentRow) =>
    setAssessments((value) =>
      value.map((item) => (item.id === row.id ? row : item)),
    );

  const page =
    area === "classes"
      ? {
          label: "CLASS MANAGEMENT",
          title: "Classes and sharing",
          detail:
            "Create a private class from a published workshop and share its code, link, or QR code.",
        }
      : area === "workshop-assessments"
        ? {
            label: "ASSESSMENT AUTHORING",
            title: "Workshop assessments",
            detail:
              "Prepare practice activities or graded quizzes for students enrolled in your classes.",
          }
        : area === "gradebook"
          ? {
              label: "CLASS RESULTS",
              title: "Gradebook",
              detail:
                "Review submissions, missing work, late work, and recorded grades without exposing student answers.",
            }
          : {
              label: "WORKSHOP AUTHORING",
              title: "My workshops",
              detail:
                "Create private lessons, read-only network topologies, flashcards, and assessments for your students.",
            };

  if (loading)
    return (
      <>
        <header className="mb-8 flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-center [&>div]:max-w-[780px] [&_h1]:mb-2 [&_h1]:text-[clamp(1.8rem,3vw,2.7rem)] [&_h1]:font-bold [&_h1]:tracking-[-0.035em] [&_p:last-child]:m-0 [&_p:last-child]:leading-7 [&_p:last-child]:text-muted">
          <div>
            <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
              {page.label}
            </p>
            <h1>{page.title}</h1>
            <p>{page.detail}</p>
          </div>
        </header>
        <section
          className="flex min-h-56 items-center justify-center gap-3 rounded-panel border border-line bg-surface p-6 text-muted shadow-panel"
          aria-live="polite"
        >
          <span className="size-7 animate-spin rounded-full border-2 border-line border-t-signal-orange" />
          <strong>Loading your instructor workspace</strong>
        </section>
      </>
    );

  if (!workshops.length)
    return (
      <>
        <header className="mb-8 flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-center [&>div]:max-w-[780px] [&_h1]:mb-2 [&_h1]:text-[clamp(1.8rem,3vw,2.7rem)] [&_h1]:font-bold [&_h1]:tracking-[-0.035em] [&_p:last-child]:m-0 [&_p:last-child]:leading-7 [&_p:last-child]:text-muted">
          <div>
            <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
              {page.label}
            </p>
            <h1>{page.title}</h1>
            <p>{page.detail}</p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
            onClick={() => setDetailsMode({ kind: "create" })}
          >
            <Plus />
            CREATE WORKSHOP
          </button>
        </header>
        <Notice message={error} error />
        <section className="grid min-h-[320px] place-items-center content-center gap-3 rounded-panel border border-line bg-surface p-6 text-center shadow-panel [&>svg]:size-9 [&>svg]:text-signal-green [&>p]:max-w-xl">
          <GraduationCap />
          <strong>No workshops yet</strong>
          <p>
            Create a private workshop first. Nothing becomes available to
            students until you publish a version and create a class.
          </p>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
            onClick={() => setDetailsMode({ kind: "create" })}
          >
            <Plus />
            CREATE YOUR FIRST WORKSHOP
          </button>
        </section>
        {detailsMode ? (
          <WorkshopDetailsDialog
            mode={detailsMode}
            onClose={() => setDetailsMode(undefined)}
            onCreate={create}
            onSave={saveDetails}
            onDelete={deleteDraft}
          />
        ) : null}
      </>
    );

  return (
    <>
      <header className="mb-8 flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-center [&>div]:max-w-[780px] [&_h1]:mb-2 [&_h1]:text-[clamp(1.8rem,3vw,2.7rem)] [&_h1]:font-bold [&_h1]:tracking-[-0.035em] [&_p:last-child]:m-0 [&_p:last-child]:leading-7 [&_p:last-child]:text-muted">
        <div>
          <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
            {page.label}
          </p>
          <h1>{page.title}</h1>
          <p>{page.detail}</p>
        </div>
        {area === "workshops" ? (
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
            onClick={() => setDetailsMode({ kind: "create" })}
          >
            <Plus />
            NEW WORKSHOP
          </button>
        ) : null}
      </header>
      <Notice message={error || notice} error={Boolean(error)} />
      <div className="grid min-h-[680px] min-w-0 grid-cols-[250px_minmax(0,1fr)] overflow-hidden rounded-panel border border-line bg-surface shadow-panel max-lg:grid-cols-1">
        <aside className="themed-scrollbar grid min-w-0 content-start gap-2 overflow-y-auto border-r border-line bg-sidebar p-3 max-lg:border-b max-lg:border-r-0 [&>strong]:px-2 [&>strong]:py-2 [&>strong]:font-mono [&>strong]:text-[0.62rem] [&>strong]:text-muted">
          <strong>YOUR WORKSHOPS</strong>
          {workshops.map((workshop) => (
            <button
              className={`grid min-h-16 min-w-0 gap-1 rounded-control border px-3 py-2 text-left ${workshop.id === selectedId ? "border-signal-orange bg-raised" : "border-transparent text-muted hover:border-line hover:bg-raised"}`}
              key={workshop.id}
              onClick={() => setSelectedId(workshop.id)}
            >
              <span className="break-words font-semibold">
                {workshop.title}
              </span>
              <small className="block text-muted">
                {workshop.current_version_id ? "Published" : "Private draft"}
              </small>
            </button>
          ))}
        </aside>
        <section className="min-w-0 bg-surface p-6 max-sm:p-4">
          {selectedWorkshop && area === "workshops" ? (
            <>
              <div className="mb-5 flex min-h-20 flex-wrap items-start justify-between gap-5 border-b border-line pb-5">
                <div className="min-w-0">
                  <span className="inline-flex min-h-6 w-fit items-center rounded-full border border-line bg-raised px-2.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.045em] text-muted">
                    {selectedWorkshop.archived
                      ? "ARCHIVED"
                      : "PRIVATE WORKSHOP"}
                  </span>
                  <h2 className="break-words">{selectedWorkshop.title}</h2>
                  <p className="mb-2 mt-2 max-w-2xl text-sm leading-6 text-muted">
                    {selectedWorkshop.description ||
                      "No workshop description yet."}
                  </p>
                  <details className="text-xs text-muted [&>summary]:cursor-pointer [&>summary]:py-2 [&>div]:grid [&>div]:grid-cols-[1fr_auto_auto] [&>div]:gap-3 [&>div]:border-t [&>div]:border-line [&>div]:py-2">
                    <summary>
                      {versions.length} published version
                      {versions.length === 1 ? "" : "s"}
                    </summary>
                    {versions.map((version) => (
                      <div key={version.id}>
                        <strong>Version {version.version}</strong>
                        <span>
                          {new Date(version.published_at).toLocaleString()}
                        </span>
                        <code>{version.checksum.slice(0, 12)}</code>
                      </div>
                    ))}
                  </details>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                    onClick={() =>
                      setDetailsMode({
                        kind: "edit",
                        workshop: selectedWorkshop,
                        canDelete:
                          versions.length === 0 &&
                          !classes.some(
                            (row) => row.workshop_id === selectedWorkshop.id,
                          ),
                        deleteReason:
                          "Published workshops and workshops used by a class must be archived so student access and records remain intact.",
                      })
                    }
                  >
                    <Pencil />
                    EDIT DETAILS
                  </button>
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                    onClick={() =>
                      void api
                        .saveWorkshop({
                          ...selectedWorkshop,
                          archived: !selectedWorkshop.archived,
                        })
                        .then(() => {
                          setNotice(
                            selectedWorkshop.archived
                              ? "Workshop restored."
                              : "Workshop archived. Existing classes remain readable.",
                          );
                          return load();
                        })
                    }
                  >
                    {selectedWorkshop.archived
                      ? "RESTORE WORKSHOP"
                      : "ARCHIVE WORKSHOP"}
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-orange/60 bg-signal-orange-soft px-4 text-xs font-semibold text-[#f1ae78] hover:border-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                    disabled={selectedWorkshop.archived}
                    onClick={() => {
                      const row = defaultTopology(selectedWorkshop.id);
                      setTopologies((value) => [...value, row]);
                      setSelectedTopology(row.stable_id);
                    }}
                  >
                    <Cable />
                    NEW TOPOLOGY
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
                    disabled={!lessons.length || selectedWorkshop.archived}
                    onClick={() =>
                      void api
                        .publishWorkshop(selectedWorkshop.id)
                        .then(() => {
                          setNotice(
                            "Workshop version published. You can now create a class.",
                          );
                          return load();
                        })
                        .catch((reason) => setError(reason.message))
                    }
                  >
                    <CheckCircle2 />
                    PUBLISH VERSION
                  </button>
                </div>
              </div>
              <div className="themed-scrollbar mb-5 flex max-w-full gap-1 overflow-x-auto rounded-control border border-line bg-canvas p-1 [&>button]:min-h-9 [&>button]:shrink-0 [&>button]:rounded-[6px] [&>button]:px-4 [&>button]:text-xs [&>button]:font-semibold [&>button]:text-muted">
                <button
                  className={
                    !selectedTopology ? "bg-signal-green-soft! text-copy!" : ""
                  }
                  onClick={() => setSelectedTopology(undefined)}
                >
                  LESSONS
                </button>
                {topologies.map((row) => (
                  <button
                    className={
                      selectedTopology === row.stable_id
                        ? "bg-signal-green-soft! text-copy!"
                        : ""
                    }
                    key={row.stable_id}
                    onClick={() => setSelectedTopology(row.stable_id)}
                  >
                    {String(row.definition.title ?? "TOPOLOGY")}
                  </button>
                ))}
              </div>
              {selectedTopology ? (
                <TopologyEditor
                  row={topologies.find(
                    (row) => row.stable_id === selectedTopology,
                  )!}
                  onSaved={(saved) => {
                    setTopologies((value) =>
                      value.map((row) =>
                        row.stable_id === saved.stable_id ? saved : row,
                      ),
                    );
                    setNotice("Topology saved.");
                  }}
                />
              ) : (
                <div className="grid min-h-[620px] grid-cols-[230px_minmax(0,1fr)] overflow-hidden rounded-panel border border-line max-lg:grid-cols-1">
                  <nav className="themed-scrollbar grid min-w-0 content-start gap-2 overflow-y-auto border-r border-line bg-sidebar p-3 max-lg:max-h-72 max-lg:border-b max-lg:border-r-0 [&>button:not([class*=inline-flex])]:min-h-14 [&>button:not([class*=inline-flex])]:rounded-control [&>button:not([class*=inline-flex])]:border [&>button:not([class*=inline-flex])]:border-transparent [&>button:not([class*=inline-flex])]:px-3 [&>button:not([class*=inline-flex])]:text-left">
                    <button
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-orange/60 bg-signal-orange-soft px-4 text-xs font-semibold text-[#f1ae78] hover:border-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                      onClick={() =>
                        void api
                          .createWorkshopLesson(
                            selectedWorkshop.id,
                            lessons.length + 1,
                          )
                          .then((row) => {
                            setLessons((value) => [...value, row]);
                            setSelectedLesson(row.id);
                          })
                      }
                    >
                      <Plus />
                      ADD LESSON
                    </button>
                    {lessons.map((lesson, index) => (
                      <button
                        className={`grid min-w-0 gap-1 ${
                          lesson.id === selectedLesson
                            ? "border-line! bg-raised! text-copy"
                            : "text-muted hover:bg-raised"
                        }`}
                        key={lesson.id}
                        onClick={() => setSelectedLesson(lesson.id)}
                      >
                        <small className="block font-mono text-signal-orange">
                          {String(index + 1).padStart(2, "0")}
                        </small>
                        <span className="block break-words font-semibold">
                          {String(lesson.draft.title ?? "Untitled lesson")}
                        </span>
                      </button>
                    ))}
                  </nav>
                  {lessons.find((row) => row.id === selectedLesson) ? (
                    <LessonEditor
                      lesson={lessons.find((row) => row.id === selectedLesson)!}
                      topologies={topologies}
                      onChange={updateLesson}
                      onSaved={() => setNotice("Lesson saved.")}
                    />
                  ) : (
                    <div className="grid min-h-60 place-items-center content-center gap-3 text-center text-muted [&>p]:m-0 [&>p]:max-w-lg">
                      <BookOpen />
                      <p>Add a lesson to begin authoring.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
          {selectedWorkshop && area === "workshop-assessments" ? (
            <div className="grid min-w-0 gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
              <nav className="themed-scrollbar grid min-w-0 content-start gap-2 overflow-y-auto rounded-panel border border-line bg-sidebar p-3 max-xl:max-h-80 [&>button:not([class*=inline-flex])]:min-h-14 [&>button:not([class*=inline-flex])]:rounded-control [&>button:not([class*=inline-flex])]:border [&>button:not([class*=inline-flex])]:border-transparent [&>button:not([class*=inline-flex])]:px-3 [&>button:not([class*=inline-flex])]:text-left">
                <div className="mb-2 grid gap-2">
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-orange/60 bg-signal-orange-soft px-4 text-xs font-semibold text-[#f1ae78] hover:border-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                    onClick={() =>
                      void api
                        .createWorkshopAssessment(
                          selectedWorkshop.id,
                          "practice",
                        )
                        .then((row) => {
                          setAssessments((value) => [...value, row]);
                          setSelectedAssessment(row.id);
                        })
                    }
                  >
                    NEW PRACTICE
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
                    onClick={() =>
                      void api
                        .createWorkshopAssessment(selectedWorkshop.id, "graded")
                        .then((row) => {
                          setAssessments((value) => [...value, row]);
                          setSelectedAssessment(row.id);
                        })
                    }
                  >
                    NEW GRADED
                  </button>
                </div>
                {assessments.map((assessment) => (
                  <button
                    className={`grid min-w-0 grid-cols-[20px_minmax(0,1fr)] items-start gap-3 ${
                      assessment.id === selectedAssessment
                        ? "border-line! bg-raised! text-copy"
                        : "text-muted hover:bg-raised"
                    }`}
                    key={assessment.id}
                    onClick={() => setSelectedAssessment(assessment.id)}
                  >
                    <ClipboardCheck />
                    <span className="grid min-w-0 gap-1">
                      <span className="block break-words font-semibold">
                        {assessment.title}
                      </span>
                      <small className="block leading-5 text-muted">
                        {assessment.mode === "graded"
                          ? "Recorded in gradebook"
                          : "Practice only"}
                      </small>
                    </span>
                  </button>
                ))}
              </nav>
              {assessments.find((row) => row.id === selectedAssessment) ? (
                <AssessmentEditor
                  row={assessments.find(
                    (row) => row.id === selectedAssessment,
                  )!}
                  onChange={updateAssessment}
                  onSaved={() => setNotice("Assessment saved.")}
                />
              ) : (
                <div className="grid min-h-60 place-items-center content-center gap-3 text-center text-muted [&>p]:m-0 [&>p]:max-w-lg">
                  <ClipboardCheck />
                  <p>Add a practice or graded assessment.</p>
                </div>
              )}
            </div>
          ) : null}
          {selectedWorkshop && area === "classes" ? (
            <Classes
              selected={selectedWorkshop}
              classes={classes.filter(
                (row) => row.workshop_id === selectedWorkshop.id,
              )}
              onCreated={() => void load()}
              onNotice={setNotice}
            />
          ) : null}
          {selectedWorkshop && area === "gradebook" ? (
            <Gradebook rows={gradeRows} />
          ) : null}
        </section>
      </div>
      {detailsMode ? (
        <WorkshopDetailsDialog
          mode={detailsMode}
          onClose={() => setDetailsMode(undefined)}
          onCreate={create}
          onSave={saveDetails}
          onDelete={deleteDraft}
        />
      ) : null}
    </>
  );
}
