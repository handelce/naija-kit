import { type Bank, banks } from "./banks";

const WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3] as const;

const DMB_CODE = /^[0-9]{3}$/;
const OFI_CODE = /^[0-9]{5}$/;
const SERIAL = /^[0-9]{9}$/;
const ACCOUNT = /^[0-9]{10}$/;

function requireString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${name} must be a string`);
}

/** The 6-digit form the check digit is computed over. */
function sixDigitCode(institutionCode: string): string {
  if (DMB_CODE.test(institutionCode)) return `000${institutionCode}`;
  if (OFI_CODE.test(institutionCode)) return `9${institutionCode}`;
  throw new RangeError(
    "institutionCode must be exactly 3 digits (bank) or 5 digits (other financial institution)",
  );
}

function checkDigitFor(code: string, serial: string): number {
  const digits = code + serial;
  let sum = 0;
  for (let i = 0; i < WEIGHTS.length; i++) sum += Number(digits[i]) * (WEIGHTS[i] as number);
  return (10 - (sum % 10)) % 10;
}

/** Check digit (0 to 9) for a 3-digit bank code or 5-digit OFI code and a 9-digit account serial. */
export function computeCheckDigit(institutionCode: string, serial: string): number {
  requireString(institutionCode, "institutionCode");
  requireString(serial, "serial");
  const code = sixDigitCode(institutionCode);
  if (!SERIAL.test(serial)) throw new RangeError("serial must be exactly 9 digits");
  return checkDigitFor(code, serial);
}

/**
 * True when `account` is 10 digits and its check digit matches `institutionCode`.
 * This is a format check: it does not show that the account exists.
 */
export function isValidNuban(account: string, institutionCode: string): boolean {
  requireString(account, "account");
  requireString(institutionCode, "institutionCode");
  const code = sixDigitCode(institutionCode);
  if (!ACCOUNT.test(account)) return false;
  return checkDigitFor(code, account.slice(0, 9)) === Number(account[9]);
}

/**
 * Banks in `data/banks.json` for which `account` passes the check digit. Several banks
 * match one number by chance, so this is a shortlist, not an identification.
 */
export function candidateBanks(account: string): Bank[] {
  requireString(account, "account");
  if (!ACCOUNT.test(account)) return [];
  const serial = account.slice(0, 9);
  const check = Number(account[9]);
  return banks.filter((bank) => checkDigitFor(sixDigitCode(bank.code), serial) === check);
}
