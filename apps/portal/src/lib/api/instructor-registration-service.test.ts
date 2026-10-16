import { beforeEach, describe, expect, test, vi } from "vitest";

import { createInstructorAccount, getOwnInstructorRequest, requestInstructorAccess } from "@/lib/api/instructor-registration-service";

const { signUp, rpc, from, select, eq, maybeSingle } = vi.hoisted(() => ({
  signUp: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  getPortalClient: () => ({ auth: { signUp }, rpc, from }),
}));

describe("Instructor registration API", () => {
  beforeEach(() => {
    signUp.mockReset();
    rpc.mockReset();
    from.mockReset().mockReturnValue({ select });
    select.mockReset().mockReturnValue({ eq });
    eq.mockReset().mockReturnValue({ maybeSingle });
    maybeSingle.mockReset();
  });

  test("creates a user with request details but no privileged role", async () => {
    signUp.mockResolvedValueOnce({ data: { user: null, session: null }, error: null });

    await createInstructorAccount({
      email: "alex@example.edu",
      password: "safe-password-123",
      displayName: "Alex Reyes",
      institution: "NetBite Academy",
      emailRedirectTo: "http://localhost:4174/",
    });

    expect(signUp).toHaveBeenCalledWith({
      email: "alex@example.edu",
      password: "safe-password-123",
      options: {
        emailRedirectTo: "http://localhost:4174/",
        data: { instructor_registration: true, display_name: "Alex Reyes", institution: "NetBite Academy" },
      },
    });
  });

  test("reads only the signed-in user's request and submits approval via the existing RPC", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { status: "pending" }, error: null });
    rpc.mockResolvedValueOnce({ error: null });

    expect(await getOwnInstructorRequest("instructor-1")).toBe("pending");
    expect(from).toHaveBeenCalledWith("instructor_requests");
    expect(eq).toHaveBeenCalledWith("user_id", "instructor-1");

    await requestInstructorAccess(" Alex Reyes ", " NetBite Academy ");
    expect(rpc).toHaveBeenCalledWith("request_instructor_access", {
      p_display_name: "Alex Reyes",
      p_institution: "NetBite Academy",
      p_reason: "",
    });
  });
});
