import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { InstructorApprovals } from "@/features/instructors";
import { WorkshopStudio } from "@/features/workshops/workshops-page";
import * as instructorApi from "@/lib/api/instructor-service";
import * as api from "@/lib/api/workshop-service";

function renderPortal(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

vi.mock("@/lib/api/workshop-service", () => ({
  createWorkshop: vi.fn(),
  createWorkshopAssessment: vi.fn(),
  createWorkshopClass: vi.fn(),
  createWorkshopLesson: vi.fn(),
  deleteWorkshopTopology: vi.fn(),
  deleteWorkshopLesson: vi.fn(),
  deleteWorkshop: vi.fn(),
  getWorkshopClasses: vi.fn(),
  getWorkshopContent: vi.fn(),
  getWorkshopGradebook: vi.fn(),
  getWorkshops: vi.fn(),
  getWorkshopVersions: vi.fn(),
  publishWorkshop: vi.fn(),
  saveWorkshop: vi.fn(),
  saveWorkshopAssessment: vi.fn(),
  saveWorkshopLesson: vi.fn(),
  saveWorkshopTopology: vi.fn(),
  setWorkshopClassEnrollment: vi.fn(),
}));

vi.mock("@/lib/api/instructor-service", () => ({
  getInstructorRequests: vi.fn(),
  reviewInstructorRequest: vi.fn(),
}));

const workshop = {
  id: "workshop-1",
  title: "Routing review",
  description: "Review routes.",
  archived: false,
  current_version_id: "version-1",
  updated_at: "2026-08-27T00:00:00.000Z",
};
const lesson = {
  id: "lesson-row-1",
  workshop_id: "workshop-1",
  stable_id: "lesson-1",
  position: 1,
  draft: { title: "Static routes", summary: "Route review", blocks: [] },
  archived: false,
};
const assessment = {
  id: "assessment-row-1",
  workshop_id: "workshop-1",
  stable_id: "assessment-1",
  title: "Route check",
  mode: "graded" as const,
  draft: { instructions: "Choose the best answer.", questions: [] },
  settings: {
    maximumAttempts: 2,
    gradePolicy: "highest",
    passingPercentage: 80,
    feedbackRelease: "final-attempt",
    shuffleQuestions: true,
    shuffleAnswers: true,
  },
  archived: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getWorkshops).mockResolvedValue([workshop]);
  vi.mocked(api.getWorkshopClasses).mockResolvedValue([]);
  vi.mocked(api.getWorkshopContent).mockResolvedValue({
    lessons: [lesson],
    topologies: [],
    assessments: [assessment],
    flashcards: [],
  });
  vi.mocked(api.getWorkshopVersions).mockResolvedValue([
    {
      id: "version-1",
      workshop_id: "workshop-1",
      version: 1,
      checksum: "a".repeat(64),
      published_at: "2026-08-27T00:00:00.000Z",
    },
  ]);
});
afterEach(cleanup);

describe("instructor workshop portal", () => {
  test("provides lesson and topology authoring from the selected workshop", async () => {
    renderPortal(<WorkshopStudio area="workshops" />);
    expect(await screen.findByText("Static routes")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Lesson collections" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Build privately, publish when ready/),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "NEW COLLECTION" })).toBeTruthy();
    expect(screen.getByText("1 published version")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Lessons, 1 item" })).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Topologies, 0 items" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Body text/ }));
    expect(screen.getByText("PARAGRAPH")).toBeTruthy();
    expect(
      screen.getByPlaceholderText(
        "Explain the concept in clear, complete sentences.",
      ),
    ).toBeTruthy();
    fireEvent.change(
      screen.getByPlaceholderText(
        "Explain the concept in clear, complete sentences.",
      ),
      { target: { value: "A router forwards traffic between networks." } },
    );
    fireEvent.click(screen.getByRole("tab", { name: "PREVIEW" }));
    const lessonPreview = screen.getByTestId("workshop-lesson-mobile-preview");
    expect(lessonPreview).toBeTruthy();
    expect(within(lessonPreview).getByText("Routing review")).toBeTruthy();
    expect(within(lessonPreview).getByText("Static routes")).toBeTruthy();
    expect(
      within(lessonPreview).getByText(
        "A router forwards traffic between networks.",
      ),
    ).toBeTruthy();
    expect(
      within(lessonPreview).getByText(/CURRENT UNSAVED DRAFT/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "EDIT" }));
    expect(
      screen.getByDisplayValue("A router forwards traffic between networks."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Topologies, 0 items" }));
    fireEvent.click(
      screen.getByRole("button", { name: "CREATE FIRST TOPOLOGY" }),
    );
    expect(screen.getByRole("group", { name: "Add a device" })).toBeTruthy();
    fireEvent.click(
      await screen.findByRole("button", { name: "Add PC to topology" }),
    );
    expect(screen.getByDisplayValue("PC1")).toBeTruthy();
    expect(screen.getByText("SAVE TOPOLOGY")).toBeTruthy();
  });

  test("renames and deletes a topology from the selector controls", async () => {
    const topology = {
      id: "topology-row-1",
      workshop_id: workshop.id,
      stable_id: "topology-1",
      definition: {
        schemaVersion: 2,
        id: "topology-1",
        title: "Routing path",
        accessibilityDescription: "Three routed networks.",
        devices: [],
        links: [],
      },
    };
    vi.mocked(api.getWorkshopContent).mockResolvedValue({
      lessons: [lesson],
      topologies: [topology],
      assessments: [assessment],
      flashcards: [],
    });
    vi.mocked(api.saveWorkshopTopology).mockImplementation(async (row) => row);
    vi.mocked(api.deleteWorkshopTopology).mockResolvedValue(topology.id);

    renderPortal(<WorkshopStudio area="workshops" />);
    await screen.findByText("Static routes");
    fireEvent.click(screen.getByRole("tab", { name: "Topologies, 1 item" }));

    expect(screen.getByRole("button", { name: "Create topology" })).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit topology details" }),
    );
    fireEvent.change(screen.getByLabelText("Topology name"), {
      target: { value: "Branch routing example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SAVE NAME" }));

    await waitFor(() =>
      expect(api.saveWorkshopTopology).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: expect.objectContaining({
            title: "Branch routing example",
          }),
        }),
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Edit topology details" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "DELETE TOPOLOGY" }));
    const confirmation = screen.getByRole("alertdialog");
    fireEvent.click(
      within(confirmation).getByRole("button", { name: "DELETE TOPOLOGY" }),
    );

    await waitFor(() =>
      expect(api.deleteWorkshopTopology).toHaveBeenCalledWith(topology.id),
    );
    expect(await screen.findByText("No topologies yet")).toBeTruthy();
  });

  test("guards lesson creation while the database request is pending", async () => {
    let finishCreation: ((row: typeof lesson) => void) | undefined;
    vi.mocked(api.createWorkshopLesson).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCreation = resolve;
        }),
    );
    renderPortal(<WorkshopStudio area="workshops" />);
    await screen.findByText("Static routes");

    const addLesson = screen.getByRole("button", { name: "ADD LESSON" });
    fireEvent.click(addLesson);
    fireEvent.click(addLesson);

    expect(api.createWorkshopLesson).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "ADDING LESSON..." }),
    ).toBeDisabled();

    finishCreation?.({
      ...lesson,
      id: "lesson-row-2",
      stable_id: "lesson-2",
      position: 2,
      draft: {
        title: "Address planning",
        summary: "Plan the subnet.",
        blocks: [],
      },
    });

    expect(await screen.findByText("Address planning")).toBeTruthy();
    expect(screen.getByRole("button", { name: "ADD LESSON" })).toBeEnabled();
  });

  test("reorders lesson blocks from the drag handle keyboard controls", async () => {
    vi.mocked(api.getWorkshopContent).mockResolvedValue({
      lessons: [
        {
          ...lesson,
          draft: {
            ...lesson.draft,
            blocks: [
              { id: "heading-1", type: "heading", text: "Routing plan" },
              {
                id: "paragraph-1",
                type: "paragraph",
                text: "Configure each router in order.",
              },
            ],
          },
        },
      ],
      topologies: [],
      assessments: [assessment],
      flashcards: [],
    });
    renderPortal(<WorkshopStudio area="workshops" />);

    const headingHandle = await screen.findByRole("button", {
      name: "Reorder heading block, position 1 of 2",
    });
    fireEvent.keyDown(headingHandle, { key: "ArrowDown" });

    expect(
      screen.getByRole("button", {
        name: "Reorder paragraph block, position 1 of 2",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Reorder heading block, position 2 of 2",
      }),
    ).toBeTruthy();
  });

  test("requires confirmation before deleting a draft lesson", async () => {
    vi.mocked(api.deleteWorkshopLesson).mockResolvedValue(lesson.id);
    renderPortal(<WorkshopStudio area="workshops" />);
    await screen.findByDisplayValue("Static routes");

    fireEvent.click(screen.getByRole("button", { name: "DELETE LESSON" }));
    expect(
      screen.getByRole("heading", { name: "Delete this lesson?" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Existing published versions are not changed/),
    ).toBeTruthy();
    const confirmation = screen.getByRole("alertdialog");
    fireEvent.click(
      within(confirmation).getByRole("button", { name: "DELETE LESSON" }),
    );

    await waitFor(() =>
      expect(api.deleteWorkshopLesson).toHaveBeenCalledWith(lesson.id),
    );
    expect(
      await screen.findByText("Add a lesson to begin authoring."),
    ).toBeTruthy();
  });

  test("shows complete graded assessment settings", async () => {
    renderPortal(<WorkshopStudio area="workshop-assessments" />);
    expect((await screen.findAllByText("Route check")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("tab", { name: "SETTINGS" }));
    expect(screen.getByDisplayValue("Route check")).toBeTruthy();
    expect(screen.getByText("Opening date (optional)")).toBeTruthy();
    expect(screen.getByText("Due date (optional)")).toBeTruthy();
    expect(screen.getByText(/Shuffle question order/)).toBeTruthy();
    expect(screen.getByText(/Shuffle answer order/)).toBeTruthy();
    const shuffleQuestions = screen.getByRole("checkbox", {
      name: /Shuffle question order/i,
    });
    expect(shuffleQuestions.tagName).toBe("BUTTON");
    expect(shuffleQuestions).toHaveAttribute("aria-checked", "true");
    fireEvent.click(shuffleQuestions);
    expect(shuffleQuestions).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("tab", { name: "PREVIEW" }));
    expect(screen.getByTestId("assessment-mobile-preview")).toBeTruthy();
    expect(screen.getByText("OFFICIAL CLASS ASSESSMENT")).toBeTruthy();
    expect(screen.getByText("ROUTE CHECK")).toBeTruthy();
    expect(screen.getByText("Attempts: 2")).toBeTruthy();
    expect(screen.getByText("Recorded score: Highest attempt")).toBeTruthy();
    expect(screen.getByText("Results: After the final attempt")).toBeTruthy();
    expect(screen.getByText("No questions added yet.")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "SUBMIT GRADED ASSESSMENT" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("tab", { name: "SETTINGS" }));
    expect(screen.getByText("Opening date (optional)")).toBeTruthy();
  });

  test("guides question authoring and reorders questions from the drag handle", async () => {
    renderPortal(<WorkshopStudio area="workshop-assessments" />);
    expect((await screen.findAllByText("Route check")).length).toBeGreaterThan(0);

    const addQuestion = screen.getByRole("button", { name: "Add question" });
    fireEvent.click(addQuestion);
    fireEvent.click(screen.getByRole("button", { name: "Question selector" }));
    let questionList = await screen.findByRole("list", { name: "Question list" });
    fireEvent.click(within(questionList).getByRole("button", { name: /Q01 .*NEEDS QUESTION/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    fireEvent.click(screen.getByRole("button", { name: "Question selector" }));
    questionList = await screen.findByRole("list", { name: "Question list" });
    fireEvent.click(within(questionList).getByRole("button", { name: /Q02 .*NEEDS QUESTION/ }));

    expect(screen.getAllByLabelText("Question")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Question"), {
      target: { value: "Second question" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Move question 2 earlier/ }));

    expect(screen.getByText("Q01").closest("div")).toHaveTextContent("Second question");
    expect(screen.getAllByLabelText("Question")).toHaveLength(1);
  });

  test("presents recorded grades without a redundant outer card", async () => {
    renderPortal(<WorkshopStudio area="gradebook" />);

    const grades = await screen.findByTestId("recorded-grades");
    expect(grades).not.toHaveClass("rounded-panel", "border", "shadow-panel");
    expect(
      screen.getByText("No grade records match these filters."),
    ).toBeTruthy();
  });

  test("renames a workshop through the details dialog", async () => {
    vi.mocked(api.saveWorkshop).mockResolvedValue({
      ...workshop,
      title: "Updated routing review",
    });
    renderPortal(<WorkshopStudio area="workshops" />);
    fireEvent.click(await screen.findByText("EDIT DETAILS"));
    const name = screen.getByLabelText("Collection name");
    fireEvent.change(name, { target: { value: "Updated routing review" } });
    fireEvent.click(screen.getByText("SAVE CHANGES"));
    await waitFor(() =>
      expect(api.saveWorkshop).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Updated routing review" }),
      ),
    );
    expect(
      await screen.findByText("Lesson collection details saved."),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    expect(screen.queryByText("Lesson collection details saved.")).toBeNull();
  });

  test("requires confirmation before deleting an unpublished draft", async () => {
    const draft = { ...workshop, current_version_id: undefined };
    vi.mocked(api.getWorkshops)
      .mockResolvedValueOnce([draft])
      .mockResolvedValue([]);
    vi.mocked(api.getWorkshopVersions).mockResolvedValue([]);
    vi.mocked(api.deleteWorkshop).mockResolvedValue(draft.id);
    renderPortal(<WorkshopStudio area="workshops" />);
    fireEvent.click(await screen.findByText("EDIT DETAILS"));
    fireEvent.click(screen.getByText("DELETE DRAFT"));
    expect(api.deleteWorkshop).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("DELETE PERMANENTLY"));
    await waitFor(() =>
      expect(api.deleteWorkshop).toHaveBeenCalledWith(draft.id),
    );
  });

  test("lets an administrator approve a pending instructor request", async () => {
    vi.mocked(instructorApi.getInstructorRequests).mockResolvedValue([
      {
        user_id: "user-1",
        display_name: "Instructor One",
        institution: "NetBite College",
        reason: "Teach networking.",
        status: "pending",
        requested_at: "2026-08-27T00:00:00.000Z",
      },
    ]);
    vi.mocked(instructorApi.reviewInstructorRequest).mockResolvedValue(
      undefined,
    );
    renderPortal(<InstructorApprovals />);
    fireEvent.click(await screen.findByText("APPROVE INSTRUCTOR"));
    await waitFor(() =>
      expect(instructorApi.reviewInstructorRequest).toHaveBeenCalledWith(
        "user-1",
        "approved",
      ),
    );
  });
});
