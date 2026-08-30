import type { WorkshopArea } from "@/features/workshops/hooks/use-workshop-studio";

export interface WorkshopPageCopy {
  label: string;
  title: string;
  detail: string;
}

const WORKSHOP_PAGE_COPY: Record<WorkshopArea, WorkshopPageCopy> = {
  classes: {
    label: "CLASS MANAGEMENT",
    title: "Classes and sharing",
    detail:
      "Assign a published lesson collection to a private class, then invite students using a code, link, or QR code.",
  },
  "workshop-assessments": {
    label: "ASSESSMENT AUTHORING",
    title: "Assessments",
    detail: "Create practice activities or graded quizzes for a lesson collection.",
  },
  gradebook: {
    label: "CLASS RESULTS",
    title: "Gradebook",
    detail:
      "Review submissions, missing work, late work, and recorded grades without exposing student answers.",
  },
  workshops: {
    label: "INSTRUCTOR CONTENT",
    title: "Lesson collections",
    detail:
      "Group related lessons, network visuals, flashcards, and assessments. Build privately, publish when ready, then share through a class.",
  },
};

export function getWorkshopPageCopy(area: WorkshopArea): WorkshopPageCopy {
  return WORKSHOP_PAGE_COPY[area];
}
