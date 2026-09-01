import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ThemeProvider } from "@/app/theme/theme-provider";
import { Login } from "@/features/auth/auth-pages";

vi.mock("@/lib/supabase", () => ({ supabase: undefined }));

describe("Login", () => {
  afterEach(cleanup);

  test("offers appearance controls and the animated network treatment before sign-in", () => {
    const { container } = render(<ThemeProvider><Login /></ThemeProvider>);

    expect(screen.getByRole("button", { name: /Appearance:/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Publish accurate networking lessons/ })).toBeInTheDocument();
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(2);
    expect(screen.getByText("CURRICULUM CONTROL PLANE")).toBeInTheDocument();
  });
});
