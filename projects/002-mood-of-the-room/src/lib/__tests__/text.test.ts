import { describe, it, expect } from "vitest";
import {
  splitSentences,
  toSigned,
  moodLabel,
  scoreToColor,
  summarize,
  formatScore,
} from "../text";

describe("splitSentences", () => {
  it("splits on terminal punctuation and keeps it", () => {
    const out = splitSentences("Hello world. How are you? I am fine!");
    expect(out).toEqual(["Hello world.", "How are you?", "I am fine!"]);
  });

  it("splits on newlines and trims", () => {
    expect(splitSentences("  a line\n\n another line ")).toEqual([
      "a line",
      "another line",
    ]);
  });

  it("drops empty fragments", () => {
    expect(splitSentences("...\n\n   \n")).toEqual(["..."]);
  });

  it("returns [] for whitespace-only input", () => {
    expect(splitSentences("   \n  ")).toEqual([]);
  });
});

describe("toSigned", () => {
  it("keeps positive confidence", () => {
    expect(toSigned({ label: "POSITIVE", score: 0.9 })).toBeCloseTo(0.9);
  });
  it("negates negative confidence", () => {
    expect(toSigned({ label: "NEGATIVE", score: 0.8 })).toBeCloseTo(-0.8);
  });
  it("is case-insensitive and handles unknown labels", () => {
    expect(toSigned({ label: "positive", score: 0.5 })).toBeCloseTo(0.5);
    expect(toSigned({ label: "LABEL_0", score: 0.5 })).toBe(0);
  });
});

describe("moodLabel", () => {
  it("buckets around the neutral band", () => {
    expect(moodLabel(0.5)).toBe("positive");
    expect(moodLabel(-0.5)).toBe("negative");
    expect(moodLabel(0.1)).toBe("neutral");
    expect(moodLabel(-0.1)).toBe("neutral");
  });
});

describe("scoreToColor", () => {
  it("maps extremes to red and green hues", () => {
    expect(scoreToColor(-1)).toBe("hsl(0, 85%, 46%)");
    expect(scoreToColor(1)).toBe("hsl(140, 85%, 46%)");
  });
  it("clamps out-of-range input", () => {
    expect(scoreToColor(5)).toBe(scoreToColor(1));
    expect(scoreToColor(-5)).toBe(scoreToColor(-1));
  });
  it("neutral sits mid-hue with low saturation", () => {
    expect(scoreToColor(0)).toBe("hsl(70, 45%, 46%)");
  });
});

describe("summarize", () => {
  it("handles the empty case", () => {
    const s = summarize([]);
    expect(s.count).toBe(0);
    expect(s.overall).toBe("neutral");
  });

  it("counts buckets and averages", () => {
    const s = summarize([0.9, 0.8, -0.7, 0.05]);
    expect(s.count).toBe(4);
    expect(s.positive).toBe(2);
    expect(s.negative).toBe(1);
    expect(s.neutral).toBe(1);
    expect(s.mean).toBeCloseTo((0.9 + 0.8 - 0.7 + 0.05) / 4); // ≈ 0.26 → positive
    expect(s.overall).toBe("positive");
  });

  it("reports an overall positive room", () => {
    expect(summarize([0.9, 0.8, 0.7]).overall).toBe("positive");
  });
});

describe("formatScore", () => {
  it("adds an explicit sign", () => {
    expect(formatScore(0.82)).toBe("+82%");
    expect(formatScore(-0.4)).toBe("-40%");
    expect(formatScore(0)).toBe("+0%");
  });
});
