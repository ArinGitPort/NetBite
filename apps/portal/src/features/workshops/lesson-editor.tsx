import {
  AlignLeft,
  Grip,
  Heading1,
  Image as ImageIcon,
  Lightbulb,
  MessageSquareText,
  Network,
  Save,
  TerminalSquare,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { WorkshopLessonBlock } from "@netbite/workshops/contracts";
import { Button } from "../../components/ui/button";
import { ConfirmationDialog } from "../../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import * as api from "../../lib/content-api";
import type {
  WorkshopLessonRow,
  WorkshopTopologyRow,
} from "../../lib/content-api";
import { LessonMobilePreview } from "./lesson-mobile-preview";
import { CommandBlockEditor } from "./command-block-editor";

const blockOptions: Array<{
  type: WorkshopLessonBlock["type"];
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    type: "heading",
    label: "Section title",
    description: "Start a new lesson section",
    icon: Heading1,
  },
  {
    type: "paragraph",
    label: "Body text",
    description: "Explain a concept in detail",
    icon: AlignLeft,
  },
  {
    type: "callout",
    label: "Important note",
    description: "Emphasize a rule or warning",
    icon: MessageSquareText,
  },
  {
    type: "example",
    label: "Worked example",
    description: "Show how to apply the concept",
    icon: Lightbulb,
  },
  {
    type: "image",
    label: "Supporting image",
    description: "Add an accessible visual",
    icon: ImageIcon,
  },
  {
    type: "topology",
    label: "Network diagram",
    description: "Insert a saved topology",
    icon: Network,
  },
  {
    type: "commands",
    label: "Configuration commands",
    description: "Add read-only commands by device",
    icon: TerminalSquare,
  },
];

const blockFieldCopy: Record<
  Exclude<WorkshopLessonBlock["type"], "topology" | "commands">,
  { label: string; placeholder: string }
> = {
  heading: {
    label: "Section title",
    placeholder: "Example: How a router chooses the next hop",
  },
  paragraph: {
    label: "Body text",
    placeholder: "Explain the concept in clear, complete sentences.",
  },
  callout: {
    label: "Important note",
    placeholder: "State the rule or warning students should remember.",
  },
  example: {
    label: "Worked example",
    placeholder: "Walk through an example using all supplied values.",
  },
  image: {
    label: "Image address",
    placeholder: "https://example.com/network-diagram.png",
  },
};

export function LessonEditor({
  collectionTitle,
  lesson,
  topologies,
  onChange,
  onDelete,
  onError,
  onSaved,
}: {
  collectionTitle: string;
  lesson: WorkshopLessonRow;
  topologies: WorkshopTopologyRow[];
  onChange: (row: WorkshopLessonRow) => void;
  onDelete: (row: WorkshopLessonRow) => Promise<void>;
  onError: (message: string) => void;
  onSaved: () => void;
}) {
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [pendingAction, setPendingAction] = useState<"save" | "delete">();
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number>();
  const [dropTargetIndex, setDropTargetIndex] = useState<number>();
  const draft = lesson.draft as {
    title?: string;
    summary?: string;
    blocks?: WorkshopLessonBlock[];
  };
  const blocks = draft.blocks ?? [];
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
  const addBlock = (type: WorkshopLessonBlock["type"]) =>
    update({
      blocks: [
        ...blocks,
        {
          id: crypto.randomUUID(),
          type,
          text: "",
          ...(type === "commands"
            ? { title: "Configuration commands", commandGroups: [] }
            : {}),
        },
      ],
    });
  const save = async () => {
    if (pendingAction) return;
    setPendingAction("save");
    try {
      await api.saveWorkshopLesson(lesson);
      onSaved();
    } catch (reason) {
      onError(
        reason instanceof Error
          ? reason.message
          : "The lesson could not be saved.",
      );
    } finally {
      setPendingAction(undefined);
    }
  };
  const remove = async () => {
    if (pendingAction) return;
    setPendingAction("delete");
    try {
      await onDelete(lesson);
    } catch (reason) {
      onError(
        reason instanceof Error
          ? reason.message
          : "The lesson could not be deleted.",
      );
      setPendingAction(undefined);
    }
  };
  return (
    <div className="grid gap-4 bg-surface p-5 text-[0.8rem] max-sm:p-4">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <strong>LESSON CONTENT</strong>
        <div className="flex flex-wrap items-center gap-2">
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
            disabled={Boolean(pendingAction)}
            onClick={() => void save()}
            tone="primary"
          >
            <Save />
            {pendingAction === "save" ? "SAVING..." : "SAVE LESSON"}
          </Button>
          <ConfirmationDialog
            confirmLabel="DELETE LESSON"
            description={`This permanently removes “${draft.title || "Untitled lesson"}” from the current draft. Existing published versions are not changed.`}
            destructive
            onConfirm={remove}
            title="Delete this lesson?"
            trigger={
              <Button disabled={Boolean(pendingAction)} tone="destructive">
                <Trash2 />
                {pendingAction === "delete" ? "DELETING..." : "DELETE LESSON"}
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
          <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
            <span>Lesson title</span>
            <input
              value={draft.title ?? ""}
              onChange={(event) => update({ title: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
            <span>Short description</span>
            <textarea
              rows={2}
              value={draft.summary ?? ""}
              onChange={(event) => update({ summary: event.target.value })}
            />
          </label>
          <section
            className="grid gap-3 border-y border-line py-4"
            aria-labelledby="add-content-block"
          >
            <div className="grid gap-1">
              <strong className="text-xs" id="add-content-block">
                ADD A CONTENT BLOCK
              </strong>
              <span className="text-xs leading-5 text-muted">
                Choose what you want to place next in this lesson.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {blockOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.type}
                    className="grid min-h-[68px] grid-cols-[34px_minmax(0,1fr)] items-center gap-2 rounded-control border border-line bg-canvas px-3 py-2 text-left transition-colors hover:border-signal-orange/60 hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange"
                    onClick={() => addBlock(option.type)}
                    type="button"
                  >
                    <span className="grid size-[34px] place-items-center rounded-control bg-raised text-signal-orange [&_svg]:size-4">
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <strong className="text-xs text-copy">
                        {option.label}
                      </strong>
                      <small className="text-[0.65rem] leading-4 text-muted">
                        {option.description}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          <div className="grid gap-3">
            {blocks.map((block, index) => (
              <section
                aria-label={`${block.type} content block ${index + 1} of ${blocks.length}`}
                className={`grid gap-4 rounded-control border bg-canvas p-4 transition-[border-color,opacity,box-shadow] [&>header]:flex [&>header]:items-center [&>header]:justify-between ${
                  dropTargetIndex === index && draggedBlockIndex !== index
                    ? "border-signal-orange shadow-[inset_0_3px_0_rgba(222,126,67,0.9)]"
                    : "border-line"
                } ${draggedBlockIndex === index ? "opacity-55" : "opacity-100"}`}
                key={block.id}
                onDragOver={(event) => {
                  if (draggedBlockIndex === undefined) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTargetIndex(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedBlockIndex !== undefined)
                    moveBlock(draggedBlockIndex, index);
                  setDraggedBlockIndex(undefined);
                  setDropTargetIndex(undefined);
                }}
              >
                <header>
                  <strong>{block.type.toUpperCase()}</strong>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          aria-label={`Reorder ${block.type} block, position ${index + 1} of ${blocks.length}`}
                          className="grid size-11 cursor-grab place-items-center rounded-control border border-line bg-transparent text-muted hover:border-muted hover:bg-raised hover:text-copy active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange [&_svg]:size-[19px]"
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
                            if (
                              event.key === "ArrowDown" &&
                              index < blocks.length - 1
                            ) {
                              event.preventDefault();
                              moveBlock(index, index + 1);
                            }
                          }}
                          type="button"
                        >
                          <Grip aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Drag to reorder. Use Up or Down Arrow for keyboard reordering.
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="grid size-11 place-items-center rounded-control border border-line bg-raised text-copy hover:border-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange [&_svg]:size-[18px]"
                          aria-label={`Remove ${block.type} block`}
                          onClick={() =>
                            update({
                              blocks: blocks.filter(
                                (_, current) => current !== index,
                              ),
                            })
                          }
                          type="button"
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Remove this content block</TooltipContent>
                    </Tooltip>
                  </div>
                </header>
                {block.type === "commands" ? (
                  <CommandBlockEditor
                    block={block}
                    onChange={(patch) => updateBlock(index, patch)}
                    topologies={topologies}
                  />
                ) : block.type === "topology" ? (
                  <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
                    <span>Lesson topology</span>
                    <select
                      value={block.topologyId ?? ""}
                      onChange={(event) =>
                        updateBlock(index, { topologyId: event.target.value })
                      }
                    >
                      <option value="">Choose a topology</option>
                      {topologies.map((topology) => (
                        <option
                          key={topology.stable_id}
                          value={topology.stable_id}
                        >
                          {String(
                            topology.definition.title ?? topology.stable_id,
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
                    <span>{blockFieldCopy[block.type].label}</span>
                    <textarea
                      placeholder={blockFieldCopy[block.type].placeholder}
                      rows={block.type === "heading" ? 2 : 4}
                      value={
                        block.type === "image"
                          ? (block.imageUrl ?? "")
                          : (block.text ?? "")
                      }
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
                  <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
                    <span>Alternative text</span>
                    <input
                      placeholder="Describe what the image shows for students using a screen reader."
                      value={block.altText ?? ""}
                      onChange={(event) =>
                        updateBlock(index, { altText: event.target.value })
                      }
                    />
                  </label>
                ) : null}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
