import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { Gradebook } from "@/features/classes/gradebook";

afterEach(cleanup);

const rows = [
  {
    assessmentId: "assessment-1",
    assessmentTitle: "Routing quiz",
    attempts: 1,
    percentage: undefined,
    status: "missing",
    studentId: "student-3",
    studentName: "Charlie",
  },
  {
    assessmentId: "assessment-1",
    assessmentTitle: "Routing quiz",
    attempts: 2,
    percentage: 76,
    status: "passed",
    studentId: "student-1",
    studentName: "Alice",
  },
  {
    assessmentId: "assessment-1",
    assessmentTitle: "Routing quiz",
    attempts: 1,
    percentage: 92,
    status: "passed",
    studentId: "student-2",
    studentName: "Bob",
  },
];

describe("Gradebook table", () => {
  test("announces loading while grade records are being fetched", () => {
    render(<Gradebook loading rows={[]} />);

    expect(screen.getByRole("status", { name: "Loading grade records" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("sorts from accessible column controls and keeps missing grades last", () => {
    render(<Gradebook rows={rows} />);

    const table = screen.getByRole("table");
    expect(studentNames(table)).toEqual(["Alice", "Bob", "Charlie"]);
    expect(within(table).getByRole("columnheader", { name: /student/i })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    fireEvent.click(within(table).getByRole("button", { name: "Sort by Grade" }));
    expect(studentNames(table)).toEqual(["Bob", "Alice", "Charlie"]);
    expect(within(table).getByRole("columnheader", { name: /grade/i })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    fireEvent.click(within(table).getByRole("button", { name: "Sort by Grade" }));
    expect(studentNames(table)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  test("visually separates adjacent column headers", () => {
    render(<Gradebook rows={rows} />);

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: /assessment/i })).toHaveClass(
      "border-l",
      "border-line",
    );
  });

  test("paginates grades and returns to the first page when sorting changes", () => {
    const manyRows = Array.from({ length: 12 }, (_, index) => ({
      assessmentId: "assessment-1",
      assessmentTitle: "Routing quiz",
      attempts: 1,
      percentage: index + 1,
      status: "passed",
      studentId: `student-${index + 1}`,
      studentName: `Student ${index + 1}`,
    }));
    render(<Gradebook rows={manyRows} />);

    const table = screen.getByRole("table");
    expect(studentNames(table)).toHaveLength(10);
    expect(screen.getByText("Showing 1–10 of 12 grade records")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(studentNames(table)).toEqual(["Student 11", "Student 12"]);
    expect(screen.getByText("Showing 11–12 of 12 grade records")).toBeInTheDocument();

    fireEvent.click(within(table).getByRole("button", { name: "Sort by Grade" }));
    expect(studentNames(table)).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

function studentNames(table: HTMLElement) {
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);
}
