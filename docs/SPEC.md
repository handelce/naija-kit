# Behaviour specification

Defines the rules every language package must follow. Test vectors live in
`spec/*.json` and are consumed by each package's tests.

## Conventions

- Inputs that are not strings or numbers of the documented shape throw a
  `TypeError` (JS), `TypeError` (PHP), or `TypeError` (Python).
- Lookups that find nothing return `null` / `None`. They never throw and never
  return a nearest guess.
- Predicates (`isValid*`) return booleans and never throw for well-typed input.
- Amounts are kobo integers. 1 naira = 100 kobo.

## NUBAN

A NUBAN is a 10-digit account number: 9 serial digits followed by a check digit.
The check digit depends on the institution's code, which is not part of the
account number.

Algorithm (CBN, *Revised Standards on NUBAN for Banks and Other Financial
Institutions*, which supersedes the 2010 standard; see `data/SOURCES.md`):

1. Form a 6-digit institution code. A deposit money bank (DMB) code is 3 digits,
   left-padded with three zeros (`011` becomes `000011`). An other-financial-
   institution (OFI) code is 5 digits with a leading `9` (`50547` becomes
   `950547`).
2. Append the first 9 digits of the account number: 15 digits `d1..d15`.
3. Multiply each digit by the weights `3 7 3 3 7 3 3 7 3 3 7 3 3 7 3` and sum.
4. `check = (10 - (sum mod 10)) mod 10`.
5. The account is valid for that institution when `check` equals the 10th digit.

For a DMB code this equals the 2010 form: the first three digits are zero, and
the remaining 12 digits take the weights `3 7 3 3 7 3 3 7 3 3 7 3`.

Worked examples from the CBN document:

| Institution code | Serial (9 digits) | Weighted sum | Check digit | Account |
| --- | --- | --- | --- | --- |
| `011` | `000001457` | 81 | 9 | `0000014579` |
| `011` | `000000022` | 30 | 0 | `0000000220` |
| `50547` | `000021457` | 211 | 9 | `0000214579` |

The first row appears in both CBN documents, the second in the 2010 document
only, and the third in the 2020 one.

Functions:

- `computeCheckDigit(institutionCode, serial9)` returns the check digit as an
  integer `0` to `9`. `serial9` must be exactly 9 digits, else `RangeError`.
- `isValidNuban(account, institutionCode)` is true only for a 10-digit string of
  digits with a matching check digit; any other string is `false`. Whitespace is
  not stripped; the caller trims. A non-string argument is a `TypeError`.
- `candidateBanks(account)` returns every bank in `data/banks.json` whose code
  yields a matching check digit, in the order of `banks`. Several banks can
  match one number by chance, so this is a shortlist for a "select your bank"
  prompt, not an identification. A string that is not
  10 ASCII digits gives an empty array; a non-string argument is a `TypeError`.
  The result is only as complete as `data/banks.json`.

An institution code is exactly 3 digits (DMB) or exactly 5 digits (OFI), ASCII
only. Any other length, including a 6-digit code, is a `RangeError`: the 6-digit
form is derived internally and is not an input. The code is validated before the
account. The length alone selects the rule.

## Banks

`data/banks.json` is `{ "source", "retrievedAt", "status", "banks" }`. `status` is
`provisional` while the list comes from a secondary source (see
`data/SOURCES.md`). Each entry of `banks`:

```json
{ "code": "044", "name": "Example Bank", "nipCode": null }
```

- `code` is the CBN institution code: 3 digits for a deposit money bank or 5
  digits for an other financial institution, as `computeCheckDigit` accepts.
- `nipCode` is the NIBSS code, or `null` when no source gives it. Every entry is
  currently `null`.
- `name` is the CBN's published name where the CBN lists the institution, and
  the secondary source's name otherwise; `data/banks-name-matches.json` lists
  every name taken from the CBN.
- Entries are ordered by name. Do not add entries from memory; each addition
  cites its source in `data/SOURCES.md`. Records rejected during collection are
  listed with reasons in `data/banks-excluded.json`.

Functions:

- `banks` is the list of entries.
- `getBank(code)` returns the entry whose `code` or `nipCode` equals `code`
  exactly, or `null`. No padding or trimming is applied, so `"44"` finds
  nothing. A non-string argument is a `TypeError`.
- `findBank(query)` returns an array of every entry whose name contains the
  query, ignoring case and any character that is not a letter or digit. A query
  with no letters or digits matches nothing. An empty array means no match; no
  nearest guess is made. A non-string argument is a `TypeError`.

## Phone

Input forms accepted: `0803 123 4567`, `0803-123-4567`, `+234 803 123 4567`,
`2348031234567`, `(0803) 1234567`. Separators (space, hyphen, parentheses, dot)
are ignored, including around the whole input.

- `normalize(input)` returns E.164 (`+2348031234567`) or `null`.
- After removing separators the input must be one of: `0` followed by 10 digits,
  `234` followed by 10 digits, or `+234` followed by 10 digits. A `+` is allowed
  only as the first character.
- The first of the 10 digits must be `7`, `8`, or `9`. Landline ranges are not
  accepted.
- Anything else returns `null`, including 10 digits with no `0` or country code,
  a `0` kept after the country code (`+2340803...`), `00234...`, other country
  codes, letters, and the empty string.
- A non-string argument is a `TypeError`.
- `isValid(input)` is `normalize(input) !== null`.
- `carrier(input)` normalizes `input`, takes the 4-digit national prefix (`0`
  and the first 3 subscriber digits, `0803` for `+2348031234567`), and returns
  the operator that `data/phone-prefixes.json` lists for it. It returns `null`
  when the input does not normalize or the prefix is not listed. A non-string
  argument is a `TypeError`.
  - The operator is the originally allocated holder, not the current network:
    ported numbers can differ. Operator names are the NCC's own labels
    (`MTN`, `AIRTEL`, `GLO`, `EMTS (9Mobile)`).
  - Which prefixes are listed, and how differences between NCC documents were
    resolved, is recorded in `data/SOURCES.md`. A prefix that is split,
    partly allocated, or unresolved is absent and returns `null`.
- `format(input, style)` with `style` one of `e164`, `national`
  (`0803 123 4567`), `international` (`+234 803 123 4567`). It returns `null`
  when `input` does not normalize. A non-string `style` is a `TypeError` and an
  unknown string is a `RangeError`; `style` is checked before `input`.

## Geo

`data/states.json` is `{ "source", "verifiedAt", "states" }`. `states` has 36
states plus the FCT with `name`, `capital`, `iso` (ISO 3166-2:NG), and `zone`
(one of the six geopolitical zones).

- `getState(nameOrIso)` accepts `"Lagos"`, `"lagos"`, `"NG-LA"`; returns the
  entry or `null`. Matching ignores case and leading, trailing, and repeated
  whitespace. `"FCT"`, `"Abuja"`, and `"Federal Capital Territory"` resolve to
  the Federal Capital Territory.
  - A hyphen between two letters in a name equals a space (`"Akwa-Ibom"`,
    `"Cross-River"`). ISO codes keep their hyphen: `"NG LA"` is `null`.
  - A trailing `" State"` is accepted after the name of a state
    (`"Lagos State"`), but not after the FCT or its aliases, and not twice.
  - Everything else returns `null`: other capitals, abbreviations such as
    `"LA"`, misspellings, and stray hyphens (`"Lagos-"`).
  - A non-string argument is a `TypeError`.
- `zones` is the six zone names sorted alphabetically.
- `statesInZone(zone)` returns states sorted by name, matching `zone` ignoring
  case. An unknown zone returns an empty array.

## Naira

A kobo argument is an integer (a JS `number` that is a safe integer, or a
`bigint`) or a string of ASCII digits with an optional leading `-`. Anything else
is a `TypeError`: floats, strings with a decimal point or separators, the empty
string, booleans, `null`.

- `format(kobo, options)` returns `₦1,234.50`. Digits are grouped in threes with
  `,`. Options:
  - `symbol`: `"₦"` (default) renders `₦1,234.50`; `"NGN"` renders
    `NGN 1,234.50` with a space; `""` renders `1,234.50`. Any other value is a
    `RangeError`.
  - `decimals`: `2` (default) or `0`. With `0`, an amount with a non-zero kobo
    part is a `RangeError`; nothing is rounded. Any other value is a `RangeError`.
  - Negative amounts put `-` first: `-₦1,234.50`, `-NGN 1,234.50`, `-1,234.50`.
- `parse(text)` returns kobo as an integer or `null` when the text is not an
  amount. A non-string argument is a `TypeError`. The grammar is: optional `-`,
  optional symbol (`₦` or `NGN`, case-sensitive) with optional spaces after it,
  then digits. The digits are either ungrouped or grouped as one to three digits
  followed by `,` and exactly three digits per group. An optional `.` follows
  with one or two digits. Surrounding whitespace is ignored. Anything else is
  `null`: a sign after the symbol, more than two decimals, a trailing or leading
  `.`, other currency marks, exponents. There is no upper bound.
- `toWords(kobo)` returns `"One thousand, two hundred and thirty-four naira, fifty kobo"`.
  Uses the short scale (thousand, million, billion, trillion).
  - The first letter is capitalised; tens and units are hyphenated
    (`twenty-one`); `naira` and `kobo` do not take a plural.
  - Groups of three digits are joined with `, `, with `and` after `hundred`
    when anything follows. When the final group is below 100 and a larger group
    precedes it, it is joined with ` and ` instead of a comma
    (`One thousand and five naira`).
  - A zero naira part is omitted when kobo is non-zero (`Fifty kobo`); a zero
    kobo part is omitted (`One naira`); zero is `Zero naira`.
  - Negative amounts are prefixed `Minus `.
  - Amounts of 10^15 naira or more (10^17 kobo) are a `RangeError`.

Arithmetic uses integers (`bigint` in JS above `Number.MAX_SAFE_INTEGER`).
`parse` returns a `number` when the result is a safe integer and a `bigint`
otherwise.

## Test vectors

Each `spec/*.json` file is `{ "module", "functions", "values" }`, where
`functions` maps a function name to a list of cases and `values` maps an exported
constant to its expected value. A case is `{ "name", "args", "returns" }` or
`{ "name", "args", "throws" }`, where `throws` is `TypeError` or `RangeError`.

Arguments and results are plain JSON, with one extension: `{ "$int": "<digits>" }`
is an arbitrary-precision integer (`bigint` in JS). Where a case returns a record
from `data/`, it gives only the identifying key and the runner compares against
the data file.

A case may give `"contains": [...]` in place of `"returns"`. The result, reduced
as above, must be an array that includes every listed value.

A runner must fail when a file or function list yields no cases.
