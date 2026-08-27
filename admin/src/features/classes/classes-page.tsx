import { Copy, Download, Link2, Plus } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { InputField } from "../../components/ui/form-field";
import { Panel } from "../../components/ui/panel";
import * as api from "../../lib/content-api";
import type { WorkshopClassRow, WorkshopRow } from "../../lib/content-api";

export function Classes({
  selected,
  classes,
  onCreated,
  onNotice,
}: {
  selected: WorkshopRow;
  classes: WorkshopClassRow[];
  onCreated: () => void;
  onNotice: (value: string) => void;
}) {
  const [title, setTitle] = useState(`${selected.title} class`);
  const create = async () => {
    const result = await api.createWorkshopClass(selected.id, title);
    onNotice(`Class created. Join code: ${result.joinCode}`);
    onCreated();
  };
  return (
    <div className="grid gap-5">
      <Panel className="grid content-start gap-5">
        <div className="grid gap-2">
          <h2 className="m-0 text-lg font-bold">Create a class</h2>
          <p className="m-0 max-w-2xl leading-7 text-muted">
            Each class stays pinned to the workshop version used when it was
            created.
          </p>
        </div>
        <InputField
          label="Class name"
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
        <div className="grid justify-items-stretch gap-2.5 sm:justify-items-start">
          <Button
            className="w-full sm:w-auto"
            disabled={!selected.current_version_id}
            onClick={() => void create()}
            tone="primary"
          >
            <Plus />
            CREATE PRIVATE CLASS
          </Button>
          {!selected.current_version_id ? (
            <p className="m-0 text-sm leading-6 text-muted">
              Publish the workshop before creating a class.
            </p>
          ) : null}
        </div>
      </Panel>
      <Panel>
        <h2 className="mb-4 text-lg font-bold">Class sharing</h2>
        {classes.map((row) => (
          <ClassShareCard
            key={row.id}
            row={row}
            onChanged={onCreated}
            onNotice={onNotice}
          />
        ))}
        {!classes.length ? (
          <p className="m-0 text-muted">
            No classes created from this workshop yet.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}

function ClassShareCard({
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
  useEffect(() => {
    void QRCode.toDataURL(link, {
      width: 180,
      margin: 2,
      color: { dark: "#171318", light: "#f3eff1" },
    }).then(setQr);
  }, [link]);
  return (
    <article className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-5 border-t border-line py-5 max-lg:grid-cols-1 [&>div:first-child]:grid [&>div:first-child]:gap-2 [&>code]:rounded-control [&>code]:border [&>code]:border-line [&>code]:bg-canvas [&>code]:px-4 [&>code]:py-3 [&>code]:font-mono [&>code]:text-signal-orange">
      <div>
        <span className="inline-flex min-h-6 w-fit items-center rounded-full border border-line bg-raised px-2.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.045em] text-muted">
          {row.join_enabled ? "ENROLLMENT OPEN" : "CODE REVOKED"}
        </span>
        <strong>{row.title}</strong>
        <p>
          Students can scan the QR code or enter the code in the Android app.
        </p>
      </div>
      <code>{row.join_code}</code>
      {qr ? (
        <img
          className="size-[150px] rounded-control bg-white p-2"
          alt={`QR code for ${row.title}`}
          src={qr}
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-orange/60 bg-signal-orange-soft px-4 text-xs font-semibold text-[#f1ae78] hover:border-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
          disabled={!row.join_enabled}
          onClick={() =>
            void navigator.clipboard
              .writeText(row.join_code)
              .then(() => onNotice("Class code copied."))
          }
        >
          <Copy />
          COPY CODE
        </button>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
          disabled={!row.join_enabled}
          onClick={() =>
            void navigator.clipboard
              .writeText(link)
              .then(() => onNotice("Join link copied."))
          }
        >
          <Link2 />
          COPY LINK
        </button>
        <button
          className={
            row.join_enabled
              ? "inline-flex min-h-11 items-center justify-center rounded-control border border-signal-red/60 bg-signal-red-soft px-4 text-xs font-semibold text-[#ff858a]"
              : "inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-raised px-4 text-xs font-semibold text-copy"
          }
          onClick={() =>
            void api
              .setWorkshopClassEnrollment(row.id, !row.join_enabled)
              .then(() => {
                onNotice(
                  row.join_enabled
                    ? "Class code revoked. Existing students retain access."
                    : "Class enrollment reopened.",
                );
                onChanged();
              })
          }
        >
          {row.join_enabled ? "REVOKE JOIN CODE" : "REOPEN ENROLLMENT"}
        </button>
      </div>
    </article>
  );
}

export function Gradebook({ rows }: { rows: Array<Record<string, unknown>> }) {
  const [studentFilter, setStudentFilter] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState("");
  const studentOptions = [
    ...new Map(
      rows.map((row) => [String(row.studentId), String(row.studentName)]),
    ).entries(),
  ];
  const assessmentOptions = [
    ...new Map(
      rows.map((row) => [
        String(row.assessmentId),
        String(row.assessmentTitle),
      ]),
    ).entries(),
  ];
  const filteredRows = rows.filter(
    (row) =>
      (!studentFilter || row.studentId === studentFilter) &&
      (!assessmentFilter || row.assessmentId === assessmentFilter),
  );
  const scores = filteredRows
    .map((row) => Number(row.percentage))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const average = scores.length
    ? scores.reduce((sum, value) => sum + value, 0) / scores.length
    : 0;
  const middle = Math.floor(scores.length / 2);
  const median = !scores.length
    ? 0
    : scores.length % 2
      ? scores[middle]
      : (scores[middle - 1] + scores[middle]) / 2;
  const submitted = filteredRows.filter((row) => row.status !== "missing");
  const passed = filteredRows.filter((row) => row.status === "passed");
  const exportCsv = () => {
    const columns = [
      "Student",
      "Assessment",
      "Recorded percentage",
      "Attempts",
      "Status",
    ];
    const lines = [
      columns,
      ...filteredRows.map((row) => [
        row.studentName,
        row.assessmentTitle,
        row.percentage ?? "",
        row.attempts,
        row.status,
      ]),
    ].map((values) =>
      values
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "netbite-gradebook.csv";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };
  return (
    <>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid min-h-32 gap-2 rounded-control border border-line border-t-[3px] border-t-signal-green bg-surface p-4 [&>span]:font-mono [&>span]:text-[0.68rem] [&>span]:text-muted [&>strong]:text-3xl">
          <span>ENROLLED</span>
          <strong>
            {new Set(filteredRows.map((row) => row.studentId)).size}
          </strong>
        </div>
        <div className="grid min-h-32 gap-2 rounded-control border border-line border-t-[3px] border-t-signal-green bg-surface p-4 [&>span]:font-mono [&>span]:text-[0.68rem] [&>span]:text-muted [&>strong]:text-3xl">
          <span>SUBMITTED</span>
          <strong>{submitted.length}</strong>
        </div>
        <div className="grid min-h-32 gap-2 rounded-control border border-line border-t-[3px] border-t-signal-green bg-surface p-4 [&>span]:font-mono [&>span]:text-[0.68rem] [&>span]:text-muted [&>strong]:text-3xl">
          <span>MISSING</span>
          <strong>
            {filteredRows.filter((row) => row.status === "missing").length}
          </strong>
        </div>
        <div className="grid min-h-32 gap-2 rounded-control border border-line border-t-[3px] border-t-signal-green bg-surface p-4 [&>span]:font-mono [&>span]:text-[0.68rem] [&>span]:text-muted [&>strong]:text-3xl">
          <span>LATE</span>
          <strong>
            {filteredRows.filter((row) => row.status === "late").length}
          </strong>
        </div>
        <div className="grid min-h-32 gap-2 rounded-control border border-line border-t-[3px] border-t-signal-green bg-surface p-4 [&>span]:font-mono [&>span]:text-[0.68rem] [&>span]:text-muted [&>strong]:text-3xl">
          <span>AVERAGE</span>
          <strong>{average.toFixed(1)}%</strong>
        </div>
        <div className="grid min-h-32 gap-2 rounded-control border border-line border-t-[3px] border-t-signal-green bg-surface p-4 [&>span]:font-mono [&>span]:text-[0.68rem] [&>span]:text-muted [&>strong]:text-3xl">
          <span>MEDIAN</span>
          <strong>{median.toFixed(1)}%</strong>
        </div>
        <div className="grid min-h-32 gap-2 rounded-control border border-line border-t-[3px] border-t-signal-green bg-surface p-4 [&>span]:font-mono [&>span]:text-[0.68rem] [&>span]:text-muted [&>strong]:text-3xl">
          <span>HIGH / LOW</span>
          <strong>
            {scores.length
              ? `${scores.at(-1)!.toFixed(0)} / ${scores[0].toFixed(0)}`
              : "—"}
          </strong>
        </div>
        <div className="grid min-h-32 gap-2 rounded-control border border-line border-t-[3px] border-t-signal-green bg-surface p-4 [&>span]:font-mono [&>span]:text-[0.68rem] [&>span]:text-muted [&>strong]:text-3xl">
          <span>PASS RATE</span>
          <strong>
            {submitted.length
              ? `${((passed.length / submitted.length) * 100).toFixed(0)}%`
              : "—"}
          </strong>
        </div>
      </div>
      <section className="rounded-panel border border-line bg-surface p-6 shadow-panel">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 [&_h2]:m-0 [&_p]:mb-0">
          <div>
            <h2>Recorded grades</h2>
            <p>
              The score policy selected for each assessment determines the
              recorded attempt.
            </p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-orange/60 bg-signal-orange-soft px-4 text-xs font-semibold text-[#f1ae78] hover:border-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
            onClick={exportCsv}
          >
            <Download />
            EXPORT CSV
          </button>
        </div>
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
            <span>Student</span>
            <select
              value={studentFilter}
              onChange={(event) => setStudentFilter(event.target.value)}
            >
              <option value="">All students</option>
              {studentOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
            <span>Assessment</span>
            <select
              value={assessmentFilter}
              onChange={(event) => setAssessmentFilter(event.target.value)}
            >
              <option value="">All assessments</option>
              {assessmentOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="overflow-x-auto rounded-control border border-line [&>div]:grid [&>div]:min-w-[720px] [&>div]:grid-cols-[1.2fr_1.4fr_.7fr_.6fr_.7fr] [&>div]:gap-3 [&>div]:border-t [&>div]:border-line [&>div]:px-4 [&>div]:py-3 [&>div:first-child]:border-t-0"
          role="table"
        >
          <div role="row" className="font-semibold text-copy">
            <span>Student</span>
            <span>Assessment</span>
            <span>Grade</span>
            <span>Attempts</span>
            <span>Status</span>
          </div>
          {filteredRows.map((row) => (
            <div role="row" key={`${row.studentId}-${row.assessmentId}`}>
              <strong>{String(row.studentName)}</strong>
              <span>{String(row.assessmentTitle)}</span>
              <span>
                {row.percentage == null
                  ? "—"
                  : `${Number(row.percentage).toFixed(1)}%`}
              </span>
              <span>{String(row.attempts)}</span>
              <span className="inline-flex min-h-6 w-fit items-center rounded-full border border-line bg-raised px-2.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.045em] text-muted">
                {String(row.status)}
              </span>
            </div>
          ))}
        </div>
        {!filteredRows.length ? (
          <p>No grade records match these filters.</p>
        ) : null}
      </section>
    </>
  );
}
