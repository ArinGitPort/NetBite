import { CheckCircle2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageIntro, StatusBadge } from "@/components/ui/admin-primitives";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/ui/feedback";
import * as instructorApi from "@/lib/api/instructor-service";
import type { InstructorRequestRow } from "@/lib/api/types";

function Notice({
  message,
  error = false,
}: {
  message?: string;
  error?: boolean;
}) {
  return message ? (
    <div className="mb-4">
      <Feedback tone={error ? "error" : "success"}>{message}</Feedback>
    </div>
  ) : null;
}

export function InstructorApprovals() {
  const [rows, setRows] = useState<InstructorRequestRow[]>([]);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      setRows(await instructorApi.getInstructorRequests());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Requests could not be loaded.",
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const review = async (
    row: InstructorRequestRow,
    decision: "approved" | "declined" | "revoked",
  ) => {
    setError(undefined);
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
          : "The request could not be updated.",
      );
    }
  };
  return (
    <>
      <PageIntro
        detail="Approve teaching accounts before they can create lesson collections and classes. Approval never grants official curriculum administration."
        eyebrow="ACCOUNT APPROVAL"
        title="Instructor access"
      />
      <Notice message={error || notice} error={Boolean(error)} />
      <section className="rounded-panel border border-line bg-surface p-5 shadow-panel">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 [&_h2]:m-0 [&_p]:mb-0">
          <div>
            <h2>Access requests</h2>
            <p>
              Review the instructor’s name, institution, and stated purpose
              before deciding.
            </p>
          </div>
          <StatusBadge>
            {rows.filter((row) => row.status === "pending").length} pending
          </StatusBadge>
        </div>
        <div className="grid">
          {rows.map((row) => (
            <article
              key={row.user_id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 border-t border-line py-5 max-sm:grid-cols-1"
            >
              <div>
                <StatusBadge>{row.status}</StatusBadge>
                <h3>{row.display_name}</h3>
                <strong>{row.institution}</strong>
                <p>{row.reason || "No additional note provided."}</p>
                <small>
                  Requested {new Date(row.requested_at).toLocaleString()}
                </small>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {row.status === "pending" ||
                row.status === "declined" ||
                row.status === "revoked" ? (
                  <Button
                    onClick={() => void review(row, "approved")}
                    tone="primary"
                  >
                    <CheckCircle2 />
                    APPROVE INSTRUCTOR
                  </Button>
                ) : null}
                {row.status === "pending" ? (
                  <Button
                    onClick={() => void review(row, "declined")}
                    tone="ghost"
                  >
                    DECLINE
                  </Button>
                ) : null}
                {row.status === "approved" ? (
                  <Button
                    onClick={() => void review(row, "revoked")}
                    tone="destructive"
                  >
                    <Trash2 />
                    REVOKE ACCESS
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {!rows.length ? (
          <p>No instructor requests have been submitted.</p>
        ) : null}
      </section>
    </>
  );
}
