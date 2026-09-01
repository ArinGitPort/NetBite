import {
  ChevronDown,
  Copy,
  Download,
  Link2,
  LoaderCircle,
  QrCode,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getWorkshopClassRoster,
  setWorkshopClassEnrollment,
} from "@/lib/api/workshop-service";
import type {
  WorkshopClassRosterEntry,
  WorkshopClassRow,
} from "@/lib/api/types";

export function ClassShareCard({
  row,
  onNotice,
  onChanged,
}: {
  row: WorkshopClassRow;
  onNotice: (value: string) => void;
  onChanged: () => void;
}) {
  const link = `netbite:///workshops/join?code=${encodeURIComponent(row.join_code)}`;
  const [qr, setQr] = useState<string>();
  const [rosterOpen, setRosterOpen] = useState(false);
  const [roster, setRoster] = useState<WorkshopClassRosterEntry[]>();
  const [rosterError, setRosterError] = useState<string>();
  const [rosterLoading, setRosterLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void QRCode.toDataURL(link, {
      width: 180,
      margin: 2,
      color: { dark: "#171318", light: "#f3eff1" },
    }).then(setQr);
  }, [link]);

  const loadRoster = async () => {
    setRosterLoading(true);
    setRosterError(undefined);
    try {
      const result = await getWorkshopClassRoster(row.id);
      setRoster(result.students);
    } catch (reason) {
      setRosterError(
        reason instanceof Error
          ? reason.message
          : "The student list could not be loaded.",
      );
    } finally {
      setRosterLoading(false);
    }
  };
  const toggleRoster = () => {
    const next = !rosterOpen;
    setRosterOpen(next);
    if (next && !roster && !rosterLoading) void loadRoster();
  };
  const visibleStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? (roster ?? []).filter((student) =>
          student.displayName.toLowerCase().includes(normalized),
        )
      : (roster ?? []);
  }, [query, roster]);
  const copy = (value: string, message: string) =>
    void navigator.clipboard.writeText(value).then(() => onNotice(message));
  const changeEnrollment = () =>
    void setWorkshopClassEnrollment(row.id, !row.join_enabled).then(() => {
      onNotice(
        row.join_enabled
          ? "Class enrollment closed. Existing students retain access."
          : "Class enrollment reopened.",
      );
      onChanged();
    });

  return (
    <article className="overflow-hidden [&+article]:mt-6 [&+article]:border-t [&+article]:border-line [&+article]:pt-6">
      <header className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="grid min-w-0 gap-1.5">
          <strong className="break-words text-base">{row.title}</strong>
          <span className="text-xs leading-5 text-muted">
            Private class invitation
          </span>
        </div>
        <span className={`inline-flex min-h-6 w-fit items-center rounded-full border px-2.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.045em] ${row.join_enabled ? "border-signal-green/60 bg-signal-green-soft text-signal-green" : "border-line bg-raised text-muted"}`}>
          {row.join_enabled ? "ENROLLMENT OPEN" : "CODE REVOKED"}
        </span>
      </header>

      <div className="grid min-w-0 gap-6 border-t border-line py-5 md:grid-cols-[176px_minmax(0,1fr)]">
        <figure className="m-0 grid content-start justify-items-center gap-2">
          {qr ? (
            <img
              className={`size-[150px] rounded-control bg-white p-2 ${row.join_enabled ? "" : "opacity-35 grayscale"}`}
              alt={`QR code for ${row.title}`}
              src={qr}
            />
          ) : (
            <span className="grid size-[150px] place-items-center rounded-control border border-dashed border-line text-muted">
              <QrCode className="size-8" />
            </span>
          )}
          <figcaption className="font-mono text-[0.62rem] font-semibold text-muted">
            {row.join_enabled ? "SCAN TO JOIN" : "ENROLLMENT CLOSED"}
          </figcaption>
        </figure>

        <section className="grid min-w-0 content-start gap-4">
          <div className="grid gap-1">
            <h3 className="m-0 text-base">Share with students</h3>
            <p className="m-0 max-w-2xl text-sm leading-6 text-muted">
              Students can scan the QR code, enter the class code in the Android app, or open the invitation link.
            </p>
          </div>
          <div className="grid max-w-xl gap-1.5">
            <span className="font-mono text-[0.62rem] font-semibold text-muted">
              CLASS CODE
            </span>
            <code className="min-w-0 rounded-control border border-line bg-canvas px-4 py-3 font-mono text-lg font-semibold tracking-[0.14em] text-signal-orange">
              {row.join_code}
            </code>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!row.join_enabled} onClick={() => copy(row.join_code, "Class code copied.")} tone="secondary">
              <Copy /> COPY CODE
            </Button>
            <Button disabled={!row.join_enabled} onClick={() => copy(link, "Join link copied.")} tone="outline">
              <Link2 /> COPY LINK
            </Button>
            {qr ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button aria-label="Download class QR code" disabled={!row.join_enabled} onClick={() => downloadQr(qr, row.title)} size="icon" tone="ghost">
                    <Download />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download QR code</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid border-t border-line">
        <button
          aria-expanded={rosterOpen}
          className="flex min-h-12 w-full items-center justify-between gap-4 py-3 text-left text-xs font-semibold text-copy hover:text-signal-orange"
          onClick={toggleRoster}
          type="button"
        >
          <span className="flex items-center gap-2">
            <Users className="size-4 text-muted" />
            ENROLLED STUDENTS
            {roster ? (
              <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[0.58rem] text-muted">
                {roster.length}
              </span>
            ) : null}
          </span>
          <ChevronDown className={`size-4 transition-transform ${rosterOpen ? "rotate-180" : ""}`} />
        </button>
        {rosterOpen ? (
          <ClassRoster
            error={rosterError}
            loading={rosterLoading}
            onQueryChange={setQuery}
            onRetry={() => void loadRoster()}
            query={query}
            students={visibleStudents}
            total={roster?.length ?? 0}
          />
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <div className="flex min-w-0 items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted" />
          <div className="grid gap-1">
            <strong className="text-xs">Enrollment access</strong>
            <span className="text-xs leading-5 text-muted">
              {row.join_enabled
                ? "New students can currently join. Existing students keep access if enrollment is closed."
                : "New students cannot join. Existing enrolled students still have access."}
            </span>
          </div>
        </div>
        {row.join_enabled ? (
          <ConfirmationDialog
            confirmLabel="CLOSE ENROLLMENT"
            description={`New students will no longer be able to join “${row.title}” using its code, link, or QR code. Existing students keep access.`}
            destructive
            onConfirm={changeEnrollment}
            title="Close class enrollment?"
            trigger={<Button tone="destructive">CLOSE ENROLLMENT</Button>}
          />
        ) : (
          <Button onClick={changeEnrollment} tone="secondary">REOPEN ENROLLMENT</Button>
        )}
      </footer>
    </article>
  );
}

function ClassRoster({
  error,
  loading,
  onQueryChange,
  onRetry,
  query,
  students,
  total,
}: {
  error?: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onRetry: () => void;
  query: string;
  students: WorkshopClassRosterEntry[];
  total: number;
}) {
  return (
    <section className="grid gap-3 pb-5" aria-label="Enrolled students">
      {total > 5 ? (
        <label className="relative block max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            aria-label="Search enrolled students"
            className="min-h-11 w-full rounded-control border border-line bg-canvas py-2 pl-10 pr-3 text-sm text-copy"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search students"
            value={query}
          />
        </label>
      ) : null}
      {loading ? (
        <div className="flex min-h-20 items-center justify-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" /> Loading students
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-signal-red">
          <span>{error}</span>
          <Button onClick={onRetry} tone="outline">TRY AGAIN</Button>
        </div>
      ) : students.length ? (
        <div className="grid" role="list">
          {students.map((student, index) => (
            <div className="grid min-w-0 gap-1 border-t border-line py-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4" key={`${student.joinedAt}-${student.displayName}-${index}`} role="listitem">
              <strong className="truncate text-sm">{student.displayName}</strong>
              <span className="text-xs text-muted">Joined {formatJoinedAt(student.joinedAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="m-0 py-3 text-sm leading-6 text-muted">
          {total ? "No students match this search." : "No students have joined this class yet. Share the class code, link, or QR code to invite them."}
        </p>
      )}
    </section>
  );
}

function downloadQr(source: string, title: string) {
  const anchor = document.createElement("a");
  anchor.href = source;
  anchor.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-qr.png`;
  anchor.click();
}

function formatJoinedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "recently"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
