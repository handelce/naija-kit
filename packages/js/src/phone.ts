import data from "../../../data/phone-prefixes.json";

export type PhoneStyle = "e164" | "national" | "international";

// A literal space, not \s: a non-breaking space is not a separator.
const SEPARATORS = /[ \-().]/g;
const NIGERIAN_MOBILE = /^(?:0|234|\+234)([789][0-9]{9})$/;

function requireString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${name} must be a string`);
}

/** The 10 digits after the country code, or null when the input is not a Nigerian mobile number. */
function subscriberDigits(input: string): string | null {
  const match = NIGERIAN_MOBILE.exec(input.replace(SEPARATORS, ""));
  return match ? (match[1] as string) : null;
}

/** E.164 form (`+2348031234567`), or null. Format only: the number may not be in service. */
export function normalize(input: string): string | null {
  requireString(input, "input");
  const digits = subscriberDigits(input);
  return digits === null ? null : `+234${digits}`;
}

const operators = new Map<string, string>(
  data.prefixes.map(({ prefix, operator }) => [prefix, operator]),
);

/**
 * The operator the NCC originally allocated the number's prefix to, or null. Ported
 * numbers can belong to another network now.
 */
export function carrier(input: string): string | null {
  requireString(input, "input");
  const digits = subscriberDigits(input);
  return digits === null ? null : (operators.get(`0${digits.slice(0, 3)}`) ?? null);
}

export function isValid(input: string): boolean {
  return normalize(input) !== null;
}

export function format(input: string, style: PhoneStyle): string | null {
  requireString(style, "style");
  if (style !== "e164" && style !== "national" && style !== "international") {
    throw new RangeError('style must be "e164", "national" or "international"');
  }
  requireString(input, "input");
  const digits = subscriberDigits(input);
  if (digits === null) return null;
  const groups = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (style === "e164") return `+234${digits}`;
  return style === "national" ? `0${groups}` : `+234 ${groups}`;
}
