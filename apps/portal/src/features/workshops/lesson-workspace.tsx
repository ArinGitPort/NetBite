import { BookOpen, ListTree, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import type { WorkshopLessonBlock } from "@netbite/workshops/contracts";
import { LessonEditor } from "@/features/workshops/lesson-editor";
import { LessonEditorOutline } from "@/features/workshops/lesson-editor-outline";
import type { WorkshopLessonRow, WorkshopTopologyRow } from "@/lib/api/types";
import { cn } from "@/lib/class-names";
import { LoadingButtonContent } from "@/components/ui/loading-content";

export function LessonWorkspace({
  addingLesson,
  archived,
  collectionTitle,
  lessons,
  onAddLesson,
  onChange,
  onDelete,
  onError,
  onSaved,
  onSelectLesson,
  selectedLessonId,
  topologies,
}: {
  addingLesson: boolean;
  archived: boolean;
  collectionTitle: string;
  lessons: WorkshopLessonRow[];
  onAddLesson: () => void;
  onChange: (row: WorkshopLessonRow) => void;
  onDelete: (row: WorkshopLessonRow) => Promise<void>;
  onError: (message: string) => void;
  onSaved: () => void;
  onSelectLesson: (id: string) => void;
  selectedLessonId?: string;
  topologies: WorkshopTopologyRow[];
}) {
  const [railView, setRailView] = useState<"lessons" | "outline">("lessons");
  const [activeBlockId, setActiveBlockId] = useState<string>();
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);
  const blocks = (selectedLesson?.draft.blocks ?? []) as WorkshopLessonBlock[];

  useEffect(() => {
    setActiveBlockId(blocks[0]?.id);
  }, [selectedLessonId]);

  const selectBlock = (id: string) => {
    setActiveBlockId(id);
    requestAnimationFrame(() => {
      document.getElementById(`lesson-block-${id}`)?.scrollIntoView?.({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  return (
    <div className="grid min-h-[620px] grid-cols-[230px_minmax(0,1fr)] rounded-panel border border-line max-lg:grid-cols-1">
      <aside className="min-w-0 border-r border-line bg-sidebar max-lg:border-b max-lg:border-r-0">
        <div className="themed-scrollbar p-3 max-lg:max-h-80 max-lg:overflow-y-auto lg:sticky lg:top-[84px] lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto">
          <div aria-label="Lesson workspace navigation" className="grid min-h-11 grid-cols-2 items-center gap-1 rounded-control border border-line bg-canvas p-1" role="tablist">
            <button
              aria-selected={railView === "lessons"}
              className="min-h-9 rounded-[6px] px-2 text-xs font-semibold text-muted hover:text-copy aria-selected:bg-signal-green-soft aria-selected:text-copy"
              onClick={() => setRailView("lessons")}
              role="tab"
              type="button"
            >
              <BookOpen aria-hidden="true" className="mr-1.5 inline size-3.5" />
              LESSONS
            </button>
            <button
              aria-selected={railView === "outline"}
              className="min-h-9 rounded-[6px] px-2 text-xs font-semibold text-muted hover:text-copy aria-selected:bg-signal-green-soft aria-selected:text-copy disabled:opacity-45"
              disabled={!selectedLesson}
              onClick={() => setRailView("outline")}
              role="tab"
              type="button"
            >
              <ListTree aria-hidden="true" className="mr-1.5 inline size-3.5" />
              OUTLINE
            </button>
          </div>
          <div className="mt-3 grid content-start gap-2">
          {railView === "lessons" ? (
            <>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-orange/60 bg-signal-orange-soft px-4 text-xs font-semibold text-signal-orange hover:border-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                disabled={addingLesson || archived}
                onClick={onAddLesson}
                type="button"
              >
                {addingLesson ? <LoadingButtonContent label="ADDING LESSON..." /> : <><Plus />ADD LESSON</>}
              </button>
              {lessons.map((lesson, index) => (
                <button
                  className={cn(
                    "grid min-h-14 min-w-0 gap-1 rounded-control border border-transparent px-3 text-left",
                    lesson.id === selectedLessonId
                      ? "border-line bg-raised text-copy"
                      : "text-muted hover:bg-raised",
                  )}
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson.id)}
                  type="button"
                >
                  <small className="block font-mono text-signal-orange">{String(index + 1).padStart(2, "0")}</small>
                  <span className="block break-words font-semibold">{String(lesson.draft.title ?? "Untitled lesson")}</span>
                </button>
              ))}
            </>
          ) : (
            <LessonEditorOutline activeId={activeBlockId} blocks={blocks} onSelect={selectBlock} />
          )}
          </div>
        </div>
      </aside>
      {selectedLesson ? (
        <LessonEditor
          activeBlockId={activeBlockId}
          collectionTitle={collectionTitle}
          key={selectedLessonId}
          lesson={selectedLesson}
          onActiveBlockChange={setActiveBlockId}
          onChange={onChange}
          onDelete={onDelete}
          onError={onError}
          onSaved={onSaved}
          topologies={topologies}
        />
      ) : (
        <div className="grid min-h-60 place-items-center content-center gap-3 text-center text-muted [&>p]:m-0 [&>p]:max-w-lg">
          <BookOpen />
          <p>Add a lesson to begin authoring.</p>
        </div>
      )}
    </div>
  );
}
