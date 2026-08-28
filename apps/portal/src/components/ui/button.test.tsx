import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  test("uses an explicit high-contrast primary treatment", () => {
    render(<Button tone="primary">Publish</Button>);
    const button = screen.getByRole("button", { name: "Publish" });
    expect(button).toHaveClass("bg-copy", "text-canvas");
  });

  test("keeps disabled text and background explicit", () => {
    render(
      <Button disabled tone="primary">
        Approve instructor
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Approve instructor" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass(
      "disabled:bg-raised/70",
      "disabled:text-muted/75",
    );
  });
});
