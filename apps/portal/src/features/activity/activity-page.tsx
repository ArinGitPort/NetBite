import { CalendarDays, FileClock, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, StatusBadge } from "@/components/ui/admin-primitives";
import { Feedback } from "@/components/ui/feedback";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { SelectField } from "@/components/ui/select";
import * as activityApi from "@/lib/api/activity-service";
import type { SafeAuditEntry } from "@/lib/api/types";

export function Audit() {
  const [rows, setRows] = useState<SafeAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [period, setPeriod] = useState("all");
  const [order, setOrder] = useState("newest");

  useEffect(() => {
    void activityApi
      .getSanitizedAuditHistory()
      .then(setRows)
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "The audit log could not be loaded.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const actionOptions = useMemo(
    () =>
      [...new Set(rows.map((row) => row.actionLabel))]
        .sort((first, second) => first.localeCompare(second))
        .map((value) => ({ value, label: value })),
    [rows],
  );
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const maximumAge = period === "all" ? undefined : Number(period) * 86_400_000;
    const now = Date.now();
    return rows
      .filter((row) => {
        const searchable = [
          row.actionLabel,
          row.contentLabel,
          row.summary,
          row.administratorName,
        ].join(" ").toLowerCase();
        const occurredAt = Date.parse(row.occurredAt);
        const matchesPeriod =
          maximumAge === undefined ||
          (!Number.isNaN(occurredAt) && now - occurredAt <= maximumAge);
        return (
          (action === "all" || row.actionLabel === action) &&
          matchesPeriod &&
          (!normalizedQuery || searchable.includes(normalizedQuery))
        );
      })
      .sort((first, second) => {
        const difference = Date.parse(second.occurredAt) - Date.parse(first.occurredAt);
        return order === "newest" ? difference : -difference;
      });
  }, [action, order, period, query, rows]);
  const filtersActive =
    Boolean(query.trim()) || action !== "all" || period !== "all" || order !== "newest";

  return (
    <>
      <PageHeader
        description="Review an immutable record of important curriculum changes and publishing events. Audit entries cannot be edited from the portal."
        label="ACCOUNTABILITY"
        title="Audit log"
      />
      {error ? (
        <div className="mb-4">
          <Feedback tone="error">{error}</Feedback>
        </div>
      ) : null}
      <section className="overflow-hidden rounded-panel border border-line bg-surface shadow-panel">
        <header className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="grid max-w-2xl gap-1.5">
            <h2 className="m-0 text-lg">Administrative events</h2>
            <p className="m-0 text-sm leading-6 text-muted">
              Each entry identifies what changed, who performed the action, and
              when it occurred.
            </p>
          </div>
          <StatusBadge tone="neutral">
            {rows.length} {rows.length === 1 ? "EVENT" : "EVENTS"}
          </StatusBadge>
        </header>
        {!loading && rows.length ? (
          <FilterToolbar
            active={filtersActive}
            onReset={() => {
              setQuery("");
              setAction("all");
              setPeriod("all");
              setOrder("newest");
            }}
            onSearchChange={setQuery}
            resultLabel={`Showing ${visibleRows.length} of ${rows.length} audit events`}
            searchLabel="Search audit log"
            searchPlaceholder="Search actions, content, or administrators"
            searchValue={query}
          >
            <SelectField
              allowEmpty={false}
              ariaLabel="Filter audit events by action"
              className="w-full sm:w-40"
              onValueChange={setAction}
              options={[{ value: "all", label: "All actions" }, ...actionOptions]}
              value={action}
            />
            <SelectField
              allowEmpty={false}
              ariaLabel="Filter audit events by date"
              className="w-full sm:w-40"
              onValueChange={setPeriod}
              options={[
                { value: "all", label: "Any date" },
                { value: "7", label: "Last 7 days" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
              ]}
              value={period}
            />
            <SelectField
              allowEmpty={false}
              ariaLabel="Sort audit events"
              className="w-full sm:w-36"
              onValueChange={setOrder}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
              ]}
              value={order}
            />
          </FilterToolbar>
        ) : null}
        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-3 border-t border-line text-sm text-muted">
            <span className="size-6 animate-spin rounded-full border-2 border-line border-t-signal-orange" />
            Loading audit log
          </div>
        ) : error ? null : visibleRows.length ? (
          <ol className="m-0 grid list-none px-5">
            {visibleRows.map((row) => (
              <AuditEntry key={row.id} row={row} />
            ))}
          </ol>
        ) : rows.length ? (
          <EmptyState
            detail="Try another search term or clear the current filters."
            title="No audit events match"
          />
        ) : (
          <div className="border-t border-line">
            <EmptyState
              detail="Published versions and important curriculum changes will appear here."
              title="No audit events recorded"
            />
          </div>
        )}
      </section>
    </>
  );
}

function AuditEntry({ row }: { row: SafeAuditEntry }) {
  return (
    <li className="grid gap-4 border-t border-line py-5 first:border-t-0 sm:grid-cols-[48px_minmax(0,1fr)]">
      <span className="grid size-11 place-items-center rounded-control border border-signal-green/60 bg-signal-green-soft text-signal-green">
        <FileClock className="size-5" />
      </span>
      <article className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={actionTone(row.actionLabel)}>
            {row.actionLabel.toUpperCase()}
          </StatusBadge>
          <h3 className="m-0 break-words text-base">{row.contentLabel}</h3>
        </div>
        <p className="m-0 text-sm leading-6 text-copy">{row.summary}</p>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <UserRound className="size-3.5" />
            <dt className="sr-only">Administrator</dt>
            <dd className="m-0">{row.administratorName || "Administrator"}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            <dt className="sr-only">Occurred</dt>
            <dd className="m-0">{formatDate(row.occurredAt)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" />
            <dt className="sr-only">Record type</dt>
            <dd className="m-0">Immutable audit entry</dd>
          </div>
        </dl>
      </article>
    </li>
  );
}

function actionTone(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes("publish") || normalized.includes("create")) {
    return "green" as const;
  }
  if (normalized.includes("delete") || normalized.includes("revoke")) {
    return "red" as const;
  }
  return "orange" as const;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
