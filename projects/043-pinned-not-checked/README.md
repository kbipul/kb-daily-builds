<div align="center">

# Pinned, Not Checked

**The agent checked out the commit the marketplace pinned. Nothing checked that it landed there.**

[![CI](https://github.com/kbipul/pinned-not-checked/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/pinned-not-checked/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-6fb3ff)](https://kbipul.github.io/pinned-not-checked/)

`Day 043` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

On 17 September 2026 Air Security disclosed Plugin4Shell, a plugin SHA-pinning bypass in Claude Code, Codex, GitHub Copilot and Gemini CLI. The finding is one sentence long: "Every affected agent checks out the pinned commit but never checks that it actually landed there." This is a simulator for that sentence. Pick an agent, pick the git host behind the marketplace, hand the plugin repository to an attacker, and watch the agent's own disclosed command sequence run against a toy repository until a pin reports green over somebody else's code.

It models two things and nothing else: git's rule that a name matching both a ref and an object id resolves to the ref, and each host's policy on whether a branch may be named like a 40-character commit hash. Every outcome on screen falls out of those two rules plus the four command sequences. There is no rule engine, no scoring, and no report card.

![Screenshot](docs/demo.png)

<sub>The sandbox that builds these projects cannot run a browser. `docs/demo.png` is captured by a real Chromium on the GitHub runner by the `screenshot` job in CI and committed back, so it appears a few minutes after publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/pinned-not-checked/)** — runs fully in your browser, nothing to install.

```bash
npm ci
npm test          # 36 tests
npm run build
npm run preview   # then open http://localhost:4173/pinned-not-checked/
```

## How it works

Three small modules carry the whole simulation.

`resolve.ts` is git's name lookup, cut down to the two kinds of name this needs. A local branch wins over a commit object of the same name, and when both exist it sets an ambiguity warning. That preference is the entire branch-name variant of the attack.

`clone.ts` is the local side of a clone. Only the default branch arrives as a local branch, which is why the attack needs the default branch and not just a branch. Point a commit-shaped branch at hostile code but leave `main` as the default and the checkout finds no local ref, falls through to the commit object, and lands on the reviewed tree. `git checkout FETCH_HEAD` goes through the same lookup before it ever reads `.git/FETCH_HEAD`, which is the Gemini CLI variant in one line of control flow.

`install.ts` runs an agent's sequence and returns both what landed and what the agent says landed. The second value is set to the pinned SHA by construction, because that is where it comes from in the real thing: the marketplace manifest, not the working tree.

```
marketplace pin ──────────────────────────────┐
                                              ▼
git clone ──▶ local branches ──┐        reported as installed
                               ├──▶ resolve ──▶ HEAD
attacker's default branch ─────┘                │
                                                ▼
                                   the two values are never compared
```

The fix in the disclosure is one assertion, `test "$(git rev-parse HEAD)" = "<pinned-sha>" || abort`, and the app has a checkbox for it. It works on both variants because it reads the resolved `HEAD` and not the name that was requested. A check written against the requested ref would pass on the Gemini path, because `git checkout FETCH_HEAD` did succeed. It just succeeded against a branch.

## Build notes — what I learned

One test failed, and the test was wrong. `source.test.ts` asserted that every quote from the disclosure's technical section contains resolution vocabulary, and it broke on the sentence the authors call the whole bug: `one-missing-check: expected 'Every affected agent checks out the p…' to match /resolve|ref|branch|checkout|HEAD|def…/i`. The quote is fine. My regex was a guess about how the authors would phrase the finding, and their phrasing turned out to be the interesting part. The bug is stated purely as a missing verification, with no mention of refs, branches or resolution at all. Those words only appear a level down, in the four quotes that explain the mechanism. The single assertion became two, one per claim, and the comment above them says why.

Two things were cut. The five-step campaign in the disclosure (plant a benign plugin, get it adopted, ship a routine version bump, then create the branch and rug-pull) is what makes this zero-click instead of a trap for the next installer, and the app only models the install at the end of it. The timeline is described in the UI and not driven. The second cut is less tidy: object availability is modelled as "every commit in the repo", including under `--depth 1`. A real shallow clone carries fewer objects. Neither disclosed path turns on which ones it omits, so a faithful model would add a control that changes no outcome on screen. The simplification is declared in a comment on `gitClone`.

The part I did not expect was the host column. Toggling the marketplace backend from Bitbucket to GitHub closes three of the four agents with no change to a single line of agent code, because GitHub refuses a 40-hex branch name and the attack branch simply never exists. Gemini CLI walks straight through it, and the reason is almost silly: its attack branch is named `FETCH_HEAD`, which is not commit-shaped, so no ref-name rule looks at it twice. I had written `looksLikeCommitId` as a shape test for the first variant and only noticed afterwards that the same function, returning false, is the whole explanation for why the mitigation misses the fourth agent. There is a test pinning it, named `rejects FETCH_HEAD, which is why no ref-name policy filters the Gemini variant`, because the function now carries an argument and not just a format check.

Two verdicts are left open in the app, marked as open, because I could not close them from the sources I had. The first is GitHub Copilot's status. The disclosure says Microsoft "has not shipped a fix, so users have no patch"; secondary coverage the same week reports GitHub asserting that a mitigation exists and the researchers disputing its scope. I did not verify either against a shipped build, so both readings are printed. The second is a gap inside the disclosure itself. Its TL;DR says an attacker "can now set the default branch to a malicious version and anyone who installs will get the malicious version", which read alone describes a plain default-branch swap defeating any pin. The technical section is narrower and requires the branch to be named the exact pinned SHA on a host that permits such names. I implemented the narrow reading, because that is the one with commands attached, and the app prints both so the gap stays visible to whoever reads it next.

A test sweeps every quoted line for collision, preimage and forgery language and finds none. That absence is load-bearing. No hash was defeated here and no SHA-1 weakness is involved; the pinned digest was correct the entire time, sitting in the manifest, and the install path never compared it to anything.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18, TypeScript 5 |
| Build | Vite 5 |
| Tests | Vitest 2, 36 tests |
| Runtime deps | none beyond React |
| Demo | GitHub Pages, fully client-side |

## Source

Or Nevo, Dor Granat, Niv Hoffman. ["Plugin4Shell - Zero Click RCE Vulnerability found in top 4 most popular coding agents, millions of agents affected"](https://www.air.security/blog-posts/plugin4shell). Air Security, 17 September 2026. Found May 2026, disclosed to all four vendors June 2026.

Every behaviour in this simulator traces to a quoted line from that post, collected in `src/git/source.ts`. Nothing here was tested against a real agent, a real marketplace or a real git host, and it will not tell you whether anything you have installed is affected.

## License

MIT © Kumar Bipul

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
