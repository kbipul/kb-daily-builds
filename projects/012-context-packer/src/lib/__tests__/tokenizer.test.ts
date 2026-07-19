import { describe, expect, it } from "vitest";
import { countTokens } from "../tokenizer";

describe("countTokens", () => {
  it("returns 0 for empty input", () => {
    expect(countTokens("")).toBe(0);
  });

  it("counts a non-empty string as > 0 tokens", () => {
    expect(countTokens("hello world")).toBeGreaterThan(0);
  });

  it("assigns more tokens to longer text", () => {
    const short = countTokens("hello");
    const long = countTokens("hello there, this is a considerably longer sentence.");
    expect(long).toBeGreaterThan(short);
  });
});
