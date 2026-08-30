import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { architectureFixtures } from "./architecture-fixtures.mjs";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const forbiddenFiles = new Set(["legacy.css", "workshops.css", "components.css"]);
const forbiddenClassPatterns = [
  /className=["'`](?:button|panel|field|page-intro|workshop-shell|topology-authoring-layout)(?:\s|["'`])/,
];
const sizeException = /^\/\/ @architecture-size-exception: \S.+$/m;
const moduleReference = /(?:from\s+|import\s*(?:\(\s*)?|vi\.mock\s*\(|jest\.mock\s*\(|export\s+[^;]*?from\s+)["']([^"']+)["']/g;
const approvedSupabaseInfrastructure = new Set([
  "lib/supabase.ts",
  "lib/api/client.ts",
  "app/providers/auth-provider.tsx",
  "app/route-guards/workspace-guard.tsx",
  "app/router/portal-router.tsx",
  "components/layout/portal-shell.tsx",
  "features/auth/auth-pages.tsx",
]);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? collect(join(directory, entry.name))
        : [join(directory, entry.name)],
    ),
  );
  return nested.flat();
}

function featureName(path) {
  return path.match(/^features\/([^/]+)\//)?.[1];
}

export function inspectPortalSource(path, source) {
  const problems = [];
  const normalizedPath = path.replaceAll("\\", "/");
  const lines = source.split(/\r?\n/).length;
  if (lines > 600) {
    problems.push(`${normalizedPath} has ${lines} lines; the absolute maximum is 600.`);
  } else if (
    lines > 500 &&
    !sizeException.test(source.split(/\r?\n/, 6).join("\n"))
  ) {
    problems.push(
      `${normalizedPath} has ${lines} lines without an architecture size exception.`,
    );
  }

  const owner = featureName(normalizedPath);
  for (const match of source.matchAll(moduleReference)) {
    const target = match[1];
    if (target.startsWith("./") || target.startsWith("../")) {
      problems.push(`${normalizedPath} uses relative source import ${target}.`);
    }
    const featureTarget = target.match(/^@\/features\/([^/]+)(?:\/(.+))?$/);
    if (featureTarget && featureTarget[1] !== owner && featureTarget[2]) {
      problems.push(
        `${normalizedPath} deep-imports feature ${featureTarget[1]}; use its public index.ts.`,
      );
    }
    if (target.includes("apps/mobile") || target.includes("@netbite/mobile")) {
      problems.push(`${normalizedPath} imports mobile application code.`);
    }
    if (
      (target === "@supabase/supabase-js" || target === "@/lib/supabase") &&
      !approvedSupabaseInfrastructure.has(normalizedPath) &&
      !normalizedPath.endsWith(".test.ts") &&
      !normalizedPath.endsWith(".test.tsx")
    ) {
      problems.push(
        `${normalizedPath} imports Supabase outside approved infrastructure.`,
      );
    }
  }

  const importsCss = /import\s+["'][^"']+\.css["']/.test(source);
  const isGlobalEntry =
    normalizedPath === "main.tsx" && source.includes('import "@/styles.css"');
  if (importsCss && !isGlobalEntry) {
    problems.push(`${normalizedPath} imports feature-level CSS.`);
  }
  if (forbiddenClassPatterns.some((pattern) => pattern.test(source))) {
    problems.push(`${normalizedPath} uses a removed semantic CSS class.`);
  }
  return problems;
}

function validateFixtures() {
  const failures = [];
  for (const fixture of architectureFixtures) {
    const actual = inspectPortalSource(fixture.path, fixture.source);
    for (const expected of fixture.expected) {
      if (!actual.some((problem) => problem.includes(expected))) {
        failures.push(`${fixture.name}: expected ${expected}`);
      }
    }
    if (!fixture.expected.length && actual.length) {
      failures.push(`${fixture.name}: ${actual.join("; ")}`);
    }
  }
  return failures;
}

const files = await collect(sourceRoot);
const problems = validateFixtures();
for (const file of files) {
  const path = relative(sourceRoot, file).replaceAll("\\", "/");
  const name = path.split("/").at(-1);
  if (forbiddenFiles.has(name)) {
    problems.push(`${path} is a removed compatibility stylesheet.`);
  }
  if (![".ts", ".tsx"].includes(extname(file))) continue;
  const source = await readFile(file, "utf8");
  problems.push(...inspectPortalSource(path, source));
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Portal architecture check passed.");
}
