import { sanitizeLesson } from "./lesson-validation.ts";
import {
  answerKey,
  publicAssessment,
  sanitizeGradedSettings,
} from "./assessment-validation.ts";
import { shouldReleaseFeedback } from "./submissions.ts";
import { safePublicImageUrl, ServiceError } from "./service-core.ts";
import { sanitizeTopology } from "./topology-validation.ts";

Deno.test("lesson publication strips draft-only fields and rejects private image URLs", () => {
  const lesson = sanitizeLesson({
    stable_id: "lesson-1",
    position: 2,
    draft: {
      title: "  Routing basics  ",
      summary: " Quick start ",
      editorOnly: "hidden",
      blocks: [{
        id: "b1",
        type: "paragraph",
        text: "Read this",
        editorOnly: "hidden",
      }],
    },
  });
  if (
    lesson.title !== "Routing basics" || lesson.order !== 2 ||
    "editorOnly" in lesson || "editorOnly" in lesson.blocks[0]
  ) {
    throw new Error("Published lesson output changed");
  }
  if (
    safePublicImageUrl("https://example.com/image.png") !==
      "https://example.com/image.png"
  ) {
    throw new Error("Public HTTPS image was rejected");
  }
  for (
    const url of [
      "http://example.com/image.png",
      "https://localhost/image.png",
      "https://192.168.1.2/image.png",
    ]
  ) {
    try {
      safePublicImageUrl(url);
      throw new Error(`Unsafe image was accepted: ${url}`);
    } catch (error) {
      if (!(error instanceof ServiceError)) throw error;
    }
  }
});

Deno.test("graded package omits answer key while the protected key remains intact", () => {
  const row = {
    stable_id: "assessment-1",
    title: "Quiz",
    mode: "graded",
    settings: {
      maximumAttempts: 2,
      passingPercentage: 75,
      gradePolicy: "highest",
      feedbackRelease: "final-attempt",
      shuffleQuestions: false,
      shuffleAnswers: true,
    },
    draft: {
      instructions: "Choose one",
      questions: [{
        id: "q1",
        prompt: "Which device?",
        correctChoiceId: "a",
        choices: [{ id: "a", label: "Router" }, { id: "b", label: "Switch" }],
      }],
    },
  };
  const published = publicAssessment(row);
  if (
    "correctChoiceId" in published.questions[0] ||
    JSON.stringify(published).includes("correctChoiceId")
  ) {
    throw new Error("Answer key leaked into graded package");
  }
  if (answerKey(row).q1 !== "a") throw new Error("Protected key changed");
  if (sanitizeGradedSettings(row.settings).maximumAttempts !== 2) {
    throw new Error("Graded settings changed");
  }
  if (
    shouldReleaseFeedback(row.settings, 1, new Date()) ||
    !shouldReleaseFeedback(row.settings, 2, new Date())
  ) {
    throw new Error("Final-attempt feedback rule changed");
  }
});

Deno.test("topology publication keeps the stable ID and omits editor-only data", () => {
  const published = sanitizeTopology({
    stable_id: "topology-1",
    definition: {
      title: "Small network",
      accessibilityDescription: "A network diagram",
      devices: [],
      links: [],
      editorOnly: "hidden",
    },
  });
  if (
    published.id !== "topology-1" || published.devices.length !== 0 ||
    "editorOnly" in published
  ) {
    throw new Error("Published topology contract changed");
  }
});
