import { Archive, ArrowDown, ArrowLeft, ArrowUp, BookOpen, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, FileClock, FileText, Image, Plus, RefreshCw, Rocket, Save, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import * as api from "../../lib/content-api";
import type { AssetRow, ChapterRow, FlashcardRow, LessonRow, QuizRow, ReleaseRow, SafeAuditEntry, SourceRow } from "../../lib/content-api";
import { ConfirmAction, EmptyState as Empty, Field, PageIntro, StatusBadge as Badge } from "../../components/ui/admin-primitives";

export function Releases() {
  const [rows, setRows] = useState<ReleaseRow[]>([]);
  const [validation, setValidation] =
    useState<Awaited<ReturnType<typeof api.validateRelease>>>();
  const [changelog, setChangelog] = useState("");
  const [minimum, setMinimum] = useState("1.0.0");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const publishRequestIds = useRef(new Map<string, string>());
  const restoreRequestIds = useRef(new Map<string, string>());
  const load = () => api.getReleases().then(setRows);
  useEffect(() => {
    void load();
  }, []);
  const validate = async () => {
    setBusy(true);
    try {
      const result = await api.validateRelease();
      setValidation(result);
      setNotice(
        result.valid
          ? "The draft is ready to publish."
          : `${result.issues.length} ${result.issues.length === 1 ? "issue must" : "issues must"} be corrected.`,
      );
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    if (!validation?.valid) return;
    const requestKey = `${minimum.trim()}\u0000${changelog.trim()}`;
    const operationId = publishRequestIds.current.get(requestKey) ?? crypto.randomUUID();
    publishRequestIds.current.set(requestKey, operationId);
    setBusy(true);
    try {
      const result = await api.publishRelease(changelog, minimum, operationId);
      publishRequestIds.current.delete(requestKey);
      setNotice(`Version ${result.releaseVersion} published.`);
      setChangelog("");
      setValidation(undefined);
      await load();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageIntro
        eyebrow="PUBLISHING"
        title="Validate and publish"
        detail="Learners receive only complete published versions. Saving a draft never changes the Android curriculum."
      />
      {notice ? <div className="mb-4 rounded-control border border-signal-green/60 bg-signal-green-soft p-3 text-sm text-[#abd2c8]">{notice}</div> : null}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(320px,.7fr)_minmax(0,1.3fr)]">
        <section className="sticky top-24 grid gap-4 rounded-panel border border-line bg-surface p-6 shadow-panel max-xl:static">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 [&_h2]:m-0 [&_h3]:m-0 [&_p]:mb-0">
            <div>
              <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">CONTENT CHECK</p>
              <h2>Prepare the next release</h2>
            </div>
            <Badge
              tone={
                validation?.valid ? "green" : validation ? "red" : "neutral"
              }
            >
              {validation?.valid
                ? "VALID"
                : validation
                  ? "ACTION NEEDED"
                  : "NOT CHECKED"}
            </Badge>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-orange/60 bg-signal-orange-soft px-4 text-xs font-semibold text-[#f1ae78] hover:border-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
            disabled={busy}
            onClick={() => void validate()}
          >
            <RefreshCw />
            CHECK CURRENT DRAFT
          </button>
          {validation ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 [&>span]:grid [&>span]:rounded-control [&>span]:border [&>span]:border-line [&>span]:p-3 [&>span]:font-mono [&>span]:text-xs [&>span]:text-muted [&>span_strong]:text-lg [&>span_strong]:text-copy">
              {Object.entries(validation.totals).map(([label, value]) => (
                <span key={label}>
                  <strong>{value}</strong>
                  {label}
                </span>
              ))}
              {validation.issues.map((issue) => (
                <div className="col-span-full rounded-control border border-signal-red/50 bg-signal-red-soft p-3 [&_strong]:text-xs [&_strong]:text-[#ff858a] [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-sm" key={`${issue.area}-${issue.message}`}>
                  <strong>{issue.area}</strong>
                  <p>{issue.message}</p>
                </div>
              ))}
            </div>
          ) : null}
          <Field label="What changed in this version?">
            <textarea
              rows={4}
              value={changelog}
              onChange={(event) => setChangelog(event.target.value)}
              placeholder="Explain what learners and instructors should know about this version."
            />
          </Field>
          <Field label="Minimum Android app version">
            <input
              value={minimum}
              pattern="\d+\.\d+\.\d+"
              onChange={(event) => setMinimum(event.target.value)}
            />
          </Field>
          <ConfirmAction
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
            confirmLabel="PUBLISH RELEASE"
            detail="This publishes one complete curriculum version to connected Android devices. Your drafts remain available for future changes."
            disabled={
              busy ||
              !validation?.valid ||
              changelog.trim().length < 3
            }
            eyebrow="PUBLISH CURRICULUM"
            onConfirm={publish}
            title="Publish this curriculum version?"
            tone="warning"
          >
            <Rocket />
            PUBLISH VERSION
          </ConfirmAction>
        </section>
        <section className="rounded-panel border border-line bg-surface p-6 shadow-panel">
          <h2>Published versions</h2>
          {rows.map((row, index) => (
            <article className="grid grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-4 max-sm:grid-cols-1" key={row.id}>
              <div className="grid size-12 place-items-center rounded-control border border-signal-green font-mono text-xs text-[#9bc8bd]">V{row.release_version}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{row.changelog}</strong>
                  {index === 0 ? (
                    <Badge tone="green">ACTIVE</Badge>
                  ) : row.rollback_of ? (
                    <Badge tone="orange">RESTORED</Badge>
                  ) : null}
                </div>
                <p>
                  {new Date(row.published_at).toLocaleString()} · Android{" "}
                  {row.minimum_app_version}+
                </p>
                <details className="mt-3 text-xs text-muted [&>summary]:w-fit [&>summary]:cursor-pointer [&>summary]:font-semibold [&>summary]:text-copy">
                  <summary>Technical details</summary>
                  <dl className="mt-5 grid [&>div]:grid [&>div]:grid-cols-[120px_minmax(0,1fr)] [&>div]:border-t [&>div]:border-line [&>div]:py-3 [&_dt]:text-sm [&_dt]:text-muted [&_dd]:m-0 [&_dd]:text-sm">
                    <div><dt>Release ID</dt><dd className="font-mono">{row.id}</dd></div>
                    <div><dt>Checksum</dt><dd className="font-mono">{row.checksum.slice(0, 16)}…</dd></div>
                  </dl>
                </details>
              </div>
              {index > 0 ? (
                <ConfirmAction
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                  confirmLabel="RESTORE VERSION"
                  detail={`Version ${row.release_version} will be copied into a new published version. Existing history will remain unchanged.`}
                  eyebrow="RESTORE PREVIOUS VERSION"
                  onConfirm={() => {
                    const operationId = restoreRequestIds.current.get(row.id) ?? crypto.randomUUID();
                    restoreRequestIds.current.set(row.id, operationId);
                    return api.rollbackRelease(row.id, operationId).then(() => {
                      restoreRequestIds.current.delete(row.id);
                      setNotice("Previous curriculum version restored.");
                      return load();
                    });
                  }}
                  title={`Restore version ${row.release_version}?`}
                  tone="warning"
                >
                  RESTORE THIS VERSION
                </ConfirmAction>
              ) : null}
            </article>
          ))}
          {!rows.length ? (
            <Empty
              title="No published versions"
              detail="Import, check, and publish the current curriculum to create version one."
            />
          ) : null}
        </section>
      </div>
    </>
  );
}
