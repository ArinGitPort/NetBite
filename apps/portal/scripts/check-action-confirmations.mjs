import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));
const violations = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (![".ts", ".tsx"].includes(extname(entry.name)) || entry.name.includes(".test.")) continue;
    const source = await readFile(path, "utf8");
    const displayPath = relative(sourceRoot, path).replaceAll("\\", "/");
    const checks = [
      [/(?:window|globalThis)\.confirm\s*\(/g, "native confirm"],
      [/(?:window|globalThis)\.alert\s*\(/g, "native alert"],
      [/@radix-ui\/react-alert-dialog/g, "direct AlertDialog primitive import"],
      [/\b(?:confirmDelete|setConfirmDelete)\b/g, "feature-local confirmation state"],
    ];
    for (const [pattern, label] of checks) {
      if (displayPath === "components/ui/dialog.tsx" && label === "direct AlertDialog primitive import") continue;
      if (pattern.test(source)) violations.push(`${displayPath}: ${label}`);
    }
  }
}

await visit(sourceRoot);

if (violations.length) {
  console.error("Portal actions must use components/ui/dialog.tsx:\n" + violations.map((item) => `- ${item}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Portal action confirmation guard passed.");
}
