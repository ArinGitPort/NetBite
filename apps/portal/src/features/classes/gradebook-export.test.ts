import type { CellObject } from "write-excel-file/browser";
import { describe, expect, test } from "vitest";

import { buildGradebookSheet } from "@/features/classes/gradebook-export";

describe("gradebook Excel export", () => {
  test("builds a formatted sheet with numeric grades and readable statuses", () => {
    const sheet = buildGradebookSheet([
      {
        assessmentTitle: "Router on a Stick Quiz",
        attempts: 2,
        score: 7,
        status: "passed",
        studentName: "Aisha Rahman",
        total: 8,
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
      columnSpan: 6,
      fontWeight: "bold",
      value: "NETBITE GRADEBOOK",
    });
    expect(sheet[3]?.map((cell) => (cell as CellObject).value)).toEqual([
      "Student",
      "Assessment",
      "Score",
      "Out of",
      "Attempts",
      "Status",
    ]);
    expect(sheet[4]?.[2]).toMatchObject({ format: "0.00", type: Number, value: 7 });
    expect(sheet[4]?.[3]).toMatchObject({ format: "0.00", type: Number, value: 8 });
    expect(sheet[4]?.[5]).toMatchObject({ backgroundColor: "#DDEFE8", value: "PASSED" });
    expect(sheet[5]?.[2]).toMatchObject({ value: "—" });
    expect(sheet[5]?.[5]).toMatchObject({ backgroundColor: "#F8E9D9", value: "MISSING" });
  });
});
