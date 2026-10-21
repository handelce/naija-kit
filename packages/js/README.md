# naija-kit

Helpers for Nigerian bank account numbers, phone numbers, states and Naira
amounts, written in TypeScript with no dependencies. It covers the rules most
Nigerian apps end up rewriting:

- Account numbers: check that a 10-digit NUBAN is well formed for a bank or
  other financial institution, using the CBN's check-digit rule, and list the
  banks a number could belong to.
- Banks: look up institution codes and names (a provisional list, see below).
- Phone numbers: turn `0803 123 4567`, `+234 803 123 4567` and `2348031234567`
  into one form, format them, and find the operator a prefix was originally
  allocated to.
- States: the 36 states and the FCT, with capitals, ISO codes and geopolitical
  zones.
- Naira: format, parse and spell out amounts, held as integer kobo and never as
  floating point.

```sh
npm install naija-kit
```

It includes its own TypeScript types and works from ESM or CommonJS on Node 18
or later. Each module is imported on its own (`naija-kit/phone`,
`naija-kit/nuban` and so on), and a phone-only import does not include the bank
list.

## Validation is not verification

These functions check format only. A valid NUBAN does not mean the account
exists, and a valid phone number does not mean the line is active. Nothing here
calls a bank, NIBSS, or any identity service.

## nuban

```ts
import { isValidNuban, computeCheckDigit, candidateBanks } from "naija-kit/nuban";

isValidNuban("0000014579", "011");       // true
computeCheckDigit("011", "000001457");   // 9
isValidNuban("0000214579", "50547");     // true: a 5-digit code is an other financial institution
candidateBanks("0000014579").some((bank) => bank.code === "011"); // true
```

The check digit follows the CBN's Revised Standards on NUBAN. An institution
code is 3 digits (bank) or 5 digits (other financial institution); any other
length throws `RangeError`. About one account number in ten passes the check for
any given bank by chance, so `candidateBanks` returns a shortlist for a "choose
your bank" prompt, never an identification.

## banks

```ts
import { getBank, findBank } from "naija-kit/banks";

getBank("044")?.name;            // "Access Bank Plc"
findBank("zenith");              // every entry whose name contains it, never a guess
getBank("999");                  // null
```

> The bank list is provisional. The CBN assigns the codes but publishes no
> list. Codes come from a payment provider's public list, filtered to the CBN's
> code shapes, and only 15 are confirmed against a CBN document. Names are the
> CBN's own where it lists the institution. An institution may be missing,
> closed, or carry a wrong code. See
> [known limitations](https://github.com/handelce/naija-kit#known-limitations).

## phone

```ts
import { normalize, isValid, format, carrier } from "naija-kit/phone";

normalize("0803 123 4567");                 // "+2348031234567"
isValid("0603 123 4567");                   // false
format("0803 123 4567", "international");   // "+234 803 123 4567"
carrier("0803 123 4567");                   // "MTN"
carrier("0702 123 4567");                   // null: this prefix is shared by several licensees
```

`carrier` reports the operator the NCC originally allocated the prefix to.
Ported numbers can belong to another network now. Only prefixes that are whole
blocks of one operator are listed; any other prefix returns `null`.

## geo

```ts
import { getState, statesInZone } from "naija-kit/geo";

getState("Lagos State")?.zone;   // "South West"
getState("Abuja")?.name;         // "Federal Capital Territory"
getState("Ikeja");               // null: capitals other than Abuja are not aliases
statesInZone("south west").map((state) => state.name);
// ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"]
```

## naira

Amounts are integer kobo (`number` or `bigint`); floats throw `TypeError`.

```ts
import { format, parse, toWords } from "naija-kit/naira";

format(123450);                       // "₦1,234.50"
format(123450n, { symbol: "NGN" });   // "NGN 1,234.50"
parse("₦1,234.50");                   // 123450
toWords(123450);                      // "One thousand, two hundred and thirty-four naira, fifty kobo"
format(1234.5);                       // throws TypeError
```

## Unknown means `null`

A lookup that finds nothing returns `null` or an empty array. No function guesses
a nearest match.

## More

[Source, specification, data sources and test vectors](https://github.com/handelce/naija-kit)
· [Report a data correction](https://github.com/handelce/naija-kit/issues/new?template=data-correction.md)
· MIT licence
