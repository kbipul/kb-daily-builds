import { useMemo, useState } from "react";
import { simulate } from "./lib/simulate";
import { FILESYSTEM, EXAMPLES } from "./data/fixtures";
import { Verdict } from "./components/Verdict";
import { Findings } from "./components/Findings";
import { Casualties } from "./components/Casualties";
import { Rewrite } from "./components/Rewrite";
import { FileTree } from "./components/FileTree";

export function App() {
  // Open on the Steam bug: the fastest way to make the point is to show a
  // command that reads as harmless and expands into a home-directory wipe.
  const [command, setCommand] = useState(EXAMPLES[0].command);

  const simulation = useMemo(() => simulate(command, { root: FILESYSTEM }), [command]);
  const doomed = useMemo(
    () => new Set(simulation.casualties.map((c) => c.path)),
    [simulation],
  );

  return (
    <div className="app">
      <header className="header">
        <h1>
          Blast <span className="header__accent">Radius</span>
        </h1>
        <p className="header__sub">
          Your agent wants to run a command. See what it destroys — before it runs.
        </p>
      </header>

      <section className="console">
        <label className="console__label" htmlFor="command">
          command
        </label>
        <div className="console__input">
          <span className="console__prompt">dev@checkout $</span>
          <input
            id="command"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            aria-describedby="console-help"
          />
        </div>
        <p id="console-help" className="console__help">
          Simulated against a virtual machine. Nothing runs. Nothing on your computer is touched.
        </p>

        <div className="examples">
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              className={`example${example.command === command ? " example--active" : ""}`}
              onClick={() => setCommand(example.command)}
              title={example.note}
            >
              {example.label}
            </button>
          ))}
        </div>
        {EXAMPLES.find((e) => e.command === command) && (
          <p className="examples__note">{EXAMPLES.find((e) => e.command === command)!.note}</p>
        )}
      </section>

      <Verdict simulation={simulation} />

      <div className="grid">
        <div className="grid__col">
          <Findings findings={simulation.findings} />
          <Rewrite simulation={simulation} />
          <Casualties casualties={simulation.casualties} />
        </div>
        <div className="grid__col">
          <FileTree doomed={doomed} />
        </div>
      </div>

      <footer className="footer">
        <p>
          <strong>This is a simulator, not a guarantee.</strong> It models a fixed set of commands
          against a fixed virtual filesystem. An <em>unknown</em> verdict means it has nothing to
          say — never that a command is safe. Do not wire it into anything as a policy gate.
        </p>
        <p>
          Day 010 of{" "}
          <a href="https://github.com/kbipul/kb-daily-builds">kb-daily-builds</a> · built by{" "}
          <a href="https://www.kumarbipul.com">Kumar Bipul</a>
        </p>
      </footer>
    </div>
  );
}
