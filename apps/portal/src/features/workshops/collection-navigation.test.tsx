import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkshopStudio } from "@/features/workshops/workshops-page";
import * as api from "@/lib/api/workshop-service";

vi.mock("@/lib/api/workshop-service", () => ({
  createWorkshopAssessment: vi.fn(),
  getWorkshopAnnouncements: vi.fn(),
  getWorkshopClasses: vi.fn(),
  getWorkshopContent: vi.fn(),
  getWorkshopGradebook: vi.fn(),
  getWorkshopVersions: vi.fn(),
  getWorkshops: vi.fn(),
}));

const workshop = {
  id: "workshop-1", title: "Routing review", description: "Review routes.",
  archived: false, current_version_id: "version-1", updated_at: "2026-08-27T00:00:00.000Z",
};
const lesson = {
  id: "lesson-row-1", workshop_id: workshop.id, stable_id: "lesson-1", position: 1,
  draft: { title: "Static routes", summary: "Route review", blocks: [] }, archived: false,
};
const assessment = {
  id: "assessment-row-1", workshop_id: workshop.id, stable_id: "assessment-1",
  title: "Route check", mode: "graded" as const,
  draft: { instructions: "Choose the best answer.", questions: [] },
  settings: { maximumAttempts: 2, gradePolicy: "highest", passingPercentage: 80, feedbackRelease: "final-attempt", shuffleQuestions: true, shuffleAnswers: true },
  archived: false,
};
const show = (area: "workshops" | "workshop-assessments" | "classes" | "gradebook") =>
  render(<TooltipProvider><WorkshopStudio area={area} /></TooltipProvider>);

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.clearAllMocks();
  vi.mocked(api.getWorkshops).mockResolvedValue([workshop]);
  vi.mocked(api.getWorkshopClasses).mockResolvedValue([]);
  vi.mocked(api.getWorkshopAnnouncements).mockResolvedValue([]);
  vi.mocked(api.getWorkshopGradebook).mockResolvedValue({ rows: [] });
  vi.mocked(api.getWorkshopContent).mockResolvedValue({ lessons: [lesson], topologies: [], assessments: [assessment], flashcards: [] });
  vi.mocked(api.getWorkshopVersions).mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("collection content navigation", () => {
  test("groups collection creation and publishing with guidance for the next steps", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.mocked(api.getWorkshopVersions).mockResolvedValue([{
      id: "version-1", workshop_id: workshop.id, version: 1,
      checksum: "a".repeat(64), published_at: "2026-08-27T00:00:00.000Z",
    }]);
    show("workshops");

    const actions = await screen.findByRole("group", { name: "Collection actions" });
    const createButton = within(actions).getByRole("button", { name: "NEW COLLECTION" });
    const publishButton = within(actions).getByRole("button", { name: "PUBLISH COLLECTION" });
    await waitFor(() => expect(publishButton).toBeEnabled());
    fireEvent.focus(createButton);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Create another private lesson collection.");
    fireEvent.blur(createButton);
    fireEvent.focus(publishButton.parentElement!);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Create a fixed version that can be used in a class.");

    fireEvent.click(publishButton);
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: "What publishing does" })).toBeInTheDocument();
    expect(within(dialog).getByText(/Saves the current 1 lesson and 1 assessment as a fixed version/)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "After publishing" })).toBeInTheDocument();
    expect(within(dialog).getByText(/Open the/)).toHaveTextContent("Classes");
    expect(within(dialog).getByText(/Share the class code, QR code, or invitation link/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Any assessments in this published version/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Existing classes stay on the version/)).toBeInTheDocument();
  });

  test("expands the collection and opens a lesson from its contents", async () => {
    const next = { ...lesson, id: "lesson-row-2", stable_id: "lesson-2", position: 2, draft: { ...lesson.draft, title: "Dynamic routes" } };
    vi.mocked(api.getWorkshopContent).mockResolvedValue({ lessons: [lesson, next], topologies: [], assessments: [assessment], flashcards: [] });
    show("workshops");

    const navigation = await screen.findByRole("navigation", { name: "Your collections" });
    const collection = within(navigation).getByRole("button", { name: /Routing review.*Published/ });
    expect(collection).not.toHaveClass("rounded-control", "bg-raised");
    await waitFor(() => expect(within(navigation).getByRole("button", { name: "Static routes" })).toHaveAttribute("aria-current", "page"));
    fireEvent.click(within(navigation).getByRole("button", { name: "Dynamic routes" }));
    expect(within(navigation).getByRole("button", { name: "Dynamic routes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByDisplayValue("Dynamic routes")).toBeInTheDocument();
    fireEvent.click(collection);
    expect(collection).toHaveAttribute("aria-expanded", "false");
    expect(within(navigation).queryByRole("button", { name: "Dynamic routes" })).not.toBeInTheDocument();
  });

  test("keeps topologies out of the collection list while retaining the Topologies tab", async () => {
    const topology = {
      id: "topology-row-1", workshop_id: workshop.id, stable_id: "topology-1",
      definition: {
        schemaVersion: 2, id: "topology-1", title: "Routing path",
        accessibilityDescription: "Three routed networks.", devices: [], links: [],
      },
    };
    const secondTopology = {
      ...topology, id: "topology-row-2", stable_id: "topology-2",
      definition: { ...topology.definition, id: "topology-2", title: "NAT example" },
    };
    vi.mocked(api.getWorkshopContent).mockResolvedValue({
      lessons: [lesson], topologies: [topology, secondTopology], assessments: [assessment], flashcards: [],
    });
    show("workshops");

    const navigation = await screen.findByRole("navigation", { name: "Your collections" });
    await waitFor(() => expect(within(navigation).getByRole("button", { name: "Static routes" })).toBeInTheDocument());
    expect(within(navigation).queryByRole("button", { name: "Routing path" })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole("button", { name: "NAT example" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Topologies, 2 items" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Selected topology" }));
    fireEvent.click(await screen.findByRole("option", { name: "NAT example" }));
    expect(screen.getByRole("combobox", { name: "Selected topology" })).toHaveTextContent("NAT example");
  });

  test("separates assessment creation from saved assessments", async () => {
    vi.mocked(api.createWorkshopAssessment).mockResolvedValue({ ...assessment, id: "assessment-row-2", title: "New practice" });
    show("workshop-assessments");

    const navigation = await screen.findByRole("navigation", { name: "Your collections" });
    await waitFor(() => expect(within(navigation).getByRole("button", { name: "Route check" })).toHaveAttribute("aria-current", "page"));
    expect(within(navigation).queryByText("Create assessment")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "NEW ASSESSMENT" }));
    const dialog = screen.getByRole("dialog", { name: "Create assessment" });
    fireEvent.click(within(dialog).getByRole("button", { name: /PRACTICE.*Instant feedback/ }));
    await waitFor(() => expect(api.createWorkshopAssessment).toHaveBeenCalledWith(workshop.id, "practice", undefined));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Create assessment" })).not.toBeInTheDocument());
    expect(within(navigation).getByRole("button", { name: "New practice" })).toHaveAttribute("aria-current", "page");
  });

  test("opens one class from the collection, distinguishing duplicate titles by code", async () => {
    vi.mocked(api.getWorkshopClasses).mockResolvedValue([
      { id: "class-1", workshop_id: workshop.id, version_id: "version-1", title: "Routing class", join_code: "ABC12345", archived: false, join_enabled: true, created_at: "2026-08-27T00:00:00.000Z" },
      { id: "class-2", workshop_id: workshop.id, version_id: "version-1", title: "Routing class", join_code: "XYZ67890", archived: false, join_enabled: false, created_at: "2026-08-28T00:00:00.000Z" },
    ]);
    show("classes");

    const navigation = await screen.findByRole("navigation", { name: "Your collections" });
    await waitFor(() => expect(within(navigation).getAllByRole("button", { name: /Routing class/ })).toHaveLength(2));
    fireEvent.change(within(navigation).getByRole("searchbox", { name: "Search classes by name or code" }), { target: { value: "XYZ67890" } });
    expect(within(navigation).getAllByRole("button", { name: /Routing class/ })).toHaveLength(1);
    expect(within(navigation).getByRole("status")).toHaveTextContent("Showing 1 of 2 classes");
    fireEvent.click(within(navigation).getByRole("combobox", { name: "Filter classes by enrollment" }));
    fireEvent.click(await screen.findByRole("option", { name: "Enrollment open" }));
    expect(within(navigation).getByText("No classes match these filters.")).toBeInTheDocument();
    fireEvent.click(within(navigation).getByRole("combobox", { name: "Filter classes by enrollment" }));
    fireEvent.click(await screen.findByRole("option", { name: "Enrollment closed" }));
    expect(screen.getByText("ABC12345")).toBeInTheDocument();
    fireEvent.click(within(navigation).getByRole("button", { name: /XYZ67890/ }));
    expect(screen.getByText("XYZ67890", { selector: "code" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Choose a class to manage" })).not.toBeInTheDocument();
  });

  test("uses the same searchable class selector on the gradebook", async () => {
    vi.mocked(api.getWorkshopClasses).mockResolvedValue([
      { id: "class-1", workshop_id: workshop.id, version_id: "version-1", title: "Routing class", join_code: "ABC12345", archived: false, join_enabled: true, created_at: "2026-08-27T00:00:00.000Z" },
      { id: "class-2", workshop_id: workshop.id, version_id: "version-1", title: "Routing class", join_code: "XYZ67890", archived: false, join_enabled: false, created_at: "2026-08-28T00:00:00.000Z" },
    ]);
    show("gradebook");

    const navigation = await screen.findByRole("navigation", { name: "Your collections" });
    await waitFor(() => expect(within(navigation).getAllByRole("button", { name: /Routing class/ })).toHaveLength(2));
    expect(screen.queryByRole("combobox", { name: "Choose gradebook class" })).not.toBeInTheDocument();
    fireEvent.change(within(navigation).getByRole("searchbox", { name: "Search classes by name or code" }), { target: { value: "XYZ67890" } });
    expect(within(navigation).getAllByRole("button", { name: /Routing class/ })).toHaveLength(1);
    fireEvent.click(within(navigation).getByRole("button", { name: /XYZ67890/ }));
    await waitFor(() => expect(api.getWorkshopGradebook).toHaveBeenCalledWith("class-2"));
  });
});
