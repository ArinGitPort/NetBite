import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { StrokeText } from "@/components/ui/stroke-text";

vi.mock("gsap", () => ({
  gsap: {
    context: (callback: () => void) => {
      callback();
      return { revert: vi.fn() };
    },
    timeline: () => {
      const timeline = { to: () => timeline };
      return timeline;
    },
  },
}));

function mockMotionPreference(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(
    () =>
      ({
        matches: reduced,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
    ),
  );
}

describe("StrokeText", () => {
  beforeEach(() => {
    Object.defineProperty(SVGElement.prototype, "getBBox", {
      configurable: true,
      value: () => ({ x: 0, y: -80, width: 760, height: 90 }),
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("starts with the fill clipped and stroke paths hidden without flashing", () => {
    mockMotionPreference(false);
    const { container } = render(<StrokeText text="networking lessons" />);

    expect(screen.getByRole("img", { name: "networking lessons" })).toBeInTheDocument();
    expect(container.querySelector("rect")).toHaveAttribute("width", "0");
    expect(container.querySelector("[data-stroke-character]")).toHaveAttribute(
      "stroke-dashoffset",
      "800",
    );
  });

  test("renders the completed text immediately when reduced motion is requested", () => {
    mockMotionPreference(true);
    const { container } = render(<StrokeText text="networking lessons" />);

    expect(container.querySelector("rect")).toHaveAttribute("width", "768");
    expect(container.querySelector("[data-stroke-character]")).toHaveAttribute(
      "stroke-dashoffset",
      "0",
    );
  });
});
