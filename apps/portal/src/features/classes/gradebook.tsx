import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  Gauge,
  Sigma,
  TriangleAlert,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui/admin-primitives";
import { Button } from "@/components/ui/button";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { SelectField } from "@/components/ui/select";

type GradeRow = Record<string, unknown>;

export function Gradebook({ rows }: { rows: GradeRow[] }) {
  const [query, setQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const studentOptions = useMemo(
    () => uniqueOptions(rows, "studentId", "studentName"),
    [rows],
  );
  const assessmentOptions = useMemo(
    () => uniqueOptions(rows, "assessmentId", "assessmentTitle"),
    [rows],
  );
  const statusOptions = useMemo(
    () =>
      [...new Set(rows.map((row) => text(row.status)).filter(Boolean))]
        .sort()
        .map((status) => ({ value: status, label: titleCase(status) })),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const searchable = [row.studentName, row.assessmentTitle, row.status]
        .map(text)
        .join(" ")
        .toLowerCase();
      return (
        (!studentFilter || text(row.studentId) === studentFilter) &&
        (!assessmentFilter || text(row.assessmentId) === assessmentFilter) &&
        (!statusFilter || text(row.status) === statusFilter) &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [assessmentFilter, query, rows, statusFilter, studentFilter]);
  const metrics = calculateMetrics(filteredRows);
  const filtersActive = Boolean(
    query.trim() || studentFilter || assessmentFilter || statusFilter,
  );

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
      <section aria-label="Gradebook summary" className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <GradeMetric
          icon={UsersRound}
          label="Enrolled"
          note="Students represented in these results"
          value={String(metrics.enrolled)}
        />
        <GradeMetric
          icon={FileCheck2}
          label="Submitted"
          note={`${metrics.missing} awaiting submission`}
          value={String(metrics.submitted)}
        />
        <GradeMetric
          icon={BarChart3}
          label="Average score"
          note={`${metrics.scores.length} recorded scores`}
          value={`${metrics.average.toFixed(1)}%`}
        />
        <GradeMetric
          accent="orange"
          icon={Gauge}
          label="Pass rate"
          note={metrics.submitted ? `${metrics.passed} of ${metrics.submitted} submissions passed` : "No submissions recorded"}
          value={metrics.submitted ? `${((metrics.passed / metrics.submitted) * 100).toFixed(0)}%` : "—"}
        />
      </section>

      <section className="mb-7 overflow-hidden rounded-panel border border-line bg-canvas/35">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="m-0 font-mono text-[0.62rem] font-semibold tracking-[0.1em] text-signal-orange">
              ASSESSMENT HEALTH
            </p>
            <h2 className="m-0 mt-1 text-base">Result distribution</h2>
          </div>
          <StatusBadge tone={metrics.missing || metrics.late ? "orange" : "green"}>
            {metrics.missing || metrics.late ? "FOLLOW-UP NEEDED" : "UP TO DATE"}
          </StatusBadge>
        </header>
        <div className="grid border-t border-line sm:grid-cols-2 xl:grid-cols-4">
          <HealthMetric icon={TriangleAlert} label="Missing" value={String(metrics.missing)} />
          <HealthMetric icon={Clock3} label="Late" value={String(metrics.late)} />
          <HealthMetric icon={Sigma} label="Median" value={`${metrics.median.toFixed(1)}%`} />
          <HealthMetric
            icon={CheckCircle2}
            label="Score range"
            value={metrics.scores.length ? `${metrics.scores[0].toFixed(0)}–${metrics.scores.at(-1)!.toFixed(0)}%` : "—"}
          />
        </div>
      </section>

      <section className="min-w-0" data-testid="recorded-grades">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="grid min-w-0 gap-1.5">
            <h2 className="m-0 text-lg">Recorded grades</h2>
            <p className="m-0 max-w-3xl text-sm leading-6 text-muted">
              Search and narrow the recorded attempt selected by each assessment’s score policy.
            </p>
          </div>
          <Button disabled={!filteredRows.length} onClick={exportCsv} tone="secondary">
            <Download /> EXPORT {filteredRows.length} RESULTS
          </Button>
        </div>

        <FilterToolbar
          active={filtersActive}
          className="mb-5 rounded-control border border-line"
          layout="stacked"
          onReset={() => {
            setQuery("");
            setStudentFilter("");
            setAssessmentFilter("");
            setStatusFilter("");
          }}
          onSearchChange={setQuery}
          resultLabel={`Showing ${filteredRows.length} of ${rows.length} grade records`}
          searchLabel="Search recorded grades"
          searchPlaceholder="Search students, assessments, or status"
          searchValue={query}
        >
          <SelectField
            ariaLabel="Filter by student"
            className="w-full"
            onValueChange={setStudentFilter}
            options={studentOptions}
            placeholder="All students"
            value={studentFilter}
          />
          <SelectField
            ariaLabel="Filter by assessment"
            className="w-full"
            onValueChange={setAssessmentFilter}
            options={assessmentOptions}
            placeholder="All assessments"
            value={assessmentFilter}
          />
          <SelectField
            ariaLabel="Filter by grade status"
            className="w-full"
            onValueChange={setStatusFilter}
            options={statusOptions}
            placeholder="All statuses"
            value={statusFilter}
          />
        </FilterToolbar>

        <GradeTable rows={filteredRows} />
      </section>
    </>
  );
}

function GradeMetric({
  accent = "green",
  icon: Icon,
  label,
  note,
  value,
}: {
  accent?: "green" | "orange";
  icon: LucideIcon;
  label: string;
  note: string;
  value: string;
}) {
  const iconStyle = accent === "orange"
    ? "border-signal-orange/50 bg-signal-orange-soft text-signal-orange"
    : "border-signal-green/50 bg-signal-green-soft text-signal-green";
  return (
    <article className="relative grid min-h-40 overflow-hidden rounded-panel border border-line bg-surface p-5 shadow-panel transition-colors hover:border-muted">
      <div className="flex items-start justify-between gap-4">
        <span className={`grid size-11 place-items-center rounded-control border ${iconStyle}`}>
          <Icon className="size-5" />
        </span>
        <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted">{label}</span>
      </div>
      <div className="mt-5 grid gap-1.5">
        <strong className="text-3xl leading-none tracking-[-0.04em] text-copy">{value}</strong>
        <small className="text-xs leading-5 text-muted">{note}</small>
      </div>
      <span className={`absolute inset-x-0 bottom-0 h-0.5 ${accent === "orange" ? "bg-signal-orange" : "bg-signal-green"}`} />
    </article>
  );
}

function HealthMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-h-24 items-center gap-3 border-t border-line px-5 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0 sm:[&:nth-child(3)]:border-l-0 xl:[&:nth-child(3)]:border-l xl:[&:nth-child(3)]:border-t-0">
      <Icon className="size-5 shrink-0 text-signal-green" />
      <div className="grid gap-1">
        <strong className="text-xl leading-none">{value}</strong>
        <span className="text-xs text-muted">{label}</span>
      </div>
    </div>
  );
}

function GradeTable({ rows }: { rows: GradeRow[] }) {
  return (
    <div className="overflow-x-auto rounded-control border border-line [&>div]:grid [&>div]:min-w-[720px] [&>div]:grid-cols-[1.2fr_1.4fr_.7fr_.6fr_.7fr] [&>div]:gap-3 [&>div]:border-t [&>div]:border-line [&>div]:px-4 [&>div]:py-3 [&>div:first-child]:border-t-0" role="table">
      <div className="font-semibold text-copy" role="row">
        <span>Student</span><span>Assessment</span><span>Grade</span><span>Attempts</span><span>Status</span>
      </div>
      {rows.map((row) => (
        <div key={`${text(row.studentId)}-${text(row.assessmentId)}`} role="row">
          <strong>{text(row.studentName)}</strong>
          <span>{text(row.assessmentTitle)}</span>
          <span>{row.percentage == null ? "—" : `${Number(row.percentage).toFixed(1)}%`}</span>
          <span>{text(row.attempts)}</span>
          <StatusBadge tone={statusTone(text(row.status))}>{text(row.status).toUpperCase()}</StatusBadge>
        </div>
      ))}
      {!rows.length ? (
        <div role="row"><span className="col-span-5 text-sm text-muted">No grade records match these filters.</span></div>
      ) : null}
    </div>
  );
}

function calculateMetrics(rows: GradeRow[]) {
  const scores = rows.map((row) => Number(row.percentage)).filter(Number.isFinite).sort((a, b) => a - b);
  const submitted = rows.filter((row) => text(row.status) !== "missing").length;
  const middle = Math.floor(scores.length / 2);
  return {
    average: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0,
    enrolled: new Set(rows.map((row) => row.studentId)).size,
    late: rows.filter((row) => text(row.status) === "late").length,
    median: !scores.length ? 0 : scores.length % 2 ? scores[middle] : (scores[middle - 1] + scores[middle]) / 2,
    missing: rows.filter((row) => text(row.status) === "missing").length,
    passed: rows.filter((row) => text(row.status) === "passed").length,
    scores,
    submitted,
  };
}

function uniqueOptions(rows: GradeRow[], valueKey: string, labelKey: string) {
  return [...new Map(rows.map((row) => [text(row[valueKey]), text(row[labelKey])])).entries()]
    .filter(([value]) => value)
    .map(([value, label]) => ({ value, label }));
}

function statusTone(status: string) {
  if (status === "passed") return "green" as const;
  if (status === "missing" || status === "late") return "orange" as const;
  if (status === "failed") return "red" as const;
  return "neutral" as const;
}

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
