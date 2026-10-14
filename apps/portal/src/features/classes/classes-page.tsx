import { Plus } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InputField } from "@/components/ui/form-field";
import { LoadingButtonContent } from "@/components/ui/loading-content";
import { Panel } from "@/components/ui/panel";
import { SelectField } from "@/components/ui/select";
import { ClassShareCard } from "@/features/classes/class-share-card";
import { createWorkshopClass } from "@/lib/api/workshop-service";
import type { WorkshopClassRow, WorkshopRow } from "@/lib/api/types";

const normalizeClassTitle = (value: string) => value.trim().replace(/\s+/g, " ");

export function Classes({
  selected,
  classes,
  selectedClassId: controlledClassId,
  onSelectClass,
  onCreated,
  onNotice,
}: {
  selected: WorkshopRow;
  classes: WorkshopClassRow[];
  selectedClassId?: string;
  onSelectClass?: (id: string) => void;
  onCreated: () => void | Promise<void>;
  onNotice: (value: string) => void;
}) {
  const [selectedClassId, setSelectedClassId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [createError, setCreateError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const selectedClass = classes.find((row) => row.id === (controlledClassId ?? selectedClassId)) ?? classes[0];
  const normalizedTitle = normalizeClassTitle(title).toLocaleLowerCase();
  const duplicate = classes.find(
    (row) => !row.archived && normalizeClassTitle(row.title).toLocaleLowerCase() === normalizedTitle,
  );
  const validTitle = normalizeClassTitle(title).length >= 3 && normalizeClassTitle(title).length <= 120;

  const openCreate = () => {
    setTitle(classes.length ? "" : `${selected.title} class`);
    setCreateError(undefined);
    setCreateOpen(true);
  };
  const create = async () => {
    if (creatingRef.current || !selected.current_version_id) return;
    if (!validTitle || duplicate) {
      setCreateError(duplicate
        ? "A class with this name already exists. Select it above or enter a different name."
        : "Enter a class name between 3 and 120 characters.");
      return;
    }
    creatingRef.current = true;
    setCreating(true);
    setCreateError(undefined);
    try {
      const result = await createWorkshopClass(selected.id, normalizeClassTitle(title));
      setSelectedClassId(result.classId);
      onSelectClass?.(result.classId);
      setCreateOpen(false);
      onNotice("Class created. Its separate roster and join code are ready below.");
      await onCreated();
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : "The class could not be created.");
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  return (
    <>
      <Panel className="grid content-start gap-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <h2 className="m-0 text-lg font-bold">Classes</h2>
            <p className="m-0 max-w-2xl text-sm leading-6 text-muted">
              Use one class for each learner group. Each class has its own roster and invitation code.
            </p>
          </div>
          <Button disabled={!selected.current_version_id} onClick={openCreate} tone={classes.length ? "secondary" : "primary"}>
            <Plus /> {classes.length ? "NEW CLASS" : "CREATE CLASS"}
          </Button>
        </header>
        {!selected.current_version_id ? (
          <p className="m-0 text-sm leading-6 text-muted">Publish this lesson collection before creating a class.</p>
        ) : null}
        {selectedClass ? (
          <>
            {classes.length > 1 && !onSelectClass ? (
              <div className="grid max-w-lg gap-1.5">
                <span className="text-xs font-semibold">Choose a class to manage</span>
                <SelectField
                  allowEmpty={false}
                  ariaLabel="Choose a class to manage"
                  onValueChange={setSelectedClassId}
                  options={classes.map((row) => ({
                    value: row.id,
                    label: `${row.title} · ${row.join_code} · ${row.join_enabled ? "Open" : "Closed"}`,
                  }))}
                  value={selectedClass.id}
                />
              </div>
            ) : null}
            <div className="min-w-0 border-t border-line pt-5">
              <ClassShareCard key={selectedClass.id} onChanged={onCreated} onNotice={onNotice} row={selectedClass} />
            </div>
          </>
        ) : (
          <p className="m-0 rounded-control border border-dashed border-line px-4 py-6 text-sm text-muted">
            No classes have been created from this collection yet. Create one to invite learners.
          </p>
        )}
      </Panel>
      <Dialog
        closeDisabled={creating}
        description={classes.length
          ? "Create another class only for a different learner group. It will have a separate roster and join code; existing classes stay unchanged."
          : "Create a private class for this learner group. It will receive its own roster and join code."}
        onOpenChange={(open) => { if (!creatingRef.current) setCreateOpen(open); }}
        open={createOpen}
        title={classes.length ? "Create another class" : "Create a class"}
      >
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void create(); }}>
          <InputField
            autoFocus
            label="Class name"
            maxLength={120}
            onChange={(event) => { setTitle(event.target.value); setCreateError(undefined); }}
            placeholder="e.g. Networking 101 – Section B"
            value={title}
          />
          {duplicate ? (
            <p className="m-0 text-sm leading-6 text-signal-orange" role="alert">
              A class with this name already exists. Select it instead or use a different name.
            </p>
          ) : null}
          {createError && !duplicate ? (
            <p className="m-0 text-sm leading-6 text-signal-red" role="alert">{createError}</p>
          ) : null}
          <p className="m-0 text-xs leading-5 text-muted">
            This class will use the collection version currently published. Publishing later edits will not change it.
          </p>
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <Button disabled={creating} onClick={() => setCreateOpen(false)} tone="outline">CANCEL</Button>
            <Button disabled={creating || !validTitle || Boolean(duplicate)} type="submit" tone="primary">
              {creating ? <LoadingButtonContent label="CREATING CLASS..." /> : <><Plus /> CREATE CLASS</>}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
