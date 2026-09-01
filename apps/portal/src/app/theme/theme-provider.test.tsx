import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ThemeProvider, useTheme } from "@/app/theme/theme-provider";

function ThemeProbe() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  return (
    <div>
      <span>{preference}:{resolvedTheme}</span>
      <button onClick={() => setPreference("light")}>Use light</button>
    </div>
  );
}

describe("portal theme preference", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themePreference;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  test("follows the system initially and persists an explicit choice", () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(screen.getByText("system:dark")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: "Use light" }));
    expect(screen.getByText("light:light")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("netbite-portal-theme")).toBe("light");
  });
});
