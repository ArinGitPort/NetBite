import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { afterEach, describe, expect, test } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

import { ThemeProvider } from "@/app/theme/theme-provider";
import { PageHeader } from "@/components/layout/page-header";
import { PortalShell } from "@/components/layout/portal-shell";
import { PageIntro } from "@/components/ui/admin-primitives";
import type { AdminAccess } from "@/lib/api/types";

const session = { user: { email: "instructor@netbite.local" } } as Session;
const instructorAccess: AdminAccess = { userId: "instructor-1", authorized: true, accessLevel: "instructor" };
const administratorAccess: AdminAccess = { userId: "admin-1", authorized: true, accessLevel: "administrator" };

function GoToClasses() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/instructor/classes")}>Go to classes</button>;
}

afterEach(cleanup);

describe("portal page heading", () => {
  test("shows page copy once in the top bar and updates it on navigation", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/instructor/assessments"]}>
          <Routes>
            <Route element={<PortalShell access={instructorAccess} session={session} />}>
              <Route element={<><PageHeader actions={<button>New assessment</button>} description="Create practice or graded activities." label="ASSESSMENT AUTHORING" title="Assessments" /><GoToClasses /></>} path="/instructor/assessments" />
              <Route element={<PageHeader description="Share a published collection with learners." label="CLASS MANAGEMENT" title="Classes and sharing" />} path="/instructor/classes" />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("heading", { level: 1, name: "Assessments" })).toBeInTheDocument();
    expect(banner).toHaveTextContent("ASSESSMENT AUTHORING");
    expect(banner).toHaveTextContent("Create practice or graded activities.");
    expect(within(screen.getByRole("main")).queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByRole("button", { name: "New assessment" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Go to classes" }));
    expect(within(banner).getByRole("heading", { level: 1, name: "Classes and sharing" })).toBeInTheDocument();
    expect(banner).toHaveTextContent("Share a published collection with learners.");
    expect(screen.queryByText("Instructor workspace")).not.toBeInTheDocument();
  });

  test("keeps admin page actions while moving its title into the top bar", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/admin/curriculum"]}>
          <Routes>
            <Route element={<PortalShell access={administratorAccess} session={session} />}>
              <Route element={<PageIntro action={<button>New lesson</button>} detail="Edit the fixed course structure." eyebrow="CURRICULUM" title="Lesson editor" />} path="/admin/curriculum" />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(within(screen.getByRole("banner")).getByRole("heading", { level: 1, name: "Lesson editor" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("New lesson");
    expect(within(screen.getByRole("main")).queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });
});
