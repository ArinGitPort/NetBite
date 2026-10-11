import { BookmarkPlus, LibraryBig, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { duplicateQuestion } from "@/features/workshops/duplicate-draft";
import type { AssessmentQuestion } from "@/features/workshops/assessment-types";
import { deleteQuestionFromBank, getQuestionBank, saveQuestionToBank, type BankQuestion } from "@/lib/api/workshop-service";

export function QuestionBankPanel({ selected, onInsert }: { selected?: AssessmentQuestion; onInsert: (question: AssessmentQuestion) => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const refresh = async () => {
    setLoading(true);
    try { setRows(await getQuestionBank()); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Question bank could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) void refresh(); }, [open]);
  const save = async () => {
    if (!selected || saving) return;
    setSaving(true); setMessage(undefined);
    try { await saveQuestionToBank(selected); await refresh(); setMessage("Question saved to your private bank."); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Question could not be saved."); }
    finally { setSaving(false); }
  };
  return <section className="border-b border-line bg-raised/45 px-4 py-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button aria-expanded={open} className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-copy hover:text-signal-orange" onClick={() => setOpen((value) => !value)} type="button"><LibraryBig aria-hidden="true" className="size-4" />QUESTION BANK</button>
      {selected ? <Button disabled={saving} onClick={() => void save()} tone="ghost"><BookmarkPlus aria-hidden="true" />{saving ? "SAVING..." : "SAVE SELECTED QUESTION"}</Button> : null}
    </div>
    {message ? <p aria-live="polite" className="m-0 mt-2 text-xs text-muted">{message}</p> : null}
    {open ? <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto" aria-label="Private question bank">
      {loading ? <p className="m-0 text-xs text-muted">Loading saved questions...</p> : null}
      {!loading && !rows.length ? <p className="m-0 text-xs text-muted">No saved questions. Save a completed question to reuse it in another collection.</p> : null}
      {rows.map((row) => <div className="flex items-center justify-between gap-3 rounded-control border border-line bg-canvas px-3 py-2" key={row.id}>
        <div className="min-w-0"><strong className="block truncate text-xs">{row.title}</strong><span className="text-[0.65rem] text-muted">{row.question.choices?.length ?? 0} choices</span></div>
        <div className="flex shrink-0 items-center gap-1"><Button aria-label={`Insert ${row.title}`} onClick={() => { onInsert(duplicateQuestion(row.question)); setMessage("A separate copy was added to this assessment."); }} size="icon" tone="ghost"><Plus aria-hidden="true" /></Button>
          <ConfirmationDialog confirmLabel="DELETE QUESTION" description={`Remove “${row.title}” from your private bank? Existing assessments keep their independent copies.`} intent="destructive" onConfirm={async () => { await deleteQuestionFromBank(row.id); setRows((current) => current.filter((item) => item.id !== row.id)); }} title="Delete saved question?" trigger={<Button aria-label={`Delete ${row.title} from question bank`} size="icon" tone="ghost"><Trash2 aria-hidden="true" /></Button>} />
        </div>
      </div>)}
    </div> : null}
  </section>;
}
