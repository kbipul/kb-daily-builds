import { describe, it, expect } from "vitest";
import { detect } from "../detect";
import { scriptHistogram, scriptOfCodePoint } from "../scripts";
import { buildProfile, cosine, markerScore, normalise } from "../ngram";
import { buildConfusion } from "../confusion";
import { LANGUAGES } from "../languages";

describe("script detection", () => {
  it("maps code points to the right script block", () => {
    expect(scriptOfCodePoint("ह".codePointAt(0)!)).toBe("Devanagari");
    expect(scriptOfCodePoint("ব".codePointAt(0)!)).toBe("Bengali");
    expect(scriptOfCodePoint("த".codePointAt(0)!)).toBe("Tamil");
    expect(scriptOfCodePoint("అ".codePointAt(0)!)).toBe("Telugu");
    expect(scriptOfCodePoint("ಕ".codePointAt(0)!)).toBe("Kannada");
    expect(scriptOfCodePoint("മ".codePointAt(0)!)).toBe("Malayalam");
    expect(scriptOfCodePoint("અ".codePointAt(0)!)).toBe("Gujarati");
    expect(scriptOfCodePoint("ਪ".codePointAt(0)!)).toBe("Gurmukhi");
    expect(scriptOfCodePoint("ଓ".codePointAt(0)!)).toBe("Odia");
    expect(scriptOfCodePoint("ا".codePointAt(0)!)).toBe("Arabic");
    expect(scriptOfCodePoint("A".codePointAt(0)!)).toBe("Latin");
  });

  it("ignores digits and punctuation when tallying the dominant script", () => {
    const h = scriptHistogram("नमस्ते!!! 123 :)");
    expect(h.dominant).toBe("Devanagari");
    expect(h.coverage).toBe(1);
  });
});

describe("n-gram helpers", () => {
  it("normalise strips digits/punct and lowercases", () => {
    expect(normalise("Hello, World! 42")).toBe("hello world");
  });
  it("cosine of a profile with itself is ~1", () => {
    const p = buildProfile("भारत एक विशाल देश है");
    expect(cosine(p, p)).toBeCloseTo(1, 5);
  });
  it("markerScore rewards presence of function words", () => {
    const hi = LANGUAGES.find((l) => l.code === "hi")!;
    expect(markerScore("यह किताब अच्छी है और सस्ती है", hi.markers)).toBeGreaterThan(0);
    expect(markerScore("this is english text", hi.markers)).toBe(0);
  });
});

describe("detect — every profiled language identifies its own sample", () => {
  const full = LANGUAGES.filter((l) => l.tier === "full");
  for (const lang of full) {
    for (let i = 0; i < lang.samples.length; i++) {
      it(`${lang.name} sample #${i + 1}`, () => {
        const r = detect(lang.samples[i]);
        expect(r.ok).toBe(true);
        expect(r.top?.code).toBe(lang.code);
      });
    }
  }
});

describe("detect — hard same-script pairs on held-out sentences", () => {
  it("Bengali vs Assamese (the ৰ / আৰু discriminator)", () => {
    expect(detect("তেওঁ আৰু মই ঘৰলৈ গৈ আছোঁ।").top?.code).toBe("as");
    expect(detect("সে এবং আমি বাড়ি যাচ্ছি।").top?.code).toBe("bn");
  });
  it("English vs Hinglish share the Latin script", () => {
    expect(detect("The weather is nice and the sky is clear today.").top?.code).toBe("en");
    expect(detect("aaj mausam bahut accha hai aur mann khush hai").top?.code).toBe("hi-Latn");
  });
  it("Devanagari siblings: Marathi and Nepali markers win over Hindi", () => {
    expect(detect("मला मराठी भाषा खूप आवडते आणि ती सोपी आहे.").top?.code).toBe("mr");
    expect(detect("मलाई नेपाली भाषा धेरै मन पर्छ र यो राम्रो छ।").top?.code).toBe("ne");
  });
});

describe("detect — unique scripts are named by script alone", () => {
  const cases: [string, string][] = [
    ["ta", "தமிழ் மொழி மிக அழகானது."],
    ["te", "తెలుగు భాష చాలా అందంగా ఉంది."],
    ["kn", "ಕನ್ನಡ ಭಾಷೆ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ."],
    ["ml", "മലയാളം ഭാഷ വളരെ മനോഹരമാണ്."],
    ["gu", "ગુજરાતી ભાષા બહુ સરસ છે."],
    ["pa", "ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਬਹੁਤ ਸੋਹਣੀ ਹੈ।"],
    ["or", "ଓଡ଼ିଆ ଭାଷା ବହୁତ ସୁନ୍ଦର।"],
  ];
  for (const [code, text] of cases) {
    it(`${code} identified`, () => {
      expect(detect(text).top?.code).toBe(code);
    });
  }
});

describe("detect — script-tier languages resolved by their unique script", () => {
  it("Santali (Ol Chiki)", () => {
    const r = detect("ᱥᱟᱱᱛᱟᱲᱤ ᱯᱟᱹᱨᱥᱤ ᱮᱴᱟᱜ ᱠᱟᱱᱟ ᱾");
    expect(r.ok).toBe(true);
    expect(r.top?.code).toBe("sat");
  });
  it("Manipuri (Meitei Mayek)", () => {
    const r = detect("ꯃꯤꯇꯩꯂꯣꯟ ꯑꯁꯤ ꯐꯖꯔꯕ ꯂꯣꯟ ꯑꯃꯅꯤ ꯫");
    expect(r.ok).toBe(true);
    expect(r.top?.code).toBe("mni");
  });
});

describe("detect — partial languages surface as same-script caveats", () => {
  it("Devanagari input lists Konkani/Maithili/Bodo/Dogri as script-only", () => {
    const r = detect("यह पुस्तक बहुत अच्छी है।");
    const codes = r.scriptOnly.map((s) => s.code);
    expect(codes).toEqual(expect.arrayContaining(["kok", "mai", "brx", "doi"]));
  });
});

describe("detect — edge cases", () => {
  it("empty input is not ok", () => {
    expect(detect("").ok).toBe(false);
  });
  it("digits/punctuation only is not ok", () => {
    expect(detect("123 !!! ???").ok).toBe(false);
  });
  it("flags mixed / code-switched text", () => {
    const r = detect("मैं office जा रहा हूँ लेकिन the meeting is at noon");
    expect(r.ok).toBe(true);
    expect(r.mixed).toBe(true);
  });
});

describe("confusion matrix is honest and mostly correct", () => {
  const cm = buildConfusion();
  it("is square over all profiled languages", () => {
    const n = LANGUAGES.filter((l) => l.tier === "full").length;
    expect(cm.labels.length).toBe(n);
    expect(cm.matrix.length).toBe(n);
    expect(cm.matrix.every((row) => row.length === n)).toBe(true);
  });
  it("leave-one-out accuracy clears a real bar", () => {
    expect(cm.accuracy).toBeGreaterThanOrEqual(0.8);
  });
  it("never confuses across different scripts (block-diagonal)", () => {
    const full = LANGUAGES.filter((l) => l.tier === "full");
    cm.matrix.forEach((row, i) => {
      row.forEach((v, j) => {
        if (v > 0) expect(full[i].script).toBe(full[j].script);
      });
    });
  });
});
