import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SPEC_DIR = fileURLToPath(new URL("../../../spec/", import.meta.url));

export interface Case {
  name: string;
  args: unknown[];
  returns?: unknown;
  contains?: unknown[];
  throws?: "TypeError" | "RangeError";
}

export interface SpecFile {
  module: string;
  functions: Record<string, Case[]>;
  values: Record<string, unknown>;
}

export function loadSpecFiles(): { file: string; spec: SpecFile }[] {
  return readdirSync(SPEC_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({ file, spec: JSON.parse(readFileSync(SPEC_DIR + file, "utf8")) as SpecFile }));
}

/** Turns `{ "$int": "123" }` into a bigint, recursively. */
export function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    const first = entries[0];
    if (entries.length === 1 && first && first[0] === "$int") return BigInt(first[1] as string);
    return Object.fromEntries(entries.map(([key, inner]) => [key, decode(inner)]));
  }
  return value;
}
