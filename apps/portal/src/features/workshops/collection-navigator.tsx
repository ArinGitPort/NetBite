import { BookOpen, Cable, ChevronDown, ClipboardCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { InputField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select";
import type { WorkshopRow } from "@/lib/api/types";

export type CollectionItem = {
  id: string;
  label: string;
  detail?: string;
  enrollment?: "open" | "closed";
  kind: "lesson" | "topology" | "assessment" | "class";
  active: boolean;
  onSelect: () => void;
};

const icons = { lesson: BookOpen, topology: Cable, assessment: ClipboardCheck, class: Users };

export function CollectionNavigator({
  workshops,
  selectedId,
  items,
  emptyLabel,
  filterClasses = false,
  onSelectCollection,
}: {
  workshops: WorkshopRow[];
  selectedId?: string;
  items: CollectionItem[];
  emptyLabel: string;
  filterClasses?: boolean;
  onSelectCollection: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState(selectedId);
  const [classQuery, setClassQuery] = useState("");
  const [enrollment, setEnrollment] = useState<"all" | "open" | "closed">("all");
  useEffect(() => { setExpandedId(selectedId); }, [selectedId]);
  const visibleItems = filterClasses ? items.filter((item) => {
    const matchesQuery = `${item.label} ${item.detail ?? ""}`.toLocaleLowerCase().includes(classQuery.trim().toLocaleLowerCase());
    return matchesQuery && (enrollment === "all" || item.enrollment === enrollment);
  }) : items;

  return (
    <nav aria-label="Your collections" className="themed-scrollbar flex min-w-0 flex-col overflow-y-auto border-r border-line bg-sidebar px-4 py-5 max-lg:border-b max-lg:border-r-0">
      <strong className="px-2 font-mono text-[0.62rem] tracking-[0.08em] text-muted">YOUR COLLECTIONS</strong>
      {filterClasses ? (
        <div className="mt-5 grid gap-4 border-b border-line px-2 pb-5">
          <InputField
            aria-label="Search classes by name or code"
            label="SEARCH CLASSES"
            onChange={(event) => setClassQuery(event.target.value)}
            placeholder="Name or join code"
            type="search"
            value={classQuery}
          />
          <div className="grid min-w-0 gap-1.5">
            <span className="text-[0.68rem] font-semibold text-copy">ENROLLMENT</span>
            <SelectField
              allowEmpty={false}
              ariaLabel="Filter classes by enrollment"
              onValueChange={(value) => setEnrollment(value as "all" | "open" | "closed")}
              options={[
                { value: "all", label: "All classes" },
                { value: "open", label: "Enrollment open" },
                { value: "closed", label: "Enrollment closed" },
              ]}
              value={enrollment}
            />
          </div>
        </div>
      ) : null}
      <div className="mt-5 grid content-start gap-3">
      {workshops.map((workshop) => {
        const selected = workshop.id === selectedId;
        const expanded = selected && expandedId === workshop.id;
        const contentId = `collection-content-${workshop.id}`;
        return (
          <div className="min-w-0 border-b border-line/70 pb-4" key={workshop.id}>
            <button
              aria-controls={expanded ? contentId : undefined}
              aria-expanded={expanded}
              className={`flex min-h-16 w-full min-w-0 items-center justify-between gap-3 border-l-2 px-3 py-2 text-left transition-colors hover:text-copy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange ${selected ? "border-signal-orange text-copy" : "border-transparent text-muted"}`}
              onClick={() => {
                if (selected) setExpandedId((current) => current === workshop.id ? undefined : workshop.id);
                else onSelectCollection(workshop.id);
              }}
              type="button"
            >
              <span className="grid min-w-0 gap-1.5">
                <span className="break-words font-semibold">{workshop.title}</span>
                <small className="text-muted">{workshop.current_version_id ? "Published" : "Draft"}</small>
              </span>
              <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded ? (
              <div className="grid gap-1 pt-2" id={contentId}>
                {visibleItems.length ? visibleItems.map((item) => {
                  const Icon = icons[item.kind];
                  return (
                    <button
                      aria-current={item.active ? "page" : undefined}
                      className={`flex min-h-12 min-w-0 items-start gap-3 border-l-2 px-3 py-2.5 text-left text-xs leading-5 transition-colors hover:text-copy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange ${item.active ? "border-signal-green font-semibold text-copy" : "border-transparent text-muted"}`}
                      key={`${item.kind}-${item.id}`}
                      onClick={item.onSelect}
                      type="button"
                    >
                      <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                      <span className="grid min-w-0 gap-0.5">
                        <span className="break-words">{item.label}</span>
                        {item.detail ? <small className="font-mono text-[0.64rem] font-normal tracking-[0.04em] text-muted">{item.detail}</small> : null}
                      </span>
                    </button>
                  );
                }) : <p className="m-0 px-3 py-3 text-xs leading-5 text-muted">{filterClasses && items.length ? "No classes match these filters." : emptyLabel}</p>}
                {filterClasses && items.length ? <p className="m-0 px-3 pt-2 text-[0.65rem] text-muted" role="status">Showing {visibleItems.length} of {items.length} classes</p> : null}
              </div>
            ) : null}
          </div>
        );
      })}
      </div>
    </nav>
  );
}
