export const architectureFixtures = [
  {
    name: "accepts source aliases",
    path: "features/example/example.ts",
    source: 'import { Button } from "@/components/ui/button";\n',
    expected: [],
  },
  {
    name: "rejects relative source imports",
    path: "features/example/example.ts",
    source: 'import { helper } from "./helper";\n',
    expected: ["uses relative source import ./helper"],
  },
  {
    name: "rejects relative side-effect imports",
    path: "features/example/example.ts",
    source: 'import "./setup";\n',
    expected: ["uses relative source import ./setup"],
  },
  {
    name: "accepts five hundred lines",
    path: "features/example/example.ts",
    source: Array.from({ length: 500 }, () => "export {}; ").join("\n"),
    expected: [],
  },
  {
    name: "accepts a documented size exception",
    path: "features/example/example.ts",
    source: [
      "// @architecture-size-exception: parser states are reviewed together",
      ...Array.from({ length: 549 }, () => "export {}; "),
    ].join("\n"),
    expected: [],
  },
  {
    name: "rejects undocumented files above target",
    path: "features/example/example.ts",
    source: Array.from({ length: 501 }, () => "export {}; ").join("\n"),
    expected: ["has 501 lines without an architecture size exception"],
  },
  {
    name: "rejects files above the absolute limit",
    path: "features/example/example.ts",
    source: [
      "// @architecture-size-exception: this must still fail",
      ...Array.from({ length: 600 }, () => "export {}; "),
    ].join("\n"),
    expected: ["has 601 lines; the absolute maximum is 600"],
  },
];
