import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const styles = readFileSync(
  resolve(process.cwd(), "src/styles/base.css"),
  "utf8",
);

describe("portal layout integrity styles", () => {
  test("keeps visible themed scrollbars", () => {
    expect(styles).toContain(
      "scrollbar-color: var(--color-raised) var(--color-canvas)",
    );
    expect(styles).toContain("*::-webkit-scrollbar-thumb");
    expect(styles).toContain("width: 10px");
    expect(styles).not.toMatch(/::-webkit-scrollbar\s*\{[^}]*display:\s*none/s);
  });
});
