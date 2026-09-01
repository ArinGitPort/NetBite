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
import * as sourceApi from "@/lib/api/source-service";
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
  ConfirmAction,
  EmptyState as Empty,
  Field,
  PageIntro,
  StatusBadge as Badge,
} from "@/components/ui/admin-primitives";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select";

export function Sources() {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [form, setForm] = useState<Partial<SourceRow>>({
    label: "",
    url: "https://",
    notes: "",
  });
  const [notice, setNotice] = useState("");
  const load = () =>
    Promise.all([sourceApi.getSources(), curriculumApi.getCurriculum()]).then(
      ([nextRows, curriculum]) => {
        setRows(nextRows);
        setLessons(curriculum.lessons.filter(({ archived }) => !archived));
      },
    );
  useEffect(() => {
    void load();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await sourceApi.saveSource(form);
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
      {notice ? (
        <div className="mb-4 rounded-control border border-signal-green/60 bg-signal-green-soft p-3 text-sm text-signal-green">
          {notice}
        </div>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(320px,.7fr)_minmax(0,1.3fr)]">
        <form
          className="grid gap-4 rounded-panel border border-line bg-surface p-5 shadow-panel"
          onSubmit={submit}
        >
          <h2 className="text-lg">{form.id ? "Edit source" : "Add source"}</h2>
          <Field
            label="Related lesson"
            hint="Optional. Assigning a lesson lets the Android app place this reference with the correct material."
          >
            <SelectField
              ariaLabel="Related lesson"
              onValueChange={(lessonId) =>
                setForm({ ...form, lesson_id: lessonId || undefined })
              }
              options={lessons.map((lesson) => ({
                value: lesson.id,
                label: lesson.draft.title,
              }))}
              placeholder="General curriculum source"
              value={form.lesson_id ?? ""}
            />
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
          <Field
            label="Internal note"
            hint="Visible only to administrators. It is never included in learner updates."
          >
            <textarea
              rows={4}
              value={form.notes ?? ""}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </Field>
          <Button tone="primary" type="submit">
            <Save />
            SAVE SOURCE
          </Button>
        </form>
        <section className="rounded-panel border border-line bg-surface p-5 shadow-panel">
          <h2 className="text-lg">Reference library</h2>
          {rows.map((row) => (
            <article
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-4 max-sm:grid-cols-1 [&>div:first-child]:grid [&>div:first-child]:gap-1 [&_a]:break-all [&_a]:font-mono [&_a]:text-xs [&_a]:text-signal-blue [&_p]:m-0 [&_p]:text-sm"
              key={row.id}
            >
              <div>
                <strong>{row.label}</strong>
                <a href={row.url} target="_blank" rel="noreferrer">
                  {row.url}
                </a>
                <p>{row.notes}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  size="compact"
                  tone="ghost"
                  onClick={() => setForm(row)}
                >
                  EDIT
                </Button>
                <ConfirmAction
                  className="grid size-11 place-items-center rounded-control border border-signal-red/60 bg-signal-red-soft text-signal-red hover:border-signal-red [&_svg]:size-[18px]"
                  ariaLabel="Delete source"
                  confirmLabel="DELETE SOURCE"
                  detail="This removes the reference from the draft library. Published curriculum packages remain unchanged."
                  onConfirm={() => sourceApi.deleteSource(row.id).then(load)}
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
