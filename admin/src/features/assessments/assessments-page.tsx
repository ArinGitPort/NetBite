import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as api from "../../lib/content-api";
import type { FlashcardRow, QuizRow } from "../../lib/content-api";
import {
  EmptyState as Empty,
  LoadingState as Loading,
  PageIntro,
  StatusBadge as Badge,
} from "../../components/ui/admin-primitives";
import { Button } from "../../components/ui/button";
import { FlashcardEditor, QuizEditor } from "./assessment-editors";

export function Assessments() {
  const [data, setData] =
    useState<Awaited<ReturnType<typeof api.getCurriculum>>>();
  const [chapterId, setChapterId] = useState("1");
  const [mode, setMode] = useState<"quiz" | "flashcards">("quiz");
  const [view, setView] = useState<"focused" | "all">("focused");
  const [selectedId, setSelectedId] = useState("");
  const [selectedItemDirty, setSelectedItemDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const load = () => api.getCurriculum().then(setData);
  useEffect(() => {
    void load();
  }, []);
  const assessmentRows = useMemo<Array<QuizRow | FlashcardRow>>(() => {
    if (!data) return [];
    const rows = mode === "quiz" ? data.quiz : data.flashcards;
    return rows.filter((item) => item.chapter_id === chapterId);
  }, [chapterId, data, mode]);
  useEffect(() => {
    setSelectedId((current) =>
      assessmentRows.some(({ id }) => id === current)
        ? current
        : (assessmentRows[0]?.id ?? ""),
    );
    setSelectedItemDirty(false);
  }, [assessmentRows]);
  if (!data) return <Loading />;
  const lessons = data.lessons.filter(
    (item) =>
      item.chapter_id === chapterId &&
      item.requirement === "core" &&
      !item.archived,
  );
  const selectedChapter = data.chapters.find(({ id }) => id === chapterId);
  const selectedAssessment =
    assessmentRows.find(({ id }) => id === selectedId) ?? assessmentRows[0];
  return (
    <>
      <PageIntro
        eyebrow="ASSESSMENTS"
        title="Quizzes and flashcards"
        detail="Each question and flashcard must be linked to an existing lesson before publication."
      />
      {notice ? (
        <div className="mb-4 rounded-control border border-signal-green/60 bg-signal-green-soft p-3 text-sm text-[#abd2c8]">
          {notice}
        </div>
      ) : null}
      <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center [&>select]:max-w-sm [&>button:last-child]:sm:ml-auto">
        <select
          aria-label="Chapter"
          disabled={selectedItemDirty}
          value={chapterId}
          onChange={(event) => setChapterId(event.target.value)}
        >
          {data.chapters.map((chapter) => (
            <option value={chapter.id} key={chapter.id}>
              {String(chapter.definition.numberLabel)} —{" "}
              {String(chapter.definition.title)}
            </option>
          ))}
        </select>
        <div className="inline-flex min-h-11 rounded-control border border-line bg-canvas p-1 [&>button]:min-w-24 [&>button]:rounded-[6px] [&>button]:border-0 [&>button]:px-3 [&>button]:text-xs [&>button]:font-semibold [&>button]:text-muted">
          <button
            aria-pressed={mode === "quiz"}
            className={
              mode === "quiz" ? "bg-signal-green-soft! text-copy!" : ""
            }
            disabled={selectedItemDirty}
            onClick={() => setMode("quiz")}
          >
            QUIZ
          </button>
          <button
            aria-pressed={mode === "flashcards"}
            className={
              mode === "flashcards" ? "bg-signal-green-soft! text-copy!" : ""
            }
            disabled={selectedItemDirty}
            onClick={() => setMode("flashcards")}
          >
            FLASHCARDS
          </button>
        </div>
        <div
          className="inline-flex min-h-11 rounded-control border border-line bg-canvas p-1 [&>button]:min-w-24 [&>button]:rounded-[6px] [&>button]:border-0 [&>button]:px-3 [&>button]:text-xs [&>button]:font-semibold [&>button]:text-muted"
          aria-label="Editor view"
        >
          <button
            aria-pressed={view === "focused"}
            className={
              view === "focused" ? "bg-signal-green-soft! text-copy!" : ""
            }
            disabled={selectedItemDirty}
            onClick={() => setView("focused")}
            type="button"
          >
            FOCUSED
          </button>
          <button
            aria-pressed={view === "all"}
            className={view === "all" ? "bg-signal-green-soft! text-copy!" : ""}
            disabled={selectedItemDirty}
            onClick={() => setView("all")}
            type="button"
          >
            ALL ITEMS
          </button>
        </div>
        <Button
          disabled={!lessons[0] || selectedItemDirty}
          tone="primary"
          onClick={() =>
            void (
              mode === "quiz"
                ? api.createQuiz(
                    chapterId,
                    lessons[0].id,
                    data.quiz.filter((item) => item.chapter_id === chapterId)
                      .length + 1,
                  )
                : api.createFlashcard(
                    chapterId,
                    lessons[0].id,
                    data.flashcards.filter(
                      (item) => item.chapter_id === chapterId,
                    ).length + 1,
                  )
            ).then(load)
          }
        >
          <Plus />
          ADD {mode === "quiz" ? "QUESTION" : "CARD"}
        </Button>
      </div>
      <section aria-labelledby="assessment-chapter-title">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div className="grid min-w-0 gap-1">
            <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
              CHAPTER {String(selectedChapter?.definition.numberLabel)}
            </p>
            <h2 className="m-0 break-words" id="assessment-chapter-title">
              {String(selectedChapter?.definition.title)}
            </h2>
          </div>
          <Badge>{assessmentRows.length} ITEMS</Badge>
        </header>
        {assessmentRows.length === 0 ? (
          <Empty
            title={`No ${mode === "quiz" ? "quiz questions" : "flashcards"}`}
            detail="Add the first item for this chapter to begin editing."
          />
        ) : view === "focused" ? (
          <div
            className="grid min-w-0 items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]"
            data-testid="assessment-workspace"
          >
            <aside
              className="min-w-0 overflow-hidden rounded-panel border border-line bg-sidebar"
              aria-label={`${mode} items`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-line p-4">
                <strong>{mode === "quiz" ? "QUESTIONS" : "CARDS"}</strong>
                <span>{assessmentRows.length}</span>
              </div>
              <div className="themed-scrollbar grid max-h-[620px] gap-1 overflow-y-auto p-3 max-xl:max-h-72">
                {assessmentRows.map((row) => {
                  const prompt = row.draft.prompt;
                  const lessonTitle = lessons.find(
                    ({ id }) => id === row.lesson_id,
                  )?.draft.title;
                  const selected = row.id === selectedId;
                  return (
                    <button
                      aria-current={selected ? "true" : undefined}
                      className={`grid min-h-16 gap-1 rounded-control border px-3 py-2 text-left ${selected ? "border-line bg-raised text-copy" : "border-transparent text-muted hover:bg-raised"}`}
                      disabled={selectedItemDirty && !selected}
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      title={
                        selectedItemDirty && !selected
                          ? "Save the current item before switching."
                          : prompt
                      }
                      type="button"
                    >
                      <span className="font-mono text-[0.65rem] text-signal-orange">
                        {mode === "quiz" ? "Q" : "C"}
                        {String(row.position).padStart(2, "0")}
                      </span>
                      <strong className="break-words leading-5">
                        {prompt ||
                          `Untitled ${mode === "quiz" ? "question" : "card"}`}
                      </strong>
                      <small className="break-words leading-5">
                        {lessonTitle ?? "Lesson mapping unavailable"}
                      </small>
                    </button>
                  );
                })}
              </div>
              {selectedItemDirty ? (
                <p
                  className="m-3 rounded-control border border-signal-orange/50 bg-signal-orange-soft p-3 text-xs text-[#efad7a]"
                  role="status"
                >
                  UNSAVED CHANGES / SAVE BEFORE SWITCHING
                </p>
              ) : null}
            </aside>
            <div
              className="min-w-0 py-1"
              data-testid="assessment-editor-region"
            >
              {mode === "quiz" ? (
                <QuizEditor
                  key={selectedId}
                  row={selectedAssessment as QuizRow}
                  lessons={lessons}
                  onDirtyChange={setSelectedItemDirty}
                  onDone={(message) => {
                    setNotice(message);
                    void load();
                  }}
                />
              ) : (
                <FlashcardEditor
                  key={selectedId}
                  row={selectedAssessment as FlashcardRow}
                  lessons={lessons}
                  onDirtyChange={setSelectedItemDirty}
                  onDone={(message) => {
                    setNotice(message);
                    void load();
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="grid min-w-0 divide-y divide-line [&>article]:py-7 [&>article:first-child]:pt-0">
            {mode === "quiz"
              ? (assessmentRows as QuizRow[]).map((row) => (
                  <QuizEditor
                    key={row.id}
                    row={row}
                    lessons={lessons}
                    onDone={(message) => {
                      setNotice(message);
                      void load();
                    }}
                  />
                ))
              : (assessmentRows as FlashcardRow[]).map((row) => (
                  <FlashcardEditor
                    key={row.id}
                    row={row}
                    lessons={lessons}
                    onDone={(message) => {
                      setNotice(message);
                      void load();
                    }}
                  />
                ))}
          </div>
        )}
      </section>
    </>
  );
}
