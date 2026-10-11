import {
  type GradebookStudentRow,
  type GradebookSummary,
} from "./workshop-types";

export function calculateGradebookSummary(
  rows: GradebookStudentRow[],
): GradebookSummary {
  const submitted = rows.filter((row) => row.percentage != null);
  const scores = submitted.map((row) => row.percentage!).sort((a, b) => a - b);
  const average = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;
  const middle = Math.floor(scores.length / 2);
  const median = !scores.length
    ? 0
    : scores.length % 2
    ? scores[middle]
    : (scores[middle - 1] + scores[middle]) / 2;
  return {
    enrolled: rows.length,
    submitted: submitted.length,
    missing: rows.length - submitted.length,
    late: rows.filter((row) => row.status === "late").length,
    average,
    median,
    highest: scores.at(-1) ?? 0,
    lowest: scores[0] ?? 0,
    passRate: submitted.length
      ? (rows.filter((row) => row.status === "passed").length /
        submitted.length) *
        100
      : 0,
  };
}
