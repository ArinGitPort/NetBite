import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { createMemoryRouter, Link, Outlet, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, test } from "vitest";

import { UnsavedChangesProvider, useGuardedTransition, useUnsavedDraft } from "@/app/providers/unsaved-changes-provider";

function Editor({ saveResult = true, blockedReason }: { saveResult?: boolean; blockedReason?: string }) {
  const [dirty, setDirty] = useState(false);
  const [localState, setLocalState] = useState("EDITOR");
  const requestTransition = useGuardedTransition();
  useUnsavedDraft("test-draft", {
    dirty,
    save: async () => {
      if (!saveResult) return false;
      setDirty(false);
      return true;
    },
    discard: () => setDirty(false),
    saveBlockedReason: blockedReason,
  });
  return <div>
    <span>{localState}</span>
    <button onClick={() => setDirty(true)}>EDIT DRAFT</button>
    <button onClick={() => requestTransition(() => setLocalState("LOCAL TRANSITION"))}>SWITCH ITEM</button>
    <Link to="/next">NEXT PAGE</Link>
  </div>;
}

function renderEditor(options?: { saveResult?: boolean; blockedReason?: string }) {
  const router = createMemoryRouter([
    {
      element: <UnsavedChangesProvider><Outlet /></UnsavedChangesProvider>,
      children: [
        { path: "/", element: <Editor {...options} /> },
        { path: "/start", element: <h1>START PAGE</h1> },
        { path: "/next", element: <h1>NEXT PAGE</h1> },
      ],
    },
  ], { initialEntries: ["/"] });
  render(<RouterProvider router={router} />);
  return router;
}

describe("UnsavedChangesProvider", () => {
  afterEach(cleanup);

  test("keeps editing or discards before a local transition", async () => {
    renderEditor();
    fireEvent.click(screen.getByText("EDIT DRAFT"));
    fireEvent.click(screen.getByText("SWITCH ITEM"));
    expect(await screen.findByRole("dialog", { name: "Leave with unsaved changes?" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("KEEP EDITING"));
    expect(screen.getByText("EDITOR")).toBeInTheDocument();

    fireEvent.click(screen.getByText("SWITCH ITEM"));
    fireEvent.click(await screen.findByText("DISCARD AND LEAVE"));
    expect(await screen.findByText("LOCAL TRANSITION")).toBeInTheDocument();
  });

  test("saves successfully before route navigation", async () => {
    renderEditor();
    fireEvent.click(screen.getByText("EDIT DRAFT"));
    fireEvent.click(screen.getByText("NEXT PAGE"));
    fireEvent.click(await screen.findByText("SAVE AND LEAVE"));
    expect(await screen.findByRole("heading", { name: "NEXT PAGE" })).toBeInTheDocument();
  });

  test("retains the editor when saving fails", async () => {
    renderEditor({ saveResult: false });
    fireEvent.click(screen.getByText("EDIT DRAFT"));
    fireEvent.click(screen.getByText("SWITCH ITEM"));
    fireEvent.click(await screen.findByText("SAVE AND LEAVE"));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
    expect(screen.getByText("EDITOR")).toBeInTheDocument();
  });

  test("blocks browser-history navigation while dirty", async () => {
    const router = renderEditor();
    await act(async () => { await router.navigate("/start"); });
    await act(async () => { await router.navigate("/"); });
    fireEvent.click(screen.getByText("EDIT DRAFT"));
    await act(async () => { await router.navigate(-1); });
    expect(await screen.findByRole("dialog", { name: "Leave with unsaved changes?" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("DISCARD AND LEAVE"));
    expect(await screen.findByRole("heading", { name: "START PAGE" })).toBeInTheDocument();
  });

  test("disables saving when the draft reports a blocking validation error", async () => {
    renderEditor({ blockedReason: "Resolve topology errors before saving." });
    fireEvent.click(screen.getByText("EDIT DRAFT"));
    fireEvent.click(screen.getByText("NEXT PAGE"));
    expect(await screen.findByRole("status")).toHaveTextContent("Resolve topology errors before saving.");
    expect(screen.getByText("SAVE AND LEAVE")).toBeDisabled();
  });

  test("guards browser unload only while dirty", async () => {
    renderEditor();
    const cleanEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    fireEvent.click(screen.getByText("EDIT DRAFT"));
    await waitFor(() => {
      const dirtyEvent = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(dirtyEvent);
      expect(dirtyEvent.defaultPrevented).toBe(true);
    });
  });
});
