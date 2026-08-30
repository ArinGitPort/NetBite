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
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import * as curriculumApi from "@/lib/api/curriculum-service";
import type {
  AssetRow,
  ChapterRow,
  FlashcardRow,
  LessonRow,
  QuizRow,
  ReleaseRow,
  SafeAuditEntry,
  SourceRow,
} from "@/lib/api/types";
import {
  DialogFrame,
  EmptyState as Empty,
  Field,
  LoadingState as Loading,
  PageIntro,
  StatusBadge as Badge,
} from "@/components/ui/admin-primitives";
import { Button } from "@/components/ui/button";
import { LessonEditor } from "@/features/curriculum/lesson-editor";

export function Curriculum() {
  const [data, setData] =
    useState<Awaited<ReturnType<typeof curriculumApi.getCurriculum>>>();
  const [chapterId, setChapterId] = useState("1");
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string>();
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [stableId, setStableId] = useState("");
  const load = useCallback(
    () =>
      curriculumApi.getCurriculum().then((next) => {
        setData(next);
        if (!next.chapters.some(({ id }) => id === chapterId))
          setChapterId(next.chapters[0]?.id ?? "1");
      }),
    [chapterId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!data || expandedCourseId !== null) return;
    const owner = data.chapters.find(({ id }) => id === chapterId)?.course_id;
    setExpandedCourseId(owner ?? data.courses[0]?.id ?? "");
  }, [chapterId, data, expandedCourseId]);
  const chapter = data?.chapters.find(({ id }) => id === chapterId);
  const lessons = useMemo(
    () =>
      data?.lessons.filter(
        (lesson) =>
          lesson.chapter_id === chapterId &&
          lesson.draft.title.toLowerCase().includes(search.toLowerCase()),
      ) ?? [],
    [data, chapterId, search],
  );
  const selected = data?.lessons.find(({ id }) => id === lessonId);
  const updateSelected = (row: LessonRow) =>
    setData((current) =>
      current
        ? {
            ...current,
            lessons: current.lessons.map((lesson) =>
              lesson.id === row.id ? row : lesson,
            ),
          }
        : current,
    );
  const moveSelected = async (direction: -1 | 1) => {
    if (!data || !selected) return;
    const ordered = data.lessons
      .filter((lesson) => lesson.chapter_id === chapterId && !lesson.archived)
      .sort((left, right) => left.position - right.position);
    const index = ordered.findIndex(({ id }) => id === selected.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try {
      await curriculumApi.reorderLessons(
        chapterId,
        ordered.map(({ id }) => id),
      );
      await load();
      setNotice("Lesson order updated.");
    } catch (error) {
      setNotice((error as Error).message);
    }
  };
  const create = async () => {
    if (!data || busy) return;
    if (!stableId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stableId))
      return setNotice(
        "Use a lowercase permanent lesson code such as network-service-review.",
      );
    setBusy(true);
    try {
      const position =
        Math.max(
          0,
          ...data.lessons
            .filter((item) => item.chapter_id === chapterId)
            .map(({ position }) => position),
        ) + 1;
      const illustration =
        data.lessons.find((item) => item.chapter_id === chapterId)?.draft
          .illustration ?? "network";
      await curriculumApi.createLesson(
        chapterId,
        stableId,
        position,
        illustration,
      );
      await load();
      setLessonId(stableId);
      setStableId("");
      setCreateOpen(false);
      setNotice("Supplemental lesson draft created.");
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!data) return <Loading />;
  return (
    <>
      <PageIntro
        eyebrow="CURRICULUM"
        title="Lesson editor"
        detail="Edit content inside the fixed NetBite course structure. New lessons are supplemental and never revoke existing completion."
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={busy}
            tone="primary"
          >
            <Plus />
            NEW LESSON
          </Button>
        }
      />
      {createOpen ? (
        <DialogFrame
          detail="New lessons are supplemental and stay inside the currently selected chapter. Use a permanent lowercase ID because learner progress refers to it."
          eyebrow="NEW SUPPLEMENTAL LESSON"
          onClose={() => {
            if (!busy) setCreateOpen(false);
          }}
          title="Create a lesson draft"
        >
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <Field
              label="Permanent lesson code"
              hint="Lowercase letters and numbers separated by hyphens. Example: network-service-review."
            >
              <input
                autoFocus
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="network-service-review"
                required
                value={stableId}
                onChange={(event) => setStableId(event.target.value)}
              />
            </Field>
            <div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <Button
                disabled={busy}
                onClick={() => setCreateOpen(false)}
                tone="outline"
                type="button"
              >
                CANCEL
              </Button>
              <Button disabled={busy} tone="primary" type="submit">
                {busy ? "CREATING..." : "CREATE DRAFT"}
              </Button>
            </div>
          </form>
        </DialogFrame>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-control border border-signal-green/60 bg-signal-green-soft p-3 text-sm text-[#abd2c8]">
          {notice}
        </div>
      ) : null}
      <div
        className="grid min-h-[720px] min-w-0 overflow-hidden rounded-panel border border-line bg-surface shadow-panel xl:grid-cols-[250px_360px_minmax(0,1fr)]"
        data-testid="curriculum-workspace"
      >
        <aside
          className="themed-scrollbar min-w-0 overflow-auto border-b border-line bg-surface p-4 xl:max-h-[calc(100vh-180px)] xl:border-b-0 xl:border-r"
          data-testid="curriculum-navigation"
        >
          <h2 className="mb-4 text-[0.8rem] font-bold uppercase tracking-[0.03em]">
            Courses and chapters
          </h2>
          <div className="mt-4 grid gap-2">
            {data.courses.map((course) => {
              const courseChapters = data.chapters.filter(
                (item) => item.course_id === course.id,
              );
              const expanded = expandedCourseId === course.id;
              return (
                <section key={course.id} className="grid gap-1">
                  <button
                    aria-expanded={expanded}
                    className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-control border px-3 py-2 text-left text-xs ${expanded ? "border-line bg-raised text-copy" : "border-transparent text-muted hover:border-line hover:bg-raised"}`}
                    onClick={() => {
                      if (expanded) {
                        setExpandedCourseId("");
                        return;
                      }
                      setExpandedCourseId(course.id);
                      const firstChapter = courseChapters[0];
                      if (firstChapter) {
                        setChapterId(firstChapter.id);
                        setLessonId(undefined);
                      }
                    }}
                    type="button"
                  >
                    <span className="grid min-w-0 gap-1">
                      <strong className="break-words leading-5">
                        {String(course.definition.title ?? course.id)}
                      </strong>
                      <small className="block text-muted">
                        {courseChapters.length} chapters
                      </small>
                    </span>
                    {expanded ? (
                      <ChevronDown aria-hidden="true" className="shrink-0" />
                    ) : (
                      <ChevronRight aria-hidden="true" className="shrink-0" />
                    )}
                  </button>
                  {expanded ? (
                    <div className="grid gap-1 pb-1 pl-2">
                      {courseChapters.map((item) => (
                        <button
                          key={item.id}
                          className={`flex min-h-14 w-full items-center gap-3 rounded-control border px-3 py-2 text-left text-xs ${item.id === chapterId ? "border-line bg-raised text-copy" : "border-transparent text-muted hover:border-line hover:bg-raised"}`}
                          onClick={() => {
                            setChapterId(item.id);
                            setLessonId(undefined);
                          }}
                        >
                          <span className="shrink-0 font-mono text-xs">
                            {String(
                              item.definition.numberLabel ?? item.position,
                            ).padStart(2, "0")}
                          </span>
                          <div className="grid min-w-0 gap-1">
                            <strong className="break-words leading-5">
                              {String(item.definition.title ?? item.id)}
                            </strong>
                            <small className="block leading-5 text-muted">
                              {
                                data.lessons.filter(
                                  (lesson) =>
                                    lesson.chapter_id === item.id &&
                                    !lesson.archived,
                                ).length
                              }{" "}
                              lessons
                            </small>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </aside>
        <section
          className="themed-scrollbar min-w-0 overflow-auto border-b border-line bg-surface p-4 xl:col-start-2 xl:max-h-[calc(100vh-180px)] xl:border-b-0 xl:border-r"
          data-testid="curriculum-lessons"
        >
          <div className="grid gap-3 border-b border-line pb-4">
            <div>
              <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
                CHAPTER{" "}
                {String(chapter?.definition.numberLabel ?? chapter?.position)}
              </p>
              <h2 className="text-lg">
                {String(chapter?.definition.title ?? "Select a chapter")}
              </h2>
            </div>
            <div className="flex min-h-11 items-center overflow-hidden rounded-control border border-line bg-canvas [&_svg]:mx-3 [&_svg]:size-4 [&_svg]:text-muted [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0">
              <Search />
              <input
                aria-label="Search lessons"
                placeholder="Search lessons"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          {lessons.map((lesson) => (
            <button
              key={lesson.id}
              className={`grid min-h-[72px] min-w-0 w-full grid-cols-[34px_minmax(0,1fr)_auto_18px] items-center gap-3 border-0 border-b border-line bg-transparent px-2 py-3 text-left text-xs hover:bg-raised max-sm:grid-cols-[30px_minmax(0,1fr)_18px] ${lesson.id === lessonId ? "bg-raised" : ""} ${lesson.archived ? "opacity-55" : ""}`}
              onClick={() => setLessonId(lesson.id)}
            >
              <span className="font-mono text-xs text-signal-orange">
                {String(lesson.position).padStart(2, "0")}
              </span>
              <div className="grid min-w-0 gap-1">
                <strong className="break-words leading-5">
                  {lesson.draft.title}
                </strong>
                <small className="block break-all leading-5 text-muted">
                  {lesson.id}
                </small>
              </div>
              <Badge
                className="max-sm:hidden"
                tone={
                  lesson.archived
                    ? "red"
                    : lesson.requirement === "supplemental"
                      ? "orange"
                      : "green"
                }
              >
                {lesson.archived ? "ARCHIVED" : lesson.requirement}
              </Badge>
              <ChevronRight />
            </button>
          ))}
          {!lessons.length ? (
            <Empty
              title="No matching lessons"
              detail="Clear the search or create a supplemental lesson."
            />
          ) : null}
        </section>
        <section
          className="themed-scrollbar min-w-0 overflow-auto bg-surface p-5 xl:col-start-3 xl:max-h-[calc(100vh-180px)]"
          data-testid="curriculum-editor"
        >
          {selected ? (
            <LessonEditor
              row={selected}
              onChange={updateSelected}
              onMove={moveSelected}
              onSaved={(message) => {
                setNotice(message);
                void load();
              }}
            />
          ) : (
            <Empty
              title="Select a lesson"
              detail="Choose a lesson to edit its structured content and Android preview."
            />
          )}
        </section>
      </div>
    </>
  );
}
