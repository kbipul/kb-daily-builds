/**
 * The virtual machine every command is simulated against: one realistic
 * checkout, plus just enough of the surrounding system for a command that
 * escapes the project to have somewhere to escape *to*.
 *
 * The flags on each node are the whole point — `gitTracked`, `gitIgnored`,
 * `modified`, `regenerable` and `secret` are what turn "12 files deleted"
 * into "9 come back, 3 never do".
 */
import type { VNode } from "../lib/types";

const file = (name: string, size: number, extra: Partial<VNode> = {}): VNode => ({
  name,
  type: "file",
  size,
  ...extra,
});

const dir = (name: string, children: VNode[], extra: Partial<VNode> = {}): VNode => ({
  name,
  type: "dir",
  children,
  ...extra,
});

/** Committed and untouched — `git checkout` restores it. */
const tracked = (name: string, size: number) => file(name, size, { gitTracked: true });
/** Committed, but edited today — the edits are not in git. */
const dirty = (name: string, size: number) => file(name, size, { gitTracked: true, modified: true });
/** Never committed — git has no copy. */
const untracked = (name: string, size: number) => file(name, size);

export const FILESYSTEM: VNode = dir("", [
  dir("usr", [dir("bin", [file("node", 78_000_000), file("git", 3_400_000)]), dir("lib", [])]),
  dir("etc", [file("hosts", 800), file("passwd", 2_400)]),
  dir("home", [
    dir("dev", [
      file(".bashrc", 3_800),
      file(".gitconfig", 620),
      dir(".ssh", [file("id_ed25519", 464, { secret: true }), file("known_hosts", 4_200)]),
      dir("checkout", [
        dir(".git", [
          file("HEAD", 41),
          file("config", 320),
          dir("objects", [file("pack-8f3a2b.pack", 14_200_000)]),
          dir("refs", [file("main", 41)]),
        ]),
        file(".gitignore", 180, { gitTracked: true }),
        file(".env", 740, { gitIgnored: true, secret: true }),
        file(".env.example", 210, { gitTracked: true }),
        tracked("package.json", 1_840),
        tracked("package-lock.json", 412_000),
        tracked("README.md", 6_200),
        tracked("vite.config.ts", 480),
        dirty("CHANGELOG.md", 2_100),
        dir("src", [
          tracked("main.tsx", 380),
          dirty("App.tsx", 9_400),
          tracked("styles.css", 5_100),
          dir("lib", [tracked("api.ts", 4_200), dirty("parser.ts", 11_800)]),
          dir("components", [tracked("Header.tsx", 2_100), tracked("Footer.tsx", 1_400)]),
        ]),
        dir("scratch", [
          untracked("migration-notes.md", 8_800),
          untracked("perf-numbers.csv", 24_000),
          untracked("todo.txt", 900),
        ]),
        dir("docs", [tracked("architecture.md", 14_000), tracked("demo.png", 240_000)]),
        dir("node_modules", [
          dir("react", [file("index.js", 120_000)]),
          dir("vite", [file("index.js", 2_400_000)]),
          dir(".bin", [file("vite", 1_200)]),
        ], { gitIgnored: true, regenerable: true }),
        dir("dist", [file("index.html", 1_100), dir("assets", [file("index-a1b2.js", 184_000)])], {
          gitIgnored: true,
          regenerable: true,
        }),
        dir("coverage", [file("lcov.info", 88_000)], { gitIgnored: true, regenerable: true }),
      ]),
    ]),
  ]),
  dir("tmp", [file("build.log", 12_000)]),
  dir("var", [dir("log", [file("syslog", 4_000_000)])]),
]);

export interface Example {
  label: string;
  command: string;
  /** Why this example is in the list — shown under the button. */
  note: string;
  env?: Record<string, string>;
}

/**
 * Every example is a real, documented failure mode. The default one is the
 * Steam bug, because it is the clearest demonstration that the command you
 * read is not the command that runs.
 */
export const EXAMPLES: Example[] = [
  {
    label: "The Steam bug",
    command: 'rm -rf "$STEAMROOT/"*',
    note: "$STEAMROOT is unset. Steam shipped this in 2015 and it deleted users' entire home directories.",
  },
  {
    label: "Clean the workspace",
    command: "git clean -xdf",
    note: "The single most common way engineers lose their .env file.",
  },
  {
    label: "Free up some space",
    command: "rm -rf node_modules dist coverage",
    note: "Actually fine — and the tool should say so rather than crying wolf.",
  },
  {
    label: "Start over",
    command: "git reset --hard HEAD",
    note: "Committed work survives via reflog. Today's uncommitted edits do not.",
  },
  {
    label: "Tidy the scratch dir",
    command: "rm -rf scratch/*",
    note: "Nothing in scratch/ was ever committed, so there is no copy anywhere.",
  },
  {
    label: "Bumblebee's classic",
    command: "rm -rf /usr $LIB/nvidia-current/xorg/",
    note: "A missing quote plus an unset $LIB removed /usr on real machines in 2015.",
  },
  {
    label: "Install a tool",
    command: "curl -sL https://example.com/install.sh | sh",
    note: "The server can serve different bytes to curl than to your browser.",
  },
  {
    label: "Reclaim docker space",
    command: "docker system prune -a --volumes",
    note: "Images re-pull. The Postgres volume with your local data does not.",
  },
];
