import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PublishCollectionActionProps {
  title: string;
  archived: boolean;
  contentReady: boolean;
  lessonCount: number;
  assessmentCount: number;
  hasPublishedVersions: boolean;
  onPublish: () => Promise<void>;
}

export function PublishCollectionAction({
  title,
  archived,
  contentReady,
  lessonCount,
  assessmentCount,
  hasPublishedVersions,
  onPublish,
}: PublishCollectionActionProps) {
  const [open, setOpen] = useState(false);
  const disabled = !contentReady || !lessonCount || archived;
  const tooltip = archived ? "Restore this collection before publishing."
    : !contentReady ? "Loading collection content."
      : !lessonCount ? "Add a lesson before publishing."
        : "Create a fixed version that can be used in a class.";

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-copy/85 hover:text-canvas active:bg-copy/75 disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
              disabled={disabled}
              onClick={() => setOpen(true)}
              type="button"
            >
              <CheckCircle2 /> PUBLISH COLLECTION
            </button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
      <ConfirmationDialog
        busyLabel="PUBLISHING..."
        confirmLabel="PUBLISH COLLECTION"
        description={`Create a published version of ${title} for your learners.`}
        details={
          <div className="grid gap-5 text-sm">
            <div className="rounded-control border border-line bg-canvas p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-signal-green" />
                <div className="grid gap-1">
                  <h3 className="m-0 font-semibold text-copy">What publishing does</h3>
                  <p className="m-0 leading-6 text-muted">
                    Saves the current {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"} and {assessmentCount} {assessmentCount === 1 ? "assessment" : "assessments"} as a fixed version. Later edits will not change it.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 px-1">
              <h3 className="m-0 font-semibold text-copy">After publishing</h3>
              <ol className="m-0 grid gap-2 pl-5 leading-6 text-muted marker:font-semibold marker:text-signal-orange">
                <li>Open the <strong className="text-copy">Classes</strong> tab and create a class for this collection.</li>
                <li>Share the class code, QR code, or invitation link with your learners.</li>
              </ol>
              <p className="m-0 border-l-2 border-signal-green pl-3 leading-6 text-muted">
                Any assessments in this published version will also be available to learners in that class.
              </p>
              {hasPublishedVersions ? <p className="m-0 text-xs leading-5 text-muted">Existing classes stay on the version they were created with.</p> : null}
            </div>
          </div>
        }
        onConfirm={onPublish}
        onOpenChange={setOpen}
        open={open}
        title="Publish this collection?"
      />
    </>
  );
}
