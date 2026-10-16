import { CheckCircle2, Clock3 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { usePortalAuth } from "@/app/providers/auth-provider";
import { BrandLockup } from "@/components/ui/brand-lockup";
import { Button as UiButton } from "@/components/ui/button";
import { Feedback as UiFeedback } from "@/components/ui/feedback";
import { InputField } from "@/components/ui/form-field";
import { ThemeMenu } from "@/components/ui/theme-menu";
import { LoginAmbient } from "@/features/auth/login-ambient";
import { getOwnInstructorRequest, requestInstructorAccess, type InstructorRequestStatus } from "@/lib/api/instructor-registration-service";

type RequestState = InstructorRequestStatus | "loading" | "none" | "error";

interface SignedInAccount {
  user: { id: string; email?: string; user_metadata?: unknown };
}

function registrationProfile(session: SignedInAccount) {
  const metadata = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName = typeof metadata?.display_name === "string" ? metadata.display_name.trim() : "";
  const institution = typeof metadata?.institution === "string" ? metadata.institution.trim() : "";
  return {
    displayName,
    institution,
    canSubmit: metadata?.instructor_registration === true
      && displayName.length >= 2 && displayName.length <= 80
      && institution.length >= 2 && institution.length <= 160,
  };
}

export function PendingInstructorAccess({ session, onLogout }: { session: SignedInAccount; onLogout: () => void }) {
  const { refreshAccess } = usePortalAuth();
  const profile = registrationProfile(session);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [institution, setInstitution] = useState(profile.institution);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        let status = await getOwnInstructorRequest(session.user.id);
        if (!status && profile.canSubmit) {
          await requestInstructorAccess(profile.displayName, profile.institution);
          status = "pending";
        }
        if (active) setRequestState(status ?? "none");
      } catch {
        if (active) setRequestState("error");
      }
    };
    void load();
    return () => { active = false; };
  }, [profile.canSubmit, profile.displayName, profile.institution, session.user.id]);

  const checkAccess = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await refreshAccess();
      setRequestState((await getOwnInstructorRequest(session.user.id)) ?? "none");
    } catch {
      setError("We couldn't check your request right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const name = displayName.trim();
    const school = institution.trim();
    if (name.length < 2 || name.length > 80 || school.length < 2 || school.length > 160) {
      setError("Enter a full name and school or organization before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await requestInstructorAccess(name, school);
      setRequestState("pending");
    } catch {
      setError("Your request could not be submitted. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const needsForm = requestState === "none" || requestState === "declined" || requestState === "revoked";
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <LoginAmbient />
      <header className="relative z-20 flex min-h-16 items-center border-b border-line bg-canvas/75 px-5 backdrop-blur-xl sm:px-10">
        <BrandLockup />
        <div className="ml-auto"><ThemeMenu /></div>
      </header>
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-64px)] w-[min(640px,calc(100%-36px))] content-center py-10">
        <section aria-labelledby="access-title" className="rounded-panel border border-line bg-surface/95 p-6 shadow-panel sm:p-9">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-signal-green-soft text-signal-green">
              {requestState === "approved" ? <CheckCircle2 aria-hidden="true" className="size-5" /> : <Clock3 aria-hidden="true" className="size-5" />}
            </span>
            <div>
              <p className="mb-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-signal-green">Instructor access</p>
              <h1 id="access-title" className="m-0 text-2xl font-bold tracking-tight">
                {requestState === "pending" ? "Your request is in review" : requestState === "approved" ? "Your request was approved" : "Request instructor access"}
              </h1>
              <p className="mb-0 mt-2 text-sm text-muted">{session.user.email}</p>
            </div>
          </div>

          {requestState === "loading" ? <p role="status" className="mt-6 text-sm text-muted">Checking your request...</p> : null}
          {requestState === "pending" ? (
            <p className="mt-6 text-sm leading-7 text-muted">A NetBite administrator will review your teaching-account request. You can sign out and return later; your request will remain pending.</p>
          ) : null}
          {requestState === "approved" ? (
            <p className="mt-6 text-sm leading-7 text-muted">Approval is recorded. Check access to open your instructor workspace.</p>
          ) : null}
          {requestState === "error" ? <UiFeedback tone="error">Your request status could not be loaded. Check your connection and try again.</UiFeedback> : null}

          {needsForm ? (
            <form className="mt-6 grid gap-4 border-t border-line pt-6" onSubmit={submitRequest}>
              <p className="m-0 text-sm leading-6 text-muted">
                {requestState === "none"
                  ? "This account does not have a teaching request yet. Submit your details for administrator review."
                  : "You can update your details and request another review."}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField autoComplete="name" label="Full name" maxLength={80} minLength={2} onChange={(event) => { setDisplayName(event.target.value); setError(""); }} required value={displayName} />
                <InputField autoComplete="organization" label="School or organization" maxLength={160} minLength={2} onChange={(event) => { setInstitution(event.target.value); setError(""); }} required value={institution} />
              </div>
              <UiButton disabled={busy} tone="primary" type="submit">{busy ? "Submitting..." : "Submit request"}</UiButton>
            </form>
          ) : null}
          {error ? <div className="mt-4"><UiFeedback tone="error">{error}</UiFeedback></div> : null}
          <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
            <UiButton disabled={busy} onClick={() => void checkAccess()} tone="secondary">Check access</UiButton>
            <UiButton disabled={busy} onClick={onLogout} tone="ghost">Sign out</UiButton>
          </div>
        </section>
      </div>
    </main>
  );
}
