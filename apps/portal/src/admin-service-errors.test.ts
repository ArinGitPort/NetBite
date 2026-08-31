import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: undefined }));

import { mapAdminServiceError, throwIfFunctionError } from "@/lib/api/errors";

describe("administrator service errors", () => {
  test("does not expose an unstructured service error", () => {
    const result = mapAdminServiceError(
      new Error(
        "relation content_admins does not exist at postgresql://internal",
      ),
      "The action could not be completed.",
    );
    expect(result.message).toBe("The action could not be completed.");
    expect(result.message).not.toMatch(/content_admins|postgresql/i);
  });

  test("maps approved error codes to fixed messages", () => {
    expect(
      mapAdminServiceError({
        error: { code: "AUTH_REQUIRED", message: "raw service text" },
      }),
    ).toEqual({
      code: "AUTH_REQUIRED",
      message: "Sign in to continue.",
    });
  });

  test("does not trust an unknown structured message", () => {
    expect(
      mapAdminServiceError({
        error: { code: "UNKNOWN", message: "internal table failed" },
      }).message,
    ).toBe("The action could not be completed.");
  });

  test("extracts an approved error from a Supabase Function response", async () => {
    const response = new Response(JSON.stringify({
      error: { code: "LESSON_REQUIRED", message: "raw server text" },
    }), { status: 400, headers: { "Content-Type": "application/json" } });

    await expect(
      throwIfFunctionError({ context: response }, "The workshop service is unavailable."),
    ).rejects.toMatchObject({
      code: "LESSON_REQUIRED",
      message: "raw server text",
    });
  });

  test("keeps safe record-specific publication guidance", () => {
    expect(
      mapAdminServiceError({
        error: {
          code: "INVALID_LESSON",
          message: "Lesson “Addressing”: Lesson block 2 is required.",
        },
      }),
    ).toEqual({
      code: "INVALID_LESSON",
      message: "Lesson “Addressing”: Lesson block 2 is required.",
    });
  });
});
