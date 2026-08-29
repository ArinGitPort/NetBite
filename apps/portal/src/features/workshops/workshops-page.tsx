import {
  BookOpen,
  Cable,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Classes, Gradebook } from "../classes/classes-page";
import { PageHeader } from "../../components/layout/page-header";
import { Button } from "../../components/ui/button";
import { ConfirmationDialog, Dialog } from "../../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { SelectField } from "@/components/ui/select";
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
  onDismiss,
}: {
  message?: string;
  error?: boolean;
  onDismiss: () => void;
}) {
  return message ? (
    <div
      className={`mb-4 flex min-h-11 items-center justify-between gap-3 rounded-control border p-2 pl-3 text-sm ${
        error
          ? "border-signal-red/60 bg-signal-red-soft text-[#ff9da1]"
          : "border-signal-green/60 bg-signal-green-soft text-[#abd2c8]"
      }`}
      role={error ? "alert" : "status"}
    >
      <span>{message}</span>
      <button
        aria-label="Dismiss notification"
        className="-my-1 grid size-11 shrink-0 place-items-center rounded-control border border-transparent text-current hover:border-current/35 hover:bg-black/10 focus-visible:outline-offset-0 [&_svg]:size-4"
        onClick={onDismiss}
        type="button"
      >
        <X aria-hidden="true" />
      </button>
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
  const [collectionView, setCollectionView] = useState<
    "lessons" | "topologies"
  >("lessons");
  const [gradeRows, setGradeRows] = useState<Array<Record<string, unknown>>>(
    [],
  );
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [detailsMode, setDetailsMode] = useState<WorkshopDetailsMode>();
  const [addingLesson, setAddingLesson] = useState(false);
  const [topologyDetailsOpen, setTopologyDetailsOpen] = useState(false);
  const [topologyName, setTopologyName] = useState("");
  const [savingTopologyName, setSavingTopologyName] = useState(false);
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
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(undefined), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);
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
        setSelectedTopology((current) =>
          current && content.topologies.some((row) => row.stable_id === current)
            ? current
            : content.topologies[0]?.stable_id,
        );
      })
      .catch((reason) => setError(reason.message));
  }, [selectedId]);
  const create = async (title: string, description: string) => {
    const row = await api.createWorkshop(title, description);
    setWorkshops((value) => [row, ...value]);
    setSelectedId(row.id);
    setNotice("Lesson collection created as a private draft.");
  };
  const saveDetails = async (workshop: WorkshopRow) => {
    const saved = await api.saveWorkshop(workshop);
    setWorkshops((value) =>
      value.map((item) => (item.id === saved.id ? saved : item)),
    );
    setNotice("Lesson collection details saved.");
  };
  const deleteDraft = async (workshop: WorkshopRow) => {
    await api.deleteWorkshop(workshop.id);
    setSelectedId(undefined);
    setLessons([]);
    setTopologies([]);
    setAssessments([]);
    setVersions([]);
    await load();
    setNotice("Private lesson collection deleted.");
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
  const addLesson = async () => {
    if (!selectedWorkshop || addingLesson) return;
    setAddingLesson(true);
    setError(undefined);
    try {
      const nextPosition =
        lessons.reduce(
          (highest, lesson) => Math.max(highest, lesson.position),
          0,
        ) + 1;
      const row = await api.createWorkshopLesson(
        selectedWorkshop.id,
        nextPosition,
      );
      setLessons((value) => [...value, row]);
      setSelectedLesson(row.id);
      setNotice("Lesson added. Add its title and content, then save it.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The lesson could not be added.",
      );
    } finally {
      setAddingLesson(false);
    }
  };
  const deleteLesson = async (lesson: WorkshopLessonRow) => {
    await api.deleteWorkshopLesson(lesson.id);
    const remaining = lessons.filter((item) => item.id !== lesson.id);
    setLessons(remaining);
    setSelectedLesson(remaining[0]?.id);
    setNotice("Lesson deleted from the current draft.");
  };
  const updateAssessment = (row: WorkshopAssessmentRow) =>
    setAssessments((value) =>
      value.map((item) => (item.id === row.id ? row : item)),
    );
  const addTopology = () => {
    if (!selectedWorkshop) return;
    const row = defaultTopology(selectedWorkshop.id);
    setTopologies((value) => [...value, row]);
    setSelectedTopology(row.stable_id);
    setCollectionView("topologies");
  };
  const selectedTopologyRow = topologies.find(
    (row) => row.stable_id === selectedTopology,
  );
  const topologyReferenceCount = selectedTopologyRow
    ? lessons.reduce((total, lesson) => {
        const blocks = Array.isArray(lesson.draft.blocks)
          ? lesson.draft.blocks
          : [];
        return (
          total +
          blocks.filter(
            (block) =>
              block &&
              typeof block === "object" &&
              "topologyId" in block &&
              block.topologyId === selectedTopologyRow.stable_id,
          ).length
        );
      }, 0)
    : 0;
  const openTopologyDetails = () => {
    if (!selectedTopologyRow) return;
    setTopologyName(
      String(selectedTopologyRow.definition.title ?? "Untitled topology"),
    );
    setTopologyDetailsOpen(true);
  };
  const renameTopology = async () => {
    if (!selectedTopologyRow) return;
    const title = topologyName.trim();
    if (!title) {
      setError("Enter a topology name before saving.");
      return;
    }
    setSavingTopologyName(true);
    setError(undefined);
    try {
      const saved = await api.saveWorkshopTopology({
        ...selectedTopologyRow,
        definition: { ...selectedTopologyRow.definition, title },
      });
      setTopologies((value) =>
        value.map((row) =>
          row.stable_id === saved.stable_id ? saved : row,
        ),
      );
      setTopologyDetailsOpen(false);
      setNotice("Topology name saved.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The topology name could not be saved.",
      );
    } finally {
      setSavingTopologyName(false);
    }
  };
  const deleteTopology = async () => {
    if (!selectedTopologyRow || topologyReferenceCount > 0) return;
    try {
      if (selectedTopologyRow.id) {
        await api.deleteWorkshopTopology(selectedTopologyRow.id);
      }
      const remaining = topologies.filter(
        (row) => row.stable_id !== selectedTopologyRow.stable_id,
      );
      setTopologies(remaining);
      setSelectedTopology(remaining[0]?.stable_id);
      setTopologyDetailsOpen(false);
      setNotice("Topology deleted from the current draft.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The topology could not be deleted.",
      );
    }
  };

  const page =
    area === "classes"
      ? {
          label: "CLASS MANAGEMENT",
          title: "Classes and sharing",
          detail:
            "Assign a published lesson collection to a private class, then invite students using a code, link, or QR code.",
        }
      : area === "workshop-assessments"
        ? {
            label: "ASSESSMENT AUTHORING",
            title: "Assessments",
            detail:
              "Create practice activities or graded quizzes for a lesson collection.",
          }
        : area === "gradebook"
          ? {
              label: "CLASS RESULTS",
              title: "Gradebook",
              detail:
                "Review submissions, missing work, late work, and recorded grades without exposing student answers.",
            }
          : {
              label: "INSTRUCTOR CONTENT",
              title: "Lesson collections",
              detail:
                "Group related lessons, network visuals, flashcards, and assessments. Build privately, publish when ready, then share through a class.",
            };

  if (loading)
    return (
      <>
        <PageHeader
          description={page.detail}
          label={page.label}
          title={page.title}
        />
        <section
          className="flex min-h-52 items-center justify-center gap-3 rounded-panel border border-line bg-surface p-5 text-sm text-muted shadow-panel"
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
        <PageHeader
          actions={
            <Button
              onClick={() => setDetailsMode({ kind: "create" })}
              tone="primary"
            >
              <Plus />
              CREATE COLLECTION
            </Button>
          }
          description={page.detail}
          label={page.label}
          title={page.title}
        />
        <Notice message={error} error onDismiss={() => setError(undefined)} />
        <section className="grid min-h-[300px] place-items-center content-center gap-3 rounded-panel border border-line bg-surface p-5 text-center text-sm shadow-panel [&>svg]:size-9 [&>svg]:text-signal-green [&>p]:max-w-xl">
          <GraduationCap />
          <strong>No lesson collections yet</strong>
          <p>
            Start a collection for one topic or unit. It remains private while
            you add lessons and activities. Publish it when it is ready, then
            assign it to a class.
          </p>
          <Button
            onClick={() => setDetailsMode({ kind: "create" })}
            tone="primary"
          >
            <Plus />
            CREATE YOUR FIRST COLLECTION
          </Button>
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
      <PageHeader
        actions={
          area === "workshops" ? (
            <Button
              onClick={() => setDetailsMode({ kind: "create" })}
              tone="primary"
            >
              <Plus />
              NEW COLLECTION
            </Button>
          ) : undefined
        }
        description={page.detail}
        label={page.label}
        title={page.title}
      />
      <Notice
        message={error || notice}
        error={Boolean(error)}
        onDismiss={() => {
          if (error) setError(undefined);
          else setNotice(undefined);
        }}
      />
      <div className="grid min-h-[680px] min-w-0 grid-cols-[250px_minmax(0,1fr)] overflow-hidden rounded-panel border border-line bg-surface shadow-panel max-lg:grid-cols-1">
        <aside className="themed-scrollbar grid min-w-0 content-start gap-2 overflow-y-auto border-r border-line bg-sidebar p-3 max-lg:border-b max-lg:border-r-0 [&>strong]:px-2 [&>strong]:py-2 [&>strong]:font-mono [&>strong]:text-[0.62rem] [&>strong]:text-muted">
          <strong>YOUR COLLECTIONS</strong>
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
                {workshop.current_version_id ? "Published" : "Draft"}
              </small>
            </button>
          ))}
        </aside>
        <section className="min-w-0 bg-surface p-5 max-sm:p-4">
          {selectedWorkshop && area === "workshops" ? (
            <>
              <div className="mb-5 flex min-h-20 flex-wrap items-start justify-between gap-5 border-b border-line pb-5">
                <div className="min-w-0">
                  <span className="inline-flex min-h-6 w-fit items-center rounded-full border border-line bg-raised px-2.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.045em] text-muted">
                    {selectedWorkshop.archived
                      ? "ARCHIVED"
                      : selectedWorkshop.current_version_id
                        ? "PUBLISHED COLLECTION"
                        : "DRAFT COLLECTION"}
                  </span>
                  <h2 className="break-words">{selectedWorkshop.title}</h2>
                  <p className="mb-2 mt-2 max-w-2xl text-sm leading-6 text-muted">
                    {selectedWorkshop.description ||
                      "Add a short description so students know what this collection covers."}
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
                          "Published collections and collections used by a class must be archived so student access and records remain intact.",
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
                              ? "Lesson collection restored."
                              : "Lesson collection archived. Existing classes remain readable.",
                          );
                          return load();
                        })
                    }
                  >
                    {selectedWorkshop.archived
                      ? "RESTORE COLLECTION"
                      : "ARCHIVE COLLECTION"}
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
                    disabled={!lessons.length || selectedWorkshop.archived}
                    onClick={() =>
                      void api
                        .publishWorkshop(selectedWorkshop.id)
                        .then(() => {
                          setNotice(
                            "Lesson collection published. You can now assign it to a class.",
                          );
                          return load();
                        })
                        .catch((reason) => setError(reason.message))
                    }
                  >
                    <CheckCircle2 />
                    PUBLISH COLLECTION
                  </button>
                </div>
              </div>
              <Tabs
                className="mb-5"
                onValueChange={(value) =>
                  setCollectionView(value as "lessons" | "topologies")
                }
                value={collectionView}
              >
                <TabsList aria-label="Collection content">
                  <TabsTrigger
                    aria-label={`Lessons, ${lessons.length} ${lessons.length === 1 ? "item" : "items"}`}
                    className="inline-flex items-center"
                    onClick={() => setCollectionView("lessons")}
                    value="lessons"
                  >
                    <BookOpen aria-hidden="true" className="mr-2 size-4" />
                    LESSONS
                    <span className="ml-2 rounded-full bg-raised px-2 py-0.5 font-mono text-[0.6rem]">
                      {lessons.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    aria-label={`Topologies, ${topologies.length} ${topologies.length === 1 ? "item" : "items"}`}
                    className="inline-flex items-center"
                    onClick={() => setCollectionView("topologies")}
                    value="topologies"
                  >
                    <Cable aria-hidden="true" className="mr-2 size-4" />
                    TOPOLOGIES
                    <span className="ml-2 rounded-full bg-raised px-2 py-0.5 font-mono text-[0.6rem]">
                      {topologies.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent className="mt-5" value="topologies">
                  {topologies.length && selectedTopology ? (
                    <div className="grid gap-4">
                      <div className="flex flex-wrap items-end gap-2 border-b border-line pb-4">
                        <label className="grid min-w-0 flex-1 gap-1.5 text-[0.7rem] font-semibold text-copy sm:max-w-sm">
                          <span>Selected topology</span>
                          <SelectField
                            allowEmpty={false}
                            ariaLabel="Selected topology"
                            onValueChange={setSelectedTopology}
                            options={topologies.map((row) => ({
                              value: row.stable_id,
                              label: String(
                                row.definition.title ?? "Untitled topology",
                              ),
                            }))}
                            placeholder="Choose a topology"
                            value={selectedTopology}
                          />
                        </label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Create topology"
                              disabled={selectedWorkshop.archived}
                              onClick={addTopology}
                              size="icon"
                              tone="secondary"
                            >
                              <Plus />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Create topology</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Edit topology details"
                              disabled={!selectedTopologyRow || selectedWorkshop.archived}
                              onClick={openTopologyDetails}
                              size="icon"
                              tone="outline"
                            >
                              <Pencil />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Rename or delete this topology
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <TopologyEditor
                        row={selectedTopologyRow!}
                        onSaved={(saved) => {
                          setTopologies((value) =>
                            value.map((row) =>
                              row.stable_id === saved.stable_id ? saved : row,
                            ),
                          );
                        }}
                      />
                    </div>
                  ) : (
                    <div className="grid min-h-[360px] place-items-center content-center gap-3 rounded-panel border border-dashed border-line bg-canvas p-6 text-center text-muted">
                      <Cable className="size-8" />
                      <strong className="text-copy">No topologies yet</strong>
                      <p className="m-0 max-w-lg text-sm leading-6">
                        Create a read-only network diagram, then insert it into
                        any lesson using a Network diagram content block.
                      </p>
                      <Button onClick={addTopology} tone="secondary">
                        <Plus />
                        CREATE FIRST TOPOLOGY
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent className="mt-5" value="lessons">
                  <div className="grid min-h-[620px] grid-cols-[230px_minmax(0,1fr)] overflow-hidden rounded-panel border border-line max-lg:grid-cols-1">
                    <nav className="themed-scrollbar grid min-w-0 content-start gap-2 overflow-y-auto border-r border-line bg-sidebar p-3 max-lg:max-h-72 max-lg:border-b max-lg:border-r-0 [&>button:not([class*=inline-flex])]:min-h-14 [&>button:not([class*=inline-flex])]:rounded-control [&>button:not([class*=inline-flex])]:border [&>button:not([class*=inline-flex])]:border-transparent [&>button:not([class*=inline-flex])]:px-3 [&>button:not([class*=inline-flex])]:text-left">
                      <button
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-orange/60 bg-signal-orange-soft px-4 text-xs font-semibold text-[#f1ae78] hover:border-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                        disabled={addingLesson || selectedWorkshop.archived}
                        onClick={() => void addLesson()}
                      >
                        {addingLesson ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <Plus />
                        )}
                        {addingLesson ? "ADDING LESSON..." : "ADD LESSON"}
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
                        key={selectedLesson}
                        collectionTitle={selectedWorkshop.title}
                        lesson={lessons.find(
                          (row) => row.id === selectedLesson,
                        )!}
                        topologies={topologies}
                        onChange={updateLesson}
                        onDelete={deleteLesson}
                        onError={setError}
                        onSaved={() => setNotice("Lesson saved.")}
                      />
                    ) : (
                      <div className="grid min-h-60 place-items-center content-center gap-3 text-center text-muted [&>p]:m-0 [&>p]:max-w-lg">
                        <BookOpen />
                        <p>Add a lesson to begin authoring.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : null}
          {selectedWorkshop && area === "workshop-assessments" ? (
            <div className="grid min-w-0 gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
              <nav className="themed-scrollbar grid min-w-0 content-start gap-2 overflow-y-auto rounded-panel border border-line bg-sidebar p-3 max-xl:max-h-80 [&>button:not([class*=inline-flex])]:min-h-14 [&>button:not([class*=inline-flex])]:rounded-control [&>button:not([class*=inline-flex])]:border [&>button:not([class*=inline-flex])]:border-transparent [&>button:not([class*=inline-flex])]:px-3 [&>button:not([class*=inline-flex])]:text-left">
                <div className="mb-2 grid gap-2 border-b border-line pb-3">
                  <span className="px-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted">
                    Create assessment
                  </span>
                  <Button
                    className="w-full"
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
                    tone="secondary"
                  >
                    <Plus />
                    NEW PRACTICE
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() =>
                      void api
                        .createWorkshopAssessment(selectedWorkshop.id, "graded")
                        .then((row) => {
                          setAssessments((value) => [...value, row]);
                          setSelectedAssessment(row.id);
                        })
                    }
                    tone="primary"
                  >
                    <Plus />
                    NEW GRADED
                  </Button>
                </div>
                {assessments.map((assessment) => (
                  <button
                    className={`grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-3 ${
                      assessment.id === selectedAssessment
                        ? "border-line! bg-raised! text-copy"
                        : "text-muted hover:bg-raised"
                    }`}
                    key={assessment.id}
                    onClick={() => setSelectedAssessment(assessment.id)}
                  >
                    <span className="grid size-9 place-items-center rounded-control border border-line bg-canvas text-muted [&_svg]:size-4">
                      <ClipboardCheck />
                    </span>
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
                  key={selectedAssessment}
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
      {topologyDetailsOpen && selectedTopologyRow ? (
        <Dialog
          description="Change the learner-facing name or remove this topology from the current draft. Published versions are not changed."
          onOpenChange={setTopologyDetailsOpen}
          open
          title="Topology details"
        >
          <label className="grid gap-2 text-xs font-semibold text-copy">
            <span>Topology name</span>
            <input
              aria-label="Topology name"
              autoFocus
              maxLength={80}
              onChange={(event) => setTopologyName(event.target.value)}
              placeholder="For example, Three-router static routing"
              value={topologyName}
            />
            <small className="font-normal leading-5 text-muted">
              Use a short name students and instructors can recognize.
            </small>
          </label>
          <div className="flex flex-col-reverse justify-end gap-2 border-b border-line pb-5 sm:flex-row">
            <Button
              onClick={() => setTopologyDetailsOpen(false)}
              tone="outline"
            >
              CANCEL
            </Button>
            <Button
              disabled={!topologyName.trim() || savingTopologyName}
              onClick={() => void renameTopology()}
              tone="primary"
            >
              {savingTopologyName ? "SAVING..." : "SAVE NAME"}
            </Button>
          </div>
          <section className="grid gap-2">
            <strong className="text-sm text-copy">Delete topology</strong>
            <p className="m-0 text-xs leading-5 text-muted">
              {topologyReferenceCount > 0
                ? `This topology is used by ${topologyReferenceCount} lesson block${topologyReferenceCount === 1 ? "" : "s"}. Remove those Network diagram or Configuration commands blocks before deleting it.`
                : "Delete this topology from the current draft. Existing published versions remain unchanged."}
            </p>
            <ConfirmationDialog
              confirmLabel="DELETE TOPOLOGY"
              description={`Delete "${String(selectedTopologyRow.definition.title ?? "Untitled topology")}" from this draft? This action cannot be undone.`}
              destructive
              onConfirm={deleteTopology}
              title="Delete this topology?"
              trigger={
                <Button
                  className="w-fit"
                  disabled={topologyReferenceCount > 0}
                  tone="destructive"
                >
                  <Trash2 />
                  DELETE TOPOLOGY
                </Button>
              }
            />
          </section>
        </Dialog>
      ) : null}
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
