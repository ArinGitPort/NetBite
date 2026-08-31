import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/form-field";
import { Panel } from "@/components/ui/panel";
import { ClassShareCard } from "@/features/classes/class-share-card";
import { createWorkshopClass } from "@/lib/api/workshop-service";
import type { WorkshopClassRow, WorkshopRow } from "@/lib/api/types";

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
    const result = await createWorkshopClass(selected.id, title);
    onNotice(`Class created. Join code: ${result.joinCode}`);
    onCreated();
  };
  return (
    <div className="grid gap-5">
      <Panel className="grid content-start gap-5">
        <div className="grid gap-2">
          <h2 className="m-0 text-lg font-bold">Create a class</h2>
          <p className="m-0 max-w-2xl leading-7 text-muted">
            Each class stays pinned to the lesson collection version used when
            it was created.
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
            <Plus /> CREATE PRIVATE CLASS
          </Button>
          {!selected.current_version_id ? (
            <p className="m-0 text-sm leading-6 text-muted">
              Publish the lesson collection before creating a class.
            </p>
          ) : null}
        </div>
      </Panel>
      <Panel>
        <h2 className="mb-4 text-lg font-bold">Class sharing</h2>
        {classes.map((row) => (
          <ClassShareCard
            key={row.id}
            onChanged={onCreated}
            onNotice={onNotice}
            row={row}
          />
        ))}
        {!classes.length ? (
          <p className="m-0 text-muted">
            No classes created from this lesson collection yet.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
