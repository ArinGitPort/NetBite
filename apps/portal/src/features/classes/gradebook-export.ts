import type { Cell, SheetData } from "write-excel-file/browser";

export interface GradebookExportRow {
  assessmentTitle: string;
  attempts: number | string;
  percentage?: number;
  status: string;
  studentName: string;
}

const border = { borderColor: "#D8D1D6", borderStyle: "thin" as const };
const centered = { align: "center" as const, alignVertical: "center" as const };

export async function downloadGradebookWorkbook(rows: GradebookExportRow[]) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const blob = await writeExcelFile(buildGradebookSheet(rows), {
    columns: [{ width: 28 }, { width: 34 }, { width: 14 }, { width: 12 }, { width: 18 }],
    orientation: "landscape",
    sheet: "Recorded grades",
    showGridLines: false,
    stickyColumnsCount: 1,
    stickyRowsCount: 4,
  }).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `netbite-gradebook-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildGradebookSheet(rows: GradebookExportRow[]): SheetData {
  const generated = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  return [
    [
      {
        ...centered,
        backgroundColor: "#1D171F",
        columnSpan: 5,
        fontSize: 18,
        fontWeight: "bold",
        height: 34,
        textColor: "#FFFFFF",
        value: "NETBITE GRADEBOOK",
      },
      null,
      null,
      null,
      null,
    ],
    [
      {
        ...centered,
        backgroundColor: "#F3ECEF",
        columnSpan: 5,
        fontSize: 10,
        height: 24,
        textColor: "#655D64",
        value: `${rows.length} filtered grade records · Generated ${generated}`,
      },
      null,
      null,
      null,
      null,
    ],
    [null, null, null, null, null],
    ["Student", "Assessment", "Grade", "Attempts", "Status"].map(headerCell),
    ...rows.map((row, index) => gradeRow(row, index)),
  ];
}

function headerCell(value: string): Cell {
  return {
    ...border,
    ...centered,
    backgroundColor: "#DCEBE6",
    fontWeight: "bold",
    height: 26,
    textColor: "#17201D",
    value,
  };
}

function gradeRow(row: GradebookExportRow, index: number): Cell[] {
  const backgroundColor = index % 2 ? "#F7F4F6" : "#FFFFFF";
  const common = {
    ...border,
    alignVertical: "center" as const,
    backgroundColor,
    height: 24,
  };
  const percentage = Number(row.percentage);
  const attempts = Number(row.attempts);
  return [
    { ...common, fontWeight: "bold", value: row.studentName || "Student" },
    { ...common, value: row.assessmentTitle || "Assessment" },
    Number.isFinite(percentage)
      ? { ...common, align: "right", format: "0.0%", type: Number, value: percentage / 100 }
      : { ...common, align: "center", textColor: "#797177", value: "—" },
    Number.isFinite(attempts)
      ? { ...common, ...centered, type: Number, value: attempts }
      : { ...common, ...centered, value: "—" },
    statusCell(row.status, common),
  ];
}

function statusCell(status: string, common: Record<string, unknown>): Cell {
  const normalized = status.trim().toLowerCase();
  const palette = normalized === "passed"
    ? { backgroundColor: "#DDEFE8", textColor: "#176B58" }
    : normalized === "missing" || normalized === "late"
      ? { backgroundColor: "#F8E9D9", textColor: "#A85518" }
      : { backgroundColor: "#F8DEDF", textColor: "#A62E35" };
  return {
    ...common,
    ...centered,
    ...palette,
    fontWeight: "bold",
    value: normalized.replaceAll("-", " ").toUpperCase() || "UNKNOWN",
  };
}
