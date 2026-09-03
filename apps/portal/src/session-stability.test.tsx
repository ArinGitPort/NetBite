import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const authHarness = vi.hoisted(() => ({
  callback: undefined as
    undefined | ((event: string, session: unknown) => void),
  currentSession: null as unknown,
  session: {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "instructor-1",
      email: "instructor@netbite.local",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-08-24T00:00:00.000Z",
    },
  },
  signOut: vi.fn(async () => ({ error: null })),
  signInWithPassword: vi.fn(async () => ({ error: null })),
}));

const apiHarness = vi.hoisted(() => ({
  getAdminAccess: vi.fn(async (userId: string) => ({
    userId,
    authorized: true,
    accessLevel: "administrator" as const,
  })),
  getSanitizedAuditHistory: vi.fn(async () => []),
  getCurriculum: vi.fn(async () => ({
    courses: [
      { id: "foundations", definition: { title: "Network Foundations" } },
      { id: "operations", definition: { title: "Network Operations" } },
    ],
    chapters: [
      {
        id: "1",
        course_id: "foundations",
        definition: { numberLabel: "01", title: "Introduction to Networks" },
      },
      {
        id: "ops-01",
        course_id: "operations",
        definition: {
          numberLabel: "01",
          title: "Transport and Application Endpoints",
        },
      },
    ],
    lessons: [
      {
        id: "connecting-devices",
        chapter_id: "1",
        requirement: "core",
        archived: false,
        draft: { title: "What is a computer network?" },
      },
    ],
    quiz: [
      {
        id: "q1",
        chapter_id: "1",
        lesson_id: "connecting-devices",
        position: 1,
        draft: {
          prompt: "Which situation describes a computer network?",
          answers: [
            "Connected devices",
            "Disconnected devices",
            "One application",
          ],
          correctAnswerIndex: 0,
          explanation: "Connected devices need a communication path.",
        },
      },
      {
        id: "q2",
        chapter_id: "1",
        lesson_id: "connecting-devices",
        position: 2,
        draft: {
          prompt: "Why might a classroom build a network?",
          answers: [
            "Share resources",
            "Remove cables",
            "Disable communication",
          ],
          correctAnswerIndex: 0,
          explanation: "Networks let devices share resources.",
        },
      },
    ],
    flashcards: [],
  })),
}));

vi.mock("@/lib/supabase", () => ({
  configured: true,
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: authHarness.currentSession },
      })),
      onAuthStateChange: vi.fn((callback) => {
        authHarness.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signOut: authHarness.signOut,
      signInWithPassword: authHarness.signInWithPassword,
    },
  },
}));

vi.mock("@/lib/api/access-service", () => ({
  getAdminAccess: apiHarness.getAdminAccess,
}));

vi.mock("@/lib/api/activity-service", () => ({
  getSanitizedAuditHistory: apiHarness.getSanitizedAuditHistory,
}));

vi.mock("@/lib/api/curriculum-service", () => ({
  getCurriculum: apiHarness.getCurriculum,
}));

import { App } from "@/app";

describe("admin session stability", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    window.location.hash = "#audit";
    authHarness.currentSession = authHarness.session;
    apiHarness.getAdminAccess.mockClear();
    apiHarness.getSanitizedAuditHistory.mockClear();
    apiHarness.getCurriculum.mockClear();
    authHarness.signOut.mockClear();
    authHarness.signInWithPassword.mockClear();
  });

  test("keeps the selected section mounted after a same-user token refresh", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Audit log" }),
    ).toBeInTheDocument();

    await act(async () => {
      authHarness.callback?.("TOKEN_REFRESHED", {
        ...authHarness.session,
        access_token: "refreshed-access-token",
        user: { ...authHarness.session.user },
      });
    });

    await waitFor(() =>
      expect(apiHarness.getAdminAccess).toHaveBeenCalledTimes(2),
    );
    expect(
      screen.getByRole("heading", { name: "Audit log" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Loading instructor workspace"),
    ).not.toBeInTheDocument();
  });

  test("signs out through the account footer", async () => {
    render(<App />);

    const signOut = await screen.findByRole("button", { name: "Sign out" });
    fireEvent.click(signOut);

    expect(authHarness.signOut).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("alertdialog", { name: "Sign out of NetBite?" })).getByRole("button", { name: "SIGN OUT" }));
    await waitFor(() => expect(authHarness.signOut).toHaveBeenCalledTimes(1));
    expect(signOut).toBeDisabled();
    expect(signOut).toHaveTextContent("Signing out...");
  });

  test("guards sign-out when an editor has unsaved changes", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("link", { name: "Curriculum" }));
    fireEvent.click(await screen.findByRole("button", { name: /What is a computer network/i }));
    fireEvent.change(screen.getByLabelText("Lesson title"), {
      target: { value: "An edited network lesson" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    fireEvent.click(within(screen.getByRole("alertdialog", { name: "Sign out of NetBite?" })).getByRole("button", { name: "SIGN OUT" }));

    expect(await screen.findByRole("dialog", { name: "Leave with unsaved changes?" })).toBeInTheDocument();
    expect(authHarness.signOut).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "KEEP EDITING" }));
    expect(authHarness.signOut).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Lesson title")).toHaveValue("An edited network lesson");
  });

  test("keeps the login submit action usable and submits trimmed credentials", async () => {
    authHarness.currentSession = null;
    render(<App />);

    const email = await screen.findByLabelText("Email address");
    const password = screen.getByLabelText("Password");
    const submit = screen.getByRole("button", { name: "Sign in" });
    expect(submit).toBeEnabled();

    fireEvent.change(email, {
      target: { value: " instructor@netbite.local " },
    });
    fireEvent.change(password, { target: { value: "secret-password" } });
    fireEvent.click(submit);

    await waitFor(() =>
      expect(authHarness.signInWithPassword).toHaveBeenCalledWith({
        email: "instructor@netbite.local",
        password: "secret-password",
      }),
    );
  });

  test("uses a focused assessment navigator with an alternate all-items view", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("link", { name: "Assessments" }));
    expect(
      await screen.findByRole("button", { name: "FOCUSED" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("assessment-workspace")).toHaveClass("min-w-0");
    expect(screen.getByTestId("assessment-section")).toHaveClass(
      "rounded-panel",
      "border",
    );
    expect(screen.getByTestId("assessment-navigator")).not.toHaveClass(
      "rounded-panel",
    );
    expect(screen.getByTestId("assessment-editor-region")).toHaveClass(
      "min-w-0",
    );
    expect(screen.getByTestId("assessment-fields")).toHaveClass("min-w-0");
    expect(screen.getByText("Editing question 01")).toBeInTheDocument();
    expect(screen.getByText("ALL CHANGES SAVED")).toHaveAttribute(
      "role",
      "status",
    );
    expect(screen.getAllByLabelText("Scenario question")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "SAVE CHANGES" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Delete quiz question" }),
    ).toHaveTextContent("DELETE QUESTION");

    fireEvent.click(
      screen.getByRole("button", { name: /Q02.*Why might a classroom/i }),
    );
    expect(screen.getByLabelText("Scenario question")).toHaveValue(
      "Why might a classroom build a network?",
    );

    fireEvent.click(screen.getByRole("button", { name: "ALL ITEMS" }));
    expect(screen.getAllByLabelText("Scenario question")).toHaveLength(2);
  });

  test("shows one expanded course at a time in curriculum authoring", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("link", { name: "Curriculum" }));
    const foundations = await screen.findByRole("button", {
      name: /Network Foundations.*1 chapters/i,
    });
    const operations = screen.getByRole("button", {
      name: /Network Operations.*1 chapters/i,
    });
    await waitFor(() =>
      expect(foundations).toHaveAttribute("aria-expanded", "true"),
    );
    expect(foundations.querySelector("strong")).toHaveTextContent(
      "Network Foundations",
    );
    expect(foundations.querySelector("small")).toHaveTextContent("1 chapters");
    expect(screen.getByTestId("curriculum-workspace")).toHaveClass("min-w-0");
    expect(screen.getByTestId("curriculum-workspace")).toHaveClass(
      "overflow-hidden",
      "rounded-panel",
      "border",
      "xl:grid-cols-[250px_360px_minmax(0,1fr)]",
    );
    expect(screen.getByTestId("curriculum-navigation")).not.toHaveClass(
      "rounded-panel",
    );
    expect(screen.getByTestId("curriculum-lessons")).not.toHaveClass(
      "rounded-panel",
    );
    expect(screen.getByTestId("curriculum-editor")).not.toHaveClass(
      "rounded-panel",
    );
    expect(operations).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("button", { name: /Introduction to Networks/i }),
    ).toBeVisible();

    fireEvent.click(operations);
    expect(foundations).toHaveAttribute("aria-expanded", "false");
    expect(operations).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", {
        name: /Transport and Application Endpoints/i,
      }),
    ).toBeVisible();
  });

  test("centers the Android lesson preview inside its editor region", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("link", { name: "Curriculum" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: /What is a computer network/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "PREVIEW" }));

    expect(screen.getByTestId("mobile-lesson-preview")).toHaveClass(
      "justify-center",
      "w-full",
      "overflow-auto",
    );
  });

  test("keeps paired lesson fields aligned and guides a new section", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("link", { name: "Curriculum" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: /What is a computer network/i,
      }),
    );

    expect(screen.getByLabelText("Section label").closest("label")).toHaveClass(
      "content-start",
    );

    fireEvent.click(screen.getByRole("button", { name: "ADD SECTION" }));
    expect(screen.getByPlaceholderText("Section heading")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Explain this part in simple English."),
    ).toBeInTheDocument();
  });
});
