import {
  extractWorkshopClassCode,
  normalizeWorkshopClassCode,
} from "@/features/workshops/class-join-code";

describe("workshop class invitation codes", () => {
  it("normalizes manually entered codes", () => {
    expect(normalizeWorkshopClassCode(" zwe-xay m4 ")).toBe("ZWEXAYM4");
    expect(normalizeWorkshopClassCode("abcdefghijklmnop")).toBe("ABCDEFGHIJ");
  });

  it("reads a direct class code", () => {
    expect(extractWorkshopClassCode("abc234xy")).toBe("ABC234XY");
  });

  it("reads the invitation URI encoded by the instructor portal", () => {
    expect(
      extractWorkshopClassCode(
        "netbite:///workshops/join?code=ZWE%58AYM4",
      ),
    ).toBe("ZWEXAYM4");
  });

  it("rejects unrelated and malformed QR values", () => {
    expect(extractWorkshopClassCode("https://example.com/no-invitation")).toBeUndefined();
    expect(extractWorkshopClassCode("ABC")).toBeUndefined();
    expect(extractWorkshopClassCode("netbite:///workshops/join?code=BAD-CODE")).toBeUndefined();
  });
});
