import { render, screen } from "@testing-library/react";
import { LockKeyhole } from "lucide-react";
import { describe, expect, test } from "vitest";

import { StatusBadge } from "@/components/ui/admin-primitives";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  test("centers and consistently sizes an icon beside its label", () => {
    render(<Badge><LockKeyhole aria-hidden="true" />Authorized staff only</Badge>);

    const badge = screen.getByText("Authorized staff only");
    expect(badge).toHaveClass("items-center", "justify-center", "leading-none", "[&_svg]:size-3.5");
  });

  test("uses the shared badge layout for legacy status badges", () => {
    render(<StatusBadge tone="green"><LockKeyhole aria-hidden="true" />Verified</StatusBadge>);

    expect(screen.getByText("Verified")).toHaveClass("gap-1.5", "[&_svg]:self-center", "text-signal-green");
  });
});
