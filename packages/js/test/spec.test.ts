import { describe, expect, it } from "vitest";
import * as banks from "../src/banks";
import * as geo from "../src/geo";
import * as naira from "../src/naira";
import * as nuban from "../src/nuban";
import * as phone from "../src/phone";
import { type Case, decode, loadSpecFiles } from "./vectors";

type Fn = (...args: unknown[]) => unknown;

const modules: Record<string, Record<string, unknown>> = { nuban, banks, phone, naira, geo };

const codes = (found: unknown) => (found as { code: string }[]).map((bank) => bank.code);

// A vector names only the identifying key of a data record, so the runner
// reduces the returned record to that key before comparing.
const projections: Record<string, (result: unknown) => unknown> = {
  "geo.getState": (state) => (state === null ? null : { iso: (state as { iso: string }).iso }),
  "geo.statesInZone": (found) => (found as { name: string }[]).map((state) => state.name),
  "banks.getBank": (bank) => (bank === null ? null : { code: (bank as { code: string }).code }),
  "banks.findBank": codes,
  "nuban.candidateBanks": codes,
};

const derivedValues: Record<string, () => unknown> = {
  "geo.stateCount": () => geo.states.length,
};

const errors = { TypeError, RangeError };

const files = loadSpecFiles();

function run(moduleName: string, fnName: string, fn: Fn, testCase: Case) {
  const args = testCase.args.map(decode);
  if (testCase.throws) {
    expect(() => fn(...args)).toThrow(errors[testCase.throws]);
    return;
  }
  const project = projections[`${moduleName}.${fnName}`] ?? ((result: unknown) => result);
  const result = project(fn(...args));
  if (testCase.contains) {
    expect(Array.isArray(result)).toBe(true);
    expect(testCase.contains.length).toBeGreaterThan(0);
    for (const wanted of testCase.contains.map(decode)) expect(result).toContainEqual(wanted);
    return;
  }
  expect(result).toStrictEqual(decode(testCase.returns));
}

describe("spec vectors", () => {
  it("finds vector files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("has a package module for every vector file", () => {
    for (const { file, spec } of files) {
      expect(modules[spec.module], `${file} names module "${spec.module}"`).toBeDefined();
    }
  });

  it("has at least one vector file for every package module", () => {
    for (const name of Object.keys(modules)) {
      expect(
        files.some(({ spec }) => spec.module === name),
        `no spec file for module "${name}"`,
      ).toBe(true);
    }
  });

  it("has vectors for every function a module exports", () => {
    for (const [name, exported] of Object.entries(modules)) {
      const spec = files.find((entry) => entry.spec.module === name)?.spec;
      expect(spec, `no spec file for module "${name}"`).toBeDefined();
      for (const [key, value] of Object.entries(exported)) {
        if (typeof value !== "function") continue;
        expect(spec?.functions[key]?.length ?? 0, `${name}.${key} has no vectors`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  for (const { file, spec } of files) {
    const mod = modules[spec.module] ?? {};

    describe(`${spec.module} (${file})`, () => {
      it("declares at least one function with at least one case", () => {
        const counts = Object.values(spec.functions).map((cases) => cases.length);
        expect(counts.length).toBeGreaterThan(0);
        for (const count of counts) expect(count).toBeGreaterThan(0);
      });

      for (const [fnName, cases] of Object.entries(spec.functions)) {
        for (const testCase of cases) {
          it(`${fnName}: ${testCase.name}`, () => {
            const fn = mod[fnName];
            expect(typeof fn, `${spec.module}.${fnName} is exported`).toBe("function");
            run(spec.module, fnName, fn as Fn, testCase);
          });
        }
      }

      for (const [key, expected] of Object.entries(spec.values)) {
        it(`value ${key}`, () => {
          const derived = derivedValues[`${spec.module}.${key}`];
          expect(derived ? derived() : mod[key]).toStrictEqual(decode(expected));
        });
      }
    });
  }
});
