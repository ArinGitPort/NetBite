import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronsUpDown,
  Download,
  FileCheck2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/ui/admin-primitives";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { LoadingButtonContent, LoadingContent } from "@/components/ui/loading-content";
import { SelectField } from "@/components/ui/select";
import { downloadGradebookWorkbook } from "@/features/classes/gradebook-export";

type GradeRow = Record<string, unknown>;
type GradeSortKey = "student" | "assessment" | "grade" | "attempts" | "status";
type SortDirection = "ascending" | "descending";
const PAGE_SIZE = 10;

export function Gradebook({ rows, loading = false }: { rows: GradeRow[]; loading?: boolean }) {
  const [query, setQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<GradeSortKey>("student");
  const [sortDirection, setSortDirection] = useState<SortDirection>("ascending");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
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
  const sortedRows = useMemo(
    () => sortGradeRows(filteredRows, sortKey, sortDirection),
    [filteredRows, sortDirection, sortKey],
  );
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const metrics = calculateMetrics(filteredRows);
  const filtersActive = Boolean(
    query.trim() || studentFilter || assessmentFilter || statusFilter,
  );

  useEffect(() => {
    setPage(1);
  }, [assessmentFilter, query, sortDirection, sortKey, statusFilter, studentFilter]);

  const exportWorkbook = async () => {
    if (exporting || !sortedRows.length) return;
    setExporting(true);
    setExportError("");
    try {
      await downloadGradebookWorkbook(sortedRows.map((row) => ({
        assessmentTitle: text(row.assessmentTitle),
        attempts: text(row.attempts),
        percentage: finiteNumber(row.percentage),
        status: text(row.status),
        studentName: text(row.studentName),
      })));
    } catch {
      setExportError("The Excel workbook could not be generated. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <section className="min-w-0" data-testid="recorded-grades">
        <div className="mb-5 grid gap-1.5">
          <h2 className="m-0 text-lg">Recorded grades</h2>
          <p className="m-0 text-sm leading-6 text-muted">Fetching the latest learner submissions from the class.</p>
        </div>
        <LoadingContent label="Loading grade records" variant="table" />
      </section>
    );
  }

  return (
    <>
      <section aria-label="Gradebook summary" className="mb-6 grid gap-3 md:grid-cols-3">
        <GradeMetric
          icon={FileCheck2}
          label="Completion"
          note={`${metrics.submitted} of ${filteredRows.length} results submitted`}
          value={filteredRows.length ? `${((metrics.submitted / filteredRows.length) * 100).toFixed(0)}%` : "—"}
        />
        <GradeMetric
          icon={BarChart3}
          label="Average score"
          note={`${metrics.scores.length} recorded scores`}
          value={metrics.scores.length ? `${metrics.average.toFixed(1)}%` : "—"}
        />
        <GradeMetric
          accent="orange"
          icon={TriangleAlert}
          label="Needs attention"
          note={`${metrics.missing} missing · ${metrics.late} late`}
          value={String(metrics.missing + metrics.late)}
        />
      </section>

      <section className="min-w-0" data-testid="recorded-grades">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="grid min-w-0 gap-1.5">
            <h2 className="m-0 text-lg">Recorded grades</h2>
            <p className="m-0 max-w-3xl text-sm leading-6 text-muted">
              Search and narrow the recorded attempt selected by each assessment’s score policy.
            </p>
          </div>
          <Button disabled={!filteredRows.length || exporting} onClick={() => void exportWorkbook()} tone="secondary">
            {exporting ? <LoadingButtonContent label="PREPARING EXCEL..." /> : <><Download />EXPORT {filteredRows.length} RESULTS</>}
          </Button>
        </div>
        {exportError ? <p className="mb-4 mt-0 text-sm text-signal-red" role="alert">{exportError}</p> : null}

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

        <GradeTable
          direction={sortDirection}
          onSort={(key) => {
            if (sortKey === key) {
              setSortDirection((current) => current === "ascending" ? "descending" : "ascending");
              return;
            }
            setSortKey(key);
            setSortDirection(key === "grade" || key === "attempts" ? "descending" : "ascending");
          }}
          rows={paginatedRows}
          sortKey={sortKey}
        />
        <DataPagination
          ariaLabel="Gradebook pagination"
          count={sortedRows.length}
          itemLabel="grade records"
          onPageChange={setPage}
          page={currentPage}
          pageSize={PAGE_SIZE}
        />
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
    ? "text-signal-orange/10 dark:text-signal-orange/20"
    : "text-signal-green/10 dark:text-signal-green/20";
  return (
    <article className="relative grid min-h-32 overflow-hidden rounded-panel border border-line bg-surface p-5 shadow-panel">
      <Icon aria-hidden="true" className={`pointer-events-none absolute -bottom-4 -right-3 size-28 rotate-[-6deg] ${iconStyle}`} strokeWidth={1.25} />
      <div className="relative z-10 grid gap-4">
        <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted">{label}</span>
        <div className="grid gap-1.5">
          <strong className="text-3xl leading-none tracking-[-0.04em] text-copy">{value}</strong>
          <small className="text-xs leading-5 text-muted">{note}</small>
        </div>
      </div>
      <span className={`absolute inset-x-0 bottom-0 h-0.5 ${accent === "orange" ? "bg-signal-orange" : "bg-signal-green"}`} />
    </article>
  );
}

const gradeColumns: Array<{ key: GradeSortKey; label: string }> = [
  { key: "student", label: "Student" },
  { key: "assessment", label: "Assessment" },
  { key: "grade", label: "Grade" },
  { key: "attempts", label: "Attempts" },
  { key: "status", label: "Status" },
];

function GradeTable({ rows, sortKey, direction, onSort }: {
  rows: GradeRow[];
  sortKey: GradeSortKey;
  direction: SortDirection;
  onSort: (key: GradeSortKey) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-control border border-line" role="table">
      <div className="grid min-w-[720px] grid-cols-[1.2fr_1.4fr_.7fr_.6fr_.7fr] bg-raised/45 text-copy" role="row">
        {gradeColumns.map((column, index) => {
          const active = sortKey === column.key;
          const SortIcon = active ? direction === "ascending" ? ArrowUp : ArrowDown : ChevronsUpDown;
          return (
            <span aria-sort={active ? direction : "none"} className={index ? "border-l border-line" : undefined} key={column.key} role="columnheader">
              <button
                aria-label={`Sort by ${column.label}`}
                className="group flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left text-xs font-semibold hover:bg-raised focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal-orange"
                onClick={() => onSort(column.key)}
                type="button"
              >
                {column.label}
                <SortIcon aria-hidden="true" className={active ? "size-3.5 text-signal-orange" : "size-3.5 text-muted/60 group-hover:text-muted"} />
              </button>
            </span>
          );
        })}
      </div>
      {rows.map((row) => (
        <div className="grid min-w-[720px] grid-cols-[1.2fr_1.4fr_.7fr_.6fr_.7fr] items-center border-t border-line transition-colors hover:bg-raised/30 [&>*]:px-4 [&>*]:py-3" key={`${text(row.studentId)}-${text(row.assessmentId)}`} role="row">
          <strong role="cell">{text(row.studentName)}</strong>
          <span role="cell">{text(row.assessmentTitle)}</span>
          <span role="cell">{row.percentage == null ? "—" : `${Number(row.percentage).toFixed(1)}%`}</span>
          <span role="cell">{text(row.attempts)}</span>
          <span role="cell"><StatusBadge tone={statusTone(text(row.status))}>{text(row.status).toUpperCase()}</StatusBadge></span>
        </div>
      ))}
      {!rows.length ? (
        <div className="grid min-w-[720px] grid-cols-5 border-t border-line px-4 py-5" role="row"><span className="col-span-5 text-sm text-muted" role="cell">No grade records match these filters.</span></div>
      ) : null}
    </div>
  );
}

function sortGradeRows(rows: GradeRow[], key: GradeSortKey, direction: SortDirection) {
  const value = (row: GradeRow): string | number | undefined => {
    if (key === "student") return text(row.studentName).toLowerCase();
    if (key === "assessment") return text(row.assessmentTitle).toLowerCase();
    if (key === "grade") return finiteNumber(row.percentage);
    if (key === "attempts") return finiteNumber(row.attempts);
    return text(row.status).toLowerCase();
  };
  return [...rows].sort((first, second) => {
    const left = value(first);
    const right = value(second);
    if (left === undefined) return right === undefined ? 0 : 1;
    if (right === undefined) return -1;
    const comparison = typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), undefined, { numeric: true });
    return direction === "ascending" ? comparison : -comparison;
  });
}

function finiteNumber(value: unknown) {
  if (value == null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function calculateMetrics(rows: GradeRow[]) {
  const scores = rows
    .map((row) => finiteNumber(row.percentage))
    .filter((score): score is number => score !== undefined);
  const submitted = rows.filter((row) => text(row.status) !== "missing").length;
  return {
    average: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0,
    late: rows.filter((row) => text(row.status) === "late").length,
    missing: rows.filter((row) => text(row.status) === "missing").length,
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
