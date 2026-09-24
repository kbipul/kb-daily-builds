# Known environment facts

Read this once per run instead of rediscovering it. Every line here cost a
previous run time. Verified dates in brackets. If a fact stops being true,
fix it here in the same commit that proves it.

## Filesystem

- The mounted "GithHub Update" folder allows create and overwrite but **not
  unlink**. Git needs unlink, so never run git inside `hub/`. Clone to a unique
  `/tmp/hub-run-$(date +%s)` every run. `hub/` is a read-only mirror. [2026-07-14]
- Each session runs as a different uid, so a fixed `/tmp/hub` or `/tmp/build`
  from yesterday is undeletable. Always use timestamped dirs. `~/` is writable
  and private to the session; store paths there (`echo $H > ~/hubpath.txt`). [2026-07-18]
- The Write/Edit tools cannot reach `/tmp`. Write project files with bash
  heredocs (`cat > file <<'EOF'`). [2026-09-23]

## Shell and processes

- Every bash tool call gets its own network namespace. A server started in one
  call is invisible to `curl` in the next. Start `vite preview` and curl it in
  the SAME call. [2026-07-18, re-hit 2026-09-14 and 2026-09-19]
- `pkill -f "vite preview"` also kills the shell running it (exit 143). Write
  `SMOKE_RESULT` to a file before the pkill and read the file, never the exit
  code. [2026-07-18]
- A bash call times out at about 180 s. `npm install` for the standard stack
  can take longer. Run it as `(setsid nohup npm install --no-audit --no-fund > log 2>&1 &)`
  and poll the log in later calls. [2026-09-23]
- An interrupted `npm install` can leave a truncated
  `@esbuild/linux-arm64/bin/esbuild`. Symptom: `signal: 'SIGSEGV'` from
  `esbuild --version`. It is NOT a platform incompatibility: `rm -rf
  node_modules package-lock.json` and reinstall. [2026-09-23]
- Second build in the same run: copy the first build's `node_modules` and
  `package-lock.json` instead of reinstalling. The stack is identical. [2026-09-23]
- There is no browser. Screenshots come from the CI `screenshot` job on GitHub
  runners, which commits `docs/demo.png` back. Never claim a local screenshot. [2026-07-06]

## Network

- Works: `git` over HTTPS to github.com, `https://github.com/trending` via
  web_fetch, npm registry, Microsoft Learn MCP (`microsoft_docs_search`,
  `microsoft_docs_fetch`) in Cowork runs.
- Blocked or off-allowlist, do not retry: `api.github.com` from the sandbox,
  `huggingface.co`, `reddit.com`. Use WebSearch results about them instead.
- web_fetch only accepts URLs that appeared in a user message or a search
  result. Search first, then fetch the result URL. This includes arXiv abstract
  pages and vendor docs.
- `datatracker.ietf.org` has maintenance windows. Retry once, then cite the
  search result.
- `github.com/trending` sometimes overflows the tool's output limit. Grep the
  saved file for `stargazers` lines rather than reading it whole.

## Sessions

- Sessions die from sleep ("computer went to sleep"), DNS (`ENOTFOUND`), weekly
  usage limits and stream cut-offs. The slot claim expires after 3 hours so the
  next run can take over, and the GitHub watchdog raises an issue.
- Two schedulers exist (the local Cowork task and a claude.ai cloud routine).
  `state/claims.json` stops them building the same slot. Disabling one of them
  is still the owner's job.

## Git and state

- publish.yml pushes `chore: mark published [skip ci]` about a minute after
  every build push. A second push in the same run needs `git pull --rebase`
  first.
- Never hand-merge `state/state.json`. During a rebase conflict: `git checkout
  --ours state/state.json` (upstream), re-run `node scripts/upsert-entry.mjs
  <entry>`, `git add`, `git rebase --continue`. Hand-merging dropped Day 044's
  repoUrl and demoUrl on 2026-09-23.
