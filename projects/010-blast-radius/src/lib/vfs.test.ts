import { describe, it, expect } from "vitest";
import { normalize, lookup, expand, expandBraces, flatten, sizeOf, recoveryOf } from "./vfs";
import { FILESYSTEM } from "../data/fixtures";

describe("normalize", () => {
  it("resolves relative paths against the cwd", () => {
    expect(normalize("src", "/home/dev/checkout")).toBe("/home/dev/checkout/src");
  });

  it("collapses . and .. segments", () => {
    expect(normalize("/home/dev/checkout/src/../dist")).toBe("/home/dev/checkout/dist");
    expect(normalize("/home/./dev")).toBe("/home/dev");
  });

  it("lets .. climb out of the project root — the escape we must be able to see", () => {
    expect(normalize("../../..", "/home/dev/checkout")).toBe("/");
  });

  it("strips duplicate and trailing slashes", () => {
    expect(normalize("/home//dev/")).toBe("/home/dev");
  });
});

describe("lookup", () => {
  it("finds a nested file", () => {
    expect(lookup(FILESYSTEM, "/home/dev/checkout/package.json")?.type).toBe("file");
  });

  it("returns null for a path that does not exist", () => {
    expect(lookup(FILESYSTEM, "/home/dev/checkout/nope.txt")).toBeNull();
  });
});

describe("expandBraces", () => {
  it("expands a single group", () => {
    expect(expandBraces("a{1,2}b")).toEqual(["a1b", "a2b"]);
  });

  it("expands nested groups combinatorially", () => {
    expect(expandBraces("{a,b}{1,2}")).toEqual(["a1", "a2", "b1", "b2"]);
  });

  it("passes plain strings through untouched", () => {
    expect(expandBraces("plain")).toEqual(["plain"]);
  });
});

describe("expand", () => {
  it("matches a literal path", () => {
    const hits = expand(FILESYSTEM, "package.json", "/home/dev/checkout");
    expect(hits.map((h) => h.path)).toEqual(["/home/dev/checkout/package.json"]);
  });

  it("expands * without crossing a slash", () => {
    const hits = expand(FILESYSTEM, "src/*", "/home/dev/checkout");
    const names = hits.map((h) => h.path.split("/").pop());
    expect(names).toContain("App.tsx");
    expect(names).toContain("lib");
    // main.tsx is inside src, but src/lib/api.ts must not match src/*
    expect(hits.some((h) => h.path.endsWith("lib/api.ts"))).toBe(false);
  });

  it("does not match dotfiles with a bare *, like a real shell", () => {
    const hits = expand(FILESYSTEM, "*", "/home/dev/checkout");
    expect(hits.some((h) => h.path.endsWith("/.env"))).toBe(false);
    expect(hits.some((h) => h.path.endsWith("/package.json"))).toBe(true);
  });

  it("matches dotfiles when the pattern starts with a dot", () => {
    const hits = expand(FILESYSTEM, ".env*", "/home/dev/checkout");
    expect(hits.map((h) => h.path.split("/").pop()).sort()).toEqual([".env", ".env.example"]);
  });

  it("crosses directories with **", () => {
    const hits = expand(FILESYSTEM, "src/**/*.ts", "/home/dev/checkout");
    expect(hits.some((h) => h.path.endsWith("lib/api.ts"))).toBe(true);
  });

  it("de-duplicates overlapping matches so bytes are never double counted", () => {
    const hits = expand(FILESYSTEM, "{package.json,package.json}", "/home/dev/checkout");
    expect(hits).toHaveLength(1);
  });

  it("returns nothing for a path that does not exist", () => {
    expect(expand(FILESYSTEM, "ghost/*", "/home/dev/checkout")).toEqual([]);
  });
});

describe("flatten", () => {
  it("includes the directory itself and everything under it", () => {
    const [entry] = expand(FILESYSTEM, "src/components", "/home/dev/checkout");
    const paths = flatten(entry).map((e) => e.path);
    expect(paths).toContain("/home/dev/checkout/src/components");
    expect(paths).toContain("/home/dev/checkout/src/components/Header.tsx");
  });
});

describe("sizeOf", () => {
  it("sums children for a directory", () => {
    const [entry] = expand(FILESYSTEM, "src/components", "/home/dev/checkout");
    expect(sizeOf(entry.node)).toBe(2_100 + 1_400);
  });
});

describe("recoveryOf", () => {
  it("flags secrets as unrecoverable even though they are just files", () => {
    const node = lookup(FILESYSTEM, "/home/dev/checkout/.env")!;
    expect(recoveryOf(node).recovery).toBe("gone-secret");
  });

  it("calls node_modules regenerable", () => {
    const node = lookup(FILESYSTEM, "/home/dev/checkout/node_modules")!;
    expect(recoveryOf(node).recovery).toBe("regenerable");
  });

  it("distinguishes a clean tracked file from a dirty one", () => {
    expect(recoveryOf(lookup(FILESYSTEM, "/home/dev/checkout/README.md")!).recovery).toBe("committed");
    expect(recoveryOf(lookup(FILESYSTEM, "/home/dev/checkout/src/App.tsx")!).recovery).toBe("partial");
  });

  it("calls untracked scratch work gone", () => {
    const node = lookup(FILESYSTEM, "/home/dev/checkout/scratch/todo.txt")!;
    expect(recoveryOf(node).recovery).toBe("gone");
  });
});
