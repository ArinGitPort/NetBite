import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Classes } from "@/features/classes/classes-page";
import { createWorkshopClass } from "@/lib/api/workshop-service";
import type { WorkshopClassRow, WorkshopRow } from "@/lib/api/types";

vi.mock("@/features/classes/class-share-card", () => ({
  ClassShareCard: ({ row }: { row: WorkshopClassRow }) => <div data-testid="class-detail">{row.title}: {row.join_code}</div>,
}));
vi.mock("@/lib/api/workshop-service", () => ({ createWorkshopClass: vi.fn() }));

const workshop = {
  id: "workshop-1",
  title: "First Lesson",
  description: "Introductory networking",
  archived: false,
  current_version_id: "version-1",
  updated_at: "2026-08-27T00:00:00.000Z",
} as WorkshopRow;
const existing = [
  { id: "class-1", workshop_id: workshop.id, version_id: "version-1", title: "First Lesson class", join_code: "ABC12345", archived: false, join_enabled: true, created_at: "2026-08-27T00:00:00.000Z" },
  { id: "class-2", workshop_id: workshop.id, version_id: "version-1", title: "First Lesson class", join_code: "XYZ67890", archived: false, join_enabled: false, created_at: "2026-08-28T00:00:00.000Z" },
] satisfies WorkshopClassRow[];

beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("class management", () => {
  test("shows one class at a time and distinguishes existing duplicate names by join code", async () => {
    render(<Classes classes={existing} onCreated={vi.fn()} onNotice={vi.fn()} selected={workshop} />);

    expect(screen.getAllByTestId("class-detail")).toHaveLength(1);
    expect(screen.getByTestId("class-detail")).toHaveTextContent("ABC12345");
    expect(screen.queryByRole("textbox", { name: "Class name" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: "Choose a class to manage" }));
    fireEvent.click(await screen.findByRole("option", { name: /XYZ67890/ }));
    expect(screen.getByTestId("class-detail")).toHaveTextContent("XYZ67890");
  });

  test("blocks an accidental same-name class before calling the service", () => {
    render(<Classes classes={existing} onCreated={vi.fn()} onNotice={vi.fn()} selected={workshop} />);

    fireEvent.click(screen.getByRole("button", { name: "NEW CLASS" }));
    const dialog = screen.getByRole("dialog", { name: "Create another class" });
    expect(within(dialog).getByText(/separate roster and join code/i)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Class name" }), { target: { value: "  first  lesson CLASS  " } });

    expect(within(dialog).getByRole("alert")).toHaveTextContent("already exists");
    expect(within(dialog).getByRole("button", { name: "CREATE CLASS" })).toBeDisabled();
    expect(createWorkshopClass).not.toHaveBeenCalled();
  });

  test("creates a deliberately named second class and opens its details", async () => {
    const next = { ...existing[0], id: "class-3", title: "First Lesson – Section B", join_code: "NEW12345" };
    vi.mocked(createWorkshopClass).mockResolvedValue({ classId: next.id, joinCode: next.join_code, title: next.title, versionId: "version-1" });
    const notice = vi.fn();
    function Harness() {
      const [classes, setClasses] = useState<WorkshopClassRow[]>([existing[0]]);
      return <Classes classes={classes} onCreated={() => setClasses((rows) => [next, ...rows])} onNotice={notice} selected={workshop} />;
    }
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "NEW CLASS" }));
    const dialog = screen.getByRole("dialog", { name: "Create another class" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Class name" }), { target: { value: "  First Lesson – Section B  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "CREATE CLASS" }));

    await waitFor(() => expect(createWorkshopClass).toHaveBeenCalledWith(workshop.id, next.title));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Create another class" })).not.toBeInTheDocument());
    expect(screen.getByTestId("class-detail")).toHaveTextContent("NEW12345");
    expect(notice).toHaveBeenCalledWith(expect.stringContaining("Class created"));
  });

  test("keeps the creation dialog open with an actionable error when saving fails", async () => {
    vi.mocked(createWorkshopClass).mockRejectedValue(new Error("The class service is unavailable."));
    render(<Classes classes={[]} onCreated={vi.fn()} onNotice={vi.fn()} selected={workshop} />);

    fireEvent.click(screen.getByRole("button", { name: "CREATE CLASS" }));
    const dialog = screen.getByRole("dialog", { name: "Create a class" });
    expect(within(dialog).getByRole("textbox", { name: "Class name" })).toHaveValue("First Lesson class");
    fireEvent.click(within(dialog).getByRole("button", { name: "CREATE CLASS" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("The class service is unavailable.");
    expect(screen.getByRole("dialog", { name: "Create a class" })).toBeInTheDocument();
  });

  test("requires a published collection before creating the first class", () => {
    render(<Classes classes={[]} onCreated={vi.fn()} onNotice={vi.fn()} selected={{ ...workshop, current_version_id: undefined }} />);
    expect(screen.getByRole("button", { name: "CREATE CLASS" })).toBeDisabled();
    expect(screen.getByText(/Publish this lesson collection/i)).toBeInTheDocument();
  });
});
