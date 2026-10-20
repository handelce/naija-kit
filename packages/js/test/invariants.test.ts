import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { banks, findBank, getBank } from "../src/banks";
import { getState, states, statesInZone, zones } from "../src/geo";
import * as kit from "../src/index";
import { format, parse, toWords } from "../src/naira";
import { candidateBanks, computeCheckDigit, isValidNuban } from "../src/nuban";
import { carrier, normalize } from "../src/phone";

describe("naira inputs a JSON vector cannot express", () => {
  const unusable = [Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53, 0.5, undefined, {}];

  it("rejects non-integer and unsafe numbers in format and toWords", () => {
    for (const value of unusable) {
      expect(() => format(value as never)).toThrow(TypeError);
      expect(() => toWords(value as never)).toThrow(TypeError);
    }
  });

  it("formats the largest safe integer exactly", () => {
    expect(format(Number.MAX_SAFE_INTEGER)).toBe("₦90,071,992,547,409.91");
  });

  it("formats a bigint and the same number as a string identically", () => {
    expect(format(123456789012345678n)).toBe(format("123456789012345678"));
  });

  it("returns a number from parse while the result is a safe integer and a bigint after", () => {
    expect(typeof parse("₦90,071,992,547,409.91")).toBe("number");
    expect(typeof parse("₦90,071,992,547,409.92")).toBe("bigint");
  });

  it("round-trips format through parse", () => {
    for (const kobo of [0, 5, 100, 123450, -123450, 99999999999]) {
      expect(parse(format(kobo))).toBe(kobo);
    }
  });
});

describe("geo data", () => {
  it("returns the record from the dataset", () => {
    const lagos = getState("Lagos");
    expect(lagos).not.toBeNull();
    expect(states).toContain(lagos);
  });

  it("covers every state exactly once across the zones", () => {
    const listed = zones.flatMap((zone) => statesInZone(zone).map((state) => state.iso));
    expect(listed.length).toBe(states.length);
    expect(new Set(listed).size).toBe(states.length);
  });

  it("resolves every state by its own name and ISO code", () => {
    expect(states.length).toBeGreaterThan(0);
    for (const state of states) {
      expect(getState(state.name)).toBe(state);
      expect(getState(state.iso)).toBe(state);
    }
  });

  it("resolves every state, but not the FCT, with a State suffix and with hyphens", () => {
    let withSuffix = 0;
    for (const state of states) {
      if (state.iso === "NG-FC") {
        expect(getState(`${state.name} State`)).toBeNull();
        continue;
      }
      withSuffix++;
      expect(getState(`${state.name} State`)).toBe(state);
      expect(getState(`${state.name.replace(/ /g, "-")}-State`)).toBe(state);
    }
    expect(withSuffix).toBe(states.length - 1);
  });

  it("cannot be modified by a caller", () => {
    expect(() => (states as unknown as unknown[]).push({})).toThrow();
    const lagos = getState("Lagos");
    expect(() => {
      (lagos as { name: string }).name = "Elsewhere";
    }).toThrow();
  });
});

describe("bank data", () => {
  it("lists banks", () => {
    expect(banks.length).toBeGreaterThan(0);
  });

  it("gives every bank a code that is 3 or 5 digits, unique, with a non-empty name", () => {
    const codes = new Set<string>();
    for (const bank of banks) {
      expect(bank.code).toMatch(/^(?:[0-9]{3}|[0-9]{5})$/);
      expect(bank.name.trim()).toBe(bank.name);
      expect(bank.name.length).toBeGreaterThan(0);
      codes.add(bank.code);
    }
    expect(codes.size).toBe(banks.length);
  });

  it("accepts every listed code in the check digit computation", () => {
    for (const bank of banks) expect(() => computeCheckDigit(bank.code, "000000000")).not.toThrow();
  });

  it("finds every bank by its own code and by its own name", () => {
    for (const bank of banks) {
      expect(getBank(bank.code)).toBe(bank);
      expect(findBank(bank.name)).toContain(bank);
    }
  });

  it("cannot be modified by a caller", () => {
    expect(() => (banks as unknown as unknown[]).push({})).toThrow();
    expect(() => {
      (banks[0] as { name: string }).name = "Elsewhere";
    }).toThrow();
  });
});

describe("candidateBanks", () => {
  const accounts = ["0000014579", "0000214579", "0000000220", "1234567890", "0000000000"];

  it("returns exactly the banks for which the account is valid", () => {
    for (const account of accounts) {
      const found = candidateBanks(account);
      const expected = banks.filter((bank) => isValidNuban(account, bank.code));
      expect(found).toEqual(expected);
    }
  });

  it("returns at least one bank for some account, so the check above is not vacuous", () => {
    expect(accounts.some((account) => candidateBanks(account).length > 0)).toBe(true);
  });

  it("includes five-digit institutions", () => {
    const withFiveDigitCodes = accounts.flatMap((account) => candidateBanks(account));
    expect(withFiveDigitCodes.some((bank) => bank.code.length === 5)).toBe(true);
  });
});

describe("phone prefix data", () => {
  const data = JSON.parse(
    readFileSync(new URL("../../../data/phone-prefixes.json", import.meta.url), "utf8"),
  ) as {
    prefixes: { prefix: string; operator: string }[];
  };

  it("lists prefixes", () => {
    expect(data.prefixes.length).toBeGreaterThan(0);
  });

  it("names the listed operator for a number under every listed prefix", () => {
    for (const { prefix, operator } of data.prefixes) {
      expect(carrier(`${prefix}1234567`)).toBe(operator);
      expect(carrier(`+234${prefix.slice(1)}1234567`)).toBe(operator);
    }
  });

  it("returns null for every mobile-range prefix that is not listed", () => {
    const listed = new Set(data.prefixes.map(({ prefix }) => prefix));
    let unlisted = 0;
    for (const lead of ["7", "8", "9"]) {
      for (let n = 0; n < 100; n++) {
        const prefix = `0${lead}${String(n).padStart(2, "0")}`;
        if (listed.has(prefix)) continue;
        unlisted++;
        expect(normalize(`${prefix}1234567`)).not.toBeNull();
        expect(carrier(`${prefix}1234567`)).toBeNull();
      }
    }
    expect(unlisted).toBeGreaterThan(0);
  });
});

describe("package index", () => {
  it("exposes each module as a namespace", () => {
    expect(typeof kit.nuban.isValidNuban).toBe("function");
    expect(typeof kit.banks.getBank).toBe("function");
    expect(typeof kit.phone.normalize).toBe("function");
    expect(typeof kit.naira.format).toBe("function");
    expect(typeof kit.geo.getState).toBe("function");
  });
});
