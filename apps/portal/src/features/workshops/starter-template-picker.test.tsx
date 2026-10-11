import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkshopStudio } from "@/features/workshops/workshops-page";
import * as api from "@/lib/api/workshop-service";

vi.mock("@/lib/api/workshop-service", () => ({
  createWorkshopAssessment: vi.fn(),
  createWorkshopLesson: vi.fn(),
  getWorkshopClasses: vi.fn(),
  getWorkshopContent: vi.fn(),
  getWorkshops: vi.fn(),
  getWorkshopVersions: vi.fn(),
}));

const workshop = {
  id: "workshop-1", title: "Routing review", description: "Review routes.", archived: false,
  current_version_id: "version-1", updated_at: "2026-08-27T00:00:00.000Z",
};
const lesson = {
  id: "lesson-row-1", workshop_id: workshop.id, stable_id: "lesson-1", position: 1,
  draft: { title: "Static routes", summary: "Route review", blocks: [] }, archived: false,
};
const assessment = {
  id: "assessment-row-1", workshop_id: workshop.id, stable_id: "assessment-1",
  title: "Route check", mode: "graded" as const,
  draft: { instructions: "Choose the best answer.", questions: [] },
  settings: { maximumAttempts: 2, gradePolicy: "highest", passingPercentage: 80 },
  archived: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getWorkshops).mockResolvedValue([workshop]);
  vi.mocked(api.getWorkshopClasses).mockResolvedValue([]);
  vi.mocked(api.getWorkshopContent).mockResolvedValue({ lessons: [lesson], topologies: [], assessments: [assessment], flashcards: [] });
  vi.mocked(api.getWorkshopVersions).mockResolvedValue([]);
});
afterEach(cleanup);

describe("workshop starter templates", () => {
  test("creates a lesson draft and confirms it beside the picker", async () => {
    vi.mocked(api.createWorkshopLesson).mockResolvedValue({
      ...lesson, id: "lesson-row-2", stable_id: "lesson-2",
      draft: { title: "Concept lesson", summary: "", blocks: [] },
    });
    render(<TooltipProvider><WorkshopStudio area="workshops" /></TooltipProvider>);
    await screen.findByText("Static routes");
    expect(screen.queryByRole("button", { name: "DUPLICATE LESSON" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("START FROM TEMPLATE"));
    fireEvent.click(screen.getByRole("button", { name: /Concept explanation Heading, explanation, and key point/ }));

    await waitFor(() => expect(api.createWorkshopLesson).toHaveBeenCalledWith(
      workshop.id, 2, expect.objectContaining({ title: "Concept lesson" }),
    ));
    expect(await screen.findByText("Concept lesson")).toBeInTheDocument();
    expect(within(screen.getByText("START FROM TEMPLATE").closest("aside")!).getByRole("status"))
      .toHaveTextContent("Concept explanation template created and opened");
  });

  test("shows assessment starter success and failure beside the action", async () => {
    let finishCreation!: () => void;
    const pendingCreation = new Promise<void>((resolve) => { finishCreation = resolve; });
    vi.mocked(api.createWorkshopAssessment).mockImplementationOnce(async () => {
      await pendingCreation;
      return {
        ...assessment, id: "assessment-row-2", stable_id: "assessment-2",
        title: "Knowledge check", mode: "practice",
      };
    }).mockRejectedValueOnce(new Error("Template creation failed."));
    render(<TooltipProvider><WorkshopStudio area="workshop-assessments" /></TooltipProvider>);
    await screen.findByRole("button", { name: /Route check Recorded in gradebook/ });
    expect(screen.queryByRole("button", { name: "DUPLICATE ASSESSMENT" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("START FROM TEMPLATE"));
    fireEvent.click(screen.getByRole("button", { name: /Knowledge check Practice/ }));
    expect(within(screen.getByRole("navigation")).getByRole("status"))
      .toHaveTextContent("Creating draft");
    expect(screen.getByRole("button", { name: /Knowledge check Practice/ })).toBeDisabled();
    finishCreation();
    await waitFor(() => expect(api.createWorkshopAssessment).toHaveBeenCalledWith(
      workshop.id, "practice", expect.objectContaining({ title: "Knowledge check" }),
    ));
    expect(await within(screen.getByRole("navigation")).findByRole("status"))
      .toHaveTextContent("Knowledge check template created and opened");

    fireEvent.click(screen.getByRole("button", { name: /Configuration review Graded/ }));
    expect(await within(screen.getByRole("navigation")).findByRole("alert"))
      .toHaveTextContent("Template creation failed.");
    expect(screen.getByRole("button", { name: /Configuration review Graded/ })).toBeEnabled();
  });
});
