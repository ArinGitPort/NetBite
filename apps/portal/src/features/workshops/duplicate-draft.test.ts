import { describe, expect, it } from "vitest";

import { duplicateAssessmentDraft, duplicateLessonDraft } from "@/features/workshops/duplicate-draft";
import type { WorkshopAssessmentRow, WorkshopLessonRow } from "@/lib/api/types";

describe("independent workshop draft copies", () => {
  it("rekeys a lesson, its blocks, and command groups while retaining topology references", () => {
    const source: WorkshopLessonRow = {
      id: "row", workshop_id: "workshop", stable_id: "lesson-original", position: 1, archived: false,
      draft: { id: "lesson-original", title: "Routing", blocks: [{ id: "block-1", type: "commands", topologyId: "topology-1", commandGroups: [{ id: "group-1", title: "R1", commands: ["show ip route"] }] }] },
    };
    const copy = duplicateLessonDraft(source);
    const block = (copy.blocks as Array<{ id: string; topologyId: string; commandGroups: Array<{ id: string }> }>)[0];
    expect(copy.id).not.toBe(source.stable_id);
    expect(block.id).not.toBe("block-1");
    expect(block.commandGroups[0].id).not.toBe("group-1");
    expect(block.topologyId).toBe("topology-1");
    expect(source.draft.title).toBe("Routing");
  });

  it("rekeys assessment questions and choices without changing the correct choice", () => {
    const source: WorkshopAssessmentRow = {
      id: "row", workshop_id: "workshop", stable_id: "assessment-original", title: "Check", mode: "graded", archived: false,
      settings: {}, draft: { questions: [{ id: "q-1", prompt: "Which?", choices: [{ id: "a", label: "Yes" }, { id: "b", label: "No" }], correctChoiceId: "b" }] },
    };
    const copy = duplicateAssessmentDraft(source);
    const question = (copy.questions as Array<{ id: string; choices: Array<{ id: string; label: string }>; correctChoiceId: string }>)[0];
    expect(question.id).not.toBe("q-1");
    expect(question.choices.map((choice) => choice.id)).not.toEqual(["a", "b"]);
    expect(question.choices.find((choice) => choice.id === question.correctChoiceId)?.label).toBe("No");
    expect((source.draft.questions as Array<{ id: string }>)[0].id).toBe("q-1");
  });
});
