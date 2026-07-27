import { describe, it, expect } from "vitest";
import { tokenize, normalizeText, splitLines } from "../normalize";

describe("tokenize", () => {
  it("lowercases and splits on non-alphanumeric", () => {
    expect(tokenize("Hello, World!")).toEqual(["hello", "world"]);
  });
  it("treats punctuation and whitespace as separators", () => {
    expect(tokenize("a.b,c   d\te")).toEqual(["a", "b", "c", "d", "e"]);
  });
  it("keeps numbers as tokens", () => {
    expect(tokenize("GPT 5.6 costs 3 dollars")).toEqual([
      "gpt", "5", "6", "costs", "3", "dollars",
    ]);
  });
  it("returns [] for empty or punctuation-only input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("!!! ??? ...")).toEqual([]);
  });
  it("handles unicode letters", () => {
    expect(tokenize("café Über")).toEqual(["café", "über"]);
  });
});

describe("normalizeText", () => {
  it("collapses casing, punctuation and whitespace to a canonical form", () => {
    expect(normalizeText("The  Cat, sat!")).toBe("the cat sat");
  });
  it("makes punctuation-only differences equal", () => {
    expect(normalizeText("Canberra, not Sydney.")).toBe(
      normalizeText("canberra not sydney")
    );
  });
  it("does not equate genuinely different strings", () => {
    expect(normalizeText("hello there")).not.toBe(normalizeText("hello world"));
  });
});

describe("splitLines", () => {
  it("trims and drops blank lines", () => {
    expect(splitLines("  a \n\n b \n   \nc")).toEqual(["a", "b", "c"]);
  });
  it("handles CRLF", () => {
    expect(splitLines("x\r\ny")).toEqual(["x", "y"]);
  });
  it("returns [] for empty block", () => {
    expect(splitLines("   \n  ")).toEqual([]);
  });
});
