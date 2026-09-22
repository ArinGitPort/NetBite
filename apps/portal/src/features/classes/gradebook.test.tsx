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
    score: undefined,
    status: "missing",
    studentId: "student-3",
    studentName: "Charlie",
    total: 10,
  },
  {
    assessmentId: "assessment-1",
    assessmentTitle: "Routing quiz",
    attempts: 2,
    percentage: 76,
    score: 7.6,
    status: "passed",
    studentId: "student-1",
    studentName: "Alice",
    total: 10,
  },
  {
    assessmentId: "assessment-1",
    assessmentTitle: "Routing quiz",
    attempts: 1,
    percentage: 92,
    score: 9.2,
    status: "passed",
    studentId: "student-2",
    studentName: "Bob",
    total: 10,
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
    expect(within(table).getByText("7.6 / 10")).toBeInTheDocument();
    expect(studentNames(table)).toEqual(["Alice", "Bob", "Charlie"]);
    expect(within(table).getByRole("columnheader", { name: /student/i })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    fireEvent.click(within(table).getByRole("button", { name: "Sort by Score" }));
    expect(studentNames(table)).toEqual(["Bob", "Alice", "Charlie"]);
    expect(within(table).getByRole("columnheader", { name: /score/i })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    fireEvent.click(within(table).getByRole("button", { name: "Sort by Score" }));
    expect(studentNames(table)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  test("shows scores returned by the previously deployed gradebook service", () => {
    render(
      <Gradebook
        rows={[
          {
            ...rows[1],
            recordedScore: 8,
            score: undefined,
            total: 10,
          },
        ]}
      />,
    );

    expect(screen.getByText("8 / 10")).toBeInTheDocument();
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
      score: (index + 1) / 10,
      status: "passed",
      studentId: `student-${index + 1}`,
      studentName: `Student ${index + 1}`,
      total: 10,
    }));
    render(<Gradebook rows={manyRows} />);

    const table = screen.getByRole("table");
    expect(studentNames(table)).toHaveLength(10);
    expect(screen.getByText("Showing 1–10 of 12 grade records")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(studentNames(table)).toEqual(["Student 11", "Student 12"]);
    expect(screen.getByText("Showing 11–12 of 12 grade records")).toBeInTheDocument();

    fireEvent.click(within(table).getByRole("button", { name: "Sort by Score" }));
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
