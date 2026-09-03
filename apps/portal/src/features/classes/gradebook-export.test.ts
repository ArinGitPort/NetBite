import type { CellObject } from "write-excel-file/browser";
import { describe, expect, test } from "vitest";

import { buildGradebookSheet } from "@/features/classes/gradebook-export";

describe("gradebook Excel export", () => {
  test("builds a formatted sheet with numeric grades and readable statuses", () => {
    const sheet = buildGradebookSheet([
      {
        assessmentTitle: "Router on a Stick Quiz",
        attempts: 2,
        percentage: 87.5,
        status: "passed",
        studentName: "Aisha Rahman",
      },
      {
        assessmentTitle: "Router on a Stick Quiz",
        attempts: 0,
        status: "missing",
        studentName: "Ben Santos",
      },
    ]);

    expect(sheet).toHaveLength(6);
    expect(sheet[0]?.[0]).toMatchObject({
      columnSpan: 5,
      fontWeight: "bold",
      value: "NETBITE GRADEBOOK",
    });
    expect(sheet[3]?.map((cell) => (cell as CellObject).value)).toEqual([
      "Student",
      "Assessment",
      "Grade",
      "Attempts",
      "Status",
    ]);
    expect(sheet[4]?.[2]).toMatchObject({ format: "0.0%", type: Number, value: 0.875 });
    expect(sheet[4]?.[4]).toMatchObject({ backgroundColor: "#DDEFE8", value: "PASSED" });
    expect(sheet[5]?.[2]).toMatchObject({ value: "—" });
    expect(sheet[5]?.[4]).toMatchObject({ backgroundColor: "#F8E9D9", value: "MISSING" });
  });
});
