import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr") },
}));
vi.mock("@/lib/api/workshop-service", () => ({
  getWorkshopClassRoster: vi.fn().mockResolvedValue({
    students: [
      { displayName: "Alex Student", joinedAt: "2026-08-30T08:00:00.000Z" },
    ],
  }),
  setWorkshopClassEnrollment: vi.fn().mockResolvedValue(undefined),
}));

import { ClassShareCard } from "@/features/classes/class-share-card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getWorkshopClassRoster } from "@/lib/api/workshop-service";

describe("ClassShareCard", () => {
  test("loads the private class roster only when requested", async () => {
    render(
      <TooltipProvider>
        <ClassShareCard
          onChanged={vi.fn()}
          onNotice={vi.fn()}
          row={{
            id: "class-1",
            workshop_id: "workshop-1",
            version_id: "version-1",
            title: "Routing class",
            join_code: "ABC12345",
            archived: false,
            join_enabled: true,
            created_at: "2026-08-30T07:00:00.000Z",
          }}
        />
      </TooltipProvider>,
    );

    expect(getWorkshopClassRoster).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /enrolled students/i }));

    await waitFor(() => expect(getWorkshopClassRoster).toHaveBeenCalledWith("class-1"));
    expect(await screen.findByText("Alex Student")).toBeInTheDocument();
    expect(screen.getByText(/joined aug/i)).toBeInTheDocument();
  });
});
