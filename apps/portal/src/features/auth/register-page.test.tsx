import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ThemeProvider } from "@/app/theme/theme-provider";
import { Register } from "@/features/auth/register-page";

const { createInstructorAccount } = vi.hoisted(() => ({ createInstructorAccount: vi.fn() }));

vi.mock("@/lib/api/instructor-registration-service", () => ({ createInstructorAccount }));

function fillRegistration(password = "safe-password-123", confirmation = password) {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Alex Reyes" } });
  fireEvent.change(screen.getByLabelText("School or organization"), { target: { value: "NetBite Academy" } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "alex@example.edu" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: confirmation } });
}

describe("Instructor registration", () => {
  afterEach(cleanup);
  beforeEach(() => createInstructorAccount.mockReset());

  test("explains approval and provides a route back to sign-in", () => {
    render(<ThemeProvider><Register /></ThemeProvider>);

    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByText(/does not grant instructor access automatically/i)).toBeInTheDocument();
    expect(screen.getByText(/Teaching access starts after approval/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /sign in/i })[0]).toHaveAttribute("href", "#/login");
    expect(screen.getByRole("link", { name: "NetBite — go to sign in" })).toHaveAttribute("href", "#/login");
  });

  test("updates password guidance and strength as the password changes", () => {
    render(<ThemeProvider><Register /></ThemeProvider>);
    const password = screen.getByLabelText("Password");
    const meter = screen.getByRole("meter", { name: "Password strength" });

    expect(meter).toHaveAttribute("aria-valuenow", "0");
    fireEvent.change(password, { target: { value: "short" } });
    expect(meter).toHaveAttribute("aria-valuetext", "Weak");
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();

    fireEvent.change(password, { target: { value: "longerphrase" } });
    expect(meter).toHaveAttribute("aria-valuetext", "Fair");
    expect(screen.getByText(/Try 12 or more characters/)).toBeInTheDocument();

    fireEvent.change(password, { target: { value: "A long password phrase 123!" } });
    expect(meter).toHaveAttribute("aria-valuetext", "Strong");
    expect(screen.getByText(/Avoid reusing this password/)).toBeInTheDocument();
  });

  test("focuses the mismatched confirmation without creating an account", () => {
    render(<ThemeProvider><Register /></ThemeProvider>);
    fillRegistration("safe-password-123", "different-password");

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("passwords do not match");
    expect(screen.getByLabelText("Confirm password")).toHaveFocus();
    expect(createInstructorAccount).not.toHaveBeenCalled();
  });

  test("creates an account without granting a role and explains the email step", async () => {
    createInstructorAccount.mockResolvedValueOnce({ data: { session: null }, error: null });
    render(<ThemeProvider><Register /></ThemeProvider>);
    fillRegistration();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(createInstructorAccount).toHaveBeenCalledWith(expect.objectContaining({
      email: "alex@example.edu",
      password: "safe-password-123",
      displayName: "Alex Reyes",
      institution: "NetBite Academy",
      emailRedirectTo: expect.stringContaining("http"),
    })));
    expect(await screen.findByRole("heading", { name: "Check your inbox" })).toBeInTheDocument();
    expect(screen.getByText(/sign in to submit your instructor request/i)).toBeInTheDocument();
  });
});
