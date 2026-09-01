import { createContext, type MutableRefObject, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export interface UnsavedDraftRegistration {
  dirty: boolean;
  save: () => boolean | Promise<boolean>;
  discard: () => void;
  saveBlockedReason?: string;
}

interface UnsavedChangesContextValue {
  notifyRegistrationChanged: () => void;
  register: (id: string, registration: MutableRefObject<UnsavedDraftRegistration>) => () => void;
  requestTransition: (transition: () => void) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | undefined>(undefined);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const registrations = useRef(new Map<string, MutableRefObject<UnsavedDraftRegistration>>());
  const [revision, setRevision] = useState(0);
  const [pendingTransition, setPendingTransition] = useState<(() => void) | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const notifyRegistrationChanged = useCallback(() => setRevision((value) => value + 1), []);
  const register = useCallback((id: string, registration: MutableRefObject<UnsavedDraftRegistration>) => {
    registrations.current.set(id, registration);
    notifyRegistrationChanged();
    return () => {
      registrations.current.delete(id);
      notifyRegistrationChanged();
    };
  }, [notifyRegistrationChanged]);

  const activeDrafts = useMemo(
    () => [...registrations.current.values()].map(({ current }) => current).filter(({ dirty }) => dirty),
    // Registration changes explicitly advance the revision counter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
  const dirty = activeDrafts.length > 0;
  const saveBlockedReason = activeDrafts.find((draft) => draft.saveBlockedReason)?.saveBlockedReason;
  const blocker = useBlocker(dirty);

  useBeforeUnload(useCallback((event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  }, [dirty]));

  const requestTransition = useCallback((transition: () => void) => {
    const hasDirtyDraft = [...registrations.current.values()].some(({ current }) => current.dirty);
    if (!hasDirtyDraft) {
      transition();
      return;
    }
    setError("");
    setPendingTransition(() => transition);
  }, []);

  const finishTransition = useCallback(() => {
    const transition = pendingTransition;
    setPendingTransition(undefined);
    setError("");
    if (blocker.state === "blocked") blocker.proceed();
    else transition?.();
  }, [blocker, pendingTransition]);

  const keepEditing = useCallback(() => {
    if (busy) return;
    setPendingTransition(undefined);
    setError("");
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker, busy]);

  const discardAndLeave = useCallback(() => {
    for (const draft of activeDrafts) draft.discard();
    finishTransition();
  }, [activeDrafts, finishTransition]);

  const saveAndLeave = useCallback(async () => {
    if (saveBlockedReason) {
      setError(saveBlockedReason);
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const draft of activeDrafts) {
        if (!await draft.save()) {
          setError("The draft could not be saved. Your changes are still available in the editor.");
          return;
        }
      }
      finishTransition();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The draft could not be saved. Your changes are still available in the editor.");
    } finally {
      setBusy(false);
    }
  }, [activeDrafts, finishTransition, saveBlockedReason]);

  const dialogOpen = blocker.state === "blocked" || Boolean(pendingTransition);
  const value = useMemo(() => ({ notifyRegistrationChanged, register, requestTransition }), [notifyRegistrationChanged, register, requestTransition]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <Dialog
        closeDisabled={busy}
        description="Save the current draft before leaving, discard the unsaved changes, or return to the editor."
        onOpenChange={(open) => { if (!open) keepEditing(); }}
        open={dialogOpen}
        title="Leave with unsaved changes?"
      >
        {saveBlockedReason && !error ? <p className="m-0 rounded-control border border-signal-orange/60 bg-signal-orange-soft p-3 text-sm text-signal-orange" role="status">{saveBlockedReason}</p> : null}
        {error ? <p className="m-0 rounded-control border border-signal-red/60 bg-signal-red-soft p-3 text-sm text-signal-red" role="alert">{error}</p> : null}
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button disabled={busy} onClick={keepEditing} tone="outline">KEEP EDITING</Button>
          <Button disabled={busy} onClick={discardAndLeave} tone="destructive">DISCARD AND LEAVE</Button>
          <Button disabled={busy || Boolean(saveBlockedReason)} onClick={() => void saveAndLeave()} tone="primary">{busy ? "SAVING..." : "SAVE AND LEAVE"}</Button>
        </div>
      </Dialog>
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedDraft(id: string, registration: UnsavedDraftRegistration) {
  const context = useContext(UnsavedChangesContext);
  const registrationRef = useRef(registration);
  registrationRef.current = registration;

  useEffect(() => context?.register(id, registrationRef), [context, id]);
  useEffect(() => context?.notifyRegistrationChanged(), [context, registration.dirty, registration.saveBlockedReason]);
}

const immediateTransition = (transition: () => void) => transition();

export function useGuardedTransition() {
  const context = useContext(UnsavedChangesContext);
  return context?.requestTransition ?? immediateTransition;
}
