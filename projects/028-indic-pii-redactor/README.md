<div align="center">

# Indic PII Redactor

**India's DPDP Rules put Phase 1 obligations on the calendar for November 2026, and the first thing every team hits is that you cannot send an Aadhaar number to a cloud API to have it removed. This does the detection in your tab — and grades every hit into `certain`, `likely` or `possible` instead of pretending to a confidence it does not have.**

[![CI](https://github.com/kbipul/indic-pii-redactor/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/indic-pii-redactor/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-2ea043)](https://kbipul.github.io/indic-pii-redactor/)

`Day 028` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Paste any text — a support ticket, a KYC email, a CSV row — and it finds the Indian
personal identifiers in it: Aadhaar, PAN, GSTIN, IFSC, UPI VPA, mobile number, PIN code,
vehicle registration and voter EPIC. It then redacts them three different ways and shows
you, per finding, exactly why it thinks what it thinks.

The part that is actually hard is not the regex. It is that `\d{12}` matches every order
number, timestamp and account ID in your corpus, and a tool that flags all of them gets
switched off in a week. So every detector here reaches for real validation where one
exists — the **Verhoeff check digit** that UIDAI puts on an Aadhaar, the **mod-36 check
character** on a GSTIN, the reserved zero in an IFSC, the holder-type letter in a PAN —
and where no checksum exists, it says so out loud rather than inventing a confidence score.

It also reads **Devanagari digits**. An Aadhaar typed as `२३४५ ६७८९ ०१२४` in a Hindi-language
form is invisible to every ASCII-only scanner, and that is not a corner case in Indian
government and BFSI document flows.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by this repo's own CI on a GitHub runner and committed back
minutes after publish — the build sandbox has no browser, so it is never faked by hand.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/indic-pii-redactor/)** — runs fully in your browser.
No key, no upload, no server. Open DevTools and watch the network tab stay empty; that is the
whole argument.

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

Three decisions worth calling out:

**Normalisation is length-preserving.** Every Indic digit block in Unicode is ten
consecutive single-code-unit code points, so folding them to ASCII is strictly 1:1. That is
what lets the scanner run its regexes against normalised text while reporting highlight
offsets against the string the user actually typed — no offset map, no drift.

**Confidence is a tier, not a percentage.** A checksum either passed or it did not. Inventing
"87% confident" from a rule engine would be a made-up number, so there are exactly three
tiers and each finding carries the sentence explaining which one it got and why.

**Overlaps are resolved, not reported.** A naive scanner reports one Aadhaar plus a phantom
mobile number hiding in its middle digits. Detectors carry a priority; the winner claims the
character range.

## The confidence tiers

| Tier | What it means | Detectors |
|---|---|---|
| `certain` | A mathematical check passed | Aadhaar (Verhoeff), GSTIN (mod-36) |
| `likely` | Structure constrained beyond length | PAN holder type, IFSC reserved zero, known UPI PSP handle, `+91` mobile, RTO state prefix, dotted email domain |
| `possible` | Shape only — false positives by design | PIN code, voter EPIC, bare 10-digit mobile, unknown UPI handle, checksum-failing Aadhaar |

The honest caveat, which the app states on its own face: **a passing checksum tells you the
number is well-formed, not that it is an Aadhaar.** Roughly one in ten random 12-digit numbers
carries a valid Verhoeff digit by chance. The shipped sample text deliberately contains a
checksum-valid *invoice* number so the first thing you see is the tool being confidently
wrong, on purpose. Treat this as triage that makes human review tractable, not as an
automated compliance control.

## Build notes — what I learned

I picked this because of a date. The DPDP Rules were notified in November 2025 with an
18-month runway, which means Phase 1 obligations land in **November 2026** and full
applicability in May 2027, with a penalty ceiling of ₹250 crore. Every Indian enterprise is
now doing data-minimisation work, and the very first practical wall is circular: to redact
personal data before it goes to a model, you need something that finds personal data, and
you cannot use a hosted API to do it because sending the Aadhaar to the redaction service
*is* the disclosure. Client-side is not a nice-to-have here. It is the only shape the tool
can have.

The Verhoeff implementation was the fun part and the tests were the useful part. I wrote a
property test that corrupts every single digit in every position of a signed number and
asserts all of them fail, plus one that swaps every adjacent pair. Both passed first try,
which was less satisfying than I wanted. The test that actually taught me something was the
statistical one: generate 4,000 random 12-digit numbers and assert that between 4% and 16%
validate. It sits at roughly 10%, exactly as the maths says, and that number is the honest
answer to "how much does the checksum really buy you?" — a 90% cut in false positives, not
the 100% a demo would imply. I put that number in the README rather than in a footnote
because it is the difference between a tool an enterprise adopts and one it pilots and drops.

Two real bugs came out of the test suite rather than out of reading the code, and both were
the same bug. The UPI detector matched `ravi.k@example` inside the email address
`ravi.k@example.co.in` — the word boundary after `example` is perfectly happy, because the
following `.` is a non-word character. Because UPI outranks email in the overlap table, the
false VPA then *swallowed* the real email, so the email detector silently returned zero
findings on text that obviously contained an email. One assertion that a VPA and an email
are told apart, and one that the sample exercises every detector, caught both. The fix is a
`(?!\.[a-zA-Z])` lookahead: a VPA handle is a bare word, an email domain is dotted. I would
not have found the swallowed-email half of that by clicking around the UI, because the
symptom was an absence.

The thing I would do differently: I built the sample text last, and it should have been
first. Once I wrote a realistic support ticket, the detector gaps were obvious in about
thirty seconds — vehicle plates and Devanagari dates were both things I only thought about
because a plausible document had them in it. Fixture-driven beats detector-driven for this
kind of work, and I did it backwards.

What I deliberately did not build: a machine-learning name detector. Indian names in
transliterated Latin script are genuinely hard, an NER model would have added tens of
megabytes to a page whose entire pitch is that it loads instantly and phones home to nobody,
and a half-working name detector is worse than none because it teaches people to trust the
output. Structured identifiers have checksums. Names do not. Shipping the part that can be
verified, and saying plainly that the rest is not covered, is the more useful tool.

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

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
