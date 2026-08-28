import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const styles = readFileSync(
  resolve(process.cwd(), "src/styles/base.css"),
  "utf8",
);
const pageHeader = readFileSync(
  resolve(process.cwd(), "src/components/layout/page-header.tsx"),
  "utf8",
);
const button = readFileSync(
  resolve(process.cwd(), "src/components/ui/button.tsx"),
  "utf8",
);
const panel = readFileSync(
  resolve(process.cwd(), "src/components/ui/panel.tsx"),
  "utf8",
);
const badge = readFileSync(
  resolve(process.cwd(), "src/components/ui/badge.tsx"),
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

  test("keeps the editorial heading scale restrained outside authentication", () => {
    expect(pageHeader).toContain("clamp(2rem,3vw,2.5rem)");
    expect(pageHeader).toContain("text-sm leading-6");
    expect(pageHeader).not.toContain("5vw");
  });

  test("keeps compact shared controls with accessible targets", () => {
    expect(button).toContain("min-h-11");
    expect(button).toContain("text-[0.7rem]");
    expect(panel).toContain("p-5");
    expect(panel).not.toContain("p-8");
  });

  test("keeps badge icons separated and browser autofill theme-safe", () => {
    expect(badge).toContain("gap-2");
    expect(badge).toContain("[&_svg]:shrink-0");
    expect(styles).toContain("input:-webkit-autofill");
    expect(styles).toContain("var(--color-canvas) inset");
  });
});
