import data from "../../../data/states.json";

export interface State {
  readonly name: string;
  readonly capital: string;
  readonly iso: string;
  readonly zone: string;
}

const FCT_ISO = "NG-FC";
const FCT_ALIASES = ["fct", "abuja"];

export const states: readonly State[] = Object.freeze(
  data.states.map((entry) => Object.freeze({ ...entry })),
);

export const zones: readonly string[] = Object.freeze(
  [...new Set(states.map((state) => state.zone))].sort(),
);

const fct = states.find((state) => state.iso === FCT_ISO);
if (!fct) throw new Error(`states data has no entry for ${FCT_ISO}`);

const byIso = new Map<string, State>(states.map((state) => [state.iso.toLowerCase(), state]));
const byName = new Map<string, State>(states.map((state) => [state.name.toLowerCase(), state]));
for (const alias of FCT_ALIASES) byName.set(alias, fct);
// Only states may take a " State" suffix, not the FCT or its aliases.
const stateOnly = new Map<string, State>(
  states.filter((state) => state !== fct).map((state) => [state.name.toLowerCase(), state]),
);

function key(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getState(nameOrIso: string): State | null {
  if (typeof nameOrIso !== "string") throw new TypeError("nameOrIso must be a string");
  const plain = key(nameOrIso);
  const iso = byIso.get(plain);
  if (iso) return iso;
  // ISO codes were matched above, so a hyphen here belongs to a name.
  const spaced = plain.replace(/-/g, " ");
  return byName.get(spaced) ?? stateOnly.get(spaced.replace(/ state$/, "")) ?? null;
}

export function statesInZone(zone: string): State[] {
  if (typeof zone !== "string") throw new TypeError("zone must be a string");
  const wanted = key(zone);
  return states
    .filter((state) => state.zone.toLowerCase() === wanted)
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}
