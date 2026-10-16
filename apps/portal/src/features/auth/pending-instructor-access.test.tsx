import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ThemeProvider } from "@/app/theme/theme-provider";
import { PendingInstructorAccess } from "@/features/auth/pending-instructor-access";

const { getOwnInstructorRequest, requestInstructorAccess, refreshAccess } = vi.hoisted(() => ({
  getOwnInstructorRequest: vi.fn(),
  requestInstructorAccess: vi.fn(),
  refreshAccess: vi.fn(),
}));

vi.mock("@/app/providers/auth-provider", () => ({ usePortalAuth: () => ({ refreshAccess }) }));
vi.mock("@/lib/api/instructor-registration-service", () => ({ getOwnInstructorRequest, requestInstructorAccess }));

const session = {
  user: {
    id: "instructor-1",
    email: "alex@example.edu",
    user_metadata: { instructor_registration: true, display_name: "Alex Reyes", institution: "NetBite Academy" },
  },
};

describe("Pending instructor access", () => {
  afterEach(cleanup);
  beforeEach(() => {
    getOwnInstructorRequest.mockReset();
    requestInstructorAccess.mockReset();
    refreshAccess.mockReset();
  });

  test("submits the registration request after the account is signed in", async () => {
    getOwnInstructorRequest.mockResolvedValueOnce(null);
    requestInstructorAccess.mockResolvedValueOnce(undefined);

    render(<ThemeProvider><PendingInstructorAccess session={session} onLogout={() => undefined} /></ThemeProvider>);

    await waitFor(() => expect(requestInstructorAccess).toHaveBeenCalledWith("Alex Reyes", "NetBite Academy"));
    expect(await screen.findByRole("heading", { name: "Your request is in review" })).toBeInTheDocument();
  });

  test("does not resubmit an existing request", async () => {
    getOwnInstructorRequest.mockResolvedValueOnce("pending");

    render(<ThemeProvider><PendingInstructorAccess session={session} onLogout={() => undefined} /></ThemeProvider>);

    expect(await screen.findByRole("heading", { name: "Your request is in review" })).toBeInTheDocument();
    expect(requestInstructorAccess).not.toHaveBeenCalled();
  });

  test("lets an existing account request instructor access", async () => {
    getOwnInstructorRequest.mockResolvedValueOnce(null);
    requestInstructorAccess.mockResolvedValueOnce(undefined);
    const existingAccount = { user: { ...session.user, user_metadata: {} } };

    render(<ThemeProvider><PendingInstructorAccess session={existingAccount} onLogout={() => undefined} /></ThemeProvider>);

    expect(await screen.findByRole("heading", { name: "Request instructor access" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Jordan Cruz" } });
    fireEvent.change(screen.getByLabelText("School or organization"), { target: { value: "NetBite Academy" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(requestInstructorAccess).toHaveBeenCalledWith("Jordan Cruz", "NetBite Academy"));
    expect(await screen.findByRole("heading", { name: "Your request is in review" })).toBeInTheDocument();
  });
});
