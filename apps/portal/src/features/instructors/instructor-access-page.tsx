import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ShieldX,
  UserRoundCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, LoadingState, StatusBadge } from "@/components/ui/admin-primitives";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Feedback } from "@/components/ui/feedback";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as instructorApi from "@/lib/api/instructor-service";
import type { InstructorRequestRow } from "@/lib/api/types";

type AccessFilter = "all" | "pending" | "approved" | "inactive";

export function InstructorApprovals() {
  const [rows, setRows] = useState<InstructorRequestRow[]>([]);
  const [filter, setFilter] = useState<AccessFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      setRows(await instructorApi.getInstructorRequests());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Instructor accounts could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(undefined), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const counts = useMemo(
    () => ({
      pending: rows.filter((row) => row.status === "pending").length,
      approved: rows.filter((row) => row.status === "approved").length,
      inactive: rows.filter(
        (row) => row.status === "declined" || row.status === "revoked",
      ).length,
    }),
    [rows],
  );
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows
        .filter((row) => {
          const matchesStatus =
            filter === "all"
              ? true
              : filter === "inactive"
                ? row.status === "declined" || row.status === "revoked"
                : row.status === filter;
          const searchable = [
            row.display_name,
            row.institution,
            row.reason,
            statusLabel(row.status),
          ].join(" ").toLowerCase();
          return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
        })
        .sort((first, second) => {
          if (first.status === "pending" && second.status !== "pending") return -1;
          if (first.status !== "pending" && second.status === "pending") return 1;
          return Date.parse(second.requested_at) - Date.parse(first.requested_at);
        });
  }, [filter, query, rows]);
  const filtersActive = filter !== "all" || Boolean(query.trim());

  const review = async (
    row: InstructorRequestRow,
    decision: "approved" | "declined" | "revoked",
  ) => {
    setError(undefined);
    setReviewingId(row.user_id);
    try {
      await instructorApi.reviewInstructorRequest(row.user_id, decision);
      setNotice(
        decision === "approved"
          ? `${row.display_name} now has instructor access.`
          : decision === "revoked"
            ? `${row.display_name} can no longer use instructor tools.`
            : `${row.display_name}'s request was declined.`,
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Instructor access could not be updated.",
      );
    } finally {
      setReviewingId(undefined);
    }
  };

  return (
    <>
      <PageHeader
        description="Review teaching-account requests and control who can create lesson collections and classes. Instructor access never grants official curriculum administration."
        label="ACCOUNT APPROVAL"
        title="Instructor access"
      />
      {error || notice ? (
        <div className="mb-4">
          <Feedback tone={error ? "error" : "success"}>
            {error || notice}
          </Feedback>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-panel border border-line bg-surface shadow-panel">
        <header className="flex flex-wrap items-start justify-between gap-5 p-5">
          <div className="grid max-w-2xl gap-1.5">
            <h2 className="m-0 text-lg">Teaching accounts</h2>
            <p className="m-0 text-sm leading-6 text-muted">
              Confirm each applicant’s identity, institution, and teaching purpose before granting access.
            </p>
          </div>
          <StatusBadge tone={counts.pending ? "orange" : "neutral"}>
            {counts.pending} pending
          </StatusBadge>
        </header>

        <div className="grid border-y border-line sm:grid-cols-3">
          <AccessSummary icon={Clock3} label="Pending review" value={counts.pending} />
          <AccessSummary icon={UserRoundCheck} label="Active instructors" value={counts.approved} />
          <AccessSummary icon={ShieldX} label="Inactive accounts" value={counts.inactive} />
        </div>

        {!loading && rows.length ? (
          <FilterToolbar
            active={filtersActive}
            onReset={() => {
              setQuery("");
              setFilter("all");
            }}
            onSearchChange={setQuery}
            resultLabel={`Showing ${visibleRows.length} of ${rows.length} teaching accounts`}
            searchLabel="Search teaching accounts"
            searchPlaceholder="Search name, institution, or teaching purpose"
            searchValue={query}
          >
            <Tabs value={filter} onValueChange={(value) => setFilter(value as AccessFilter)}>
              <TabsList aria-label="Filter instructor accounts" className="flex-wrap">
                <TabsTrigger value="all">ALL</TabsTrigger>
                <TabsTrigger value="pending">PENDING</TabsTrigger>
                <TabsTrigger value="approved">ACTIVE</TabsTrigger>
                <TabsTrigger value="inactive">INACTIVE</TabsTrigger>
              </TabsList>
            </Tabs>
          </FilterToolbar>
        ) : null}

        {loading ? (
          <div className="border-t border-line"><LoadingState label="Loading instructor accounts" /></div>
        ) : visibleRows.length ? (
          <div className="grid px-5">
            {visibleRows.map((row) => (
              <InstructorAccessRow
                busy={reviewingId === row.user_id}
                key={row.user_id}
                onReview={(decision) => review(row, decision)}
                row={row}
              />
            ))}
          </div>
        ) : (
          <div className={rows.length ? "" : "border-t border-line"}>
            <EmptyState
              detail={rows.length ? "Try another search term or clear the current filters." : "No teaching-account requests have been submitted."}
              title={rows.length ? "No teaching accounts match" : "No accounts to review"}
            />
          </div>
        )}
      </section>
    </>
  );
}

function AccessSummary({ icon: Icon, label, value }: {
  icon: typeof Clock3;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-h-24 items-center gap-3 border-t border-line px-5 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <Icon className="size-5 shrink-0 text-signal-green" />
      <div className="grid gap-1">
        <strong className="text-2xl leading-none">{value}</strong>
        <span className="text-xs text-muted">{label}</span>
      </div>
    </div>
  );
}

function InstructorAccessRow({ busy, onReview, row }: {
  busy: boolean;
  onReview: (decision: "approved" | "declined" | "revoked") => Promise<void>;
  row: InstructorRequestRow;
}) {
  return (
    <article className="grid min-w-0 gap-5 border-t border-line py-5 first:border-t-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="grid min-w-0 gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-control bg-raised font-semibold text-copy">
            {initials(row.display_name)}
          </span>
          <div className="grid min-w-0 gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="m-0 break-words text-base">{row.display_name}</h3>
              <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
            </div>
            <span className="flex items-center gap-2 text-xs text-muted">
              <Building2 className="size-3.5 shrink-0" />
              {row.institution || "Institution not provided"}
            </span>
          </div>
        </div>
        <dl className="grid min-w-0 gap-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-1">
            <dt className="font-mono text-[0.6rem] font-semibold text-muted">TEACHING PURPOSE</dt>
            <dd className="m-0 break-words leading-5 text-copy">{row.reason || "No teaching purpose was provided."}</dd>
          </div>
          <div className="grid content-start gap-1 sm:min-w-48">
            <dt className="flex items-center gap-1.5 font-mono text-[0.6rem] font-semibold text-muted">
              <CalendarDays className="size-3.5" /> REQUESTED
            </dt>
            <dd className="m-0 leading-5 text-copy">{formatDate(row.requested_at)}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {row.status === "approved" ? (
          <ConfirmationDialog
            confirmLabel="REVOKE ACCESS"
            description={`${row.display_name} will no longer be able to create or manage instructor content. Existing classes and published materials remain preserved.`}
            destructive
            onConfirm={() => onReview("revoked")}
            title="Revoke instructor access?"
            trigger={<Button disabled={busy} tone="destructive"><ShieldX /> REVOKE ACCESS</Button>}
          />
        ) : (
          <ConfirmationDialog
            confirmLabel={row.status === "pending" ? "APPROVE INSTRUCTOR" : "RESTORE ACCESS"}
            description={`${row.display_name} will be able to create lesson collections, assessments, and private classes. This does not grant administrator access.`}
            onConfirm={() => onReview("approved")}
            title={row.status === "pending" ? "Approve this instructor?" : "Restore instructor access?"}
            trigger={<Button disabled={busy} tone="primary"><CheckCircle2 /> {row.status === "pending" ? "APPROVE INSTRUCTOR" : "RESTORE ACCESS"}</Button>}
          />
        )}
        {row.status === "pending" ? (
          <ConfirmationDialog
            confirmLabel="DECLINE REQUEST"
            description={`${row.display_name} will not receive instructor access. The request remains in the account history.`}
            destructive
            onConfirm={() => onReview("declined")}
            title="Decline this request?"
            trigger={<Button disabled={busy} tone="ghost">DECLINE</Button>}
          />
        ) : null}
      </div>
    </article>
  );
}

function statusTone(status: InstructorRequestRow["status"]) {
  if (status === "approved") return "green" as const;
  if (status === "pending") return "orange" as const;
  return "neutral" as const;
}

function statusLabel(status: InstructorRequestRow["status"]) {
  return status === "approved" ? "ACTIVE" : status.toUpperCase();
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)![0]}` : parts[0]?.slice(0, 2) || "IN").toUpperCase();
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
