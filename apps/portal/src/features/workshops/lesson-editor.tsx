import {
  ChevronDown,
  ChevronsUpDown,
  Grip,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useUnsavedDraft } from "@/app/providers/unsaved-changes-provider";
import type { WorkshopLessonBlock } from "@netbite/workshops/contracts";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { LoadingButtonContent } from "@/components/ui/loading-content";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SelectField } from "@/components/ui/select";
import * as workshopApi from "@/lib/api/workshop-service";
import type {
  WorkshopLessonRow,
  WorkshopTopologyRow,
} from "@/lib/api/types";
import { LessonMobilePreview } from "@/features/workshops/lesson-mobile-preview";
import { CommandBlockEditor } from "@/features/workshops/command-block-editor";
import { LessonBlockPicker } from "@/features/workshops/lesson-block-picker";
import {
  createLessonBlock,
  getLessonBlockLabel,
  getLessonBlockStatus,
  getLessonBlockSummary,
  lessonBlockFieldCopy,
} from "@/features/workshops/lesson-block-definitions";
import { LessonDetails } from "@/features/workshops/lesson-details";
import { cn } from "@/lib/class-names";

export function LessonEditor({
  activeBlockId,
  collectionTitle,
  lesson,
  topologies,
  onActiveBlockChange,
  onChange,
  onDelete,
  onError,
  onSaved,
}: {
  activeBlockId?: string;
  collectionTitle: string;
  lesson: WorkshopLessonRow;
  topologies: WorkshopTopologyRow[];
  onActiveBlockChange: (id?: string) => void;
  onChange: (row: WorkshopLessonRow) => void;
  onDelete: (row: WorkshopLessonRow) => Promise<void>;
  onError: (message: string) => void;
  onSaved: () => void;
}) {
  const draft = lesson.draft as {
    title?: string;
    summary?: string;
    blocks?: WorkshopLessonBlock[];
  };
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [pendingAction, setPendingAction] = useState<"save" | "delete">();
  const [savedLesson, setSavedLesson] = useState(lesson);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number>();
  const [dropTargetIndex, setDropTargetIndex] = useState<number>();
  const [expandedAll, setExpandedAll] = useState(false);
  const [removedBlock, setRemovedBlock] = useState<{
    block: WorkshopLessonBlock;
    index: number;
  }>();
  const blocks = draft.blocks ?? [];
  const dirty = JSON.stringify(lesson) !== JSON.stringify(savedLesson);
  const update = (patch: Record<string, unknown>) =>
    onChange({ ...lesson, draft: { ...lesson.draft, ...patch } });
  const updateBlock = (index: number, patch: Partial<WorkshopLessonBlock>) =>
    update({
      blocks: blocks.map((block, current) =>
        current === index ? { ...block, ...patch } : block,
      ),
    });
  const moveBlock = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= blocks.length ||
      toIndex >= blocks.length
    )
      return;
    const reordered = [...blocks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    update({ blocks: reordered });
  };
  const addBlock = (
    type: WorkshopLessonBlock["type"],
    afterIndex = blocks.length - 1,
  ) => {
    const block = createLessonBlock(type);
    const nextBlocks = [...blocks];
    nextBlocks.splice(Math.max(0, afterIndex + 1), 0, block);
    update({ blocks: nextBlocks });
    setRemovedBlock(undefined);
    setExpandedAll(false);
    onActiveBlockChange(block.id);
    requestAnimationFrame(() =>
      document
        .getElementById(`lesson-block-${block.id}`)
        ?.scrollIntoView?.({ behavior: "smooth", block: "center" }),
    );
  };
  const removeBlock = (index: number) => {
    const block = blocks[index];
    if (!block) return;
    const nextBlocks = blocks.filter((_, current) => current !== index);
    setRemovedBlock({ block, index });
    update({ blocks: nextBlocks });
    if (activeBlockId === block.id) {
      onActiveBlockChange(nextBlocks[index]?.id ?? nextBlocks[index - 1]?.id);
    }
  };
  const undoRemove = () => {
    if (!removedBlock) return;
    const nextBlocks = [...blocks];
    nextBlocks.splice(Math.min(removedBlock.index, nextBlocks.length), 0, removedBlock.block);
    update({ blocks: nextBlocks });
    onActiveBlockChange(removedBlock.block.id);
    setRemovedBlock(undefined);
  };
  const save = async () => {
    if (pendingAction || !dirty) return true;
    setPendingAction("save");
    try {
      await workshopApi.saveWorkshopLesson(lesson);
      setSavedLesson(lesson);
      onSaved();
      return true;
    } catch (reason) {
      onError(
        reason instanceof Error
          ? reason.message
          : "The lesson could not be saved.",
      );
      return false;
    } finally {
      setPendingAction(undefined);
    }
  };
  useUnsavedDraft(`workshop-lesson:${lesson.id}`, {
    dirty,
    save,
    discard: () => onChange(savedLesson),
  });
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
        return;
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });
  const remove = async () => {
    if (pendingAction) return;
    setPendingAction("delete");
    try {
      await onDelete(lesson);
    } catch (reason) {
      const error = reason instanceof Error ? reason : new Error("The lesson could not be deleted.");
      onError(error.message);
      throw error;
    } finally {
      setPendingAction(undefined);
    }
  };
  return (
    <div className="grid gap-4 bg-surface p-5 text-[0.8rem] max-sm:p-4">
      <div className="sticky top-[68px] z-20 -mx-5 -mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/95 px-5 py-4 shadow-[0_10px_24px_rgb(0_0_0/8%)] backdrop-blur-xl max-sm:-mx-4 max-sm:-mt-4 max-sm:px-4">
        <div className="grid gap-1">
          <strong>LESSON CONTENT</strong>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={dirty ? "text-xs text-signal-orange" : "text-xs text-muted"} role="status">
              {dirty ? "UNSAVED CHANGES" : "ALL CHANGES SAVED"}
            </span>
            <small className="font-mono text-[0.6rem] text-muted">
              {blocks.length} BLOCK{blocks.length === 1 ? "" : "S"}
            </small>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view === "edit" && blocks.length ? (
            <Button
              onClick={() => {
                if (expandedAll) onActiveBlockChange(undefined);
                setExpandedAll((current) => !current);
              }}
              size="compact"
              tone="ghost"
            >
              <ChevronsUpDown />
              {expandedAll ? "COLLAPSE ALL" : "EXPAND ALL"}
            </Button>
          ) : null}
          <Tabs
            value={view}
            onValueChange={(value) => setView(value as "edit" | "preview")}
          >
            <TabsList aria-label="Lesson editor view">
              <TabsTrigger value="edit" onClick={() => setView("edit")}>
                EDIT
              </TabsTrigger>
              <TabsTrigger value="preview" onClick={() => setView("preview")}>
                PREVIEW
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            disabled={Boolean(pendingAction) || !dirty}
            onClick={() => void save()}
            tone="primary"
            title="Save lesson (Ctrl+S)"
          >
            {pendingAction === "save" ? <LoadingButtonContent label="SAVING..." /> : <><Save />SAVE LESSON</>}
          </Button>
          <ConfirmationDialog
            confirmLabel="DELETE LESSON"
            description={`This permanently removes “${draft.title || "Untitled lesson"}” from the current draft. Existing published versions are not changed.`}
            busyLabel="DELETING..."
            intent="destructive"
            onConfirm={remove}
            title="Delete this lesson?"
            trigger={
              <Button disabled={Boolean(pendingAction) || dirty} tone="destructive">
                {pendingAction === "delete" ? <LoadingButtonContent label="DELETING..." /> : <><Trash2 />DELETE LESSON</>}
              </Button>
            }
          />
        </div>
      </div>
      {view === "preview" ? (
        <LessonMobilePreview
          blocks={blocks}
          collectionTitle={collectionTitle}
          summary={draft.summary ?? ""}
          title={draft.title ?? ""}
          topologies={topologies}
        />
      ) : (
        <>
          <LessonDetails
            onChange={update}
            summary={draft.summary ?? ""}
            title={draft.title ?? ""}
          />
          <LessonBlockPicker
            onAdd={(type) => addBlock(type, activeBlockId ? blocks.findIndex((block) => block.id === activeBlockId) : blocks.length - 1)}
          />
          <div className="grid gap-3">
            {blocks.map((block, index) => {
              const expanded = expandedAll || activeBlockId === block.id;
              const status = getLessonBlockStatus(block);
              return (
                <section
                  aria-label={`${block.type} content block ${index + 1} of ${blocks.length}`}
                  className={cn(
                    "scroll-mt-40 rounded-control border bg-canvas transition-[border-color,opacity,box-shadow]",
                    expanded ? "border-line shadow-[0_8px_24px_rgb(0_0_0/6%)]" : "border-line/75",
                    dropTargetIndex === index && draggedBlockIndex !== index &&
                      "border-signal-orange shadow-[inset_0_3px_0_rgba(222,126,67,0.9)]",
                    draggedBlockIndex === index && "opacity-55",
                  )}
                  id={`lesson-block-${block.id}`}
                  key={block.id}
                  onDragOver={(event) => {
                    if (draggedBlockIndex === undefined) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropTargetIndex(index);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedBlockIndex !== undefined) moveBlock(draggedBlockIndex, index);
                    setDraggedBlockIndex(undefined);
                    setDropTargetIndex(undefined);
                  }}
                >
                  <header className="flex min-h-[66px] items-stretch">
                    <button
                      aria-expanded={expanded}
                      className="grid min-w-0 flex-1 grid-cols-[34px_minmax(0,1fr)_auto_18px] items-center gap-3 rounded-l-control px-3 py-2 text-left hover:bg-raised/55 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal-orange"
                      onClick={() => {
                        if (expandedAll) {
                          setExpandedAll(false);
                          onActiveBlockChange(block.id);
                        } else {
                          onActiveBlockChange(expanded ? undefined : block.id);
                        }
                      }}
                      type="button"
                    >
                      <span className="font-mono text-[0.65rem] text-signal-orange">{String(index + 1).padStart(2, "0")}</span>
                      <span className="grid min-w-0 gap-1">
                        <strong className="text-xs">{block.type.toUpperCase()}</strong>
                        <small className="truncate text-[0.65rem] text-muted">{getLessonBlockSummary(block)}</small>
                      </span>
                      <small className={cn("hidden font-mono text-[0.56rem] sm:block", status.complete ? "text-signal-green" : "text-signal-orange")}>
                        {status.label}
                      </small>
                      <ChevronDown className={cn("size-4 text-muted transition-transform", expanded && "rotate-180")} />
                    </button>
                    <div className="flex shrink-0 items-center gap-1 border-l border-line px-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            aria-label={`Reorder ${block.type} block, position ${index + 1} of ${blocks.length}`}
                            className="grid size-10 cursor-grab place-items-center rounded-control text-muted hover:bg-raised hover:text-copy active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange [&_svg]:size-[18px]"
                            draggable
                            onDragEnd={() => {
                              setDraggedBlockIndex(undefined);
                              setDropTargetIndex(undefined);
                            }}
                            onDragStart={(event) => {
                              setDraggedBlockIndex(index);
                              setDropTargetIndex(index);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", block.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "ArrowUp" && index > 0) {
                                event.preventDefault();
                                moveBlock(index, index - 1);
                              }
                              if (event.key === "ArrowDown" && index < blocks.length - 1) {
                                event.preventDefault();
                                moveBlock(index, index + 1);
                              }
                            }}
                            type="button"
                          >
                            <Grip aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Drag to reorder. Use Up or Down Arrow for keyboard reordering.</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            aria-label={`Remove ${block.type} block`}
                            className="grid size-10 place-items-center rounded-control text-muted hover:bg-signal-red-soft hover:text-signal-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange [&_svg]:size-[17px]"
                            onClick={() => removeBlock(index)}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Remove this content block</TooltipContent>
                      </Tooltip>
                    </div>
                  </header>
                  {expanded ? (
                    <div className="grid gap-4 border-t border-line p-4">
                      {block.type === "commands" ? (
                        <CommandBlockEditor block={block} onChange={(patch) => updateBlock(index, patch)} topologies={topologies} />
                      ) : block.type === "topology" ? (
                        <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
                          <span>Lesson topology</span>
                          <SelectField
                            ariaLabel="Lesson topology"
                            onValueChange={(topologyId) => updateBlock(index, { topologyId })}
                            options={topologies.map((topology) => ({
                              value: topology.stable_id,
                              label: String(topology.definition.title ?? topology.stable_id),
                            }))}
                            placeholder="Choose a topology"
                            value={block.topologyId ?? ""}
                          />
                        </label>
                      ) : (
                        <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
                          <span>{lessonBlockFieldCopy[block.type].label}</span>
                          <textarea
                            placeholder={lessonBlockFieldCopy[block.type].placeholder}
                            rows={block.type === "heading" ? 2 : 4}
                            value={block.type === "image" ? (block.imageUrl ?? "") : (block.text ?? "")}
                            onChange={(event) =>
                              updateBlock(
                                index,
                                block.type === "image"
                                  ? { imageUrl: event.target.value }
                                  : { text: event.target.value },
                              )
                            }
                          />
                        </label>
                      )}
                      {block.type === "image" ? (
                        <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
                          <span>Alternative text</span>
                          <input
                            placeholder="Describe what the image shows for students using a screen reader."
                            value={block.altText ?? ""}
                            onChange={(event) => updateBlock(index, { altText: event.target.value })}
                          />
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              );
            })}
            {removedBlock ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-signal-orange/45 bg-signal-orange-soft px-4 py-3" role="status">
                <span className="text-xs">{getLessonBlockLabel(removedBlock.block.type)} removed.</span>
                <Button onClick={undoRemove} size="compact" tone="ghost">
                  <Undo2 />
                  UNDO
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
