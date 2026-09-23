<div align="center">

# Half the Findings

**Independent verification bounds what the report got wrong. It says nothing about what was never found.**

[![CI](https://github.com/kbipul/half-the-findings/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/half-the-findings/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-f0883e)](https://kbipul.github.io/half-the-findings/)

`Day 045` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

Cloudflare published [security-audit-skill](https://github.com/cloudflare/security-audit-skill) on 19 September 2026, and on 23 September it was the second repository on GitHub Trending at 3,607 stars for the day. It is a six-phase coding-agent security audit, and the sixth phase is the interesting one: fresh agents re-check every factual claim in the structured output against the actual source, and the agent that checks a finding is never the agent that found it. Three verdicts land in `findings.json`, with stated criteria. `confirmed` needs a complete source trace and a bounded observed result. `needs_validation` carries an exact unresolved fact and no severity. `rejected` records a disproved candidate.

Two other sentences from the same documentation sit less comfortably next to that. Runs are additive because each one "explores different code paths" and the skill "reads prior `findings.json` files to skip known issues and target gaps". And: "a single run found roughly half of the vulnerabilities that repeated runs found in total."

This is a simulator for reading those facts together. A toy repository has twelve code paths and eleven planted vulnerabilities, and the app holds the ground truth where no audit could see it. A run reads four paths. Press the button and watch two panels: what `findings.json` says, every entry stamped independently verified, and what the repository actually holds. Then fix a confirmed finding and put it back, because a later run skips the path that a finding already names.

![Screenshot](docs/demo.png)

<sub>The sandbox that builds these projects has no browser, so it cannot screenshot. `docs/demo.png` is captured by a real Chromium on the GitHub runner by the `screenshot` job in CI and committed back, so it appears a few minutes after publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/half-the-findings/)** — runs fully in your browser, nothing to install.

```bash
npm install
npm test          # 17 tests
npm run build
npm run preview   # then open http://localhost:4173/half-the-findings/
```

## How it works

```
recon ─▶ hunting ─▶ validation ─▶ report ─▶ findings.json ─▶ verification
         (4 of 12    (verdict per   (per        (machine-        (a second
          paths,      candidate)     run)        readable)        agent
          gaps first)                                            re-reads
                                                                 source)
```

Three properties carry the argument, and all three are mechanical rather than scored.

Hunting is bounded by paths. A run reads four of twelve, chosen from the paths no prior finding names, so it cannot report anything on a path it never opened. The test for that is `cannot report a vulnerability on a path it never read`, and it holds by construction.

Verification runs after `findings.json` exists, and it operates on claims. It can reject a candidate that was never real, which is what the `rejected` verdict is for. It has nothing to operate on for a vulnerability that no hunter raised, so a false negative never reaches it. `cannot raise a finding: every finding belongs to the run that hunted it` pins that down.

Targeting gaps is what makes runs additive, and it is also the shield. Fix `V1`, then regress it: the report still carries the finding from before the fix, so the next run treats that path as known and looks elsewhere. The coverage ledger says so out loud when it happens.

## Build notes — what I learned

The number did not come out. Cloudflare reports one run finding roughly half of what repeated runs find in total, and over 400 seeds this toy puts run one at 3.13 of the 10.88 eventually found, which is 29%. Matching their headline would have taken one edit, changing paths-per-run from four to six, and I left it alone. A simulator that reproduces a figure because its author tuned a constant until it did is evidence of nothing, and the shape being demonstrated here is that a persistent gap stays invisible, not that the gap is any particular size. The 29% is a property of my four-of-twelve choice and belongs to this repository rather than to theirs.

A test I wrote asserted the wrong thing and caught a design problem anyway. `rejects false leads and still leaves unexplored paths` failed with `expected 0 to be greater than 0`, because with eight paths and four per run, two runs read the entire repository. The model was correct and the assertion was wrong, but the failure was pointing at something real: a repository that can be exhausted in two runs cannot show a coverage gap at all. Widening it to twelve paths was the fix, and the replacement test now asserts what is actually true, which is that a single run leaves more unread than it reads.

Then `tsc` refused the thing I most wanted to be true. `Argument of type 'string' is not assignable to parameter of type '"src/api/orders.ts" | ...'` came from comparing a vulnerability's path against the set of paths a run skipped, because I had typed the ground truth loosely and the path union strictly. Narrowing `Vuln.path` to `Path` fixed it in one line. The compiler was insisting that ground truth and explored paths live in the same space, which is the premise the whole comparison rests on.

What I am not claiming: this is not a port of the skill and not a measurement of it. The phase names, the three verdicts and their criteria, the skip-known-issues behaviour and the roughly-half figure are quoted from Cloudflare's published description of their own tool, which I read rather than ran. The hunter here is a seeded coin flip at 0.85. Whether the real skill's gap behaves like this on real code is open, and nothing on the screen settles it.

The part I would defend anyway: independence is the right property to want, and it answers a question about false positives. Cloudflare are explicit that repeated runs find more, so they are not claiming otherwise. The failure mode worth naming is a reader who sees eleven verified findings and a green badge, and takes the verification stamp as a statement about the repository instead of a statement about the eleven.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18, hand-written CSS, no component library |
| Language | TypeScript 5 (`strict`, `noUnusedLocals`) |
| Build | Vite 5, `base: '/half-the-findings/'` for Pages |
| Tests | Vitest 2, 17 tests over the model |
| Randomness | mulberry32, seeded, so every run in the demo reproduces |
| Runtime deps | react, react-dom. Nothing else. |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
