<div align="center">

# MCP Auditor — Audit Your MCP Server Config Before Your Agent Does

**Paste your Claude Desktop / Cursor / VS Code mcpServers config and get an instant security report: hardcoded secrets, unpinned remote execution, root filesystem access, and dangerous capability combos like filesystem+network exfiltration paths — 100% in your browser.**

[![CI](https://github.com/kbipul/mcp-auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/kbipul/mcp-auditor/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-5eead4)](https://kbipul.github.io/mcp-auditor/)

`Day 007` of **[kb-daily-builds](https://github.com/kbipul/kb-daily-builds)** — one AI project a day.

</div>

## What it does

An MCP client config (the `mcpServers` block in Claude Desktop, Cursor, Windsurf or VS Code) is a list of programs your agent launches automatically, on every session, with your permissions. GitHub's trending page this week is still stacked with MCP tooling — `ChromeDevTools/chrome-devtools-mcp` picked up 404 stars today alone — and the ecosystem keeps growing faster than anyone's reviewing what these configs actually grant. `curl | bash` installers, unpinned `npx` packages, and filesystem servers scoped to the whole home directory all ship as normal-looking JSON that nobody reads twice.

MCP Auditor is the ten-second first pass. Paste your config and it flags **hardcoded secrets and private keys**, **remote-code-execution patterns** (`curl | bash`, encoded PowerShell, URL-fetched scripts), **unscoped root filesystem access**, **unpinned package execution**, and — the part a line-by-line read easily misses — **dangerous capability combos**: if the config enables both a filesystem server and a network/browser server at the same time, that pairing is a built-in exfiltration path even when neither server is individually malicious. It grades the config A–F, shows a per-server capability matrix, and explains every finding with a concrete fix.

Everything runs client-side. The config you paste — including any tokens in it — never leaves the tab.

![Screenshot](docs/demo.png)
<sub>Screenshot auto-captured by CI on GitHub's runner (the build sandbox can't run a browser) — appears within minutes of publish.</sub>

## Try it

**[Live demo →](https://kbipul.github.io/mcp-auditor/)** — runs fully in your browser, nothing to install.

```bash
git clone https://github.com/kbipul/mcp-auditor.git
cd mcp-auditor
npm install
npm run dev       # local dev server
npm test          # 34 unit tests, vitest
npm run build     # production build to dist/
```

## How it works

- **Two-layer rule engine.** Line-based regex rules scan a pretty-printed (one-token-per-line) rendering of the config for single-server red flags — hardcoded secrets, `curl|bash`, root paths, `sudo`, `@latest`. Document-level rules run over the *parsed* server list, because combo risks (filesystem + network, a raw shell interpreter alongside anything else, multiple servers each holding credentials) span more than one entry and can't be caught line by line.
- **Capability inference, not a formal manifest.** MCP servers don't declare permission scopes the way OS-level sandboxes do — you only get a `command` and `args`. So capability tags (filesystem, network, browser, shell, database, credentials) are inferred from package/command names and arguments. This is a heuristic, stated plainly in the UI: it's a fast first pass, not a formal audit.
- **Same scoring model as [SkillScan](https://github.com/kbipul/skill-scan)**, its sibling from Day 006 — weighted deductions by severity, capped per rule so one noisy finding can't zero the score alone, criticals cap the letter grade at D even if the numeric score is high. Consistent voice across the two tools on purpose: this is the second day of a small "AI agent supply-chain security" series — Day 006 audited the skills an agent loads, Day 007 audits the servers it talks to.

## Build notes — what I learned

The genuinely interesting part of this build was realizing MCP configs don't have a formal permission model to audit against — there's no `allowed-tools` field like a skill file has. So "auditing" here means inferring what a server *can reach* from nothing but its launch command, which is inherently fuzzier than SkillScan's frontmatter-driven checks. I leaned into that honestly in the UI copy rather than overselling precision the tool doesn't have.

The combo-detection logic (filesystem + network = exfiltration path) is the feature I'm most pleased with — it's the one thing a human skimming a config server-by-server is likely to miss, because no single entry looks wrong in isolation. Getting the capability heuristics accurate enough to avoid flooding false positives on ordinary `npx @modelcontextprotocol/server-*` packages took a few iterations of test-writing before the code — I wrote the "should NOT flag a clean config" tests first, which caught an early version of the unpinned-package rule that was flagging every single `npx` invocation regardless of whether the package was actually pinned.

One thing I'd do differently with more time: the capability heuristic classifies by name-matching, so a well-known server with an unusual internal name (rather than the official `@modelcontextprotocol/server-*` naming) could be under-classified. A v2 could ship a small allow-list of known-good official server packages to reduce both false positives and false negatives.

## Stack

| | |
|---|---|
| UI | React 18, TypeScript 5 |
| Build | Vite 6 |
| Tests | Vitest 2 (34 unit tests across parser, capability classifier, rule engine, and end-to-end sample grading) |
| Deploy | GitHub Pages via Actions |

---

<div align="center"><sub>
Built by <a href="https://www.kumarbipul.com"><b>Kumar Bipul</b></a> ·
IT Director → AI/ML · <a href="https://github.com/kbipul">github.com/kbipul</a>
</sub></div>
