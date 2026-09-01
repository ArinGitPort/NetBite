import { RefreshCw, Rocket } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  ConfirmAction,
  Field,
  PageIntro,
  StatusBadge,
} from "@/components/ui/admin-primitives";
import { Button } from "@/components/ui/button";
import { PublishedVersions } from "@/features/publishing/published-versions";
import * as publishingApi from "@/lib/api/publishing-service";
import type { ReleaseRow } from "@/lib/api/types";

export function Releases() {
  const [rows, setRows] = useState<ReleaseRow[]>([]);
  const [validation, setValidation] =
    useState<Awaited<ReturnType<typeof publishingApi.validateRelease>>>();
  const [changelog, setChangelog] = useState("");
  const [minimum, setMinimum] = useState("1.0.0");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const publishRequestIds = useRef(new Map<string, string>());
  const restoreRequestIds = useRef(new Map<string, string>());
  const load = () => publishingApi.getReleases().then(setRows);

  useEffect(() => {
    void load();
  }, []);

  const validate = async () => {
    setBusy(true);
    try {
      const result = await publishingApi.validateRelease();
      setValidation(result);
      setNotice(
        result.valid
          ? "The draft is ready to publish."
          : `${result.issues.length} ${result.issues.length === 1 ? "issue must" : "issues must"} be corrected.`,
      );
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!validation?.valid) return;
    const requestKey = `${minimum.trim()}\u0000${changelog.trim()}`;
    const operationId =
      publishRequestIds.current.get(requestKey) ?? crypto.randomUUID();
    publishRequestIds.current.set(requestKey, operationId);
    setBusy(true);
    try {
      const result = await publishingApi.publishRelease(
        changelog,
        minimum,
        operationId,
      );
      publishRequestIds.current.delete(requestKey);
      setNotice(`Version ${result.releaseVersion} published.`);
      setChangelog("");
      setValidation(undefined);
      await load();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restore = (row: ReleaseRow) => {
    const operationId =
      restoreRequestIds.current.get(row.id) ?? crypto.randomUUID();
    restoreRequestIds.current.set(row.id, operationId);
    return publishingApi.rollbackRelease(row.id, operationId).then(() => {
      restoreRequestIds.current.delete(row.id);
      setNotice("Previous curriculum version restored.");
      return load();
    });
  };

  return (
    <>
      <PageIntro
        detail="Learners receive only complete published versions. Saving a draft never changes the Android curriculum."
        eyebrow="PUBLISHING"
        title="Validate and publish"
      />
      {notice ? (
        <div className="mb-4 rounded-control border border-signal-green/60 bg-signal-green-soft p-3 text-sm text-signal-green">
          {notice}
        </div>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(320px,.7fr)_minmax(0,1.3fr)]">
        <section className="sticky top-24 grid gap-4 rounded-panel border border-line bg-surface p-5 shadow-panel max-xl:static">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 [&_h2]:m-0 [&_p]:mb-0">
            <div>
              <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
                CONTENT CHECK
              </p>
              <h2>Prepare the next release</h2>
            </div>
            <StatusBadge
              tone={validation?.valid ? "green" : validation ? "red" : "neutral"}
            >
              {validation?.valid
                ? "VALID"
                : validation
                  ? "ACTION NEEDED"
                  : "NOT CHECKED"}
            </StatusBadge>
          </div>
          <Button disabled={busy} onClick={() => void validate()} tone="secondary">
            <RefreshCw /> CHECK CURRENT DRAFT
          </Button>
          {validation ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 [&>span]:grid [&>span]:rounded-control [&>span]:border [&>span]:border-line [&>span]:p-3 [&>span]:font-mono [&>span]:text-xs [&>span]:text-muted [&>span_strong]:text-lg [&>span_strong]:text-copy">
              {Object.entries(validation.totals).map(([label, value]) => (
                <span key={label}>
                  <strong>{value}</strong>
                  {label}
                </span>
              ))}
              {validation.issues.map((issue) => (
                <div
                  className="col-span-full rounded-control border border-signal-red/50 bg-signal-red-soft p-3 [&_strong]:text-xs [&_strong]:text-signal-red [&_p]:mb-0 [&_p]:mt-1 [&_p]:text-sm"
                  key={`${issue.area}-${issue.message}`}
                >
                  <strong>{issue.area}</strong>
                  <p>{issue.message}</p>
                </div>
              ))}
            </div>
          ) : null}
          <Field label="What changed in this version?">
            <textarea
              onChange={(event) => setChangelog(event.target.value)}
              placeholder="Explain what learners and instructors should know about this version."
              rows={4}
              value={changelog}
            />
          </Field>
          <Field label="Minimum Android app version">
            <input
              onChange={(event) => setMinimum(event.target.value)}
              pattern="\d+\.\d+\.\d+"
              value={minimum}
            />
          </Field>
          <ConfirmAction
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-copy/85 hover:text-canvas active:bg-copy/75 disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
            confirmLabel="PUBLISH RELEASE"
            detail="This publishes one complete curriculum version to connected Android devices. Your drafts remain available for future changes."
            disabled={busy || !validation?.valid || changelog.trim().length < 3}
            eyebrow="PUBLISH CURRICULUM"
            onConfirm={publish}
            title="Publish this curriculum version?"
            tone="warning"
          >
            <Rocket /> PUBLISH VERSION
          </ConfirmAction>
        </section>
        <PublishedVersions onRestore={restore} rows={rows} />
      </div>
    </>
  );
}
