# Data sources

Every dataset here records where it came from. Add the entry in the same pull
request as the data.

| File | Contents | Source | Status |
| --- | --- | --- | --- |
| `states.json` | 36 states and the FCT: name, capital, ISO 3166-2:NG code, zone | Constitution 1999 (rev. 2011), s.3 and First Schedule Part I; ISO 3166-2:NG | Checked 2026-10-18 |
| `banks.json` | CBN institution codes (3-digit banks, 5-digit other financial institutions) and names | Paystack List Banks API, <https://api.paystack.co/bank?country=nigeria> (secondary); names from the CBN's own lists | Provisional |
| `banks-excluded.json` | Records rejected while building `banks.json`, each with a reason | Paystack response | Audit record |
| `banks-name-matches.json` | Names in `banks.json` taken from the CBN's lists | CBN directories, <https://www.cbn.gov.ng/supervision/> | Audit record |
| `phone-prefixes.json` | Mobile prefixes and the operator each was originally allocated to | Three NCC documents (below) | Checked against all three |

## Standards

| Used for | Document | URL |
| --- | --- | --- |
| NUBAN check digit and institution codes (`docs/SPEC.md`) | CBN, *Revised Standards on NUBAN for Banks and Other Financial Institutions* (2019 standard), circular PSM/DIR/CON/CWO/05/030 of 9 March 2020 | https://www.cbn.gov.ng/out/2020/psmd/revised%20standards%20on%20nigeria%20uniform%20bank%20account%20number%20(nuban)%20for%20banks%20and%20other%20financial%20institutions%20.pdf |
| 12-weight form of the check digit | CBN, *Proposals on the Implementation of NUBAN Scheme*, version 0.4 | https://www.cbn.gov.ng/OUT/2011/CIRCULARS/BSPD/NUBAN%20PROPOSALS%20V%200%204-%2003%2009%202010.PDF |

The 2020 standard defines the 6-digit institution code (3-digit bank codes with
three leading zeros, 5-digit OFI codes with a leading 9), the 15-weight check
digit, one bank and one OFI worked example, and the sort-code formats. It took
effect on 20 April 2020, with full compliance due by 15 March 2021, and has no
table of institution codes. The 2010 proposal is superseded and gives the same
result for 3-digit codes; it is the source of the second worked example, and its
bank-code table is not used.

## banks.json

The CBN assigns the codes but publishes no list, and NIBSS shares its list only
with participants. The file is built from a secondary source and marked
`"status": "provisional"`.

Codes come from Paystack's List Banks API (retrieved 2026-10-17, 290 records, no
API key needed). A record is kept when its code is exactly 3 or 5 digits, the two
shapes in the CBN standard, and no differently named institution shares it;
identical duplicates are collapsed. The 71 excluded records are in
`banks-excluded.json` with reasons:

- 45 six-digit codes, 11 alphanumeric, one 2-digit and one 4-digit
- 8 that share a code with a differently named institution, and 1 exact duplicate
- 4 five-digit codes starting `00` (Globus Bank, Summit Bank, Tatum Bank Ltd,
  Pocket App). They look like zero-padded 3-digit codes. Read as OFI codes they
  would get a leading 9 and the wrong check digit, and the true codes are unknown.

All 15 codes in the CBN's 2010 table that still name an existing bank match
(011, 023, 032, 033, 035, 044, 050, 057, 058, 068, 070, 214, 215, 221, 232). No
other entry is confirmed by the CBN or NIBSS.

Names are the CBN's own where it lists the institution. On 2026-10-19 the nine
public lists at <https://www.cbn.gov.ng/supervision/> (commercial, non-interest,
merchant and microfinance banks; mortgage institutions; development finance
institutions; finance companies; discount houses; payment service banks; 1,006
names, no codes) were matched to the entries. A name was taken only when it was
identical to the entry's after ignoring case, punctuation, the words plc,
limited, ltd, nigeria, nig, of, the and and, and reading "microfinance bank" as
"MFB", and only when the match was one to one. 133 of 219 entries matched and
121 changed spelling (listed in `banks-name-matches.json`); the other 86 keep
Paystack's name. CBN names are used as published. Because those lists carry no
codes, the link from code to institution still rests on Paystack.

The other Paystack fields, including `longcode`, are not used. `nipCode` is
`null` for every entry because no source gives it. Paystack's terms of use could
not be read from a primary source, so the file credits Paystack and will be
removed if Paystack objects. Replace it with the CBN or NIBSS register when one
is obtained, and set `status` to `verified`.

## phone-prefixes.json

Built from three NCC documents, fetched 2026-10-17 and 2026-10-19:

- [Valid Assignment of Mobile Numbers with Dates of Allocation @ December 2023](https://ncc.gov.ng/media/67/view): operator per 4-digit prefix.
- [National Numbering Plan, October 2022](https://ncc.gov.ng/sites/default/files/2024-11/Standards-National_Numbering_Plan_202210.pdf): ranges per allocation, rows 1 to 308.
- [National Numbering Plan CSV](https://ncc.gov.ng/sites/default/files/2025-05/national_numbering_plan.csv), linked from the NCC's numbering page: ranges per licensee, 352 rows. It has no date of its own; its URL path is `2025-05`, so it is the newest.

A prefix is listed when every document that lists it gives the whole prefix to
one operator and the two newest (the 2023 table and the CSV) both list it. That
gives 38 prefixes: Airtel 11, Glo 7, MTN 14, 9mobile 5 and NATCOM 1. 36 of them
also appear in the 2022 plan under the same operator; `0707` is absent from it
and `0804` is named differently. Operator labels are the 2023 table's wording,
except `0804`.

Not listed, so `carrier` returns `null`:

| Prefix | Reason |
| --- | --- |
| `0702` | Split: the CSV gives `7020` to Smile, `7023` to Openskys and `7025` to MTN, and the 2022 plan adds Visafone and ICN blocks |
| `0801` | Mafab holds only `8010…` (1 million of 10 million numbers) in the 2022 plan and the CSV; the 2023 table gives no extent |
| `0710`, `0712`, `0718`, `0720`, `0721`, `0724` | In the CSV only, as 1-million sub-blocks of small licensees (for example `7187…` Holla Tags, `7240…` Vas2nets) |
| `0700`, `0800` | Shared by value-added special-number service licensees |
| `0900` | Reserved for vanity number services |
| `0709`, `0819` | Withdrawn |

Judgment calls:

- `0707` is listed although the 2022 plan has no row for it. The two newest
  documents give it whole to MTN, and the 2022 plan predates it.
- `0804` is listed as `NATCOM (nTel)`. The 2022 plan and the CSV name the holder
  `NATCOM Dev. & Inv. Ltd (nTel)`, and the 2023 table calls it `M-TEL`. NATCOM
  acquired the assets and licences of NITEL and MTEL (bid 2014, payments in
  January and April 2015; see [TheCable](https://www.thecable.ng/?p=53799)), so
  `M-TEL` is read as the earlier name of the same block. That rests on press
  reports, not an NCC statement, and the label is a shortened form of the
  NCC's licensee name.

Irregularities in the sources, none of which changes an entry:

- Row 255 of the 2022 plan (MTN, `0704`) gives the range `7047000000–7047999999`
  (1 million numbers) with a total of 3,000,000. The CSV lists `0704` as a single
  MTN row of 10,000,000 numbers, so the prefix is a whole MTN block.
- Row 34 (Airtel, `0911`) prints its access code as `0911`, not three digits.

All three documents predate the retrieval, so later allocations are not
reflected.

## states.json

Checked 2026-10-18 against:

- The Constitution ([1999, rev. 2011](https://www.constituteproject.org/constitution/Nigeria_2011?lang=en)):
  all 36 state names match section 3, and Part I of the First Schedule gives each
  capital. Section 3 names the FCT as "The Federal Capital Territory, Abuja".
- ISO 3166-2:NG, through [Wikipedia's copy of the list](https://en.wikipedia.org/wiki/ISO_3166-2:NG):
  all 37 codes and names match.
- [Wikipedia's States of Nigeria table](https://en.wikipedia.org/wiki/States_of_Nigeria):
  all 37 capitals and zones match, except that it writes `Ado Ekiti`.

The zones are conventional and not in the Constitution, so that column rests on
the Wikipedia table alone. ISO names the FCT "Abuja Federal Capital Territory";
the file uses the Constitution's `Federal Capital Territory`. Four capitals are
spelled differently in the Constitution, and the file keeps the modern spelling:

| State | File | Constitution |
| --- | --- | --- |
| Bayelsa | Yenagoa | Yenegoa |
| Ekiti | Ado-Ekiti | Ado Ekiti |
| Osun | Osogbo | Oshogbo |
| Rivers | Port Harcourt | Port-Harcourt |
