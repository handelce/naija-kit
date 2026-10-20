export const NAIRA_SIGN = "₦";

/** Kobo as a safe-integer number, a bigint, or a string of digits with an optional leading `-`. */
export type Kobo = number | bigint | string;

export interface FormatOptions {
  symbol?: "₦" | "NGN" | "";
  decimals?: 0 | 2;
}

const DIGIT_STRING = /^-?[0-9]+$/;
const AMOUNT = /^(-)?(?:(₦|NGN) *)?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.([0-9]{1,2}))?$/;
const SYMBOL_PREFIX = { "₦": "₦", NGN: "NGN ", "": "" } as const;
const WORD_LIMIT = 10n ** 15n;

function toKobo(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && DIGIT_STRING.test(value)) return BigInt(value);
  throw new TypeError("kobo must be a safe integer, a bigint, or a string of digits");
}

function group(digits: string): string {
  return digits.replace(/\B(?=(?:[0-9]{3})+$)/g, ",");
}

export function format(kobo: Kobo, options: FormatOptions = {}): string {
  const value = toKobo(kobo);
  const { symbol = NAIRA_SIGN, decimals = 2 } = options;
  if (!(symbol in SYMBOL_PREFIX)) throw new RangeError('symbol must be "₦", "NGN" or ""');
  if (decimals !== 0 && decimals !== 2) throw new RangeError("decimals must be 0 or 2");

  const magnitude = value < 0n ? -value : value;
  const naira = group((magnitude / 100n).toString());
  const subunit = magnitude % 100n;
  if (decimals === 0 && subunit !== 0n) {
    throw new RangeError("amount has kobo; use decimals 2 rather than rounding");
  }
  const fraction = decimals === 2 ? `.${subunit.toString().padStart(2, "0")}` : "";
  return `${value < 0n ? "-" : ""}${SYMBOL_PREFIX[symbol]}${naira}${fraction}`;
}

/** Kobo as a number while it is a safe integer, a bigint beyond that; null when `text` is not an amount. */
export function parse(text: string): number | bigint | null {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  const match = AMOUNT.exec(text.trim());
  if (!match) return null;
  const [, minus, , whole, fraction = ""] = match;
  const magnitude =
    BigInt((whole as string).replace(/,/g, "")) * 100n + BigInt(fraction.padEnd(2, "0"));
  const kobo = minus ? -magnitude : magnitude;
  const limit = BigInt(Number.MAX_SAFE_INTEGER);
  return kobo >= -limit && kobo <= limit ? Number(kobo) : kobo;
}

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES = ["", "thousand", "million", "billion", "trillion"];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n] as string;
  const ones = n % 10;
  return (TENS[Math.floor(n / 10)] as string) + (ones ? `-${ONES[ones]}` : "");
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 0) return belowHundred(rest);
  const head = `${ONES[hundreds]} hundred`;
  return rest === 0 ? head : `${head} and ${belowHundred(rest)}`;
}

function nairaWords(naira: bigint): string {
  const groups: { value: number; scale: string }[] = [];
  let rest = naira;
  for (const scale of SCALES) {
    const value = Number(rest % 1000n);
    if (value !== 0) groups.unshift({ value, scale });
    rest /= 1000n;
  }
  return groups
    .map(({ value, scale }, index) => {
      const words = scale ? `${belowThousand(value)} ${scale}` : belowThousand(value);
      if (index === 0) return words;
      const closesBelowHundred = scale === "" && value < 100;
      return `${closesBelowHundred ? " and " : ", "}${words}`;
    })
    .join("");
}

export function toWords(kobo: Kobo): string {
  const value = toKobo(kobo);
  const magnitude = value < 0n ? -value : value;
  const naira = magnitude / 100n;
  if (naira >= WORD_LIMIT) throw new RangeError("amount must be below 10^15 naira");
  const subunit = Number(magnitude % 100n);

  const parts: string[] = [];
  if (naira > 0n || subunit === 0) parts.push(`${naira === 0n ? "zero" : nairaWords(naira)} naira`);
  if (subunit > 0) parts.push(`${belowHundred(subunit)} kobo`);
  const text = (value < 0n ? "minus " : "") + parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
