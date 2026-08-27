import { Plus, Save, Trash2 } from "lucide-react";
import type { WorkshopLessonBlock } from "../../../../shared/workshop-contract";
import * as api from "../../lib/content-api";
import type { WorkshopLessonRow, WorkshopTopologyRow } from "../../lib/content-api";

export function LessonEditor({ lesson, topologies, onChange, onSaved }: { lesson: WorkshopLessonRow; topologies: WorkshopTopologyRow[]; onChange: (row: WorkshopLessonRow) => void; onSaved: () => void }) {
  const draft = lesson.draft as { title?: string; summary?: string; blocks?: WorkshopLessonBlock[] };
  const blocks = draft.blocks ?? [];
  const update = (patch: Record<string, unknown>) => onChange({ ...lesson, draft: { ...lesson.draft, ...patch } });
  const updateBlock = (index: number, patch: Partial<WorkshopLessonBlock>) => update({ blocks: blocks.map((block, current) => current === index ? { ...block, ...patch } : block) });
  const addBlock = (type: WorkshopLessonBlock["type"]) => update({ blocks: [...blocks, { id: crypto.randomUUID(), type, text: "" }] });
  return <div className="grid gap-5 bg-surface p-6 max-sm:p-4">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4"><strong>LESSON CONTENT</strong><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4" onClick={() => void api.saveWorkshopLesson(lesson).then(onSaved)}><Save />SAVE LESSON</button></div>
    <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted"><span>Lesson title</span><input value={draft.title ?? ""} onChange={(event) => update({ title: event.target.value })} /></label>
    <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted"><span>Short description</span><textarea rows={2} value={draft.summary ?? ""} onChange={(event) => update({ summary: event.target.value })} /></label>
    <div className="flex flex-wrap items-center gap-2 border-y border-line py-3 [&>span]:mr-auto [&>span]:text-xs [&>span]:text-muted"><span>Add content</span>{(["heading", "paragraph", "callout", "example", "image", "topology"] as const).map((type) => <button key={type} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4" onClick={() => addBlock(type)}>{type}</button>)}</div>
    <div className="grid gap-3">{blocks.map((block, index) => <section className="grid gap-4 rounded-control border border-line bg-canvas p-4 [&>header]:flex [&>header]:items-center [&>header]:justify-between" key={block.id}>
      <header><strong>{block.type.toUpperCase()}</strong><button className="grid size-11 place-items-center rounded-control border border-line bg-raised text-copy hover:border-muted hover:bg-surface [&_svg]:size-[18px]" aria-label="Remove block" onClick={() => update({ blocks: blocks.filter((_, current) => current !== index) })}><Trash2 /></button></header>
      {block.type === "topology" ? <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted"><span>Lesson topology</span><select value={block.topologyId ?? ""} onChange={(event) => updateBlock(index, { topologyId: event.target.value })}><option value="">Choose a topology</option>{topologies.map((topology) => <option key={topology.stable_id} value={topology.stable_id}>{String(topology.definition.title ?? topology.stable_id)}</option>)}</select></label> : <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted"><span>{block.type === "image" ? "Image address" : "Content"}</span><textarea rows={block.type === "heading" ? 2 : 4} value={block.type === "image" ? block.imageUrl ?? "" : block.text ?? ""} onChange={(event) => updateBlock(index, block.type === "image" ? { imageUrl: event.target.value } : { text: event.target.value })} /></label>}
      {block.type === "image" ? <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted"><span>Alternative text</span><input value={block.altText ?? ""} onChange={(event) => updateBlock(index, { altText: event.target.value })} /></label> : null}
    </section>)}</div>
  </div>;
}


