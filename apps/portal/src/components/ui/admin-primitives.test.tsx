import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { LoadingState } from "@/components/ui/admin-primitives";

describe("LoadingState", () => {
  afterEach(cleanup);

  test("renders the themed liquid loader with an announced context label", () => {
    const { container } = render(<LoadingState label="Loading curriculum" />);

    const status = screen.getByRole("status", { name: "Loading curriculum" });
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent("Loading curriculum");
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector(".fill-signal-orange")).not.toBeNull();
    expect(container.querySelector(".fill-signal-green")).not.toBeNull();
  });
});
