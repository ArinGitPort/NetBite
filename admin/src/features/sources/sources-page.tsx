import { Archive, ArrowDown, ArrowLeft, ArrowUp, BookOpen, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, FileClock, FileText, Image, Plus, RefreshCw, Rocket, Save, Search, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import * as api from "../../lib/content-api";
import type { AssetRow, ChapterRow, FlashcardRow, LessonRow, QuizRow, ReleaseRow, SafeAuditEntry, SourceRow } from "../../lib/content-api";
import { ConfirmAction, EmptyState as Empty, Field, PageIntro, StatusBadge as Badge } from "../../components/ui/admin-primitives";

export function Sources() {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [form, setForm] = useState<Partial<SourceRow>>({
    label: "",
    url: "https://",
    notes: "",
  });
  const [notice, setNotice] = useState("");
  const load = () => Promise.all([api.getSources(), api.getCurriculum()]).then(([nextRows, curriculum]) => { setRows(nextRows); setLessons(curriculum.lessons.filter(({ archived }) => !archived)); });
  useEffect(() => {
    void load();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.saveSource(form);
      setForm({ label: "", url: "https://", notes: "" });
      setNotice("Source saved.");
      await load();
    } catch (error) {
      setNotice((error as Error).message);
    }
  };
  return (
    <>
      <PageIntro
        eyebrow="SOURCE REFERENCES"
        title="Source references"
        detail="Record the primary RFC, IEEE/IANA, or official vendor material supporting authored claims."
      />
      {notice ? <div className="mb-4 rounded-control border border-signal-green/60 bg-signal-green-soft p-3 text-sm text-[#abd2c8]">{notice}</div> : null}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(320px,.7fr)_minmax(0,1.3fr)]">
        <form className="grid gap-4 rounded-panel border border-line bg-surface p-6 shadow-panel" onSubmit={submit}>
          <h2>{form.id ? "Edit source" : "Add source"}</h2>
          <Field label="Related lesson" hint="Optional. Assigning a lesson lets the Android app place this reference with the correct material.">
            <select value={form.lesson_id ?? ""} onChange={(event) => setForm({ ...form, lesson_id: event.target.value || undefined })}>
              <option value="">General curriculum source</option>
              {lessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{lesson.draft.title}</option>)}
            </select>
          </Field>
          <Field label="Source label">
            <input
              required
              value={form.label ?? ""}
              onChange={(event) =>
                setForm({ ...form, label: event.target.value })
              }
            />
          </Field>
          <Field label="HTTPS URL">
            <input
              required
              type="url"
              value={form.url ?? ""}
              onChange={(event) =>
                setForm({ ...form, url: event.target.value })
              }
            />
          </Field>
          <Field label="Internal note" hint="Visible only to administrators. It is never included in learner updates.">
            <textarea
              rows={4}
              value={form.notes ?? ""}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </Field>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4">
            <Save />
            SAVE SOURCE
          </button>
        </form>
        <section className="rounded-panel border border-line bg-surface p-6 shadow-panel">
          <h2>Reference library</h2>
          {rows.map((row) => (
            <article className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-4 max-sm:grid-cols-1 [&>div:first-child]:grid [&>div:first-child]:gap-1 [&_a]:break-all [&_a]:font-mono [&_a]:text-xs [&_a]:text-[#8eb8da] [&_p]:m-0 [&_p]:text-sm" key={row.id}>
              <div>
                <strong>{row.label}</strong>
                <a href={row.url} target="_blank" rel="noreferrer">
                  {row.url}
                </a>
                <p>{row.notes}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                  onClick={() => setForm(row)}
                >
                  EDIT
                </button>
                <ConfirmAction
                  className="grid size-11 place-items-center rounded-control border border-signal-red/60 bg-signal-red-soft text-[#ff858a] hover:border-signal-red [&_svg]:size-[18px]"
                  ariaLabel="Delete source"
                  confirmLabel="DELETE SOURCE"
                  detail="This removes the reference from the draft library. Published curriculum packages remain unchanged."
                  onConfirm={() => api.deleteSource(row.id).then(load)}
                  title="Delete this source?"
                >
                  <X />
                </ConfirmAction>
              </div>
            </article>
          ))}
          {!rows.length ? (
            <Empty
              title="No source records"
              detail="Add the official references used to verify a lesson."
            />
          ) : null}
        </section>
      </div>
    </>
  );
}

