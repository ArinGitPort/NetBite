import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { InstructorDashboard } from "@/features/workshops/pages/instructor-dashboard";
import * as workshopApi from "@/lib/api/workshop-service";

vi.mock("@/lib/api/workshop-service", () => ({ getInstructorOverview: vi.fn() }));

describe("InstructorDashboard", () => {
  afterEach(cleanup);

  test("summarizes instructor work and exposes frequent destinations", async () => {
    vi.mocked(workshopApi.getInstructorOverview).mockResolvedValue({
      workshops: [
        { id: "workshop-1", title: "Routing lab", description: "Practice static routes.", archived: false, current_version_id: "version-1", updated_at: "2026-09-01T10:00:00.000Z" },
        { id: "workshop-2", title: "VLAN draft", description: "", archived: false, updated_at: "2026-08-30T10:00:00.000Z" },
      ],
      classes: [{ id: "class-1", workshop_id: "workshop-1", version_id: "version-1", title: "Networking 101", join_code: "ABC123", archived: false, join_enabled: true, created_at: "2026-09-01T10:00:00.000Z" }],
      assessments: [
        { id: "assessment-1", mode: "graded", archived: false },
        { id: "assessment-2", mode: "practice", archived: false },
      ],
    });

    render(<MemoryRouter><InstructorDashboard /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Instructor overview" })).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Instructor summary" });
    const collections = within(summary).getByText("Lesson collections").closest("article");
    expect(collections).not.toBeNull();
    expect(within(collections!).getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Assessments/ })).toHaveAttribute("href", "/instructor/assessments");
    expect(screen.getByRole("link", { name: /Gradebook/ })).toHaveAttribute("href", "/instructor/gradebook");
    expect(screen.getByText("Routing lab")).toBeInTheDocument();
    expect(screen.getByText("CLASSROOM READY")).toBeInTheDocument();
  });
});
