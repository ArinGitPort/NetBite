import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { WorkshopLessonBlock } from "@netbite/workshops/contracts";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LessonWorkspace } from "@/features/workshops/lesson-workspace";
import type { WorkshopLessonRow } from "@/lib/api/types";
import * as api from "@/lib/api/workshop-service";

vi.mock("@/lib/api/workshop-service", () => ({
  saveWorkshopLesson: vi.fn(),
}));

function LessonWorkspaceHarness({ blocks }: { blocks: WorkshopLessonBlock[] }) {
  const [lessons, setLessons] = useState<WorkshopLessonRow[]>([
    {
      id: "lesson-row-1",
      workshop_id: "workshop-1",
      stable_id: "lesson-1",
      position: 1,
      draft: {
        title: "Static routes",
        summary: "Route review",
        blocks,
      },
      archived: false,
    },
  ]);
  return (
    <TooltipProvider>
      <LessonWorkspace
        addingLesson={false}
        archived={false}
        collectionTitle="Routing review"
        lessons={lessons}
        onAddLesson={() => undefined}
        onChange={(changed) =>
          setLessons((current) =>
            current.map((lesson) => (lesson.id === changed.id ? changed : lesson)),
          )
        }
        onDelete={async () => undefined}
        onError={() => undefined}
        onSaved={() => undefined}
        onSelectLesson={() => undefined}
        selectedLessonId="lesson-row-1"
        topologies={[]}
      />
    </TooltipProvider>
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("lesson workspace scalability", () => {
  test("shows block expansion controls only while editing", async () => {
    render(
      <LessonWorkspaceHarness
        blocks={[{ id: "heading-1", type: "heading", text: "Routing plan" }]}
      />,
    );

    expect(await screen.findByRole("button", { name: "EXPAND ALL" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "PREVIEW" }));
    expect(screen.queryByRole("button", { name: /EXPAND ALL|COLLAPSE ALL/ })).not.toBeInTheDocument();
  });

  test("uses the outline to focus one block editor at a time", async () => {
    render(
      <LessonWorkspaceHarness
        blocks={[
          { id: "heading-1", type: "heading", text: "Routing plan" },
          { id: "paragraph-1", type: "paragraph", text: "" },
        ]}
      />,
    );

    expect(
      await screen.findByPlaceholderText("Example: How a router chooses the next hop"),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Explain the concept in clear, complete sentences."),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "OUTLINE" }));
    const outline = screen.getByRole("list", { name: "Lesson outline" });
    expect(within(outline).getByLabelText("CONTENT REQUIRED")).toBeInTheDocument();
    fireEvent.click(within(outline).getByRole("button", { name: /02 Body text/ }));

    expect(
      screen.getByPlaceholderText("Explain the concept in clear, complete sentences."),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Example: How a router chooses the next hop"),
    ).not.toBeInTheDocument();
  });

  test("inserts after the active block, restores removals, and saves with the keyboard", async () => {
    vi.mocked(api.saveWorkshopLesson).mockResolvedValue(undefined);
    render(
      <LessonWorkspaceHarness
        blocks={[
          { id: "heading-1", type: "heading", text: "Routing plan" },
          { id: "paragraph-1", type: "paragraph", text: "Configure the router." },
        ]}
      />,
    );
    await screen.findByRole("button", { name: "Reorder heading block, position 1 of 2" });

    fireEvent.click(screen.getByRole("button", { name: /Important note/ }));
    expect(
      screen.getByRole("button", { name: "Reorder callout block, position 2 of 3" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove callout block" }));
    expect(screen.getByText("Important note removed.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "UNDO" }));
    expect(
      screen.getByRole("button", { name: "Reorder callout block, position 2 of 3" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { ctrlKey: true, key: "s" });
    await waitFor(() => expect(api.saveWorkshopLesson).toHaveBeenCalled());
  });
});
