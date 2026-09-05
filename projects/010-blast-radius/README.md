<div align="center">

# Blast Radius

**Paste the command your agent wants to run and watch it destroy a virtual machine instead of yours. What dies, what comes back, and a safer way to say it.**

[![CI](https://github.com/kbipul/blast-radius/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/blast-radius/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-3fb950)](https://kbipul.github.io/blast-radius/)

`Day 010` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

The top of GitHub's trending page is now a wall of agent skills. You drop a markdown file into `.claude/`, and something starts running shell commands on your machine. The review step in that pipeline is a human glancing at a command and deciding it looks fine.

Humans are bad at that, because **the command you read is not the command that runs.** Blast Radius makes the difference visible: type a command, and it is parsed, variable-expanded, glob-expanded and simulated against a virtual filesystem, a realistic checkout with tracked files, uncommitted edits, a git-ignored `.env`, untracked scratch work and a `node_modules`. You get a severity verdict, a per-file casualty list that says *why* each file does or doesn't come back, and a safer rewrite.

It opens on `rm -rf "$STEAMROOT/"*`, the line Steam shipped in 2015. It reads like it deletes a game directory. `$STEAMROOT` is unset, so it expands to `rm -rf /*` and takes the home directory with it. The tool shows you both lines, stacked.

What the severity actually measures is recoverability rather than deletion. `rm -rf node_modules dist` clears 2.6 MB out of the fixture tree and every byte of it is rebuildable. `rm -rf scratch/*` deletes 33 KB you will never see again. Both lines are `rm -rf`, and a tool that scores them the same is a tool people learn to ignore.

![Screenshot](docs/demo.png)

<sub>The screenshot is captured by this repo's CI on a GitHub runner and committed back automatically — it appears within a few minutes of first publish. The build sandbox has no browser, so it is never faked or hand-drawn.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/blast-radius/)** runs fully in your browser. Nothing to install, and nothing is executed.

```bash
git clone https://github.com/kbipul/blast-radius.git
cd blast-radius
npm ci
npm test          # 78 tests
npm run dev       # http://localhost:5173/blast-radius/
```

## How it works

Three layers, each tested on its own, and no shell anywhere near your machine.

```
"rm -rf \"$STEAMROOT/\"*"
        │
        ▼
  ┌───────────┐   tokenize → quotes, escapes
  │  parse.ts │   substitute → $VAR, ${VAR}   ← unset expands to ""
  └───────────┘   split → ; && || |  · strip sudo, VAR=x prefixes
        │
        ▼  "rm -rf /*"                         ← the command that actually runs
  ┌───────────┐   expand()  → globs, braces, ** across a VNode tree
  │   vfs.ts  │   flatten() → everything under a dir, flags inherited
  └───────────┘   recoveryOf() → regenerable │ committed │ partial │ gone │ gone-secret
        │
        ▼
  ┌────────────┐  per-command semantics: rm, git clean/reset/checkout/push,
  │simulate.ts │  find -delete, mv, dd, chmod -R, docker prune, kubectl delete
  └────────────┘  → severity · casualties · findings · safer rewrite
```

`src/lib/parse.ts` treats expansion as the primary job. The famous disasters (Steam's `$STEAMROOT`, Bumblebee's `rm -rf /usr $LIB/...`) are not bugs in `rm`. They are bugs in *expansion*. So the parser's job isn't to identify `rm`; it's to answer "after the shell finishes, which paths does this command actually receive?" An unset variable expands to an empty string silently, exactly as a real shell does without `set -u`. In `simulate()` the `unset-var` finding is pushed before the per-command loop even begins, so the expansion problem outranks whatever the command turns out to be.

The filesystem in `src/lib/vfs.ts` carries recoverability alongside the names. Each `VNode` knows whether it is `gitTracked`, `modified`, `gitIgnored`, `regenerable` or `secret`, and `recoveryOf()` collapses those flags into one of five verdicts: regenerable, committed, partial, gone, gone-secret. That's what turns "12 files deleted" into "9 come back with `git checkout`, 3 never do, and one of them was your `.env`."

An unrecognised command returns `unknown` and says so rather than staying quiet. The `honesty guarantees` block in `src/lib/simulate.test.ts` runs `terraform destroy -auto-approve` and asserts the verdict contains "Not recognised" and does not contain "Safe". A tool that stays silent about `terraform destroy` and gets read as "approved" is worse than no tool at all.

## Build notes

I wrote the engine first, then wrote the tests to describe what a real shell does. Five failed. Three of them were real bugs, and all three were the same mistake: a place where I'd modelled a *name* instead of a *behaviour*.

`rm -rf node_modules` came back "destructive", 3 files unrecoverable. I'd set `regenerable` on the `node_modules` directory in `src/data/fixtures.ts` but not on its children, and the casualty list is built from children. Rebuildable and git-ignored belong to a *subtree*, so `flatten()` now inherits them downward. That one is obvious in hindsight and would have been invisible without a test asserting the boring case. The test is called `"calls deleting regenerable dirs safe-ish and never unrecoverable"`. Anything can flag `rm -rf /`. The hard part is staying quiet when quiet is correct.

`rm src` deleted seven files, which is every file under `src` in the fixture tree. Real `rm` refuses a directory without `-r` and descends into nothing. I'd flattened first and filtered to files afterwards, which is a different command. `"refuses to delete directories without -r, like real rm"` covers it now.

The third one was the good one. `find src -name '*.ts' -delete` reported nothing. My parser split short flags into characters, so `-delete` became the flags `d,e,l,t,e` and vanished. `find` doesn't use POSIX short flags at all: `-name`, `-delete`, `-exec` are single-dash *long* options, a convention `find` has kept since the 1970s. My parser had quietly imposed `rm`'s grammar on a command that never agreed to it. The fix was to keep the untouched tokens on each `ParsedCommand` as `rawArgs` and let each simulator read the grammar its own command speaks; `simulateFind()` now checks `rawArgs.includes("-delete")` directly. A parser that assumes one grammar for all programs fails silently in the direction of "nothing to report", which is the worst possible direction for a safety tool to fail in.

Calibration was the actual design problem. The first pass scored on scariness, which made every `rm` red and the tool useless in a day. The rewrite scores on *recoverability*. `rm -rf node_modules dist coverage` is CAUTION and the fixture note says so out loud: "Actually fine — and the tool should say so rather than crying wolf." `rm -rf scratch/*` deletes a hundredth of the bytes and is DESTRUCTIVE, because nothing in `scratch/` was ever committed. A safety tool's credibility is spent on false positives, and there is no way to earn it back.

## What it doesn't do

The virtual filesystem is a fixture in `src/data/fixtures.ts`, not a scan of your real checkout, so the casualty *counts* are illustrative while the *mechanism* is real. Reading a live `git status` and `.gitignore` to simulate against your actual tree is the obvious next version, and would turn this from a demonstration into a pre-commit hook. I'd also want `set -u`/`set -e` awareness: the plain advice for half the findings here is "one line at the top of the script would have made the shell refuse."

What I'd resist is wiring this into an agent as an automatic policy gate. It models a fixed list of commands against a fixed tree; the `unknown` verdict is load-bearing and it will be hit constantly. Something that approves 95% of commands correctly and silently green-lights the 5% it has never seen is a worse safety story than no gate and an attentive human. Which leaves the question I haven't answered: what should a gate do with `unknown` in a pipeline that has to return a yes or a no either way?

## Stack

| Layer | Choice | Why |
|---|---|---|
| UI | React 18 + TypeScript 5 | Strict mode on; the domain types (`Recovery`, `Severity`) do real work |
| Build | Vite 5 | `base: "/blast-radius/"` for Pages |
| Tests | Vitest 2 + Testing Library | 78 tests: 70 on the engine, 8 on the UI |
| Engine | ~1,250 lines, zero runtime deps | A parser, a VFS and a simulator, importing nothing. No shell and no `eval`; nothing is executed |
| Hosting | GitHub Pages | Fully static; no server, no telemetry, no network calls at all |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
