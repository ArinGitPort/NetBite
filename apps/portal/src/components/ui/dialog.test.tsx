import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";

afterEach(cleanup);

describe("ConfirmationDialog", () => {
  test("opens with cancel focused and restores focus when cancelled", async () => {
    render(
      <ConfirmationDialog
        confirmLabel="DELETE ITEM"
        description="This permanently removes the item."
        intent="destructive"
        onConfirm={vi.fn()}
        title="Delete this item?"
        trigger={<Button>OPEN CONFIRMATION</Button>}
      />,
    );

    const trigger = screen.getByRole("button", { name: "OPEN CONFIRMATION" });
    fireEvent.click(trigger);
    const cancel = await screen.findByRole("button", { name: "CANCEL" });
    await waitFor(() => expect(cancel).toHaveFocus());
    fireEvent.click(cancel);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  test("can be dismissed with the close button or backdrop", async () => {
    render(
      <ConfirmationDialog
        confirmLabel="CONTINUE"
        description="Review this action before continuing."
        onConfirm={vi.fn()}
        title="Continue?"
        trigger={<Button>OPEN CONFIRMATION</Button>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "OPEN CONFIRMATION" }));
    fireEvent.click(await screen.findByRole("button", { name: "Close confirmation" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "OPEN CONFIRMATION" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(document.querySelector("[data-confirmation-overlay]")!);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  test("waits for async success and prevents duplicate confirmation", async () => {
    let resolveAction: () => void = () => undefined;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => { resolveAction = resolve; }));
    render(
      <ConfirmationDialog
        busyLabel="DELETING..."
        confirmLabel="DELETE ITEM"
        description="This permanently removes the item."
        intent="destructive"
        onConfirm={onConfirm}
        title="Delete this item?"
        trigger={<Button>OPEN CONFIRMATION</Button>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "OPEN CONFIRMATION" }));
    fireEvent.click(await screen.findByRole("button", { name: "DELETE ITEM" }));
    const busyAction = screen.getByRole("button", { name: "DELETING..." });
    expect(busyAction).toBeDisabled();
    fireEvent.click(busyAction);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    resolveAction();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  test("keeps the dialog open and announces async failures", async () => {
    render(
      <ConfirmationDialog
        confirmLabel="PUBLISH"
        description="This makes the release available to learners."
        intent="warning"
        onConfirm={() => Promise.reject(new Error("Publishing is temporarily unavailable."))}
        title="Publish this release?"
        trigger={<Button>OPEN CONFIRMATION</Button>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "OPEN CONFIRMATION" }));
    fireEvent.click(await screen.findByRole("button", { name: "PUBLISH" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Publishing is temporarily unavailable.");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PUBLISH" })).toBeEnabled();
  });
});
