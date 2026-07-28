import { describe, it, expect } from "vitest";
import { evaluate, tokenize } from "../tools/calculator";

describe("calculator", () => {
  it("respects operator precedence", () => {
    expect(evaluate("2 + 3 * 4")).toBe(14);
    expect(evaluate("(2 + 3) * 4")).toBe(20);
  });
  it("handles unary minus and exponent (right-assoc)", () => {
    expect(evaluate("-5 + 3")).toBe(-2);
    expect(evaluate("2 ^ 3 ^ 2")).toBe(512);
  });
  it("handles nested parentheses and modulo", () => {
    expect(evaluate("((1 + 2) * (3 + 4)) % 5")).toBe(1);
  });
  it("throws on division by zero", () => {
    expect(() => evaluate("1 / 0")).toThrow(/division by zero/);
  });
  it("rejects code / stray characters (no eval)", () => {
    expect(() => evaluate("2 + alert(1)")).toThrow();
    expect(() => evaluate("1; 2")).toThrow();
  });
  it("rejects mismatched parentheses", () => {
    expect(() => evaluate("(1 + 2")).toThrow(/parentheses/);
  });
  it("tokenizes numbers and operators", () => {
    expect(tokenize("1+2").length).toBe(3);
  });
});
