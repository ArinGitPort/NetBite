import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const violations = [];
const moduleReference =
  /(?:from\s+|import\s*\(|require\s*\(|vi\.mock\s*\(|jest\.mock\s*\(|export\s+[^;]*?from\s+)["']([^"']+)["']/g;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["node_modules", "dist", ".expo", "coverage"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (sourceExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const rules = [
  {
    root: "apps/portal",
    forbidden: ["apps/mobile", "@netbite/mobile", "../../mobile", "../mobile", "mobile/assets"],
    message: "Portal code cannot import mobile application code or assets.",
  },
  {
    root: "apps/mobile",
    forbidden: ["apps/portal", "@netbite/portal", "../../portal", "../portal"],
    message: "Mobile code cannot import portal application code.",
  },
  {
    root: "packages",
    forbidden: ["apps/mobile", "apps/portal", "@netbite/mobile", "@netbite/portal"],
    message: "Shared packages cannot import application code.",
  },
  {
    root: "supabase/functions",
    forbidden: ["react-native", "react-dom", "apps/mobile", "apps/portal"],
    message: "Supabase Functions cannot depend on browser or React Native applications.",
  },
];

for (const rule of rules) {
  const root = resolve(repositoryRoot, rule.root);
  for (const file of await walk(root)) {
    const text = await readFile(file, "utf8");
    const references = [...text.matchAll(moduleReference)].map((match) => match[1]);
    for (const reference of references) {
      for (const forbidden of rule.forbidden) {
        if (reference.includes(forbidden)) {
          violations.push(
            `${relative(repositoryRoot, file)}: ${rule.message} Found '${forbidden}' in '${reference}'.`,
          );
        }
      }
      if (reference.includes("../shared") || reference.includes("../../shared")) {
        violations.push(
          `${relative(repositoryRoot, file)}: import the relevant @netbite package instead of the obsolete shared folder.`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("Workspace import boundaries are valid.");
