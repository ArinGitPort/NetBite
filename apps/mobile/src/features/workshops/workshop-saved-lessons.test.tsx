import { fireEvent, render } from "@testing-library/react-native";

import type { WorkshopLesson } from "@/core/workshops/types";
import { WorkshopSavedLessons } from "@/features/workshops/workshop-saved-lessons";

const lessons: WorkshopLesson[] = [
  {
    id: "lesson-1",
    title: "First switched network",
    summary: "Connect two hosts through a switch.",
    order: 1,
    blocks: [],
  },
  {
    id: "lesson-2",
    title: "Router-on-a-Stick",
    summary: "Route between two authored VLANs.",
    order: 2,
    blocks: [],
  },
];

describe("WorkshopSavedLessons", () => {
  test("reveals bookmarked workshop lessons and opens the selected lesson", async () => {
    const onOpen = jest.fn();
    const screen = await render(
      <WorkshopSavedLessons
        lessons={lessons}
        onOpen={onOpen}
        savedLessonIds={["lesson-2"]}
      />,
    );

    expect(screen.queryByText("Router-on-a-Stick")).toBeNull();
    await fireEvent.press(
      screen.getByRole("button", { name: /saved lessons/i }),
    );
    await fireEvent.press(
      screen.getByRole("button", {
        name: "Saved lesson: Router-on-a-Stick",
      }),
    );

    expect(onOpen).toHaveBeenCalledWith("lesson-2");
  });

  test("explains how to create the first workshop bookmark", async () => {
    const screen = await render(
      <WorkshopSavedLessons
        lessons={lessons}
        onOpen={jest.fn()}
        savedLessonIds={[]}
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: /saved lessons/i }),
    );
    expect(screen.getByText("NO SAVED LESSONS YET")).toBeTruthy();
    expect(screen.getByText(/use the bookmark in its header/i)).toBeTruthy();
  });
});
