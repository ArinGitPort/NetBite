import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const forbiddenFiles = new Set(["legacy.css", "workshops.css", "components.css"]);
const forbiddenClassPatterns = [
  /className=["'`](?:button|panel|field|page-intro|workshop-shell|topology-authoring-layout)(?:\s|["'`])/,
];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? collect(join(directory, entry.name)) : [join(directory, entry.name)]));
  return nested.flat();
}

const files = await collect(sourceRoot);
const problems = [];
for (const file of files) {
  const name = file.split(/[\\/]/).at(-1);
  if (forbiddenFiles.has(name)) problems.push(`${relative(sourceRoot, file)} is a removed compatibility stylesheet.`);
  if (![".ts", ".tsx"].includes(extname(file))) continue;
  const source = await readFile(file, "utf8");
  const importsCss = /import\s+["'][^"']+\.css["']/.test(source);
  const isGlobalEntry = relative(sourceRoot, file) === "main.tsx" && source.includes("./styles.css");
  if (importsCss && !isGlobalEntry) problems.push(`${relative(sourceRoot, file)} imports feature-level CSS.`);
  if (forbiddenClassPatterns.some((pattern) => pattern.test(source))) problems.push(`${relative(sourceRoot, file)} uses a removed semantic CSS class.`);
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Tailwind architecture check passed.");
}
