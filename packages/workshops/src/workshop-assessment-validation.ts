import {
  type GradedAssessmentSettings,
  type WorkshopValidationIssue,
} from "./workshop-types";

export function validateGradedAssessmentSettings(
  settings: GradedAssessmentSettings,
): WorkshopValidationIssue[] {
  const issues: WorkshopValidationIssue[] = [];
  if (
    !Number.isInteger(settings.maximumAttempts) ||
    settings.maximumAttempts < 1 ||
    settings.maximumAttempts > 20
  ) {
    issues.push({
      severity: "error",
      path: "maximumAttempts",
      message: "Maximum attempts must be between 1 and 20.",
    });
  }
  if (
    !Number.isFinite(settings.passingPercentage) ||
    settings.passingPercentage < 0 ||
    settings.passingPercentage > 100
  ) {
    issues.push({
      severity: "error",
      path: "passingPercentage",
      message: "Passing percentage must be between 0 and 100.",
    });
  }
  if (settings.opensAt && Number.isNaN(Date.parse(settings.opensAt))) {
    issues.push({
      severity: "error",
      path: "opensAt",
      message: "Opening date is not valid.",
    });
  }
  if (settings.dueAt && Number.isNaN(Date.parse(settings.dueAt))) {
    issues.push({
      severity: "error",
      path: "dueAt",
      message: "Due date is not valid.",
    });
  }
  if (
    settings.opensAt &&
    settings.dueAt &&
    Date.parse(settings.dueAt) <= Date.parse(settings.opensAt)
  ) {
    issues.push({
      severity: "error",
      path: "dueAt",
      message: "Due date must be after the opening date.",
    });
  }
  return issues;
}
