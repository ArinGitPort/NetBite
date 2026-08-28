import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import * as api from "../../lib/content-api";
import type { LessonRow } from "../../lib/content-api";
import {
  ConfirmAction,
  DialogFrame,
  Field,
  StatusBadge as Badge,
} from "../../components/ui/admin-primitives";

export function LessonEditor({
  row,
  onChange,
  onMove,
  onSaved,
}: {
  row: LessonRow;
  onChange: (row: LessonRow) => void;
  onMove: (direction: -1 | 1) => void;
  onSaved: (message: string) => void;
}) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const draft = row.draft;
  const change = (patch: Partial<typeof draft>) =>
    onChange({ ...row, draft: { ...draft, ...patch } });
  const save = async () => {
    setBusy(true);
    try {
      await api.saveLesson(row);
      onSaved(
        "Lesson draft saved. It is not visible to learners until publication.",
      );
    } catch (error) {
      onSaved((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const archive = async () => {
    setBusy(true);
    try {
      await api.setLessonArchived(row.id, !row.archived);
      onSaved(row.archived ? "Lesson restored." : "Lesson archived.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="mb-5 flex justify-between gap-5 border-b border-line pb-5 max-lg:flex-col">
        <div>
          <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
            {row.requirement.toUpperCase()} LESSON
          </p>
          <h2>{draft.title}</h2>
          <small className="font-mono">{row.id}</small>
        </div>
        <div className="inline-flex min-h-11 rounded-control border border-line bg-canvas p-1 [&>button]:min-w-24 [&>button]:rounded-[6px] [&>button]:border-0 [&>button]:px-3 [&>button]:text-xs [&>button]:font-semibold [&>button]:text-muted">
          <button
            className={tab === "edit" ? "bg-signal-green-soft! text-copy!" : ""}
            onClick={() => setTab("edit")}
            type="button"
          >
            EDIT
          </button>
          <button
            className={
              tab === "preview" ? "bg-signal-green-soft! text-copy!" : ""
            }
            onClick={() => setTab("preview")}
            type="button"
          >
            PREVIEW
          </button>
        </div>
      </div>
      {tab === "preview" ? (
        <MobilePreview row={row} />
      ) : (
        <div className="grid gap-4">
          <Field label="Lesson title">
            <input
              value={draft.title}
              onChange={(event) => change({ title: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Section label">
              <input
                value={draft.eyebrow}
                onChange={(event) => change({ eyebrow: event.target.value })}
              />
            </Field>
            <Field
              label="Lesson visual"
              hint="Must already exist in the Android application."
            >
              <input
                value={draft.illustration}
                onChange={(event) =>
                  change({ illustration: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Plain-English explanation">
            <textarea
              rows={7}
              value={draft.body}
              onChange={(event) => change({ body: event.target.value })}
            />
          </Field>
          <div className="rounded-control border border-line bg-canvas p-4">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 [&_h2]:m-0 [&_h3]:m-0 [&_p]:mb-0">
              <div>
                <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
                  STRUCTURED EXPLANATION
                </p>
                <h3>Lesson sections</h3>
              </div>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                onClick={() =>
                  change({
                    sections: [
                      ...(draft.sections ?? []),
                      { heading: "", body: "" },
                    ],
                  })
                }
              >
                <Plus />
                ADD SECTION
              </button>
            </div>
            {(draft.sections ?? []).map((section, index) => (
              <div
                className="relative mt-3 grid grid-cols-[1fr_2fr_44px] items-start gap-2 max-sm:grid-cols-1"
                key={`${row.id}-${index}`}
              >
                <input
                  aria-label={`Section ${index + 1} heading`}
                  placeholder="Section heading"
                  value={section.heading}
                  onChange={(event) =>
                    change({
                      sections: draft.sections?.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, heading: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
                <textarea
                  aria-label={`Section ${index + 1} body`}
                  placeholder="Explain this part in simple English."
                  rows={3}
                  value={section.body}
                  onChange={(event) =>
                    change({
                      sections: draft.sections?.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, body: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
                <button
                  className="grid size-11 place-items-center rounded-control border border-signal-red/60 bg-signal-red-soft text-[#ff858a] hover:border-signal-red [&_svg]:size-[18px]"
                  aria-label={`Remove section ${index + 1}`}
                  onClick={() =>
                    change({
                      sections: draft.sections?.filter(
                        (_item, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
          <Field label="Takeaway">
            <textarea
              rows={3}
              value={draft.takeaway}
              onChange={(event) => change({ takeaway: event.target.value })}
            />
          </Field>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
              disabled={busy}
              onClick={() => void save()}
            >
              <Save />
              {busy ? "SAVING..." : "SAVE DRAFT"}
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                disabled={busy || row.archived}
                onClick={() => void onMove(-1)}
              >
                <ArrowUp /> MOVE EARLIER
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                disabled={busy || row.archived}
                onClick={() => void onMove(1)}
              >
                <ArrowDown /> MOVE LATER
              </button>
            </div>
            <ConfirmAction
              ariaLabel={row.archived ? "Restore lesson" : "Archive lesson"}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-red/60 bg-transparent px-4 text-xs font-semibold text-[#ff858a] hover:bg-signal-red-soft disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
              confirmLabel={row.archived ? "RESTORE LESSON" : "ARCHIVE LESSON"}
              detail={
                row.archived
                  ? "The draft will return to the active lesson list. Existing published versions are unchanged."
                  : "The draft will leave the active lesson list. Existing published versions remain unchanged."
              }
              disabled={busy}
              eyebrow={row.archived ? "RESTORE DRAFT" : "ARCHIVE DRAFT"}
              onConfirm={archive}
              title={`${row.archived ? "Restore" : "Archive"} ${draft.title}?`}
              tone="warning"
            >
              <Archive />
              {row.archived ? "RESTORE LESSON" : "ARCHIVE LESSON"}
            </ConfirmAction>
          </div>
        </div>
      )}
    </>
  );
}
function MobilePreview({ row }: { row: LessonRow }) {
  return (
    <div
      className="themed-scrollbar flex min-h-[650px] w-full justify-center overflow-auto rounded-control border border-line bg-canvas/70 p-4 sm:p-5"
      data-testid="mobile-lesson-preview"
    >
      <div className="h-[640px] w-full max-w-[390px] shrink-0 overflow-y-auto rounded-[34px] border-[8px] border-[#29252a] bg-sidebar bg-[image:var(--nb-grid)] bg-[size:24px_24px] shadow-[0_24px_55px_rgb(0_0_0/50%)]">
        <div className="flex h-14 items-center gap-3 border-b border-line px-4 text-xs text-signal-red [&_svg]:size-4 [&_span]:ml-auto [&_span]:text-muted">
          <ArrowLeft />
          CLOSE <span>1 / 1</span>
        </div>
        <div className="p-5 [&_h2]:text-lg [&_h2]:leading-7 [&_p]:text-sm [&_section]:border-t [&_section]:border-line [&_section]:py-4 [&_section_h3]:text-signal-orange">
          <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
            {row.draft.eyebrow}
          </p>
          <h2>{row.draft.title.toUpperCase()}</h2>
          {row.requirement === "supplemental" ? (
            <Badge tone="orange">NEW / SUPPLEMENTAL</Badge>
          ) : null}
          <p>{row.draft.body}</p>
          {row.draft.sections?.map((section) => (
            <section key={section.heading}>
              <h3>{section.heading}</h3>
              <p>{section.body}</p>
            </section>
          ))}
          <div className="border-l-[3px] border-signal-green bg-signal-green-soft p-4 [&_strong]:text-[#9bc7bc]">
            <strong>REMEMBER THIS</strong>
            <p>{row.draft.takeaway}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
