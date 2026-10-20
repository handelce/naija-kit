import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dirs = ["data", "spec"];
let checked = 0;
const problems = [];

for (const dir of dirs) {
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const path = join(dir, file);
    try {
      JSON.parse(readFileSync(path, "utf8"));
      checked += 1;
    } catch (error) {
      problems.push(`${path}: ${error.message}`);
    }
  }
}

const sameKeys = (value, keys) =>
  value !== null &&
  typeof value === "object" &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());

const statesFile = JSON.parse(readFileSync("data/states.json", "utf8"));
const zoneNames = [
  "North Central",
  "North East",
  "North West",
  "South East",
  "South South",
  "South West",
];
if (!sameKeys(statesFile, ["source", "verifiedAt", "states"])) {
  problems.push("data/states.json: expected exactly the keys source, verifiedAt, states");
} else {
  if (typeof statesFile.source !== "string" || statesFile.source.trim() === "")
    problems.push("data/states.json: source is empty");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(statesFile.verifiedAt))
    problems.push("data/states.json: verifiedAt is not YYYY-MM-DD");
  const states = statesFile.states;
  if (!Array.isArray(states) || states.length !== 37) {
    problems.push(
      `data/states.json: expected 37 entries, found ${Array.isArray(states) ? states.length : "none"}`,
    );
  } else {
    if (new Set(states.map((s) => s.iso)).size !== states.length)
      problems.push("data/states.json: duplicate ISO codes");
    states.forEach((state, index) => {
      const where = `data/states.json: states[${index}]`;
      if (!sameKeys(state, ["name", "capital", "iso", "zone"]))
        return problems.push(`${where} must have exactly name, capital, iso, zone`);
      if (!/^NG-[A-Z]{2}$/.test(state.iso))
        problems.push(`${where} iso "${state.iso}" is not NG-XX`);
      if (!zoneNames.includes(state.zone)) problems.push(`${where} unknown zone "${state.zone}"`);
      if (!state.name || !state.capital) problems.push(`${where} name or capital is empty`);
    });
  }
}

const banksFile = JSON.parse(readFileSync("data/banks.json", "utf8"));
if (!sameKeys(banksFile, ["source", "retrievedAt", "status", "banks"])) {
  problems.push("data/banks.json: expected exactly the keys source, retrievedAt, status, banks");
} else {
  if (typeof banksFile.source !== "string" || banksFile.source.trim() === "")
    problems.push("data/banks.json: source is empty");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(banksFile.retrievedAt))
    problems.push("data/banks.json: retrievedAt is not YYYY-MM-DD");
  if (!["provisional", "verified"].includes(banksFile.status))
    problems.push(`data/banks.json: unknown status ${banksFile.status}`);
  if (!Array.isArray(banksFile.banks) || banksFile.banks.length === 0) {
    problems.push("data/banks.json: banks must be a non-empty array");
  } else {
    const codes = new Set();
    banksFile.banks.forEach((bank, index) => {
      const where = `data/banks.json: banks[${index}]`;
      if (!sameKeys(bank, ["code", "name", "nipCode"]))
        return problems.push(`${where} must have exactly code, name, nipCode`);
      if (!/^(\d{3}|\d{5})$/.test(bank.code))
        problems.push(`${where} code "${bank.code}" is not 3 or 5 digits`);
      if (codes.has(bank.code)) problems.push(`${where} duplicate code ${bank.code}`);
      codes.add(bank.code);
      if (
        typeof bank.name !== "string" ||
        bank.name !== bank.name.trim().replace(/\s+/g, " ") ||
        bank.name === ""
      ) {
        problems.push(`${where} name is empty or has stray whitespace`);
      }
      if (bank.nipCode !== null && !/^\d{6}$/.test(bank.nipCode))
        problems.push(`${where} nipCode must be null or 6 digits`);
      const previous = banksFile.banks[index - 1];
      if (previous && previous.name.toLowerCase() > bank.name.toLowerCase())
        problems.push(`${where} is out of name order`);
    });
  }
}

const prefixFile = JSON.parse(readFileSync("data/phone-prefixes.json", "utf8"));
if (!sameKeys(prefixFile, ["source", "retrievedAt", "status", "prefixes"])) {
  problems.push(
    "data/phone-prefixes.json: expected exactly the keys source, retrievedAt, status, prefixes",
  );
} else {
  if (typeof prefixFile.source !== "string" || prefixFile.source.trim() === "")
    problems.push("data/phone-prefixes.json: source is empty");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prefixFile.retrievedAt))
    problems.push("data/phone-prefixes.json: retrievedAt is not YYYY-MM-DD");
  if (!["provisional", "verified"].includes(prefixFile.status))
    problems.push(`data/phone-prefixes.json: unknown status ${prefixFile.status}`);
  if (!Array.isArray(prefixFile.prefixes) || prefixFile.prefixes.length === 0) {
    problems.push("data/phone-prefixes.json: prefixes must be a non-empty array");
  } else {
    const seen = new Set();
    prefixFile.prefixes.forEach((entry, index) => {
      const where = `data/phone-prefixes.json: prefixes[${index}]`;
      if (!sameKeys(entry, ["prefix", "operator"]))
        return problems.push(`${where} must have exactly prefix, operator`);
      if (!/^0[789]\d{2}$/.test(entry.prefix))
        problems.push(
          `${where} prefix "${entry.prefix}" is not 0 then 7, 8 or 9 and two more digits`,
        );
      if (seen.has(entry.prefix)) problems.push(`${where} duplicate prefix ${entry.prefix}`);
      seen.add(entry.prefix);
      if (
        typeof entry.operator !== "string" ||
        entry.operator.trim() === "" ||
        entry.operator !== entry.operator.trim()
      ) {
        problems.push(`${where} operator is empty or has stray whitespace`);
      }
      const previous = prefixFile.prefixes[index - 1];
      if (previous && previous.prefix > entry.prefix)
        problems.push(`${where} is out of prefix order`);
    });
  }
}

const matchesFile = JSON.parse(readFileSync("data/banks-name-matches.json", "utf8"));
if (
  !sameKeys(matchesFile, ["source", "retrievedAt", "renamed"]) ||
  !Array.isArray(matchesFile.renamed) ||
  matchesFile.renamed.length === 0
) {
  problems.push(
    "data/banks-name-matches.json: expected source, retrievedAt and a non-empty renamed array",
  );
} else {
  const byCode = new Map(banksFile.banks.map((bank) => [bank.code, bank]));
  matchesFile.renamed.forEach((entry, index) => {
    const where = `data/banks-name-matches.json: renamed[${index}]`;
    if (!sameKeys(entry, ["code", "name", "cbnName", "cbnList"]))
      return problems.push(`${where} must have code, name, cbnName, cbnList`);
    const bank = byCode.get(entry.code);
    if (!bank) problems.push(`${where} code ${entry.code} is not in banks.json`);
    else if (bank.name !== entry.cbnName)
      problems.push(
        `${where} banks.json names ${entry.code} "${bank.name}", not "${entry.cbnName}"`,
      );
  });
}

const excludedFile = JSON.parse(readFileSync("data/banks-excluded.json", "utf8"));
if (
  !sameKeys(excludedFile, ["source", "retrievedAt", "excluded"]) ||
  !Array.isArray(excludedFile.excluded) ||
  excludedFile.excluded.length === 0
) {
  problems.push(
    "data/banks-excluded.json: expected source, retrievedAt and a non-empty excluded array",
  );
} else {
  excludedFile.excluded.forEach((entry, index) => {
    if (
      !sameKeys(entry, ["code", "name", "reason"]) ||
      Object.values(entry).some((v) => typeof v !== "string" || v === "")
    ) {
      problems.push(
        `data/banks-excluded.json: excluded[${index}] must have non-empty code, name, reason`,
      );
    }
  });
}

if (checked === 0) problems.push("no JSON files found to validate");

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`validated ${checked} JSON files`);
