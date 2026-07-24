import { describe, it, expect } from "vitest";
import { tokenize, normalizeInput, extractNumbers, extractQuoted, looksLikeError } from "../text";

describe("tokenize", () => {
  it("splits on non-alphanumerics and lowercases", () => {
    expect(tokenize("Hello, World-42!")).toEqual(["hello", "world", "42"]);
  });
  it("returns [] for empty", () => {
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("normalizeInput", () => {
  it("makes key order irrelevant for JSON objects", () => {
    expect(normalizeInput('{"a":1,"b":2}')).toBe(normalizeInput('{ "b": 2, "a": 1 }'));
  });
  it("collapses whitespace for non-JSON", () => {
    expect(normalizeInput("cat   file.txt\n")).toBe("cat file.txt");
  });
  it("sorts nested objects recursively", () => {
    expect(normalizeInput('{"z":{"b":1,"a":2}}')).toBe('{"z":{"a":2,"b":1}}');
  });
  it("empty string stays empty", () => {
    expect(normalizeInput("   ")).toBe("");
  });
});

describe("extractNumbers", () => {
  it("finds standalone numbers", () => {
    expect(extractNumbers("high of 27C and 63mm over 8 days")).toContain("8");
    expect(extractNumbers("value is 27")).toEqual(["27"]);
  });
  it("handles decimals and negatives", () => {
    expect(extractNumbers("temp -3.5 rising")).toEqual(["-3.5"]);
  });
  it("ignores numbers glued inside identifiers", () => {
    expect(extractNumbers("v2 and utf8")).toEqual([]);
  });
});

describe("extractQuoted", () => {
  it("pulls double, single and backtick quotes", () => {
    expect(extractQuoted(`say "hello" and 'world' and \`code\``)).toEqual(["hello", "world", "code"]);
  });
  it("ignores 1-char quotes", () => {
    expect(extractQuoted(`a "x" b`)).toEqual([]);
  });
});

describe("looksLikeError", () => {
  it("detects common error phrasings", () => {
    expect(looksLikeError("Error: invalid expression")).toBe(true);
    expect(looksLikeError("Request timed out")).toBe(true);
    expect(looksLikeError("404 not found")).toBe(true);
    expect(looksLikeError("permission denied")).toBe(true);
  });
  it("passes normal observations", () => {
    expect(looksLikeError("Paris: 14C, light rain.")).toBe(false);
  });
});
