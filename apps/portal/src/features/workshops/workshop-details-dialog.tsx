import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Feedback } from "@/components/ui/feedback";
import { InputField, TextareaField } from "@/components/ui/form-field";
import type { WorkshopRow } from "@/lib/api/types";

export type WorkshopDetailsMode =
  | { kind: "create" }
  | {
      kind: "edit";
      workshop: WorkshopRow;
      canDelete: boolean;
      deleteReason?: string;
    };

interface WorkshopDetailsDialogProps {
  mode: WorkshopDetailsMode;
  onClose: () => void;
  onCreate: (title: string, description: string) => Promise<void>;
  onSave: (workshop: WorkshopRow) => Promise<void>;
  onDelete: (workshop: WorkshopRow) => Promise<void>;
}

function validateDetails(title: string, description: string) {
  const cleanTitle = title.trim();
  const cleanDescription = description.trim();
  if (cleanTitle.length < 3 || cleanTitle.length > 120) {
    return "Use a collection name between 3 and 120 characters.";
  }
  if (cleanDescription.length > 1000) {
    return "Keep the collection description within 1,000 characters.";
  }
  return undefined;
}

export function WorkshopDetailsDialog({
  mode,
  onClose,
  onCreate,
  onSave,
  onDelete,
}: WorkshopDetailsDialogProps) {
  const workshop = mode.kind === "edit" ? mode.workshop : undefined;
  const [title, setTitle] = useState(workshop?.title ?? "");
  const [description, setDescription] = useState(workshop?.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setTitle(workshop?.title ?? "");
    setDescription(workshop?.description ?? "");
    setConfirmDelete(false);
    setError(undefined);
  }, [workshop?.id]);

  const submit = async () => {
    const validation = validateDetails(title, description);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      if (workshop) {
        await onSave({
          ...workshop,
          title: title.trim(),
          description: description.trim(),
        });
      } else {
        await onCreate(title.trim(), description.trim());
      }
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The lesson collection could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!workshop || mode.kind !== "edit" || !mode.canDelete || !confirmDelete)
      return;
    setBusy(true);
    setError(undefined);
    try {
      await onDelete(workshop);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The lesson collection could not be deleted.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      closeDisabled={busy}
      description={
        workshop
          ? "Update the name students will recognize and the description shown before enrollment."
          : "A lesson collection keeps related lessons, network visuals, flashcards, and assessments together. It remains private until you publish it."
      }
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      open
      title={
        workshop ? "Lesson collection details" : "Create a lesson collection"
      }
    >
      <p className="mb-2 font-mono text-[0.65rem] font-semibold tracking-[0.13em] text-signal-orange">
        {workshop ? "COLLECTION SETTINGS" : "NEW LESSON COLLECTION"}
      </p>
      <div className="grid gap-5">
        <InputField
          autoFocus
          label="Collection name"
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="IPv4 troubleshooting review"
          value={title}
        />
        <TextareaField
          hint={`${description.length} / 1000`}
          label="Description"
          maxLength={1000}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Explain what students will study in this collection."
          rows={4}
          value={description}
        />
      </div>
      {error ? (
        <div className="mt-5">
          <Feedback tone="error">{error}</Feedback>
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-end gap-2.5">
        <Button disabled={busy} onClick={onClose} tone="ghost">
          CANCEL
        </Button>
        <Button disabled={busy} onClick={() => void submit()} tone="primary">
          {workshop ? <Save /> : <Plus />}
          {busy ? "SAVING..." : workshop ? "SAVE CHANGES" : "CREATE COLLECTION"}
        </Button>
      </div>
      {workshop && mode.kind === "edit" ? (
        <section className="mt-7 grid grid-cols-1 items-center gap-5 border-t border-signal-red/30 pt-6 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <strong className="text-copy">Delete lesson collection</strong>
            <p className="mb-0 mt-1 text-xs leading-6 text-muted">
              {mode.canDelete
                ? "This permanently removes the private draft and its unfinished content."
                : mode.deleteReason}
            </p>
          </div>
          {mode.canDelete ? (
            confirmDelete ? (
              <div className="grid-column-[1/-1] col-span-full rounded-control border border-signal-red/60 bg-signal-red-soft p-4">
                <p className="mb-3 text-copy">
                  This cannot be undone. Delete{" "}
                  <strong>{workshop.title}</strong>?
                </p>
                <div className="flex flex-wrap justify-end gap-2.5">
                  <Button
                    disabled={busy}
                    onClick={() => setConfirmDelete(false)}
                    tone="ghost"
                  >
                    KEEP COLLECTION
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => void remove()}
                    tone="danger"
                  >
                    <Trash2 />
                    DELETE PERMANENTLY
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                tone="danger"
              >
                <Trash2 />
                DELETE DRAFT
              </Button>
            )
          ) : null}
        </section>
      ) : null}
    </Dialog>
  );
}
