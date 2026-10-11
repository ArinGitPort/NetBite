import { adminJson, adminPreflight, requestId } from "../_shared/admin-http.ts";
import { type JsonObject, ServiceError, safeError } from "./service-core.ts";
import { publishWorkshop, createClass } from "./publishing.ts";
import { submitAssessment, assessmentStatus } from "./submissions.ts";
import { gradebook, assessmentAnalytics, attemptDetail, classRoster } from "./reporting.ts";
Deno.serve(async (request) => {
  const preflight = adminPreflight(request);
  if (preflight) return preflight;
  const id = requestId();
  if (request.method !== "POST")
    return adminJson(
      request,
      {
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Use POST.",
          requestId: id,
        },
      },
      405,
    );
  try {
    const body = (await request.json()) as JsonObject;
    switch (body.action) {
      case "publish":
        return await publishWorkshop(request, body, id);
      case "create-class":
        return await createClass(request, body);
      case "submit":
        return await submitAssessment(request, body);
      case "assessment-status":
        return await assessmentStatus(request, body);
      case "gradebook":
        return await gradebook(request, body);
      case "assessment-analytics":
        return await assessmentAnalytics(request, body);
      case "attempt-detail":
        return await attemptDetail(request, body);
      case "class-roster":
        return await classRoster(request, body);
      default:
        throw new ServiceError(
          "UNKNOWN_ACTION",
          "Choose a supported workshop action.",
        );
    }
  } catch (error) {
    return safeError(request, error, id);
  }
});
