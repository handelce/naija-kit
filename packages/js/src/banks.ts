import data from "../../../data/banks.json";

export interface Bank {
  readonly code: string;
  readonly name: string;
  readonly nipCode: string | null;
}

/** Entries are provisional: see `status` and `source` in `data/banks.json`. */
export const banks: readonly Bank[] = Object.freeze(
  data.banks.map(
    (entry): Bank => Object.freeze({ code: entry.code, name: entry.name, nipCode: entry.nipCode }),
  ),
);

function searchKey(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

const nameKeys = new Map<Bank, string>(banks.map((bank) => [bank, searchKey(bank.name)]));

/** The bank whose `code` or `nipCode` equals `code` exactly, or null. */
export function getBank(code: string): Bank | null {
  if (typeof code !== "string") throw new TypeError("code must be a string");
  return banks.find((bank) => bank.code === code || bank.nipCode === code) ?? null;
}

/** Every bank whose name contains `query`, ignoring case and punctuation. Empty when none match. */
export function findBank(query: string): Bank[] {
  if (typeof query !== "string") throw new TypeError("query must be a string");
  const wanted = searchKey(query);
  if (wanted === "") return [];
  return banks.filter((bank) => (nameKeys.get(bank) as string).includes(wanted));
}
