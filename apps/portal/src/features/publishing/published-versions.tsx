import { CalendarDays, ChevronDown, History, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";

import {
  EmptyState,
  StatusBadge,
} from "@/components/ui/admin-primitives";
import { ConfirmAction } from "@/components/ui/dialog";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { SelectField } from "@/components/ui/select";
import type { ReleaseRow } from "@/lib/api/types";

type ReleaseStatus = "all" | "current" | "previous" | "restored";
type ReleaseOrder = "newest" | "oldest";

export function PublishedVersions({
  onRestore,
  rows,
}: {
  onRestore: (row: ReleaseRow) => Promise<void>;
  rows: ReleaseRow[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ReleaseStatus>("all");
  const [order, setOrder] = useState<ReleaseOrder>("newest");
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => {
        const rowStatus = index === 0 ? "current" : row.rollback_of ? "restored" : "previous";
        const matchesStatus = status === "all" || rowStatus === status;
        const searchable = [
          row.changelog,
          `version ${row.release_version}`,
          `v${row.release_version}`,
          row.minimum_app_version,
          row.id,
        ].join(" ").toLowerCase();
        return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
      })
      .sort((first, second) => {
        const difference = Date.parse(second.row.published_at) - Date.parse(first.row.published_at);
        return order === "newest" ? difference : -difference;
      });
  }, [order, query, rows, status]);
  const filtersActive = Boolean(query.trim()) || status !== "all" || order !== "newest";

  return (
    <section className="overflow-hidden rounded-panel border border-line bg-surface shadow-panel">
      <header className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="grid max-w-xl gap-1.5">
          <h2 className="m-0 text-lg">Published versions</h2>
          <p className="m-0 text-sm leading-6 text-muted">
            Review what learners received, app compatibility, and previous
            versions available to restore.
          </p>
        </div>
        <StatusBadge tone="neutral">
          {rows.length} {rows.length === 1 ? "VERSION" : "VERSIONS"}
        </StatusBadge>
      </header>

      {rows.length ? (
        <FilterToolbar
          active={filtersActive}
          onReset={() => {
            setQuery("");
            setStatus("all");
            setOrder("newest");
          }}
          onSearchChange={setQuery}
          resultLabel={`Showing ${visibleRows.length} of ${rows.length} versions`}
          searchLabel="Search published versions"
          searchPlaceholder="Search release notes, version, or Android compatibility"
          searchValue={query}
        >
          <SelectField
            allowEmpty={false}
            ariaLabel="Filter published versions by status"
            className="w-full sm:w-40"
            onValueChange={(value) => setStatus(value as ReleaseStatus)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "current", label: "Current" },
              { value: "previous", label: "Previous" },
              { value: "restored", label: "Restored" },
            ]}
            value={status}
          />
          <SelectField
            allowEmpty={false}
            ariaLabel="Sort published versions"
            className="w-full sm:w-40"
            onValueChange={(value) => setOrder(value as ReleaseOrder)}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
            ]}
            value={order}
          />
        </FilterToolbar>
      ) : null}

      {visibleRows.length ? (
        <div className="grid px-5">
          {visibleRows.map(({ row, index }) => (
            <PublishedVersion
              active={index === 0}
              key={row.id}
              onRestore={() => onRestore(row)}
              row={row}
            />
          ))}
        </div>
      ) : rows.length ? (
        <div>
          <EmptyState
            detail="Try another search term or clear the current filters."
            title="No versions match"
          />
        </div>
      ) : (
        <div className="border-t border-line">
          <EmptyState
            detail="Check and publish the current curriculum to create the first learner release."
            title="No published versions"
          />
        </div>
      )}
    </section>
  );
}

function PublishedVersion({
  active,
  onRestore,
  row,
}: {
  active: boolean;
  onRestore: () => Promise<void>;
  row: ReleaseRow;
}) {
  return (
    <article className="grid gap-4 border-t border-line py-5 first:border-t-0 sm:grid-cols-[64px_minmax(0,1fr)]">
      <div
        aria-label={`Version ${row.release_version}`}
        className="grid size-14 place-items-center self-start rounded-control border border-signal-green/70 bg-signal-green-soft font-mono text-xs font-semibold text-signal-green"
      >
        V{row.release_version}
      </div>
      <div className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="m-0 break-words text-base">{row.changelog}</h3>
              {active ? (
                <StatusBadge tone="green">CURRENT</StatusBadge>
              ) : row.rollback_of ? (
                <StatusBadge tone="orange">RESTORED</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">PREVIOUS</StatusBadge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {formatDate(row.published_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Smartphone className="size-3.5" />
                Android {row.minimum_app_version} or newer
              </span>
            </div>
          </div>
          {!active ? (
            <ConfirmAction
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line bg-transparent px-3 text-xs font-semibold text-copy hover:border-muted hover:bg-raised disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
              confirmLabel="RESTORE VERSION"
              detail={`Version ${row.release_version} will be copied into a new published version. Existing releases and audit records remain unchanged.`}
              onConfirm={onRestore}
              title={`Restore version ${row.release_version}?`}
              tone="warning"
            >
              <History /> RESTORE
            </ConfirmAction>
          ) : null}
        </div>

        <details className="group border-t border-line/70 pt-3 text-xs text-muted">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-2 font-semibold text-copy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal-orange">
            RELEASE DETAILS
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <dl className="mt-3 grid gap-3 rounded-control bg-raised/55 p-4 sm:grid-cols-2">
            <Metadata label="Release ID" value={row.id} />
            <Metadata label="Checksum" value={`${row.checksum.slice(0, 16)}…`} />
          </dl>
        </details>
      </div>
    </article>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="font-mono text-[0.6rem] font-semibold tracking-[0.08em] text-muted">
        {label.toUpperCase()}
      </dt>
      <dd className="m-0 truncate font-mono text-xs text-copy" title={value}>
        {value}
      </dd>
    </div>
  );
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
