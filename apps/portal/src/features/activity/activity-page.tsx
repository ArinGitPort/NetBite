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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as activityApi from "@/lib/api/activity-service";
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

export function Audit() {
  const [rows, setRows] = useState<SafeAuditEntry[]>([]);
  useEffect(() => {
    void activityApi.getSanitizedAuditHistory().then(setRows);
  }, []);
  return (
    <>
      <PageIntro
        eyebrow="ACCOUNTABILITY"
        title="Activity history"
        detail="Review important curriculum changes and publishing activity. History cannot be edited from this portal."
      />
      <section className="rounded-panel border border-line bg-surface p-5 shadow-panel">
        <div className="grid [&>article]:grid [&>article]:grid-cols-[44px_minmax(0,1fr)] [&>article]:gap-4 [&>article]:border-t [&>article]:border-line [&>article]:py-4 [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-sm [&_small]:text-muted">
          {rows.map((row) => (
            <article key={row.id}>
              <div className="grid size-10 place-items-center rounded-control border border-signal-green text-signal-green [&_svg]:size-4">
                <Sparkles />
              </div>
              <div>
                <strong>
                  {row.actionLabel} · {row.contentLabel}
                </strong>
                <p>{row.summary}</p>
                <small>
                  {row.administratorName} ·{" "}
                  {new Date(row.occurredAt).toLocaleString()}
                </small>
              </div>
            </article>
          ))}
        </div>
        {!rows.length ? (
          <Empty
            title="No activity recorded"
            detail="Curriculum changes and published versions will appear here."
          />
        ) : null}
      </section>
    </>
  );
}
