import { describe, it, expect } from "vitest";
import { parseFrontmatter, getEntry } from "../frontmatter";

describe("parseFrontmatter", () => {
  it("returns present=false when there is no block", () => {
    const r = parseFrontmatter("# Just a heading\n\nsome text");
    expect(r.present).toBe(false);
    expect(r.entries).toHaveLength(0);
    expect(r.body).toContain("Just a heading");
  });

  it("parses scalar keys with line numbers", () => {
    const r = parseFrontmatter("---\nname: foo\ndescription: does a thing\n---\nbody");
    expect(r.present).toBe(true);
    expect(getEntry(r, "name")?.value).toBe("foo");
    expect(getEntry(r, "description")?.value).toBe("does a thing");
    expect(getEntry(r, "name")?.line).toBe(2);
  });

  it("strips surrounding quotes", () => {
    const r = parseFrontmatter(`---\ntools: "*"\n---\n`);
    expect(getEntry(r, "tools")?.value).toBe("*");
  });

  it("parses inline array syntax", () => {
    const r = parseFrontmatter("---\nallowed-tools: [Read, Bash(git status:*)]\n---\n");
    expect(getEntry(r, "allowed-tools")?.value).toEqual(["Read", "Bash(git status:*)"]);
  });

  it("parses block list syntax", () => {
    const r = parseFrontmatter("---\ntopics:\n  - a\n  - b\n---\n");
    expect(getEntry(r, "topics")?.value).toEqual(["a", "b"]);
  });

  it("is case-insensitive in getEntry and tolerates aliases", () => {
    const r = parseFrontmatter("---\nallowedTools: [Read]\n---\n");
    expect(getEntry(r, "allowed-tools", "allowedTools")?.value).toEqual(["Read"]);
  });

  it("treats an unterminated block as body, not frontmatter", () => {
    const r = parseFrontmatter("---\nname: foo\nno closing fence");
    expect(r.present).toBe(false);
  });

  it("computes bodyStartLine after the closing fence", () => {
    const r = parseFrontmatter("---\nname: foo\n---\nline four\n");
    expect(r.bodyStartLine).toBe(4);
    expect(r.body.startsWith("line four")).toBe(true);
  });
});
