import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ThemeProvider } from "@/app/theme/theme-provider";
import { Login } from "@/features/auth/auth-pages";

const { signInWithPassword } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signInWithPassword } },
}));

describe("Login", () => {
  afterEach(cleanup);
  beforeEach(() => signInWithPassword.mockReset());

  test("offers appearance controls and the animated network treatment before sign-in", () => {
    const { container } = render(<ThemeProvider><Login /></ThemeProvider>);

    expect(screen.getByRole("button", { name: /Appearance:/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Publish accurate networking lessons/ })).toBeInTheDocument();
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(2);
    expect(screen.getByText("CURRICULUM CONTROL PLANE")).toBeInTheDocument();
  });

  test("clears failed sign-in feedback when the learner edits a credential", async () => {
    signInWithPassword.mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    });
    render(<ThemeProvider><Login /></ThemeProvider>);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "instructor@netbite.local" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "incorrect" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("incorrect");
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "corrected" },
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("shows the shared compact spinner while sign-in is pending", async () => {
    let complete: (value: { error: null }) => void = () => undefined;
    signInWithPassword.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    render(<ThemeProvider><Login /></ThemeProvider>);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "instructor@netbite.local" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("status", { name: "Signing in" })).toBeInTheDocument();
    await act(async () => complete({ error: null }));
    await waitFor(() =>
      expect(screen.queryByRole("status", { name: "Signing in" })).not.toBeInTheDocument(),
    );
  });
});
