# naija-kit

Nigerian bank account numbers, phone numbers, states and Naira in one small
TypeScript package with no dependencies.

Most Nigerian apps end up writing the same helpers: check that an account number
is well formed for its bank, turn `0803 123 4567`, `+234 803 123 4567` and
`2348031234567` into one form, list the states and zones for a dropdown, and
format or spell out a Naira amount. This package collects those rules and the
reference data behind them in one place, so each app does not keep its own copy.

- It has no dependencies, ships its own TypeScript types, and works from ESM or
  CommonJS on Node 18 or later.
- Each module is imported on its own, so a phone-only import does not carry the
  bank list.
- Money is handled as integer kobo, never as floating point.
- Where the data is not known, a function returns `null` instead of guessing.

```sh
npm install naija-kit
```

```ts
import { isValidNuban, candidateBanks } from "naija-kit/nuban";
import { normalize, carrier } from "naija-kit/phone";
import { getState } from "naija-kit/geo";
import { format, toWords } from "naija-kit/naira";

normalize("0803 123 4567");        // "+2348031234567"
getState("lagos")?.zone;           // "South West"
format(123450n);                   // "₦1,234.50"
```

Exact behaviour is in [docs/SPEC.md](docs/SPEC.md). Every function is tested
against the shared vectors in [`spec/`](spec).

## Modules

| Module | What it does |
| --- | --- |
| `nuban` | Check-digit validation of 10-digit account numbers, and the banks a number could belong to |
| `banks` | Bank and institution codes and names (provisional, see [Known limitations](#known-limitations)) |
| `phone` | Normalise to E.164, validate, format, and find the operator a prefix was allocated to |
| `geo` | The 36 states and the FCT, with their geopolitical zones |
| `naira` | Format, parse and spell out amounts, using integer kobo |

## Validation is not verification

These functions check format only. A valid NUBAN does not mean the account
exists, and a valid phone number does not mean the line is active. Operator
detection reports the original allocation, so a ported number can differ.

## Data

Every dataset cites its source in [data/SOURCES.md](data/SOURCES.md). If
something is wrong, [open a data correction](../../issues/new?template=data-correction.md)
with a public source; see [CONTRIBUTING.md](CONTRIBUTING.md).

- A lookup that finds nothing returns `null` or an empty array.
- States come from the Constitution and ISO 3166-2:NG. The zones are
  conventional and rest on one secondary source.
- Phone prefixes come from three NCC documents. A prefix is listed only when it
  is a whole block of one operator, so `carrier` returns `null` for shared or
  partly allocated prefixes such as `0702` and `0801`. Two entries, `0707` and
  `0804`, needed a judgment call, explained in `SOURCES.md`.
- NUBAN follows the CBN's 2020 standard. Its worked examples are in the tests.
- Records that were left out or renamed while building the bank data are kept in
  `data/banks-excluded.json` and `data/banks-name-matches.json`.

## Known limitations

- The bank list is provisional. The CBN assigns institution codes but does not
  publish a list, and NIBSS shares its list only with participants.
  `data/banks.json` takes codes from a payment provider's public list, filtered
  to the 3- and 5-digit shapes the CBN standard defines, and only 15 of them are
  confirmed against a CBN document. Names are the CBN's own where it lists the
  institution. So `candidateBanks`, `getBank` and `findBank` can miss an
  institution, include one that has closed, or carry a wrong code for a newer
  one. Treat the results as a shortlist.
- `nipCode` is `null` for every bank because no source gives it.
- `carrier` covers 38 prefixes. `normalize` checks structure only, so it also
  accepts numbers in ranges that are not mobile, such as `0700`, `0800` and `0900`.
- LGAs, and PHP and Python packages, are planned.

[Spec](docs/SPEC.md) · [Contributing](CONTRIBUTING.md) · MIT licence
