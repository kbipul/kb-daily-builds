<div align="center">

# Indic PII Redactor

**India's DPDP Rules put Phase 1 obligations on the calendar for November 2026, and the first thing every team hits is that you cannot send an Aadhaar number to a cloud API to have it removed. This does the detection in your tab — and grades every hit into `certain`, `likely` or `possible` instead of pretending to a confidence it does not have.**

[![CI](https://github.com/kbipul/indic-pii-redactor/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/indic-pii-redactor/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2ea043)](https://kbipul.github.io/indic-pii-redactor/)

`Day 028` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Paste a support ticket, a KYC email or a CSV row and it finds the Indian personal
identifiers in it: Aadhaar, PAN, GSTIN, IFSC, UPI VPA, mobile number, PIN code, vehicle
registration and voter EPIC. It redacts them three ways (a `[AADHAAR]`-style label, a block
of the original length, or last four kept) and shows you, per finding, why it thinks what it
thinks.

The regex is the easy part. `\d{12}` matches every order number, timestamp and account ID in
your corpus, and a tool that flags all of them gets switched off in a week. So every detector
here uses real validation where one exists: the Verhoeff check digit that UIDAI puts on an
Aadhaar, the mod-36 check character on a GSTIN, the reserved zero in an IFSC, the holder-type
letter in a PAN. Where no checksum exists it says so out loud, and there is no invented
confidence score to fill the gap.

It also reads Devanagari digits. An Aadhaar typed as `२३४५ ६७८९ ०१२४` in a Hindi-language
form is invisible to every ASCII-only scanner, and Indian government and BFSI document flows
are full of forms typed that way.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by this repo's own CI on a GitHub runner and committed back
minutes after publish — the build sandbox has no browser, so it is never faked by hand.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/indic-pii-redactor/)** runs fully in your browser.
It needs no API key and uploads nothing; open DevTools and the network tab stays empty.

```bash
git clone https://github.com/kbipul/indic-pii-redactor.git
cd indic-pii-redactor
npm ci
npm test          # 58 tests
npm run dev       # http://localhost:5173
```

## How it works

```
input text
   │
   ├─ normalizeDigits()     Devanagari/Tamil/Bengali/… digits → ASCII, 1 char → 1 char
   │                        so every offset still points at the original character
   ├─ 10 detectors          regex shape → classify() → certain | likely | possible | reject
   │
   ├─ resolveOverlaps()     an Aadhaar contains a 10-digit "mobile"; a GSTIN contains a PAN.
   │                        Higher-priority detector wins the range, ties broken by tier.
   │
   └─ redact() / segment()  masked output + highlight ranges over the untouched input
```

Normalisation is length-preserving. Every Indic digit block in Unicode is ten consecutive
single-code-unit code points, so folding them to ASCII is strictly 1:1. The scanner runs its
regexes against the normalised text and reports highlight offsets against the string the user
actually typed. There is no offset map, so there is nothing to drift.

A checksum either passed or it did not, so confidence is one of exactly three tiers. An
"87% confident" from a rule engine would be a made-up number, so there is no percentage
anywhere; each finding carries the sentence explaining which tier it got and why.

An Aadhaar contains a ten-digit run that looks like a mobile number, and a GSTIN contains a
PAN. A naive scanner reports both. Here every detector carries a priority and the winner claims
the character range; where priority ties, the stronger confidence tier wins, then the longer
span. The test for it is `does not report the mobile number hiding inside an Aadhaar`.

| Tier | What it means | Detectors |
|---|---|---|
| `certain` | A mathematical check passed | Aadhaar (Verhoeff), GSTIN (mod-36) |
| `likely` | Structure constrained beyond length | PAN holder type, IFSC reserved zero, known UPI PSP handle, `+91` mobile, RTO state prefix, dotted email domain |
| `possible` | Shape only; false positives by design | PIN code, voter EPIC, bare 10-digit mobile, unknown UPI handle, checksum-failing Aadhaar |

A passing checksum tells you the number is well-formed. It cannot tell you the number is an
Aadhaar. Roughly one in ten random 12-digit numbers carries a valid Verhoeff digit by chance,
and the shipped sample text has `invoice 412356789046` in it, which passes Verhoeff and is an
invoice number, so the first thing you see is the tool being confidently wrong, on purpose. A
test pins that it stays `certain`, and the comment on that test says what the app's footer
says: a passing checksum proves the shape, not the meaning. Use this as triage that makes a
human review tractable, and nothing more automated than that.

## Build notes — what I learned

The email detector returned zero findings on a support ticket that plainly contained an email
address. Nothing crashed. The finding was simply absent, and an absence is the one symptom
that clicking around a UI never surfaces. Two assertions found it: `separates a UPI VPA from
an email by its handle`, and `covers the full detector spread`, which walks the shipped sample
and expects every detector to fire at least once.

It was one bug with two symptoms. The UPI detector matched `ravi.k@example` inside
`ravi.k@example.co.in`, because the word boundary after `example` is satisfied by the dot that
follows it. UPI outranks email in the overlap table, so the phantom VPA claimed the range and
swallowed the real email. The fix is a `(?!\.[a-zA-Z])` lookahead, and the comment above the
pattern in `detectors.ts` gives the rule: a VPA handle is a bare word, an email domain is
dotted.

The Verhoeff implementation gave the tests nothing to catch. One property test corrupts every
digit in every position of a signed number and asserts all of them fail; another swaps every
adjacent pair. Both passed first try, which was less satisfying than I wanted. The statistical
test taught me something: generate 4,000 random 12-digit numbers and assert that between 4%
and 16% validate. Its comment reads "A correct check digit is 1 value in 10, so ~10% should
survive," and it sits at roughly 10%, exactly as the maths says. That is the honest answer to
how much the checksum buys you: a 90% cut in false positives, where a demo would imply 100%.
Run at scale it holds: 200,000 random strings, 20,174 pass, 10.09%. I put that figure in the
README, because it is the difference between a tool an enterprise adopts and one it pilots
and drops.

I picked this because of a date. The DPDP Rules were notified in November 2025 with an
18-month runway, so Phase 1 obligations land in **November 2026** and full applicability in
May 2027, with a penalty ceiling of ₹250 crore. Every Indian enterprise is now doing
data-minimisation work, and the very first practical wall is circular: to redact personal data
before it goes to a model you need something that finds personal data, and you cannot use a
hosted API to do it because sending the Aadhaar to the redaction service *is* the disclosure.
Client-side is the only shape the tool can have.

I built the sample text last, and it should have been first. Once I wrote a realistic support
ticket the detector gaps were obvious in about thirty seconds; vehicle plates and Devanagari
dates were both things I only thought about because a plausible document had them in it.
Fixture-driven beats detector-driven for this kind of work, and I did it backwards.

What I deliberately did not build is a machine-learning name detector. Structured identifiers
have checksums and names do not. Indian names in transliterated Latin script are genuinely
hard, an NER model would have added tens of megabytes to a page whose entire pitch is that it
loads instantly and phones home to nobody, and a half-working name detector is worse than none
because it teaches people to trust the output.

The same weight problem decided the slate. Day 028 was an India Flagship day, and Indic OCR
Lab would have scored 9/12 against this build's 11/12, then failed the feasibility gate: it
needs 10-20 MB of Tesseract traineddata per script at runtime, and with no browser in the build
sandbox I could not have honestly claimed it recognised anything. A generic PII scrubber has
also sat unbuilt in the backlog as Day 053. This build subsumes that slot and should retire it,
because a generic scrubber is a commodity; the Verhoeff, mod-36, PAN holder-type and
Devanagari-digit work is the part that makes this one distinct.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5 (strict) |
| Build | Vite 6 |
| Tests | Vitest — 58 tests across 6 files |
| Runtime deps | none beyond React — no model, no network, no API key |
| Licence | MIT |

All test fixtures and the sample text use **synthetic** identifiers, generated by computing
valid check digits over arbitrary digit strings. No real person's Aadhaar, PAN or GSTIN
appears anywhere in this repository.

## Sources

- **Digital Personal Data Protection Rules, 2025** — notified by MeitY on 13 November 2025
  via Gazette G.S.R. 846(E), with a phased runway: 14 November 2025, 14 November 2026 and
  13 May 2027 for the data-fiduciary obligations (notice, consent, data minimisation) that
  make on-device redaction a practical requirement rather than a preference.
  [PIB summary (PDF)](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf)
  · [overview](https://en.wikipedia.org/wiki/Digital_Personal_Data_Protection_Rules,_2025)
- **Verhoeff checksum** — the Dihedral-group check digit used by UIDAI for Aadhaar, and
  the mod-36 check character used in GSTIN. Both are implemented from the published
  algorithms in `src/engine/`, with the false-positive rate measured rather than assumed
  (200,000 random 12-digit strings, 10.09% accepted; pinned in `verhoeff.test.ts`).

This README describes a compliance *clock*, not legal advice. Dates above are as notified;
confirm current applicability before relying on them.


---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
