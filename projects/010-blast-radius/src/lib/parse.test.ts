import { describe, it, expect } from "vitest";
import { tokenize, substitute, parse, DEFAULT_ENV } from "./parse";

describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("rm -rf dist")).toEqual(["rm", "-rf", "dist"]);
  });

  it("keeps quoted strings together", () => {
    expect(tokenize('rm -rf "my folder"')).toEqual(["rm", "-rf", "my folder"]);
  });

  it("handles the Steam pattern: quote ends before the glob", () => {
    expect(tokenize('rm -rf "$STEAMROOT/"*')).toEqual(["rm", "-rf", "$STEAMROOT/*"]);
  });

  it("preserves an empty quoted argument", () => {
    expect(tokenize('rm ""')).toEqual(["rm", ""]);
  });

  it("respects backslash escapes", () => {
    expect(tokenize("rm my\\ file")).toEqual(["rm", "my file"]);
  });
});

describe("substitute", () => {
  it("expands a set variable", () => {
    expect(substitute("$HOME/x", DEFAULT_ENV).value).toBe("/home/dev/x");
  });

  it("expands ${BRACED} form", () => {
    expect(substitute("${HOME}/x", DEFAULT_ENV).value).toBe("/home/dev/x");
  });

  it("expands an unset variable to empty and reports it", () => {
    const result = substitute("$STEAMROOT/x", DEFAULT_ENV);
    expect(result.value).toBe("/x");
    expect(result.unset).toEqual(["STEAMROOT"]);
  });
});

describe("parse", () => {
  it("separates short flags, long flags and args", () => {
    const { commands } = parse("rm -rf --verbose dist");
    expect(commands[0].name).toBe("rm");
    expect(commands[0].flags).toContain("r");
    expect(commands[0].flags).toContain("f");
    expect(commands[0].flags).toContain("--verbose");
    expect(commands[0].args).toEqual(["dist"]);
  });

  it("reports that expansion changed the command", () => {
    const result = parse('rm -rf "$STEAMROOT/"*');
    expect(result.expansionChanged).toBe(true);
    expect(result.unsetVars).toEqual(["STEAMROOT"]);
    expect(result.expanded).toBe("rm -rf /*");
  });

  it("does not flag expansion when nothing expanded", () => {
    expect(parse("rm -rf dist").expansionChanged).toBe(false);
  });

  it("splits a chained command line", () => {
    const { commands } = parse("npm run build && rm -rf dist");
    expect(commands.map((c) => c.name)).toEqual(["npm", "rm"]);
  });

  it("splits on semicolons too", () => {
    expect(parse("ls; rm -rf dist").commands.map((c) => c.name)).toEqual(["ls", "rm"]);
  });

  it("detects sudo and strips it from the program name", () => {
    const { commands } = parse("sudo rm -rf /usr");
    expect(commands[0].sudo).toBe(true);
    expect(commands[0].name).toBe("rm");
  });

  it("skips VAR=value prefixes", () => {
    expect(parse("NODE_ENV=production npm run build").commands[0].name).toBe("npm");
  });

  it("detects a pipe into a shell", () => {
    expect(parse("curl -sL https://x.sh | sh").pipedToShell).toBe(true);
  });

  it("does not treat an ordinary pipe as a shell pipe", () => {
    expect(parse("cat x | grep y").pipedToShell).toBe(false);
  });
});
