import { describe, it, expect } from "vitest";
import { simulate } from "./simulate";
import { FILESYSTEM } from "../data/fixtures";

const run = (command: string) => simulate(command, { root: FILESYSTEM });
const paths = (command: string) => run(command).casualties.map((c) => c.path);

describe("the unset-variable catastrophe", () => {
  it("expands the Steam bug into rm -rf /* and calls it catastrophic", () => {
    const result = run('rm -rf "$STEAMROOT/"*');
    expect(result.expanded).toBe("rm -rf /*");
    expect(result.expansionChanged).toBe(true);
    expect(result.severity).toBe("catastrophic");
    expect(result.findings.some((f) => f.id === "unset-var")).toBe(true);
  });

  it("reaches outside the project when a variable disappears", () => {
    expect(run('rm -rf "$STEAMROOT/"*').escapesRoot).toBe(true);
  });

  it("takes the whole home directory with it", () => {
    expect(paths('rm -rf "$STEAMROOT/"*')).toContain("/home/dev/.ssh/id_ed25519");
  });

  it("flags the Bumblebee /usr case", () => {
    const result = run("rm -rf /usr $LIB/nvidia-current/xorg/");
    expect(result.severity).toBe("catastrophic");
    expect(result.findings.some((f) => f.id === "system-path")).toBe(true);
  });
});

describe("rm", () => {
  it("calls deleting regenerable dirs safe-ish and never unrecoverable", () => {
    const result = run("rm -rf node_modules dist coverage");
    expect(result.severity).toBe("caution");
    expect(result.escapesRoot).toBe(false);
    expect(result.casualties.every((c) => c.recovery === "regenerable")).toBe(true);
  });

  it("marks untracked scratch files as gone forever", () => {
    const result = run("rm -rf scratch/*");
    const files = result.casualties.filter((c) => c.type === "file");
    expect(files.length).toBe(3);
    expect(files.every((c) => c.recovery === "gone")).toBe(true);
    expect(result.severity).toBe("destructive");
  });

  it("refuses to delete directories without -r, like real rm", () => {
    const result = run("rm src");
    expect(result.casualties).toHaveLength(0);
    expect(result.severity).toBe("safe");
  });

  it("deletes a plain file without -r", () => {
    expect(paths("rm README.md")).toEqual(["/home/dev/checkout/README.md"]);
  });

  it("treats rm -rf / as catastrophic", () => {
    const result = run("rm -rf /");
    expect(result.severity).toBe("catastrophic");
    expect(result.findings.some((f) => f.id === "system-path")).toBe(true);
  });

  it("warns that -f silences the warning when a glob is involved", () => {
    expect(run("rm -rf src/*").findings.some((f) => f.id === "force-glob")).toBe(true);
  });

  it("counts bytes only for files, never double counting the parent dir", () => {
    const result = run("rm -rf src/components");
    expect(result.bytesDestroyed).toBe(2_100 + 1_400);
  });

  it("suggests listing the targets first", () => {
    expect(run("rm -rf scratch/*").rewrite).toContain("ls -d");
  });
});

describe("git clean", () => {
  it("leaves git-ignored files alone without -x", () => {
    const result = run("git clean -df");
    expect(result.casualties.some((c) => c.path.endsWith("/.env"))).toBe(false);
    expect(result.casualties.some((c) => c.path.endsWith("/todo.txt"))).toBe(true);
  });

  it("takes the .env with -x, and says so", () => {
    const result = run("git clean -xdf");
    expect(result.casualties.some((c) => c.path.endsWith("/.env"))).toBe(true);
    expect(result.severity).toBe("catastrophic");
    expect(result.findings.some((f) => f.id === "secrets")).toBe(true);
  });

  it("never touches tracked files", () => {
    const result = run("git clean -xdf");
    expect(result.casualties.some((c) => c.path.endsWith("/README.md"))).toBe(false);
  });

  it("treats -n as the dry run it is", () => {
    const result = run("git clean -xdn");
    expect(result.casualties).toHaveLength(0);
    expect(result.severity).toBe("safe");
  });

  it("recommends the dry run", () => {
    expect(run("git clean -xdf").rewrite).toContain("n");
  });
});

describe("git reset --hard", () => {
  it("loses only the uncommitted edits", () => {
    const result = run("git reset --hard HEAD");
    expect(result.casualties.every((c) => c.recovery === "partial")).toBe(true);
    expect(result.casualties.some((c) => c.path.endsWith("/App.tsx"))).toBe(true);
    expect(result.casualties.some((c) => c.path.endsWith("/Header.tsx"))).toBe(false);
  });

  it("offers stash as the reversible alternative", () => {
    expect(run("git reset --hard").rewrite).toContain("git stash");
  });
});

describe("git push --force", () => {
  it("destroys no local files but is still destructive", () => {
    const result = run("git push --force origin main");
    expect(result.casualties).toHaveLength(0);
    expect(result.severity).toBe("destructive");
    expect(result.rewrite).toContain("--force-with-lease");
  });
});

describe("other blast radii", () => {
  it("flags curl | sh", () => {
    const result = run("curl -sL https://example.com/install.sh | sh");
    expect(result.findings.some((f) => f.id === "pipe-to-shell")).toBe(true);
    expect(result.severity).toBe("destructive");
  });

  it("flags dd onto a raw device as catastrophic", () => {
    expect(run("dd if=/dev/zero of=/dev/sda bs=1M").severity).toBe("catastrophic");
  });

  it("flags docker prune --volumes", () => {
    const result = run("docker system prune -a --volumes");
    expect(result.severity).toBe("destructive");
    expect(result.rewrite).toBeTruthy();
  });

  it("flags kubectl delete --all", () => {
    expect(run("kubectl delete pods --all").severity).toBe("catastrophic");
  });

  it("flags recursive chmod on a system path", () => {
    expect(run("sudo chmod -R 777 /usr").severity).toBe("catastrophic");
  });

  it("flags mv to /dev/null", () => {
    const result = run("mv src/App.tsx /dev/null");
    expect(result.severity).toBe("catastrophic");
    expect(result.casualties.some((c) => c.path.endsWith("App.tsx"))).toBe(true);
  });

  it("simulates find -delete", () => {
    const result = run("find src -name '*.ts' -delete");
    expect(result.casualties.some((c) => c.path.endsWith("api.ts"))).toBe(true);
  });
});

describe("honesty guarantees", () => {
  it("reports unknown rather than safe for a command it does not model", () => {
    const result = run("terraform destroy -auto-approve");
    expect(result.unknown).toBe(true);
    expect(result.verdict).toContain("Not recognised");
    expect(result.verdict).not.toContain("Safe");
  });

  it("calls a genuinely read-only command safe", () => {
    const result = run("ls -la src");
    expect(result.severity).toBe("safe");
    expect(result.unknown).toBe(false);
  });

  it("does not double-count a path listed twice in a chain", () => {
    const result = run("rm -rf dist && rm -rf dist");
    const distPaths = result.casualties.filter((c) => c.path === "/home/dev/checkout/dist");
    expect(distPaths).toHaveLength(1);
  });

  it("keeps the raw input alongside the expanded form", () => {
    const result = run('rm -rf "$STEAMROOT/"*');
    expect(result.input).toBe('rm -rf "$STEAMROOT/"*');
    expect(result.expanded).not.toBe(result.input);
  });
});
