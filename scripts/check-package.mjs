import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "js");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const problems = [];

const exportsMap = pkg.exports ?? {};
if (Object.keys(exportsMap).length === 0) problems.push("package.json has no exports");

for (const [subpath, conditions] of Object.entries(exportsMap)) {
  for (const [kind, expectedTypes] of [
    ["import", ".d.ts"],
    ["require", ".d.cts"],
  ]) {
    const target = conditions[kind];
    if (!target || typeof target !== "object") {
      problems.push(`exports["${subpath}"].${kind} must be an object with types and default`);
      continue;
    }
    if (!target.types?.endsWith(expectedTypes)) {
      problems.push(`exports["${subpath}"].${kind}.types must end in ${expectedTypes}`);
    }
    for (const file of [target.types, target.default]) {
      if (!file || !existsSync(join(root, file)))
        problems.push(`exports["${subpath}"].${kind}: ${file} does not exist; run the build`);
    }
  }
}

// Fields npm reads for the package page and for licence compliance.
for (const field of [
  "name",
  "version",
  "description",
  "license",
  "repository",
  "homepage",
  "bugs",
]) {
  if (!pkg[field]) problems.push(`package.json is missing ${field}`);
}
if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0)
  problems.push("package has runtime dependencies");

const packed = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: root, encoding: "utf8" }),
)[0];
const shipped = new Set(packed.files.map((file) => file.path));
for (const required of ["package.json", "README.md", "LICENSE"]) {
  if (!shipped.has(required)) problems.push(`the tarball does not contain ${required}`);
}
for (const path of shipped) {
  if (!/^(dist\/|package\.json$|README\.md$|LICENSE$)/.test(path))
    problems.push(`unexpected file in the tarball: ${path}`);
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(
  `package ok: ${packed.name}@${packed.version}, ${shipped.size} files, ${packed.unpackedSize} bytes unpacked`,
);
